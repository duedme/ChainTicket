import { useData } from '../../context/DataContext';
import { motion } from 'framer-motion';
import { Clock, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ClientDashboard = () => {
    const { services, createOrder } = useData();
    const navigate = useNavigate();

    const handlePurchase = (id) => {
        createOrder(id);
        navigate('/client/orders');
    };

    return (
        <div className="pb-20">
            <div className="mb-12 text-center">
                <h2 className="text-4xl md:text-5xl font-bold font-serif text-gradient-gold tracking-widest uppercase">The Collection</h2>
                <div className="w-[1px] h-16 bg-gradient-to-b from-[#FFD700] to-transparent mx-auto mt-6" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-6xl mx-auto">
                {services.map((service, index) => (
                    <motion.div
                        key={service.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="group relative bg-[#050505] border border-[#222] hover:border-[#FFD700] transition-colors duration-700"
                    >
                        {/* Image Container - Fixed Height */}
                        <div className="h-64 overflow-hidden relative grayscale group-hover:grayscale-0 transition-all duration-1000">
                            <img
                                src={service.image}
                                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-[2s]"
                                alt={service.title}
                            />
                            <div className="absolute inset-0 bg-black/20" />
                        </div>

                        <div className="p-8 text-center relative">
                            {/* Floating Badge */}
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black border border-[#FFD700] px-4 py-2">
                                <div className="flex items-center gap-2 text-[#FFD700] text-[10px] font-bold uppercase tracking-[0.2em]">
                                    <Clock className="w-3 h-3" />
                                    <span>{service.avgTime} Min Wait</span>
                                </div>
                            </div>

                            <h3 className="text-3xl font-serif text-white mt-4 mb-2">{service.title}</h3>
                            <p className="text-[#666] text-xs uppercase tracking-widest mb-8">
                                {service.totalStock - service.sold} exclusive spots remaining
                            </p>

                            <button
                                onClick={() => handlePurchase(service.id)}
                                disabled={service.totalStock - service.sold <= 0}
                                className="w-full btn-premium py-5 text-xs tracking-[0.3em] group-hover:bg-white group-hover:text-black"
                            >
                                {service.totalStock - service.sold <= 0 ? 'SOLD OUT' : 'SECURE RESERVATION'}
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default ClientDashboard;
