import { verifyTypedData, createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

import express from 'express';
import crypto from 'crypto';
import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';

const router = express.Router();

// Configuración de Movement
const CONTRACT_ADDRESS = process.env.CONTRACT_MODULE_ADDRESS || '2339acd68a5b699c8bfefed62febcf497959ca55527227e980c56031b3bfced9'
const MOVEMENT_RPC = process.env.MOVEMENT_RPC_URL || 'https://testnet.movementnetwork.xyz/v1'
const MOVEMENT_INDEXER = process.env.MOVEMENT_INDEXER_URL || 'https://hasura.testnet.movementnetwork.xyz/v1/graphql'

// Inicializar Aptos client para Movement
const aptosConfig = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: MOVEMENT_RPC,
  indexer: MOVEMENT_INDEXER,
});
const aptos = new Aptos(aptosConfig);

// Cliente para Base Sepolia
const baseClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.BASE_RPC_URL || 'https://sepolia.base.org')
});

// ============================================
// FUNCIÓN: Obtener precio del evento desde el indexer
// ============================================
async function getEventPrice(eventAddress) {
  try {
    // Query GraphQL al indexer de Movement
    const query = `
      query GetEventData {
        current_objects(
          where: {object_address: {_eq: "${eventAddress}"}}
        ) {
          object_address
          owner_address
        }
      }
    `;
    
    const response = await fetch(MOVEMENT_INDEXER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    
    const result = await response.json();
    
    // Si no encontramos en indexer, intentar view function directamente
    if (!result.data?.current_objects?.length) {
      return await getEventPriceFromContract(eventAddress);
    }
    
    // Obtener precio usando view function del contrato
    return await getEventPriceFromContract(eventAddress);
    
  } catch (error) {
    console.error('Error fetching event price from indexer:', error);
    // Fallback: precio por defecto o desde contrato
    return await getEventPriceFromContract(eventAddress);
  }
}

// View function para obtener precio directamente del contrato
async function getEventPriceFromContract(eventAddress) {
  try {
    const result = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESS}::ticket::get_ticket_price`,
        typeArguments: [],
        functionArguments: [eventAddress]
      }
    });
    
    // El precio viene en la unidad más pequeña, convertir a USD
    const priceInSmallestUnit = Number(result[0]);
    const priceInUSD = priceInSmallestUnit / 1_000_000; // Ajustar según decimales
    
    return priceInUSD;
  } catch (error) {
    console.error('Error getting price from contract:', error);
    // Precio por defecto si falla
    return 5.00;
  }
}

// ============================================
// FUNCIÓN: Obtener info completa del evento
// ============================================
async function getEventInfo(eventAddress) {
  try {
    const result = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESS}::ticket::get_event_info`,
        typeArguments: [],
        functionArguments: [eventAddress]
      }
    });
    
    // Retorna: name, admin_registry, total_tickets, tickets_sold, ticket_price, 
    // is_active, is_cancelled, transferable, resalable, permanent, refundable, payment_processor
    return {
      name: result[0],
      adminRegistry: result[1],
      totalTickets: Number(result[2]),
      ticketsSold: Number(result[3]),
      ticketPrice: Number(result[4]) / 1_000_000,
      isActive: result[5],
      isCancelled: result[6],
      transferable: result[7],
      resalable: result[8],
      permanent: result[9],
      refundable: result[10],
      paymentProcessor: result[11]
    };
  } catch (error) {
    console.error('Error getting event info:', error);
    throw new Error('Event not found');
  }
}

// ============================================
// FUNCIÓN: Mintear ticket después del pago
// ============================================
async function mintTicketOnChain(eventAddress, buyerAddress, paymentTxHash) {
  try {
    // ⭐ Convertir dirección EVM a formato Movement (64 chars)
    let formattedBuyer = buyerAddress;
    if (buyerAddress.startsWith('0x')) {
      const addressWithout0x = buyerAddress.slice(2);
      if (addressWithout0x.length < 64) {
        formattedBuyer = '0x' + addressWithout0x.padStart(64, '0');
      }
    }
    console.log('📝 Formatted buyer address:', formattedBuyer);

    const privateKeyHex = process.env.PAYMENT_PROCESSOR_PRIVATE_KEY;
    if (!privateKeyHex) {
      throw new Error('Payment processor private key not configured');
    }
    
    const privateKey = new Ed25519PrivateKey(privateKeyHex);
    const paymentProcessor = Account.fromPrivateKey({ privateKey });
    
    // Generar QR hash - usar formattedBuyer ⭐
    const qrHash = crypto.createHash('sha256')
      .update(`${eventAddress}-${formattedBuyer}-${paymentTxHash}-${Date.now()}`)
      .digest();
    
    const transaction = await aptos.transaction.build.simple({
      sender: paymentProcessor.accountAddress,
      data: {
        function: `${CONTRACT_ADDRESS}::ticket::mint_ticket_after_payment`,
        typeArguments: [],
        functionArguments: [
          eventAddress,
          formattedBuyer,
          Array.from(qrHash)
        ]
      }
    });
    
    const pendingTx = await aptos.signAndSubmitTransaction({
      signer: paymentProcessor,
      transaction
    });
    
    const committedTx = await aptos.waitForTransaction({
      transactionHash: pendingTx.hash
    });
    
    let ticketAddress = null;
    if (committedTx.events) {
      const purchaseEvent = committedTx.events.find(
        e => e.type.includes('::ticket::TicketPurchased')
      );
      if (purchaseEvent) {
        ticketAddress = purchaseEvent.data.ticket_address;
      }
    }
    
    return {
      success: true,
      txHash: pendingTx.hash,
      ticketAddress,
      qrHash: qrHash.toString('hex'),
      buyer: formattedBuyer
    };
    
  } catch (error) {
    console.error('Error minting ticket on-chain:', error);
    throw error;
  }
}

