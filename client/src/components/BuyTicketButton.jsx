import { useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { getTicketPrice, purchaseTicket, purchaseTicketDev } from '../services/ticketService';

export default function BuyTicketButton({ eventAddress, devMode = false }) {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleBuy = async () => {
    // Si no está autenticado, iniciar login
    if (!authenticated) {
      login();
      return;
    }

    if (!wallets.length) {
      setError('No se encontró wallet. Intenta reconectarte.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const wallet = wallets[0];
      
      if (devMode) {
        // Modo desarrollo (sin firma real)
        setStatus('Procesando compra (dev mode)...');
        const purchaseResult = await purchaseTicketDev(eventAddress, wallet.address);
        
        if (purchaseResult.success) {
          setResult(purchaseResult);
        } else {
          setError(purchaseResult.error || 'Error al comprar');
        }
      } else {
        // Modo producción (con firma real)
        setStatus('Obteniendo precio...');
        const priceInfo = await getTicketPrice(eventAddress);
        
        setStatus(`Firma la autorización de ${priceInfo.price} USDC...`);
        const purchaseResult = await purchaseTicket(eventAddress, wallet);
        
        if (purchaseResult.success) {
          setResult(purchaseResult);
          setStatus('');
        } else {
          setError(purchaseResult.error || purchaseResult.message || 'Error al comprar');
        }
      }
    } catch (err) {
      console.error('Error:', err);
      if (err.message?.includes('User rejected')) {
        setError('Firma cancelada por el usuario');
      } else {
        setError(err.message || 'Error desconocido');
      }
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  return (
    <div className="buy-ticket-container" style={{ padding: '20px' }}>
      <button 
        onClick={handleBuy}
        disabled={loading}
        style={{
          padding: '15px 30px',
          fontSize: '18px',
          backgroundColor: loading ? '#666' : '#f0b90b',
          color: '#000',
          border: 'none',
          borderRadius: '8px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: 'bold'
        }}
      >
        {!authenticated 
          ? '🔐 Conectar Wallet'
          : loading 
            ? '⏳ ' + (status || 'Procesando...')
            : '🎫 Comprar Ticket (5 USDC)'
        }
      </button>

      {error && (
        <div style={{ 
          marginTop: '15px', 
          padding: '10px', 
          backgroundColor: '#ff4444', 
          color: 'white',
          borderRadius: '8px'
        }}>
          ❌ {error}
        </div>
      )}

      {result && (
        <div style={{ 
          marginTop: '15px', 
          padding: '15px', 
          backgroundColor: '#00c853', 
          color: 'white',
          borderRadius: '8px'
        }}>
          <h3 style={{ margin: '0 0 10px 0' }}>✅ ¡Ticket Comprado!</h3>
          <p style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>Ticket:</strong> {result.ticket?.address?.slice(0, 25)}...
          </p>
          <p style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>QR Hash:</strong> {result.ticket?.qrHash?.slice(0, 25)}...
          </p>
          <a 
            href={`https://explorer.movementnetwork.xyz/txn/${result.movementTx?.hash}?network=testnet`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'white', textDecoration: 'underline' }}
          >
            Ver transacción en Explorer →
          </a>
        </div>
      )}
    </div>
  );
}
