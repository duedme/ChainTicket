import { useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { getTicketPrice, purchaseTicketDev } from '../services/ticketService';

export default function BuyTicketButton({ eventAddress }) {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleBuy = async () => {
    if (!authenticated || !wallets.length) {
      setError('Por favor conecta tu wallet primero');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Obtener precio (opcional, para mostrar)
      const priceInfo = await getTicketPrice(eventAddress);
      console.log('💰 Precio:', priceInfo.price, priceInfo.currency);

      // 2. Obtener dirección del usuario
      const userWallet = wallets[0].address;
      console.log('👤 Wallet del usuario:', userWallet);

      // 3. Comprar ticket (modo desarrollo)
      const purchaseResult = await purchaseTicketDev(eventAddress, userWallet);
      
      if (purchaseResult.success) {
        console.log('🎫 Ticket comprado:', purchaseResult);
        setResult(purchaseResult);
      } else {
        setError(purchaseResult.error || 'Error al comprar ticket');
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="buy-ticket-container">
      <button 
        onClick={handleBuy}
        disabled={loading || !authenticated}
        className="buy-button"
      >
        {loading ? '⏳ Procesando...' : '🎫 Comprar Ticket (5 USDC)'}
      </button>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {result && (
        <div className="success-message">
          <h3>✅ ¡Ticket Comprado!</h3>
          <p><strong>Ticket:</strong> {result.ticket.address.slice(0, 20)}...</p>
          <p><strong>QR Hash:</strong> {result.ticket.qrHash.slice(0, 20)}...</p>
          <a 
            href={`https://explorer.movementnetwork.xyz/txn/${result.movementTx.hash}?network=testnet`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver en Explorer →
          </a>
        </div>
      )}
    </div>
  );
}
