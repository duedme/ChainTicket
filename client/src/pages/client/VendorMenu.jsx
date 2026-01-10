import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, Plus, ShoppingCart, ArrowLeft, Users, Ticket, Timer, CheckCircle, LogIn } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

const VendorMenu = () => {
    const { vendorId } = useParams();
    const { vendors, services, cart, addToCart, purchaseDirectly, joinQueue, getQueueStatus, orders } = useData();
    const { isGuest, connectWallet } = useAuth();
    const navigate = useNavigate();
    const [queueTime, setQueueTime] = useState(null);
    const [queuePosition, setQueuePosition] = useState(null);
    const [queueOrderId, setQueueOrderId] = useState(null);
    const [queueOrderNumber, setQueueOrderNumber] = useState(null);
    const [joining, setJoining] = useState(false);
    const [purchasing, setPurchasing] = useState(null);
    const [purchaseSuccess, setPurchaseSuccess] = useState(null);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);

    // Match vendor by ID (handle both string and number IDs)
    const vendor = vendors.find(v => String(v.id) === String(vendorId));
    
    // Debug: Check what vendorId values services have
    const servicesVendorIds = services.slice(0, 5).map(s => ({ 
        id: s.id, 
        title: s.title, 
        vendorId: s.vendorId,
        vendorid: s.vendorid,
        vendorIdType: typeof s.vendorId,
        vendorIdString: String(s.vendorId || s.vendorid || '')
    }));
    
    console.log('🔍 VendorMenu Debug:', {
        vendorIdParam: vendorId,
        vendorIdType: typeof vendorId,
        vendor: vendor ? {
            id: vendor.id,
            idType: typeof vendor.id,
            name: vendor.name,
            vendorId: vendor.vendorId,
            vendorid: vendor.vendorid,
            gsi2sk: vendor.gsi2sk,
            allKeys: Object.keys(vendor)
        } : null,
        firstFewServicesVendorIds: servicesVendorIds,
        servicesCount: services.length,
        allServices: services
    });
    
    // Simple, direct filter - match vendorId exactly
    const vendorServices = services.filter(s => {
        const serviceVendorId = String(s.vendorId || s.vendorid || '').trim();
        const matchVendorId = String(vendorId || '').trim();
        const matchVendorObjId = String(vendor?.id || '').trim();
        
        // Debug first few comparisons
        const isFirstFew = services.indexOf(s) < 3;
        if (isFirstFew) {
            console.log('🔎 Filtering service:', {
                serviceId: s.id,
                serviceTitle: s.title,
                serviceVendorId,
                matchVendorId,
                matchVendorObjId,
                match1: serviceVendorId === matchVendorId,
                match2: serviceVendorId === matchVendorObjId,
                vendorGsi2sk: vendor?.gsi2sk,
                gsi2skExtracted: vendor?.gsi2sk ? vendor.gsi2sk.replace('VENDOR#', '').trim() : null,
                match3: vendor?.gsi2sk ? serviceVendorId === vendor.gsi2sk.replace('VENDOR#', '').trim() : false
            });
        }
        
        // Match against URL parameter
        if (serviceVendorId === matchVendorId) {
            return true;
        }
        
        // Match against vendor.id
        if (serviceVendorId === matchVendorObjId) {
            return true;
        }
        
        // Match against gsi2sk (format: VENDOR#ID)
        if (vendor?.gsi2sk) {
            const gsi2skId = vendor.gsi2sk.replace('VENDOR#', '').trim();
            if (serviceVendorId === gsi2skId) {
                return true;
            }
        }
        
        return false;
    });
    
    console.log('✅ Filtered vendorServices:', {
        count: vendorServices.length,
        services: vendorServices.slice(0, 5).map(s => ({ id: s.id, title: s.title, vendorId: s.vendorId }))
    });
    
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const vendorType = vendor?.vendor_type || vendor?.vendorType;
    const usesCart = vendor?.uses_cart || vendor?.usesCart || false;

    useEffect(() => {
        if (vendorType === 'supermarket' && orders.length > 0) {
            const existingQueueOrder = orders.find(o => 
                o.isQueueOrder && 
                String(o.vendorId) === String(vendorId) &&
                o.status !== 'completed'
            );
            if (existingQueueOrder && !queueOrderId) {
                setQueueOrderId(existingQueueOrder.dbId);
                setQueueOrderNumber(existingQueueOrder.id);
                setQueuePosition(existingQueueOrder.queuePosition || 1);
                setQueueTime(existingQueueOrder.estimatedWait || 5);
            }
        }
    }, [vendorType, orders, vendorId, queueOrderId]);

    const pollQueueStatus = useCallback(async () => {
        if (!queueOrderId) return;
        
        const status = await getQueueStatus(queueOrderId);
        if (status) {
            setQueuePosition(status.queuePosition);
            setQueueTime(status.estimatedWait);
            if (status.status === 'completed') {
                setQueueOrderId(null);
                setQueueOrderNumber(null);
            }
        }
    }, [queueOrderId, getQueueStatus]);

    useEffect(() => {
        if (queueOrderId && vendorType === 'supermarket') {
            pollQueueStatus();
            const interval = setInterval(pollQueueStatus, 30000);
            return () => clearInterval(interval);
        }
    }, [queueOrderId, vendorType, pollQueueStatus]);

    useEffect(() => {
        if (queueTime && queueTime > 0 && queueOrderId) {
            const countdown = setInterval(() => {
                setQueueTime(prev => Math.max(0, prev - 1));
            }, 60000);
            return () => clearInterval(countdown);
        }
    }, [queueOrderId, queueTime]);

    if (!vendor) return <div className="text-white p-10">Vendor not found</div>;

    const handleJoinQueue = async () => {
        if (isGuest) {
            setShowLoginPrompt(true);
            return;
        }
        setJoining(true);
        const result = await joinQueue(vendor.id);
        if (result && result.order) {
            setQueueOrderId(result.order.id);
            setQueueOrderNumber(result.order.order_number);
            setQueuePosition(result.queuePosition);
            setQueueTime(result.estimatedWait);
        }
        setJoining(false);
    };

    const handleLogin = () => {
        setShowLoginPrompt(false);
        connectWallet();
    };

    if (vendorType === 'supermarket') {
        return (
            <div className="pb-20">
                <div className="mb-8 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/client')}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm uppercase tracking-widest">Back</span>
                    </button>
                </div>

                <div className="mb-12 text-center">
                    <h2 className="text-4xl md:text-5xl font-bold font-serif text-gradient-gold tracking-widest uppercase">{vendor.name}</h2>
                    <p className="text-gray-400 text-sm mt-2 tracking-widest uppercase">{vendor.type}</p>
                    <div className="w-[1px] h-16 bg-gradient-to-b from-[#FFD700] to-transparent mx-auto mt-6" />
                </div>

                <div className="max-w-md mx-auto">
                    {queueOrderId ? (
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-[#050505] border border-[#FFD700] p-8 text-center"
                        >
                            <CheckCircle className="w-16 h-16 text-[#FFD700] mx-auto mb-6" />
                            <h3 className="text-2xl font-serif text-white mb-2">You're in the Queue!</h3>
                            <p className="text-gray-400 mb-6">Order #{queueOrderNumber}</p>
                            
                            <div className="mb-6 p-4 bg-black/50 border border-[#333]">
                                <div className="flex items-center justify-center gap-2 text-[#FFD700] mb-2">
                                    <Timer className="w-5 h-5" />
                                    <span className="text-3xl font-bold">{queueTime} min</span>
                                </div>
                                <p className="text-gray-500 text-xs uppercase tracking-widest">
                                    Position #{queuePosition}
                                </p>
                            </div>

                            <p className="text-gray-500 text-xs">
                                We'll update your position as orders are processed
                            </p>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-[#050505] border border-[#222] p-8 text-center"
                        >
                            <Users className="w-16 h-16 text-[#FFD700] mx-auto mb-6" />
                            <h3 className="text-2xl font-serif text-white mb-4">Virtual Queue</h3>
                            <p className="text-gray-400 mb-6">Skip the line! Join our virtual queue and we'll notify you when it's your turn.</p>
                            
                            <div className="mb-6 p-4 bg-black/50 border border-[#333]">
                                <p className="text-gray-500 text-xs uppercase tracking-widest">
                                    Avg. service time: ~{vendor.avg_service_time || 5} min per person
                                </p>
                            </div>

                            <button
                                onClick={handleJoinQueue}
                                disabled={joining}
                                className="w-full bg-[#FFD700] text-black py-4 text-sm tracking-[0.3em] font-bold uppercase hover:bg-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <Users className="w-5 h-5" />
                                {joining ? 'Joining...' : 'Join Queue'}
                            </button>
                        </motion.div>
                    )}
                </div>

                {showLoginPrompt && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowLoginPrompt(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[#0a0a0a] border border-[#FFD700]/30 p-8 max-w-md w-full text-center"
                        >
                            <LogIn className="w-16 h-16 text-[#FFD700] mx-auto mb-6" />
                            <h3 className="text-2xl font-serif text-white mb-4">Login Required</h3>
                            <p className="text-gray-400 mb-6">
                                Please sign in to join the queue and get your digital pass.
                            </p>
                            <button
                                onClick={handleLogin}
                                className="w-full bg-[#FFD700] text-black py-4 text-sm tracking-[0.3em] font-bold uppercase hover:bg-white transition-colors flex items-center justify-center gap-2"
                            >
                                <LogIn className="w-5 h-5" />
                                Sign In / Register
                            </button>
                            <button
                                onClick={() => setShowLoginPrompt(false)}
                                className="w-full mt-3 text-gray-500 hover:text-white py-2 text-xs uppercase tracking-widest transition-colors"
                            >
                                Cancel
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </div>
        );
    }

    const handleDirectPurchase = async (serviceId) => {
        if (isGuest) {
          setShowLoginPrompt(true);
          return;
        }
        
        setPurchasing(serviceId);
        const result = await purchaseDirectly(serviceId, vendorId);
        setPurchasing(null);
        
        // Manejar error de pago
        if (result?.error) {
          alert(`Error: ${result.error}`);
          return;
        }
        
        if (result) {
          setPurchaseSuccess(serviceId);
          
          // Si hubo pago crypto, mostrar mensaje especial
          if (result.paymentTxHash) {
            console.log('🎉 Compra con crypto exitosa! TxHash:', result.paymentTxHash);
          }
          
          setTimeout(() => setPurchaseSuccess(null), 3000);
        }
      };

    const handleAddToCart = (serviceId) => {
        if (isGuest) {
            setShowLoginPrompt(true);
            return;
        }
        addToCart(serviceId);
    };

    const buttonText = usesCart ? 'Add to Cart' : 'Get Ticket';
    const ButtonIcon = usesCart ? Plus : Ticket;

    return (
        <div className="pb-20">
            <div className="mb-8 flex items-center justify-between">
                <button
                    onClick={() => navigate('/client')}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm uppercase tracking-widest">Back</span>
                </button>

                {usesCart && (
                    <button
                        onClick={() => navigate('/client/cart')}
                        className="relative flex items-center gap-3 bg-[#FFD700] text-black px-6 py-3 hover:bg-white transition-colors"
                    >
                        <ShoppingCart className="w-5 h-5" />
                        <span className="text-sm font-bold uppercase tracking-widest">Cart</span>
                        {cartCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-black text-[#FFD700] w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                                {cartCount}
                            </span>
                        )}
                    </button>
                )}
            </div>

            <div className="mb-12 text-center">
                <h2 className="text-4xl md:text-5xl font-bold font-serif text-gradient-gold tracking-widest uppercase">{vendor.name}</h2>
                <p className="text-gray-400 text-sm mt-2 tracking-widest uppercase">{vendor.type}</p>
                <div className="w-[1px] h-16 bg-gradient-to-b from-[#FFD700] to-transparent mx-auto mt-6" />
                {usesCart && (
                    <p className="text-gray-500 text-xs mt-4 tracking-widest uppercase">
                        Add multiple services to your cart
                    </p>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                {vendorServices.map((service, index) => (
                    <motion.div
                        key={service.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="group relative bg-[#050505] border border-[#222] hover:border-[#FFD700] transition-colors duration-700"
                    >
                        <div className="h-56 overflow-hidden relative grayscale group-hover:grayscale-0 transition-all duration-1000">
                            <img
                                src={service.image}
                                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-[2s]"
                                alt={service.title}
                            />
                            <div className="absolute inset-0 bg-black/20" />
                            
                            {service.price > 0 && (
                                <div className="absolute top-4 right-4 bg-black/80 border border-[#FFD700] px-3 py-1">
                                    <span className="text-[#FFD700] text-sm font-bold">${service.price}</span>
                                </div>
                            )}
                        </div>

                        <div className="p-6">
                            <div className="mb-4 flex items-center gap-2 text-[#FFD700] text-xs font-bold uppercase tracking-[0.2em]">
                                <Clock className="w-3 h-3" />
                                <span>{service.avgTime} Min</span>
                            </div>

                            <h3 className="text-xl font-serif text-white mb-2">{service.title}</h3>
                            <p className="text-[#666] text-xs uppercase tracking-widest mb-6">
                                {service.totalStock - service.sold} available
                            </p>

                            {purchaseSuccess === service.id ? (
                                <div className="w-full bg-green-600 text-white py-3 text-xs tracking-[0.3em] font-bold uppercase flex items-center justify-center gap-2">
                                    <CheckCircle className="w-4 h-4" />
                                    Ticket Purchased!
                                </div>
                            ) : (
                                <button
                                    onClick={() => usesCart ? handleAddToCart(service.id) : handleDirectPurchase(service.id)}
                                    disabled={service.totalStock - service.sold <= 0 || purchasing === service.id}
                                    className="w-full bg-[#FFD700] text-black py-3 text-xs tracking-[0.3em] font-bold uppercase hover:bg-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ButtonIcon className="w-4 h-4" />
                                    {service.totalStock - service.sold <= 0 ? 'SOLD OUT' : 
                                     purchasing === service.id ? 'Processing...' : buttonText}
                                </button>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>

            {showLoginPrompt && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                    onClick={() => setShowLoginPrompt(false)}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={e => e.stopPropagation()}
                        className="bg-[#0a0a0a] border border-[#FFD700]/30 p-8 max-w-md w-full text-center"
                    >
                        <LogIn className="w-16 h-16 text-[#FFD700] mx-auto mb-6" />
                        <h3 className="text-2xl font-serif text-white mb-4">Login Required</h3>
                        <p className="text-gray-400 mb-6">
                            Please sign in to purchase tickets and access your digital passes.
                        </p>
                        <button
                            onClick={handleLogin}
                            className="w-full bg-[#FFD700] text-black py-4 text-sm tracking-[0.3em] font-bold uppercase hover:bg-white transition-colors flex items-center justify-center gap-2"
                        >
                            <LogIn className="w-5 h-5" />
                            Sign In / Register
                        </button>
                        <button
                            onClick={() => setShowLoginPrompt(false)}
                            className="w-full mt-3 text-gray-500 hover:text-white py-2 text-xs uppercase tracking-widest transition-colors"
                        >
                            Cancel
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </div>
    );
};

export default VendorMenu;
