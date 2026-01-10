// client/src/pages/client/Cart.jsx
import { useData } from '../../context/DataContext';
import { useX402Payment } from '../../hooks/useX402Payment';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  ArrowLeft, 
  Clock, 
  CheckCircle,
  Loader2,
  AlertCircle
} from 'lucide-react';

const Cart = () => {
  const { 
    cart, 
    removeFromCart, 
    updateCartQuantity, 
    clearCart,
    fetchMyOrders,
    fetchMyTickets,
    fetchServices
  } = useData();
  
  const { purchaseTicket, loading: paymentLoading, error: paymentError } = useX402Payment();
  const navigate = useNavigate();
  
  const [checkoutStatus, setCheckoutStatus] = useState(null);
  const [purchaseResult, setPurchaseResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Calcular total
  const totalAmount = cart.reduce((sum, item) => sum + (item.service.price * item.quantity), 0);
  
  // Calcular max wait time
  const maxWaitTime = cart.length > 0 
    ? Math.max(...cart.map(item => item.service.avgTime || 0)) 
    : 0;

  // Verificar si todos los servicios están on-chain
  const DEFAULT_EVENT = import.meta.env.VITE_DEFAULT_EVENT_ADDRESS || '0x2339acd68a5b699c8bfefed62febcf497959ca55527227e980c56031b3bfced9';
  const allServicesOnChain = true; // Siempre permitir con fallback
  const servicesNotOnChain = [];

  // Manejar checkout con x402
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    // Validar que el servicio esté publicado on-chain
    const eventAddress = cart[0].service.eventAddress || 
    import.meta.env.VITE_DEFAULT_EVENT_ADDRESS || 
    '0x2339acd68a5b699c8bfefed62febcf497959ca55527227e980c56031b3bfced9';
    
    if (!eventAddress) {
      setCheckoutStatus('error');
      setErrorMessage('This service is not available for purchase yet. The vendor needs to publish it on-chain first.');
      return;
    }
    
    setCheckoutStatus('processing');
    setErrorMessage(null);

    try {
      console.log('🛒 Starting checkout...');
      console.log('   Total:', totalAmount, 'USD');
      console.log('   Event:', eventAddress);
      console.log('   Items:', cart.length);

      // Si el total es 0, procesar como gratuito
      if (totalAmount === 0) {
        console.log('💸 Free order, skipping payment...');
        setCheckoutStatus('success');
        setPurchaseResult({ ticket: { address: 'free-ticket' } });
        clearCart();
        return;
      }

      // Procesar pago con x402
      const result = await purchaseTicket(eventAddress, totalAmount);

      if (result.success) {
        console.log('🎉 Purchase successful!', result);
        setCheckoutStatus('success');
        setPurchaseResult(result);
        
        // Limpiar carrito
        clearCart();
        
        // Refrescar datos
        await Promise.all([
          fetchMyOrders?.(),
          fetchMyTickets?.(),
          fetchServices?.(true)
        ]);

        // Navegar después de 2 segundos
        setTimeout(() => {
          navigate('/client/orders', { 
            state: { 
              purchaseSuccess: true, 
              ticket: result.ticket,
              payment: result.payment
            } 
          });
        }, 2000);

      } else {
        console.error('❌ Purchase failed:', result.error);
        setCheckoutStatus('error');
        setErrorMessage(result.error || 'Payment failed');
      }

    } catch (error) {
      console.error('❌ Checkout error:', error);
      setCheckoutStatus('error');
      setErrorMessage(error.message || 'An unexpected error occurred');
    }
  };

  // Resetear estado de error
  const resetCheckout = () => {
    setCheckoutStatus(null);
    setErrorMessage(null);
  };

  return (
    <div className="pb-20 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm uppercase tracking-widest">Back</span>
        </button>
      </div>

      <div className="mb-12 text-center">
        <h2 className="text-4xl md:text-5xl font-bold font-serif text-gradient-gold tracking-widest uppercase">
          Your Cart
        </h2>
        <div className="w-[1px] h-16 bg-gradient-to-b from-[#FFD700] to-transparent mx-auto mt-6" />
      </div>

      {/* Success State */}
      {checkoutStatus === 'success' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel p-12 text-center border border-green-500/50 mb-8"
        >
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
          <h3 className="text-3xl text-white font-serif mb-4">Purchase Successful!</h3>
          <p className="text-gray-400 mb-4">Your ticket has been minted.</p>
          {purchaseResult?.ticket?.address && (
            <p className="text-xs text-gray-500 font-mono break-all">
              Ticket: {purchaseResult.ticket.address}
            </p>
          )}
          {purchaseResult?.payment?.txHash && (
            <p className="text-xs text-gray-500 font-mono break-all mt-2">
              Payment TX: {purchaseResult.payment.txHash}
            </p>
          )}
          <p className="text-sm text-[#FFD700] mt-6">Redirecting to orders...</p>
        </motion.div>
      )}

      {/* Error State */}
      {checkoutStatus === 'error' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel p-8 text-center border border-red-500/50 mb-8"
        >
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-2xl text-white font-serif mb-2">Payment Failed</h3>
          <p className="text-red-400 mb-6">{errorMessage || paymentError || 'Unknown error'}</p>
          <button 
            onClick={resetCheckout}
            className="btn-premium px-8 py-3"
          >
            Try Again
          </button>
        </motion.div>
      )}

      {/* Empty Cart */}
      {cart.length === 0 && checkoutStatus !== 'success' ? (
        <div className="glass-panel p-20 text-center border border-[#222]">
          <ShoppingBag className="w-16 h-16 text-[#333] mx-auto mb-6" />
          <h3 className="text-2xl text-gray-400 font-serif mb-4">Your cart is empty</h3>
          <button 
            onClick={() => navigate('/client')}
            className="btn-premium mt-4"
          >
            Browse Establishments
          </button>
        </div>
      ) : checkoutStatus !== 'success' && (
        <>
          {/* Cart Items */}
          <div className="space-y-4 mb-8">
            <AnimatePresence>
              {cart.map((item) => (
                <motion.div
                  key={item.serviceId}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="glass-panel p-6 flex items-center gap-6"
                >
                  {/* Image */}
                  <div className="w-24 h-24 bg-[#111] overflow-hidden flex-shrink-0 relative">
                    <img 
                      src={item.service.image} 
                      className="w-full h-full object-cover"
                      alt={item.service.title}
                    />
                    {/* On-chain indicator */}
                    {item.service.eventAddress ? (
                      <div className="absolute top-1 right-1 w-3 h-3 bg-green-500 rounded-full" title="On-chain" />
                    ) : (
                      <div className="absolute top-1 right-1 w-3 h-3 bg-yellow-500 rounded-full" title="Not on-chain" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <h3 className="text-xl font-serif text-white mb-1">
                      {item.service.title}
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-[#FFD700] text-xs">
                        <Clock className="w-3 h-3" />
                        <span>{item.service.avgTime} min</span>
                      </div>
                      {item.service.price > 0 && (
                        <span className="text-white text-sm font-bold">
                          ${item.service.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                    {/* Warning if not on-chain */}
                    {!item.service.eventAddress && (
                      <p className="text-yellow-400 text-xs mt-1">⚠ Not available yet</p>
                    )}
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => updateCartQuantity(item.serviceId, item.quantity - 1)}
                      className="w-8 h-8 border border-[#333] hover:border-[#FFD700] flex items-center justify-center transition-colors"
                      disabled={checkoutStatus === 'processing'}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-xl font-bold w-8 text-center">{item.quantity}</span>
                    <button 
                      onClick={() => updateCartQuantity(item.serviceId, item.quantity + 1)}
                      className="w-8 h-8 border border-[#333] hover:border-[#FFD700] flex items-center justify-center transition-colors"
                      disabled={checkoutStatus === 'processing'}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Remove */}
                  <button 
                    onClick={() => removeFromCart(item.serviceId)}
                    className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                    disabled={checkoutStatus === 'processing'}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Summary */}
          <div className="glass-panel p-8 border-t-2 border-t-[#FFD700]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-400 uppercase tracking-widest text-sm">Total Items</span>
              <span className="text-2xl font-bold text-white">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            </div>
            
            {/* Total Amount */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-400 uppercase tracking-widest text-sm">Total</span>
              <span className="text-2xl font-bold text-[#FFD700]">
                ${totalAmount.toFixed(2)} USDC
              </span>
            </div>

            <div className="flex items-center justify-between mb-8 pb-6 border-b border-[#222]">
              <span className="text-gray-400 uppercase tracking-widest text-sm">Estimated Wait Time</span>
              <div className="flex items-center gap-2 text-[#FFD700]">
                <Clock className="w-5 h-5" />
                <span className="text-2xl font-bold">{maxWaitTime} min</span>
              </div>
            </div>

            {/* Warning: Service not on-chain */}
            {!allServicesOnChain && servicesNotOnChain.length > 0 && (
              <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-yellow-400 font-medium text-sm">Service Not Available</p>
                  <p className="text-gray-400 text-xs mt-1">
                    "{servicesNotOnChain.map(i => i.service.title).join('", "')}" 
                    {servicesNotOnChain.length === 1 ? ' is' : ' are'} not published on-chain yet.
                  </p>
                </div>
              </div>
            )}

            {/* Checkout Button */}
            <button 
              onClick={handleCheckout}
              disabled={paymentLoading || checkoutStatus === 'processing' || cart.length === 0 || !allServicesOnChain}
              className="btn-premium w-full py-5 text-sm flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(paymentLoading || checkoutStatus === 'processing') ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing Payment...</span>
                </>
              ) : !allServicesOnChain ? (
                'SERVICE NOT AVAILABLE'
              ) : (
                'CONFIRM ORDER'
              )}
            </button>

            {/* Payment Info */}
            <p className="text-center text-gray-500 text-xs mt-4">
              Payment processed via USDC on Base Sepolia
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default Cart;
