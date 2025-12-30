import { facilitator } from '@coinbase/x402';
import { paymentMiddleware } from 'x402-express';

// Configuración del middleware x402
export const createTicketPaywall = (priceInUSD, eventAddress) => {
  return paymentMiddleware(
    process.env.PAYMENT_RECEIVER_ADDRESS, // Wallet que recibe el pago
    {
      price: `$${priceInUSD}`,           // Precio en USD (se paga en USDC)
      network: 'base-sepolia',            // Red para pagos (Base tiene fees muy bajos)
      config: {
        description: `Ticket para evento ${eventAddress}`,
        maxTimeoutSeconds: 300,           // 5 minutos para completar pago
        resource: `/api/tickets/mint/${eventAddress}`
      }
    },
    facilitator  // Usa el facilitator de Coinbase
  );
};

// Middleware dinámico que lee el precio del evento
export const dynamicPaymentMiddleware = async (req, res, next) => {
  const { eventAddress } = req.params;
  
  try {
    // Obtener precio del evento desde tu contrato/DB
    const eventPrice = await getEventPrice(eventAddress);
    
    // Crear paywall dinámico
    const paywall = createTicketPaywall(eventPrice, eventAddress);
    
    // Ejecutar middleware
    return paywall(req, res, next);
  } catch (error) {
    console.error('Error en payment middleware:', error);
    return res.status(500).json({ error: 'Error procesando pago' });
  }
};

// Helper para obtener precio (implementar según tu lógica)
async function getEventPrice(eventAddress) {
  // TODO: Query a Hasura GraphQL o tu DB
  // Por ahora retorna precio dummy
  return 5.00; // $5 USD
}