// ============================================
// MIDDLEWARE: x402 Dynamic Payment
// ============================================
function createDynamicPaymentMiddleware() {
  return async (req, res, next) => {
    const eventAddress = req.params.eventAddress;
    const paymentHeader = req.headers['x-payment'];
    
    try {
      // Obtener precio del evento
      const price = await getEventPrice(eventAddress);
      
      // Si no hay header de pago, retornar 402 con instrucciones
      if (!paymentHeader) {
        return res.status(402).json({
          error: 'Payment Required',
          paymentDetails: {
            scheme: 'x402',
            network: 'base', // Pagos en Base (USDC)
            receiver: process.env.PAYMENT_RECEIVER_ADDRESS,
            amount: price.toString(),
            currency: 'USDC',
            eventAddress,
            description: `Ticket purchase for event ${eventAddress}`,
            // Información para el cliente x402
            paymentInstructions: {
              chainId: 84532,
              token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC SEPOLIA
              recipient: process.env.PAYMENT_RECEIVER_ADDRESS,
              amount: Math.floor(price * 1_000_000).toString(), // USDC tiene 6 decimales
            }
          }
        });
      }
      
      // Verificar el pago
      const paymentValid = await verifyX402Payment(paymentHeader, price);
      
      if (!paymentValid.valid) {
        return res.status(402).json({
          error: 'Invalid Payment',
          message: paymentValid.error,
          paymentDetails: {
            scheme: 'x402',
            receiver: process.env.PAYMENT_RECEIVER_ADDRESS,
            amount: price.toString(),
            currency: 'USDC'
          }
        });
      }
      
      // Guardar info del pago verificado en request
      req.paymentInfo = paymentValid;
      next();
      
    } catch (error) {
      console.error('Payment middleware error:', error);
      return res.status(500).json({
        error: 'Payment verification failed',
        message: error.message
      });
    }
  };
}

// ============================================
// FUNCIÓN: Verificar pago x402
// ============================================
async function verifyX402Payment(paymentHeader, expectedAmount) {
  // En desarrollo, siempre aprobar
  if (process.env.NODE_ENV === 'development') {
    console.warn('🧪 DEV MODE: Skipping payment verification');
    try {
      const paymentData = JSON.parse(Buffer.from(paymentHeader, 'base64').toString());
      return { 
        valid: true, 
        txHash: paymentData.txHash || 'dev-mode',
        amount: expectedAmount,
        sender: paymentData.from || paymentData.sender || 'dev-user'
      };
    } catch {
      return { valid: true, txHash: 'dev-mode', amount: expectedAmount, sender: 'dev-user' };
    }
  }

  try {
    // Decodificar header
    const authData = JSON.parse(Buffer.from(paymentHeader, 'base64').toString());
    const { from, to, value, validAfter, validBefore, nonce, signature, chainId } = authData;
    
    // Verificar chain
    if (chainId !== 84532) {
      return { valid: false, error: 'Invalid chain ID' };
    }
    
    // Verificar que no haya expirado
    const now = Math.floor(Date.now() / 1000);
    if (now >= Number(validBefore)) {
      return { valid: false, error: 'Authorization expired' };
    }
    
    // Verificar monto
    const expectedValueWei = BigInt(Math.floor(expectedAmount * 1000000));
    if (BigInt(value) < expectedValueWei) {
      return { valid: false, error: 'Insufficient amount' };
    }
    
    // Verificar destinatario
    if (to.toLowerCase() !== process.env.PAYMENT_RECEIVER_ADDRESS.toLowerCase()) {
      return { valid: false, error: 'Invalid recipient' };
    }
    
    // Verificar firma EIP-712
    const isValidSignature = await verifyTypedData({
      address: from,
      domain: {
        name: 'USD Coin',
        version: '2',
        chainId: 84532,
        verifyingContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
      },
      types: {
        TransferWithAuthorization: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'validAfter', type: 'uint256' },
          { name: 'validBefore', type: 'uint256' },
          { name: 'nonce', type: 'bytes32' }
        ]
      },
      primaryType: 'TransferWithAuthorization',
      message: {
        from,
        to,
        value: BigInt(value),
        validAfter: BigInt(validAfter),
        validBefore: BigInt(validBefore),
        nonce
      },
      signature
    });
    
    if (!isValidSignature) {
      return { valid: false, error: 'Invalid signature' };
    }
    
    // TODO: Ejecutar transferWithAuthorization en Base
    // Por ahora retornamos válido si la firma es correcta
    
    return {
      valid: true,
      txHash: `pending-${Date.now()}`,
      amount: expectedAmount,
      sender: from
    };
    
  } catch (error) {
    console.error('Payment verification error:', error);
    return { valid: false, error: 'Invalid payment format' };
  }
}

