import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, Save, Edit2, Wallet, Copy, Check, ExternalLink, Shield } from 'lucide-react';
import { useWallets } from '@privy-io/react-auth';

const Profile = () => {
    const { user, updateUserProfile } = useAuth();
    const { wallets } = useWallets();
    const [isEditing, setIsEditing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [formData, setFormData] = useState({
        fullName: user?.profile?.fullName || '',
        email: user?.profile?.email || '',
        phone: user?.profile?.phone || '',
        location: user?.profile?.location || ''
    });

    const wallet = wallets && wallets.length > 0 ? wallets[0] : null;
    const walletAddress = wallet?.address;

    const handleSave = () => {
        updateUserProfile(formData);
        setIsEditing(false);
    };

    const copyAddress = () => {
        if (walletAddress) {
            navigator.clipboard.writeText(walletAddress);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="pb-20 max-w-2xl mx-auto">
            <div className="mb-12 text-center">
                <h2 className="text-4xl md:text-5xl font-bold font-serif text-gradient-gold tracking-widest uppercase">My Profile</h2>
                <div className="w-[1px] h-16 bg-gradient-to-b from-[#FFD700] to-transparent mx-auto mt-6" />
                <p className="text-gray-400 text-sm mt-4 tracking-widest uppercase">Manage your account information</p>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#050505] border border-[#222] p-8"
            >
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FFD700] to-[#B8860B] flex items-center justify-center">
                            <User className="w-8 h-8 text-black" />
                        </div>
                        <div>
                            <p className="text-[#FFD700] font-mono text-sm">{user?.wallet ? user.wallet.substring(0, 16) + '...' : 'No Wallet'}</p>
                            <p className="text-gray-500 text-xs uppercase tracking-widest mt-1">{user?.userType === 'vendor' ? 'Vendor Account' : 'User Account'}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                        className="flex items-center gap-2 px-4 py-2 border border-[#FFD700] text-[#FFD700] hover:bg-[#FFD700] hover:text-black transition-all text-sm uppercase tracking-widest"
                    >
                        {isEditing ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                        {isEditing ? 'Save' : 'Edit'}
                    </button>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 block">Full Name</label>
                        <div className="flex items-center gap-3 bg-black/50 border border-[#333] p-4">
                            <User className="w-5 h-5 text-[#666]" />
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    className="bg-transparent flex-1 text-white outline-none"
                                    placeholder="Enter your full name"
                                />
                            ) : (
                                <span className="text-white">{formData.fullName || 'Not set'}</span>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 block">Email</label>
                        <div className="flex items-center gap-3 bg-black/50 border border-[#333] p-4">
                            <Mail className="w-5 h-5 text-[#666]" />
                            {isEditing ? (
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="bg-transparent flex-1 text-white outline-none"
                                    placeholder="Enter your email"
                                />
                            ) : (
                                <span className="text-white">{formData.email || 'Not set'}</span>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 block">Phone</label>
                        <div className="flex items-center gap-3 bg-black/50 border border-[#333] p-4">
                            <Phone className="w-5 h-5 text-[#666]" />
                            {isEditing ? (
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="bg-transparent flex-1 text-white outline-none"
                                    placeholder="Enter your phone"
                                />
                            ) : (
                                <span className="text-white">{formData.phone || 'Not set'}</span>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 block">Location</label>
                        <div className="flex items-center gap-3 bg-black/50 border border-[#333] p-4">
                            <MapPin className="w-5 h-5 text-[#666]" />
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="bg-transparent flex-1 text-white outline-none"
                                    placeholder="Enter your location"
                                />
                            ) : (
                                <span className="text-white">{formData.location || 'Not set'}</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-[#222]">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Account Type</p>
                    <div className="inline-block px-4 py-2 bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] text-sm uppercase tracking-widest">
                        {user?.userType === 'vendor' ? 'Vendor' : 'User'}
                    </div>
                </div>
            </motion.div>

            {/* Wallet Configuration Section */}
            {!user?.isGuest && wallet && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-[#050505] border border-[#222] p-8 mt-6"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-2xl font-bold font-serif text-gradient-gold tracking-widest uppercase flex items-center gap-2">
                                <Wallet className="w-6 h-6" />
                                Privy Wallet
                            </h3>
                            <p className="text-gray-400 text-xs mt-2 tracking-widest uppercase">
                                Your embedded wallet configuration
                            </p>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 bg-[#FFD700]/10 border border-[#FFD700]/30">
                            <Shield className="w-3 h-3 text-[#FFD700]" />
                            <span className="text-[#FFD700] text-[10px] uppercase tracking-wider font-semibold">Secured</span>
                        </div>
                    </div>

                    {/* Wallet Address */}
                    <div className="mb-6">
                        <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 block">
                            Wallet Address
                        </label>
                        <div className="flex items-center gap-2 bg-black/50 border border-[#333] p-4">
                            <Wallet className="w-5 h-5 text-[#FFD700] flex-shrink-0" />
                            <span className="text-white font-mono text-sm flex-1 break-all">
                                {walletAddress}
                            </span>
                            <button
                                onClick={copyAddress}
                                className="p-2 hover:bg-[#FFD700]/10 transition-colors flex-shrink-0"
                                title="Copy address"
                            >
                                {copied ? (
                                    <Check className="w-4 h-4 text-green-400" />
                                ) : (
                                    <Copy className="w-4 h-4 text-gray-400" />
                                )}
                            </button>
                            <a
                                href={`https://explorer.movementnetwork.xyz/account/${walletAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-[#FFD700]/10 transition-colors flex-shrink-0"
                                title="View on explorer"
                            >
                                <ExternalLink className="w-4 h-4 text-gray-400" />
                            </a>
                        </div>
                    </div>

                    {/* Wallet Features */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="p-4 bg-black/30 border border-[#333]">
                            <div className="flex items-center gap-2 mb-2">
                                <Shield className="w-4 h-4 text-green-400" />
                                <span className="text-xs font-bold text-white uppercase tracking-wider">Auto-Managed</span>
                            </div>
                            <p className="text-[10px] text-gray-500">
                                Privy manages your keys securely
                            </p>
                        </div>

                        <div className="p-4 bg-black/30 border border-[#333]">
                            <div className="flex items-center gap-2 mb-2">
                                <Wallet className="w-4 h-4 text-blue-400" />
                                <span className="text-xs font-bold text-white uppercase tracking-wider">Embedded</span>
                            </div>
                            <p className="text-[10px] text-gray-500">
                                No browser extension needed
                            </p>
                        </div>

                        <div className="p-4 bg-black/30 border border-[#333]">
                            <div className="flex items-center gap-2 mb-2">
                                <Check className="w-4 h-4 text-[#FFD700]" />
                                <span className="text-xs font-bold text-white uppercase tracking-wider">No Recovery</span>
                            </div>
                            <p className="text-[10px] text-gray-500">
                                No seed phrases to remember
                            </p>
                        </div>
                    </div>

                    {/* Info Box */}
                    <div className="p-4 bg-[#FFD700]/5 border border-[#FFD700]/20">
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-[#FFD700]/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-[#FFD700] text-xs font-bold">i</span>
                            </div>
                            <div>
                                <p className="text-[#FFD700] text-xs font-semibold mb-1">
                                    About Privy Embedded Wallets
                                </p>
                                <p className="text-gray-400 text-[10px] leading-relaxed">
                                    Your wallet is automatically created and managed by Privy. You can use it across any device by simply logging in. 
                                    No need to worry about private keys, seed phrases, or wallet extensions.
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default Profile;
