import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

// Configuración de Movement (compatible con Aptos SDK)
const config = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: process.env.MOVEMENT_RPC_URL,
  indexer: process.env.MOVEMENT_INDEXER_URL
});

const aptos = new Aptos(config);

// Dirección de tu módulo desplegado
const MODULE_ADDRESS = process.env.CONTRACT_MODULE_ADDRESS;

/**
 * Mint ticket después de pago verificado
 */
export async function mintTicketOnChain({ eventAddress, buyerAddress, paymentTxHash }) {
  // Generar QR hash único para este ticket
  const qrHash = generateQRHash(eventAddress, buyerAddress, Date.now());
  
  // Construir la transacción
  const transaction = await aptos.transaction.build.simple({
    sender: process.env.BACKEND_WALLET_ADDRESS, // Tu wallet del backend
    data: {
      function: `${MODULE_ADDRESS}::ticket::mint_ticket_after_payment`,
      typeArguments: [],
      functionArguments: [
        eventAddress,      // event_object
        buyerAddress,      // receiver
        qrHash,            // qr_hash
        false              // is_permanent (configurable)
      ]
    }
  });
  
  // Firmar y enviar
  // NOTA: Necesitas la private key del backend wallet
  const pendingTx = await aptos.signAndSubmitTransaction({
    signer: getBackendSigner(),
    transaction
  });
  
  // Esperar confirmación
  const result = await aptos.waitForTransaction({
    transactionHash: pendingTx.hash
  });
  
  return {
    tokenId: extractTokenId(result),
    qrHash,
    txHash: pendingTx.hash
  };
}

/**
 * Query eventos usando Hasura GraphQL
 */
export async function getEventDetails(eventAddress) {
  const query = `
    query GetEvent($address: String!) {
      events(where: {account_address: {_eq: $address}}) {
        account_address
        creation_number
        data
        sequence_number
        transaction_version
        type
      }
    }
  `;
  
  const response = await fetch(process.env.MOVEMENT_INDEXER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      variables: { address: eventAddress }
    })
  });
  
  return response.json();
}

// Helpers
function generateQRHash(event, buyer, timestamp) {
  const crypto = require('crypto');
  return crypto
    .createHash('sha256')
    .update(`${event}-${buyer}-${timestamp}`)
    .digest('hex');
}

function getBackendSigner() {
  // Implementar según tu setup de keys
  // NUNCA expongas private keys en el código
}

function extractTokenId(txResult) {
  // Parsear el resultado para obtener el token ID
  // Depende de cómo tu contrato emite eventos
}
