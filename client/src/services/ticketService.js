import { signPaymentAuthorization, encodePaymentHeader } from './usdcPaymentService';

const API_URL = import.meta.env.VITE_API_URL || 'https://d4y2c4layjh2.cloudfront.net';

// Obtener precio de un evento
export async function getTicketPrice(eventAddress) {
  const response = await fetch(`${API_URL}/api/tickets/price/${eventAddress}`);
  return response.json();
}

// Comprar ticket CON FIRMA REAL
export async function purchaseTicket(eventAddress, wallet) {
  // 1. Obtener precio
  const priceInfo = await getTicketPrice(eventAddress);
  console.log('💰 Precio del ticket:', priceInfo.price, priceInfo.currency);
  
  // 2. Firmar autorización de pago (aquí sale el popup de Privy)
  console.log('✍️ Solicitando firma al usuario...');
  const authorization = await signPaymentAuthorization(wallet, priceInfo.price);
  console.log('✅ Firma obtenida');
  
  // 3. Codificar para el header
  const paymentHeader = encodePaymentHeader(authorization);
  
  // 4. Enviar al backend
  const response = await fetch(`${API_URL}/api/tickets/purchase/${eventAddress}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-payment': paymentHeader
    },
    body: JSON.stringify({ 
      buyerAddress: wallet.address 
    })
  });
  
  return response.json();
}

// Versión dev (mantener para pruebas)
export async function purchaseTicketDev(eventAddress, buyerAddress) {
  const fakePayment = btoa(JSON.stringify({
    txHash: '0xdev' + Date.now(),
    chainId: 84532,
    amount: '5000000',
    sender: buyerAddress
  }));

  const response = await fetch(`${API_URL}/api/tickets/purchase/${eventAddress}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-payment': fakePayment
    },
    body: JSON.stringify({ buyerAddress })
  });

  return response.json();
}
