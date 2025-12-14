import { useData } from '../../context/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle, User, Activity } from 'lucide-react';

const AdminDashboard = () => {
    const { orders, setOrders, services } = useData();

    const getServiceInfo = (id) => services.find(s => s.id === id);

    const advanceStatus = (orderId, currentStatus) => {
        setOrders(prev => prev.map(o => {
            if (o.id !== orderId) return o;
            if (currentStatus === 'pending') return { ...o, status: 'ready' };
            if (currentStatus === 'ready') return { ...o, status: 'completed' };
            return o;
        }));
    };

    const activeOrders = orders.filter(o => o.status !== 'completed').sort((a, b) => a.timestamp - b.timestamp);

    return (
        <div className="max-w-7xl mx-auto pb-20">
            <div className="flex items-center justify-between mb-12 border-b border-[#333] pb-6">
                <div>
                    <h2 className="text-4xl font-bold font-serif tracking-wide text-gradient-gold">Concierge Queue</h2>
                    <p className="text-sm uppercase tracking-[0.2em] text-[#888] mt-2">Managing Real-time Requests</p>
                </div>
                <div className="bg-[#111] border border-[#333] px-6 py-3 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-mono text-green-500 uppercase tracking-widest">System Active</span>
                </div>
            </div>

            {activeOrders.length === 0 ? (
                <div className="glass-panel p-32 text-center border border-[#222]">
                    <Clock className="w-20 h-20 text-[#222] mx-auto mb-8" />
                    <h3 className="text-2xl text-[#666] font-serif uppercase tracking-widest">All caught up</h3>
                    <p className="text-[#444] mt-2">Waiting for new requests...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    <AnimatePresence>
                        {activeOrders.map(order => {
                            const service = getServiceInfo(order.serviceId);
                            return (
                                <motion.div
                                    key={order.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="glass-panel p-8 relative overflow-hidden group hover:border-[#FFD700] transition-colors duration-500"
                                >
                                    <div className={`absolute top-0 right-0 p-4`}>
                                        <span className={`text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 border ${order.status === 'ready' ? 'text-green-500 border-green-500' : 'text-[#FFD700] border-[#FFD700]'}`}>
                                            {order.status}
                                        </span>
                                    </div>

                                    <div className="flex items-start gap-6 mb-8 mt-2">
                                        {/* Fixed image size to prevent "giant" images */}
                                        <div className="w-24 h-24 bg-[#111] p-1 border border-[#333]">
                                            <img src={service?.image} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" alt="" />
                                        </div>
                                        <div>
                                            <span className="text-[#444] font-mono text-xs">#{order.id}</span>
                                            <h4 className="font-bold text-2xl font-serif text-white mt-1 leading-none">{service?.title}</h4>
                                            <p className="text-xs text-[#666] mt-2 uppercase tracking-wider">VIP Client</p>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-[#222]">
                                        {order.status === 'pending' && (
                                            <button
                                                onClick={() => advanceStatus(order.id, 'pending')}
                                                className="w-full py-4 bg-[#FFD700] text-black font-bold text-xs uppercase tracking-[0.2em] hover:bg-white transition-colors flex items-center justify-center gap-3"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                                Confirm Ready
                                            </button>
                                        )}
                                        {order.status === 'ready' && (
                                            <button
                                                onClick={() => advanceStatus(order.id, 'ready')}
                                                className="w-full py-4 bg-[#111] text-green-500 border border-green-500/30 font-bold text-xs uppercase tracking-[0.2em] hover:bg-green-900/20 transition-colors flex items-center justify-center gap-3"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                                Close Order
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
