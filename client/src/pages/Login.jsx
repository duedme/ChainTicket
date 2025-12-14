import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import AnimatedBackground from '../components/AnimatedBackground';
import logo from '../assets/logo.jpg';
import { Wallet, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const { login, connectWallet, loading, authenticated, user, ready } = useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (ready && authenticated && user) {
            navigate('/client');
        }
    }, [ready, authenticated, user, navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        const success = await login(username, password);
        if (success) {
            if (username === 'admin') navigate('/admin');
            else navigate('/client');
        } else {
            setError('Credenciales inválidas');
        }
    };

    const handleWallet = async () => {
        await connectWallet();
    };

    if (!ready) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="text-[#FFD700] text-xl animate-pulse">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
            <AnimatedBackground />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                className="glass-panel w-full max-w-[500px] p-10 md:p-14 relative z-10 flex flex-col items-center border-t-2 border-t-[#FFD700]"
            >
                <div className="relative mb-12 text-center group">
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.8 }}
                        className="w-48 h-48 md:w-56 md:h-56 mx-auto mb-6 relative"
                    >
                        <div className="absolute inset-0 bg-[#FFD700] rounded-full blur-[40px] opacity-20 animate-pulse" />
                        <img
                            src={logo}
                            alt="Chain Ticket Logo"
                            className="w-full h-full object-cover rounded-full border border-[#FFD700]/30 shadow-2xl relative z-10"
                        />
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-4xl md:text-5xl font-bold text-gradient-gold font-serif tracking-widest uppercase"
                    >
                        Chain Ticket
                    </motion.h1>
                    <p className="text-[#FFD700] text-xs tracking-[0.6em] uppercase mt-3 font-light">Exclusive Access</p>
                </div>

                <form onSubmit={handleLogin} className="w-full space-y-8">
                    <div className="space-y-6">
                        <div className="group">
                            <label className="text-[10px] text-[#FFD700] uppercase tracking-[0.2em] mb-2 block font-bold">Identity</label>
                            <input
                                type="text"
                                placeholder="ENTER USERNAME"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="input-premium placeholder:text-gray-600 placeholder:text-sm"
                            />
                        </div>

                        <div className="group">
                            <label className="text-[10px] text-[#FFD700] uppercase tracking-[0.2em] mb-2 block font-bold">Passcode</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-premium placeholder:text-gray-600 placeholder:text-sm"
                            />
                        </div>
                    </div>

                    {error && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-red-500 text-xs text-center uppercase tracking-wider font-bold"
                        >
                            {error}
                        </motion.p>
                    )}

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="btn-premium w-full flex items-center justify-center gap-4 mt-8"
                        disabled={loading}
                    >
                        {loading ? 'AUTHENTICATING...' : (
                            <>
                                <span className="font-serif">ENTER PORTAL</span>
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </motion.button>
                </form>

                <div className="w-full my-10 flex items-center gap-6 opacity-30">
                    <div className="h-[1px] flex-1 bg-[#FFD700]" />
                    <span className="text-[10px] font-mono text-[#FFD700]">*</span>
                    <div className="h-[1px] flex-1 bg-[#FFD700]" />
                </div>

                <motion.button
                    onClick={handleWallet}
                    whileHover={{ borderColor: '#FFD700', color: '#FFD700' }}
                    className="w-full py-4 border border-[#333] hover:bg-[#111] transition-all flex items-center justify-center gap-3 text-sm text-gray-500 uppercase tracking-[0.2em]"
                >
                    <Wallet className="w-4 h-4" />
                    Connect with Privy
                </motion.button>

                <p className="text-[10px] text-gray-600 mt-4 text-center">
                    Email, Wallet, or Social Login
                </p>
            </motion.div>

            <div className="absolute bottom-6 text-[10px] text-[#444] tracking-[0.5em] font-mono uppercase">
                Secured by Movement M1
            </div>
        </div>
    );
};

export default Login;
