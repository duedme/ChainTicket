import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import AnimatedBackground from '../components/AnimatedBackground';
import logo from '../assets/logo.jpg';
import { Wallet, ArrowRight, User, Building2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const { connectWallet, loading, authenticated, user, ready, needsRegistration, enterAsGuest } = useAuth();
  const navigate = useNavigate();
  const [showGuestOptions, setShowGuestOptions] = useState(false);

  useEffect(() => {
    if (!ready) return;
    
    // Si el usuario ya está logueado, redirigir
    if (user && !user.isGuest && authenticated) {
      if (needsRegistration) {
        navigate('/register');
      } else if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/client');
      }
    }
    
    // Si es guest, redirigir según rol
    if (user && user.isGuest) {
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/client');
      }
    }
  }, [ready, authenticated, user, navigate, needsRegistration]);

  const handleWallet = async () => {
    await connectWallet();
  };

  const handleGuestEntry = (guestType) => {
    enterAsGuest(guestType);
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-[#FFD700] text-xl animate-pulse">Loading...</div>
      </div>
    );
  }

  // ✅ FIX: Si ya está autenticado, mostrar loading mientras redirige
  if (authenticated && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-[#FFD700] text-xl animate-pulse">Redirecting...</div>
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
        {/* Logo and Title */}
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
          <p className="text-[#FFD700] text-xs tracking-[0.6em] uppercase mt-3 font-light">
            Exclusive Access
          </p>
        </div>

        {/* Main Login Button */}
        <motion.button
          onClick={handleWallet}
          disabled={loading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="btn-premium w-full flex items-center justify-center gap-4"
        >
          {loading ? (
            'CONNECTING...'
          ) : (
            <>
              <Wallet className="w-5 h-5" />
              <span className="font-serif">ENTER PORTAL</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </motion.button>
        
        <p className="text-[10px] text-gray-500 mt-6 text-center tracking-widest uppercase">
          Powered by Privy
        </p>

        {/* Divider */}
        <div className="w-full border-t border-[#333] my-6" />

        {/* Guest Options */}
        {!showGuestOptions ? (
          <motion.button
            onClick={() => setShowGuestOptions(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 px-6 border border-[#444] rounded-lg text-gray-400 hover:text-[#FFD700] hover:border-[#FFD700]/50 transition-all flex items-center justify-center gap-3"
          >
            <Eye className="w-4 h-4" />
            <span className="text-sm tracking-wider">CONTINUE AS GUEST</span>
          </motion.button>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-3"
          >
            <p className="text-[10px] text-gray-500 text-center tracking-widest uppercase mb-4">
              Select Guest Mode
            </p>
            
            <motion.button
              onClick={() => handleGuestEntry('client')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 px-6 border border-[#444] rounded-lg text-gray-400 hover:text-[#FFD700] hover:border-[#FFD700]/50 transition-all flex items-center justify-center gap-3"
            >
              <User className="w-4 h-4" />
              <span className="text-sm tracking-wider">BROWSE AS CLIENT</span>
            </motion.button>
            
            <motion.button
              onClick={() => handleGuestEntry('admin')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 px-6 border border-[#444] rounded-lg text-gray-400 hover:text-[#FFD700] hover:border-[#FFD700]/50 transition-all flex items-center justify-center gap-3"
            >
              <Building2 className="w-4 h-4" />
              <span className="text-sm tracking-wider">PREVIEW AS ADMIN</span>
            </motion.button>
            
            <button
              onClick={() => setShowGuestOptions(false)}
              className="w-full text-[10px] text-gray-600 hover:text-gray-400 mt-2"
            >
              Cancel
            </button>
          </motion.div>
        )}

        <p className="text-[9px] text-gray-600 mt-4 text-center">
          Guest data expires after 24 hours
        </p>

        {/* Footer */}
        <div className="absolute bottom-6 text-[10px] text-[#444] tracking-[0.5em] font-mono uppercase">
          Secured by Movement M1
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
