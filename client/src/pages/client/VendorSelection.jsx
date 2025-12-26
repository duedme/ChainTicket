import { useData } from '../../context/DataContext';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Store, ArrowRight, Users, Utensils, Sparkles, ShoppingCart } from 'lucide-react';

const VendorSelection = () => {
    const { vendors } = useData();
    const navigate = useNavigate();

    const getVendorCTA = (vendor) => {
        const vendorType = vendor.vendor_type || vendor.vendorType;
        switch (vendorType) {
            case 'restaurant_menu':
                return { text: 'View Menu', icon: Utensils };
            case 'supermarket':
                return { text: 'Join Queue', icon: Users };
            case 'spa_beauty':
                return { text: 'Book Service', icon: Sparkles };
            case 'events':
            case 'bar':
            case 'restaurant':
            default:
                return { text: 'View Tickets', icon: ArrowRight };
        }
    };

    return (
        <div className="pb-20">
            <div className="mb-12 text-center">
                <h2 className="text-4xl md:text-5xl font-bold font-serif text-gradient-gold tracking-widest uppercase">Select Establishment</h2>
                <div className="w-[1px] h-16 bg-gradient-to-b from-[#FFD700] to-transparent mx-auto mt-6" />
                <p className="text-gray-400 text-sm mt-4 tracking-widest uppercase">Choose your premium destination</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {vendors.map((vendor, index) => {
                    const cta = getVendorCTA(vendor);
                    const CTAIcon = cta.icon;
                    
                    return (
                        <motion.div
                            key={vendor.id}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.15 }}
                            onClick={() => navigate(`/client/vendor/${vendor.id}`)}
                            className="group relative bg-[#050505] border border-[#222] hover:border-[#FFD700] transition-all duration-500 cursor-pointer overflow-hidden"
                        >
                            <div className="h-72 overflow-hidden relative grayscale group-hover:grayscale-0 transition-all duration-1000">
                                <img
                                    src={vendor.image}
                                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-[2s]"
                                    alt={vendor.name}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

                                <div className="absolute top-4 right-4 bg-black/80 border border-[#FFD700] px-3 py-1">
                                    <span className="text-[#FFD700] text-xs font-bold uppercase tracking-widest">{vendor.type}</span>
                                </div>
                            </div>

                            <div className="p-6 text-center">
                                <h3 className="text-2xl font-serif text-white mb-4">{vendor.name}</h3>

                                <div className="flex items-center justify-center gap-2 text-[#FFD700] group-hover:text-white transition-colors">
                                    <span className="text-xs uppercase tracking-[0.2em]">{cta.text}</span>
                                    <CTAIcon className="w-4 h-4" />
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default VendorSelection;
