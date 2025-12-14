import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, ShoppingBag, Clock, ShoppingCart } from 'lucide-react';
import AnimatedBackground from '../../components/AnimatedBackground';
import logo from '../../assets/logo.jpg';

const ClientLayout = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path;

    return (
        <div className="min-h-screen relative text-white selection:bg-[#FFD700] selection:text-black">
            <AnimatedBackground />

            {/* Premium Minimal Header */}
            <div className="sticky top-0 z-50 px-8 py-6 flex justify-between items-center bg-gradient-to-b from-black via-black/90 to-transparent">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-[#FFD700]/50">
                        <img src={logo} className="w-full h-full object-cover" />
                    </div>
                    <h1 className="hidden md:block text-xl font-bold text-[#FFD700] tracking-[0.2em] uppercase font-serif">Chain Ticket</h1>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden sm:flex flex-col items-end">
                        <p className="text-[10px] text-[#888] uppercase tracking-widest">Logged in as</p>
                        <p className="text-xs font-bold text-[#FFD700] font-mono">{user?.wallet ? user.wallet.substring(0, 8) + '...' : 'Guest'}</p>
                    </div>
                    <button onClick={handleLogout} className="text-xs uppercase tracking-widest text-[#666] hover:text-white transition-colors">
                        Exit
                    </button>
                </div>
            </div>

            <main className="p-6 md:p-12 max-w-7xl mx-auto min-h-[80vh]">
                <Outlet />
            </main>

            {/* Luxury Bottom Nav for Mobile */}
            <div className="fixed bottom-0 left-0 w-full h-20 bg-black border-t border-[#222] flex justify-around items-center z-50 md:hidden">
                <Link
                    to="/client"
                    className={`flex flex-col items-center gap-1 transition-all ${isActive('/client') ? 'text-[#FFD700]' : 'text-[#444]'}`}
                >
                    <ShoppingBag className="w-5 h-5" />
                    <span className="text-[9px] uppercase font-bold tracking-[0.2em] mt-2">Catalog</span>
                </Link>
                <div className="w-[1px] h-8 bg-[#222]" />
                <Link
                    to="/client/orders"
                    className={`flex flex-col items-center gap-1 transition-all ${isActive('/client/orders') ? 'text-[#FFD700]' : 'text-[#444]'}`}
                >
                    <Clock className="w-5 h-5" />
                    <span className="text-[9px] uppercase font-bold tracking-[0.2em] mt-2">Wallet</span>
                </Link>
            </div>
        </div>
    );
};

export default ClientLayout;
