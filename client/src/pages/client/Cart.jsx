import { useData } from '../../context/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, Clock } from 'lucide-react';

const Cart = () => {
    const { cart, removeFromCart, updateCartQuantity, createOrderFromCart } = useData();
    const navigate = useNavigate();

    const handleCheckout = () => {
        const order = createOrderFromCart();
        if (order) {
            navigate('/client/orders');
        }
    };

    // Calculate max wait time (based on longest service)
    const maxWaitTime = cart.length > 0
        ? Math.max(...cart.map(item => item.service.avgTime))
        : 0;

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
                <h2 className="text-4xl md:text-5xl font-bold font-serif text-gradient-gold tracking-widest uppercase">Your Cart</h2>
                <div className="w-[1px] h-16 bg-gradient-to-b from-[#FFD700] to-transparent mx-auto mt-6" />
            </div>

            {cart.length === 0 ? (
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
            ) : (
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
                                    <div className="w-24 h-24 bg-[#111] overflow-hidden flex-shrink-0">
                                        <img
                                            src={item.service.image}
                                            className="w-full h-full object-cover"
                                            alt={item.service.title}
                                        />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1">
                                        <h3 className="text-xl font-serif text-white mb-1">{item.service.title}</h3>
                                        <div className="flex items-center gap-2 text-[#FFD700] text-xs">
                                            <Clock className="w-3 h-3" />
                                            <span>{item.service.avgTime} min</span>
                                        </div>
                                    </div>

                                    {/* Quantity Controls */}
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => updateCartQuantity(item.serviceId, item.quantity - 1)}
                                            className="w-8 h-8 border border-[#333] hover:border-[#FFD700] flex items-center justify-center transition-colors"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <span className="text-xl font-bold w-8 text-center">{item.quantity}</span>
                                        <button
                                            onClick={() => updateCartQuantity(item.serviceId, item.quantity + 1)}
                                            className="w-8 h-8 border border-[#333] hover:border-[#FFD700] flex items-center justify-center transition-colors"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Remove */}
                                    <button
                                        onClick={() => removeFromCart(item.serviceId)}
                                        className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* Summary */}
                    <div className="glass-panel p-8 border-t-2 border-t-[#FFD700]">
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-gray-400 uppercase tracking-widest text-sm">Total Items</span>
                            <span className="text-2xl font-bold text-white">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                        </div>

                        <div className="flex items-center justify-between mb-8 pb-6 border-b border-[#222]">
                            <span className="text-gray-400 uppercase tracking-widest text-sm">Estimated Wait Time</span>
                            <div className="flex items-center gap-2 text-[#FFD700]">
                                <Clock className="w-5 h-5" />
                                <span className="text-2xl font-bold">{maxWaitTime} min</span>
                            </div>
                        </div>

                        <button
                            onClick={handleCheckout}
                            className="btn-premium w-full py-5 text-sm"
                        >
                            CONFIRM ORDER
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default Cart;
