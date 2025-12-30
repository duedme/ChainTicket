import express from 'express';
import { dynamicPaymentMiddleware } from '../middleware/x402Payment.js';
import { mintTicketOnChain } from '../services/movementService.js';

const router = express.Router();

/**
 * POST /api/tickets/purchase/:eventAddress
 * 
 * Flujo:
 * 1. Cliente llama este endpoint
 * 2. Si no hay pago, retorna 402 con instrucciones
 * 3. Si hay pago válido en X-PAYMENT header, procede al mint
 */
router.post(
  '/purchase/:eventAddress',
  dynamicPaymentMiddleware,  // Este middleware maneja el 402
  async (req, res) => {
    // Si llegamos aquí, el pago fue verificado y liquidado ✅
    const { eventAddress } = req.params;
    const buyerAddress = req.body.buyerAddress || req.headers['x-buyer-address'];
    
    // Extraer info del pago del header de respuesta
    const paymentResponse = req.headers['x-payment-response'];
    
    try {
      // Mint del ticket on-chain
      const mintResult = await mintTicketOnChain({
        eventAddress,
        buyerAddress,
        paymentTxHash: paymentResponse?.transactionHash
      });
      
      return res.status(200).json({
        success: true,
        message: 'Ticket comprado exitosamente',
        ticket: {
          tokenId: mintResult.tokenId,
          eventAddress,
          owner: buyerAddress,
          qrHash: mintResult.qrHash
        },
        payment: {
          txHash: paymentResponse?.transactionHash,
          amount: paymentResponse?.amount
        }
      });
      
    } catch (error) {
      console.error('Error minting ticket:', error);
      return res.status(500).json({
        success: false,
        error: 'Error al crear el ticket',
        details: error.message
      });
    }
  }
);

/**
 * GET /api/tickets/price/:eventAddress
 * Obtener precio de un evento (público, sin pago)
 */
router.get('/price/:eventAddress', async (req, res) => {
  const { eventAddress } = req.params;
  
  try {
    const price = await getEventPrice(eventAddress);
    return res.json({ eventAddress, price, currency: 'USD' });
  } catch (error) {
    return res.status(404).json({ error: 'Evento no encontrado' });
  }
});

export default router;
