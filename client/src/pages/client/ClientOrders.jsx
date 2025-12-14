import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, QrCode, ShieldCheck, Package } from 'lucide-react';

const ClientOrders = () => {
    const { orders, services } = useData();
    const [showNFT, setShowNFT] = useState(null);

    const myOrders = orders.filter(o => o.status !== 'archived').sort((a, b) => b.timestamp - a.timestamp);
    const getService = (id) => services.find(s => s.id === id);

    return (
        <div className="space-y-8 pb-24">
            <div className="text-center md:text-left">
                <h2 className="text-2xl font-bold mb-2 font-serif text-white tracking-wide">My Orders</h2>
                <p className="text-xs text-gray-500 uppercase tracking-widest">Active & Past Experiences</p>
            </div>

            {myOrders.length === 0 ? (
                <div className="glass-panel p-16 text-center rounded border border-white/5">
                    <Clock className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-500 font-serif">No active orders.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    <AnimatePresence>
                        {myOrders.map(order => {
                            const isReady = order.status === 'ready';
                            const isCompleted = order.status === 'completed';

                            return (
                                <motion.div
                                    key={order.id}
                                    layout
                                    className={`glass-panel rounded-lg overflow-hidden relative border-t-4 ${isReady ? 'border-green-500' : 'border-yellow-600'}`}
                                >
                                    {/* Background Pattern */}
                                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

                                    <div className="p-6 md:p-8 relative z-10">
                                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                                            <div>
                                                <h3 className="font-bold text-2xl font-serif text-white">Order #{order.id}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-green-500 animate-bounce' : 'bg-yellow-500 animate-pulse'}`} />
                                                    <span className={`text-xs font-bold uppercase tracking-widest ${isReady ? 'text-green-400' : 'text-yellow-500'}`}>
                                                        {isReady ? 'Ready for Pickup' : order.status}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="font-mono text-[10px] text-gray-600 border border-white/5 px-2 py-1 rounded self-start md:self-auto">
                                                {new Date(order.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>

                                        {/* Order Items */}
                                        <div className="mb-6 space-y-3 bg-black/30 p-4 rounded border border-white/5">
                                            <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-widest mb-2">
                                                <Package className="w-3 h-3" />
                                                <span>Items in this order</span>
                                            </div>
                                            {order.items.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-sm">
                                                    <span className="text-white">{item.serviceName}</span>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-gray-500">x{item.quantity}</span>
                                                        <span className="text-[#FFD700] text-xs">{item.avgTime}min</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {order.status === 'pending' && (
                                            <div className="flex items-center gap-4 border-l-2 border-yellow-500/30 pl-4 py-2 bg-yellow-500/5 rounded-r">
                                                <Clock className="w-8 h-8 text-yellow-500" />
                                                <div>
                                                    <p className="text-[10px] text-yellow-500/70 uppercase tracking-widest">Estimated Wait</p>
                                                    <p className="font-bold text-2xl text-white">{order.estimatedWait} <span className="text-sm font-normal text-gray-500">mins</span></p>
                                                </div>
                                            </div>
                                        )}

                                        {isReady && !showNFT && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-center md:text-left py-2"
                                            >
                                                <button
                                                    onClick={() => setShowNFT(order.id)}
                                                    className="w-full md:w-auto btn-premium flex items-center justify-center gap-3 text-xs"
                                                >
                                                    <QrCode className="w-5 h-5" />
                                                    REVEAL ACCESS TOKEN
                                                </button>
                                            </motion.div>
                                        )}

                                        {/* NFT / Token View */}
                                        {showNFT === order.id && (
                                            <motion.div
                                                initial={{ scale: 0.9, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                className="bg-black border border-yellow-500/40 rounded p-6 mt-4 flex flex-col items-center justify-center relative shadow-[0_0_50px_rgba(212,175,55,0.15)]"
                                            >
                                                {/* Holographic effect */}
                                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />

                                                <div className="w-40 h-40 bg-white p-3 rounded mb-4 shadow-2xl">
                                                    <img
                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${order.id}`}
                                                        alt="NFT QR"
                                                        className="w-full h-full"
                                                    />
                                                </div>
                                                <h4 className="text-gradient-gold font-bold text-xl mb-1 font-serif tracking-widest">VERIFIED ASSET</h4>
                                                <p className="text-[10px] text-gray-500 font-mono tracking-widest">{order.id}-{Date.now()}</p>

                                                <div className="mt-4 flex items-center gap-2 text-green-500 text-xs uppercase tracking-widest bg-green-900/20 px-3 py-1 rounded-full border border-green-500/20">
                                                    <ShieldCheck className="w-4 h-4" />
                                                    <span>Blockchain Verified</span>
                                                </div>
                                            </motion.div>
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

export default ClientOrders;
