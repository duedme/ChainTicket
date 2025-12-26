import { useData } from '../../context/DataContext';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, Plus, ShoppingCart, ArrowLeft, Users, Ticket, Timer, CheckCircle } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

const VendorMenu = () => {
    const { vendorId } = useParams();
    const { vendors, services, cart, addToCart, joinQueue, getQueueStatus, orders } = useData();
    const navigate = useNavigate();
    const [queueTime, setQueueTime] = useState(null);
    const [queuePosition, setQueuePosition] = useState(null);
    const [queueOrderId, setQueueOrderId] = useState(null);
    const [queueOrderNumber, setQueueOrderNumber] = useState(null);
    const [joining, setJoining] = useState(false);

    const vendor = vendors.find(v => v.id === parseInt(vendorId));
    const vendorServices = services.filter(s => s.vendorId === parseInt(vendorId));
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const vendorType = vendor?.vendor_type || vendor?.vendorType;

    useEffect(() => {
        if (vendorType === 'supermarket' && orders.length > 0) {
            const existingQueueOrder = orders.find(o => 
                o.isQueueOrder && 
                o.vendorId === parseInt(vendorId) &&
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
            </div>
        );
    }

    const isMenuBased = vendorType === 'restaurant_menu';
    const buttonText = isMenuBased ? 'Add to Order' : 'Get Ticket';
    const ButtonIcon = isMenuBased ? Plus : Ticket;

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

                <button
                    onClick={() => navigate('/client/cart')}
                    className="relative flex items-center gap-3 bg-[#FFD700] text-black px-6 py-3 hover:bg-white transition-colors"
                >
                    <ShoppingCart className="w-5 h-5" />
                    <span className="text-sm font-bold uppercase tracking-widest">
                        {isMenuBased ? 'Order' : 'Cart'}
                    </span>
                    {cartCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-black text-[#FFD700] w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                            {cartCount}
                        </span>
                    )}
                </button>
            </div>

            <div className="mb-12 text-center">
                <h2 className="text-4xl md:text-5xl font-bold font-serif text-gradient-gold tracking-widest uppercase">{vendor.name}</h2>
                <p className="text-gray-400 text-sm mt-2 tracking-widest uppercase">{vendor.type}</p>
                <div className="w-[1px] h-16 bg-gradient-to-b from-[#FFD700] to-transparent mx-auto mt-6" />
                {isMenuBased && (
                    <p className="text-gray-500 text-xs mt-4 tracking-widest uppercase">
                        Add items to your order - one ticket per order
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

                            <button
                                onClick={() => addToCart(service.id)}
                                disabled={service.totalStock - service.sold <= 0}
                                className="w-full bg-[#FFD700] text-black py-3 text-xs tracking-[0.3em] font-bold uppercase hover:bg-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ButtonIcon className="w-4 h-4" />
                                {service.totalStock - service.sold <= 0 ? 'SOLD OUT' : buttonText}
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default VendorMenu;
