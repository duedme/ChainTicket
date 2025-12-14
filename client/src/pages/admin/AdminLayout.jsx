import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, LayoutDashboard, ListPlus, Shield } from 'lucide-react';
import AnimatedBackground from '../../components/AnimatedBackground';

const AdminLayout = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path;

    return (
        <div className="min-h-screen relative text-white flex flex-col">
            <AnimatedBackground />

            {/* Premium Navbar */}
            <div className="glass-panel sticky top-0 z-50 px-6 py-4 flex justify-between items-center border-b border-white/5">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded border border-yellow-500/30 flex items-center justify-center bg-black/50">
                        <Shield className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold tracking-[0.1em] text-gradient-gold">ADMIN DASHBOARD</h1>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">Management Console</p>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#94a3b8] hover:text-white transition-colors border border-transparent hover:border-white/10 px-4 py-2 rounded"
                >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                </button>
            </div>

            <div className="flex flex-1">
                {/* Sidebar */}
                <aside className="w-64 hidden md:flex flex-col border-r border-white/5 bg-black/20 pt-8">
                    <nav className="space-y-2 px-4">
                        <Link
                            to="/admin"
                            className={`flex items-center gap-3 px-4 py-4 rounded transition-all group ${isActive('/admin') ? 'bg-yellow-500/10 border-l-2 border-yellow-500 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                        >
                            <LayoutDashboard className={`w-5 h-5 ${isActive('/admin') ? 'text-yellow-500' : 'group-hover:text-yellow-500 transition-colors'}`} />
                            <span className="text-sm tracking-wide font-medium">Overview</span>
                        </Link>
                        <Link
                            to="/admin/services"
                            className={`flex items-center gap-3 px-4 py-4 rounded transition-all group ${isActive('/admin/services') ? 'bg-yellow-500/10 border-l-2 border-yellow-500 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                        >
                            <ListPlus className={`w-5 h-5 ${isActive('/admin/services') ? 'text-yellow-500' : 'group-hover:text-yellow-500 transition-colors'}`} />
                            <span className="text-sm tracking-wide font-medium">Services</span>
                        </Link>
                    </nav>
                </aside>

                {/* Content */}
                <main className="flex-1 p-6 md:p-10 pt-8 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
