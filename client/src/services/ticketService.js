const API_URL = import.meta.env.VITE_API_URL || 'https://d4y2c4layjh2.cloudfront.net';

// Obtener precio de un evento
export async function getTicketPrice(eventAddress) {
  const response = await fetch(`${API_URL}/api/tickets/price/${eventAddress}`);
  return response.json();
}

// Comprar ticket (modo desarrollo - sin pago real)
export async function purchaseTicketDev(eventAddress, buyerAddress) {
  // Header de pago falso para desarrollo
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

// Comprar ticket (modo producción - con firma real)
export async function purchaseTicketProd(eventAddress, buyerAddress, signedPayment) {
  const response = await fetch(`${API_URL}/api/tickets/purchase/${eventAddress}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-payment': signedPayment
    },
    body: JSON.stringify({ buyerAddress })
  });

  return response.json();
}