// Verificar transacción en Base
async function verifyBaseTransaction(txHash, expectedAmount) {
  if (process.env.NODE_ENV === 'development') {
    console.warn('🧪 DEV MODE: Skipping transaction verification');
    return true;
  }

  try {
    const baseRpc = process.env.BASE_RPC_URL || 'https://sepolia.base.org';
    const response = await fetch(baseRpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getTransactionReceipt',
        params: [txHash]
      })
    });
    const result = await response.json();
    
    if (result.result && result.result.status === '0x1') {
      return true;
    }
    return false;
  } catch (error) {
    console.error('Base transaction verification error:', error);
    return false;
  }
}

// ============================================
// RUTAS
// ============================================

// GET /api/tickets/price/:eventAddress - Obtener precio de un evento
router.get('/price/:eventAddress', async (req, res) => {
  const { eventAddress } = req.params;
  
  try {
    const price = await getEventPrice(eventAddress);
    const eventInfo = await getEventInfo(eventAddress);
    
    return res.json({
      eventAddress,
      price,
      currency: 'USD',
      eventName: eventInfo.name,
      ticketsRemaining: eventInfo.totalTickets - eventInfo.ticketsSold,
      isActive: eventInfo.isActive
    });
  } catch (error) {
    return res.status(404).json({ 
      error: 'Event not found',
      message: error.message 
    });
  }
});

// GET /api/tickets/event/:eventAddress - Info completa del evento
router.get('/event/:eventAddress', async (req, res) => {
  const { eventAddress } = req.params;
  
  try {
    const eventInfo = await getEventInfo(eventAddress);
    return res.json(eventInfo);
  } catch (error) {
    return res.status(404).json({ 
      error: 'Event not found',
      message: error.message 
    });
  }
});

// POST /api/tickets/purchase/:eventAddress - Comprar ticket con x402
router.post(
  '/purchase/:eventAddress',
  createDynamicPaymentMiddleware(),
  async (req, res) => {
    const { eventAddress } = req.params;
    const buyerAddress = req.body.buyerAddress || req.headers['x-buyer-address'];
    
    if (!buyerAddress) {
      return res.status(400).json({
        error: 'Buyer address required',
        message: 'Provide buyerAddress in body or x-buyer-address header'
      });
    }
    
    try {
      // Mint del ticket on-chain
      const mintResult = await mintTicketOnChain(
        eventAddress,
        buyerAddress,
        req.paymentInfo.txHash
      );
      
      return res.status(200).json({
        success: true,
        message: 'Ticket purchased successfully',
        ticket: {
          address: mintResult.ticketAddress,
          eventAddress,
          owner: buyerAddress,
          qrHash: mintResult.qrHash
        },
        payment: {
          txHash: req.paymentInfo.txHash,
          amount: req.paymentInfo.amount,
          network: 'base'
        },
        movementTx: {
          hash: mintResult.txHash
        }
      });
      
    } catch (error) {
      console.error('Error minting ticket:', error);
      return res.status(500).json({
        success: false,
        error: 'Error creating ticket',
        message: error.message
      });
    }
  }
);

// POST /api/tickets/purchase-free/:eventAddress - Comprar ticket gratis
router.post('/purchase-free/:eventAddress', async (req, res) => {
  const { eventAddress } = req.params;
  const { buyerAddress } = req.body;
  
  if (!buyerAddress) {
    return res.status(400).json({ error: 'Buyer address required' });
  }
  
  try {
    // Verificar que el evento es gratuito
    const eventInfo = await getEventInfo(eventAddress);
    if (eventInfo.ticketPrice > 0) {
      return res.status(402).json({
        error: 'Payment required',
        price: eventInfo.ticketPrice
      });
    }
    
    const mintResult = await mintTicketOnChain(eventAddress, buyerAddress, 'free');
    
    return res.json({
      success: true,
      ticket: {
        address: mintResult.ticketAddress,
        qrHash: mintResult.qrHash
      },
      txHash: mintResult.txHash
    });
    
  } catch (error) {
    return res.status(500).json({
      error: 'Error creating ticket',
      message: error.message
    });
  }
});

export default router;
