import { usePrivy } from '@privy-io/react-auth';

export function useX402Payment() {
  const { user, signMessage } = usePrivy();
  
  const purchaseTicket = async (eventAddress) => {
    const API_URL = import.meta.env.VITE_API_URL;
    
    // Primera llamada - obtendrá 402 si requiere pago
    let response = await fetch(`${API_URL}/api/tickets/purchase/${eventAddress}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-buyer-address': user.wallet.address
      }
    });
    
    // Si es 402, necesitamos pagar
    if (response.status === 402) {
      const paymentRequired = response.headers.get('X-PAYMENT-REQUIRED');
      const paymentInfo = JSON.parse(paymentRequired);
      
      // Construir payload de pago
      // x402 usa USDC en Base por defecto
      const paymentPayload = await constructPayment(paymentInfo, user.wallet);
      
      // Reintentar con el pago
      response = await fetch(`${API_URL}/api/tickets/purchase/${eventAddress}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-buyer-address': user.wallet.address,
          'X-PAYMENT': paymentPayload
        }
      });
    }
    
    if (!response.ok) {
      throw new Error('Error en la compra');
    }
    
    return response.json();
  };
  
  return { purchaseTicket };
}

// Helper para construir el pago
async function constructPayment(paymentInfo, wallet) {
  // La librería x402-fetch puede manejar esto automáticamente
  // O puedes usar el SDK de Privy para firmar
  // Implementación depende de tu setup exacto
}
