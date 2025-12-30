// client/src/services/x402Client.js
import { wrapFetchWithPayment } from 'x402-fetch';

export function createPaymentFetch(wallet) {
  return wrapFetchWithPayment(fetch, {
    wallet,
    onPaymentRequired: async (paymentDetails) => {
      // Mostrar UI de confirmación al usuario
      console.log('Pago requerido:', paymentDetails);
      return true; // Confirmar pago
    }
  });
}
