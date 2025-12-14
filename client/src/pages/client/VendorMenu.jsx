import { useData } from '../../context/DataContext';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, Plus, ShoppingCart, ArrowLeft } from 'lucide-react';

const VendorMenu = () => {
    const { vendorId } = useParams();
    const { vendors, services, cart, addToCart } = useData();
    const navigate = useNavigate();

    const vendor = vendors.find(v => v.id === parseInt(vendorId));
    const vendorServices = services.filter(s => s.vendorId === parseInt(vendorId));
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    if (!vendor) return <div className="text-white p-10">Vendor not found</div>;

    return (
        <div className="pb-20">
            {/* Header */}
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
                    <span className="text-sm font-bold uppercase tracking-widest">Cart</span>
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
                        {/* Image Container */}
                        <div className="h-56 overflow-hidden relative grayscale group-hover:grayscale-0 transition-all duration-1000">
                            <img
                                src={service.image}
                                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-[2s]"
                                alt={service.title}
                            />
                            <div className="absolute inset-0 bg-black/20" />
                        </div>

                        <div className="p-6">
                            {/* Time Badge */}
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
                                <Plus className="w-4 h-4" />
                                {service.totalStock - service.sold <= 0 ? 'SOLD OUT' : 'ADD TO CART'}
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default VendorMenu;
