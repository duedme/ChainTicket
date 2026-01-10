import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Copy, Check, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { usePrivy, useWallets } from '@privy-io/react-auth';

const WalletWidget = ({ compact = false }) => {
    const { authenticated } = usePrivy();
    const { wallets } = useWallets();
    const [copied, setCopied] = useState(false);
    const [showFull, setShowFull] = useState(false);
    const [balance, setBalance] = useState(null);
    const [loadingBalance, setLoadingBalance] = useState(false);

    const wallet = wallets && wallets.length > 0 ? wallets[0] : null;
    const address = wallet?.address;

    useEffect(() => {
        if (address) {
            fetchBalance();
            // Refresh balance every 30 seconds
            const interval = setInterval(fetchBalance, 30000);
            return () => clearInterval(interval);
        }
    }, [address]);

    const fetchBalance = async () => {
        if (!address) return;
        setLoadingBalance(true);
        try {
          // Llamar a balanceOf de USDC en Base Sepolia
          const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
          const balanceOfSelector = '0x70a08231'; // balanceOf(address)
          const paddedAddress = address.slice(2).padStart(64, '0');
          
          const response = await fetch('https://sepolia.base.org', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_call',
              params: [{
                to: USDC_ADDRESS,
                data: balanceOfSelector + paddedAddress
              }, 'latest'],
              id: 1
            })
          });
          
          const data = await response.json();
          if (data.result) {
            const balanceWei = parseInt(data.result, 16);
            const balanceUSDC = (balanceWei / 1e6).toFixed(2); // USDC tiene 6 decimales
            setBalance(balanceUSDC);
          }
        } catch (error) {
          console.error('Error fetching USDC balance:', error);
          setBalance('0.00');
        } finally {
          setLoadingBalance(false);
        }
      };

    const copyAddress = () => {
        if (address) {
            navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const formatAddress = (addr) => {
        if (!addr) return '';
        return showFull ? addr : `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    if (!authenticated || !wallet) {
        return null;
    }

    if (compact) {
        return (
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-3 py-2 bg-black/50 border border-[#333] hover:border-[#FFD700] transition-colors rounded"
            >
                <Wallet className="w-4 h-4 text-[#FFD700]" />
                <span className="text-white text-sm font-mono">{formatAddress(address)}</span>
                <button
                    onClick={copyAddress}
                    className="text-gray-400 hover:text-[#FFD700] transition-colors"
                >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel p-6 border-t-2 border-t-[#FFD700]"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#FFD700]/10 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-[#FFD700]" />
                    </div>
                    <div>
                        <h3 className="text-white font-serif text-lg">Privy Wallet</h3>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">Embedded Wallet</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/30 rounded">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-green-400 text-[10px] uppercase tracking-wider">Active</span>
                </div>
            </div>

            {/* Balance */}
            <div className="mb-6 p-4 bg-black/50 border border-[#333] rounded">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Balance</p>
                <div className="flex items-baseline gap-2">
                    {loadingBalance ? (
                        <div className="text-2xl text-gray-400 animate-pulse">Loading...</div>
                    ) : (
                        <>
                            <span className="text-3xl font-bold text-white">{balance || '0.00'}</span>
                            <span className="text-gray-500 text-sm">USDC</span>
                        </>
                    )}
                </div>
                <p className="text-[10px] text-gray-600 mt-1">Base Sepolia</p>
            </div>

            {/* Address */}
            <div className="mb-4">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Wallet Address</p>
                <div className="flex items-center gap-2 bg-black/50 border border-[#333] p-3 rounded">
                    <span className="text-white font-mono text-sm flex-1 break-all">
                        {formatAddress(address)}
                    </span>
                    <button
                        onClick={() => setShowFull(!showFull)}
                        className="text-gray-400 hover:text-[#FFD700] transition-colors"
                        title={showFull ? "Hide full address" : "Show full address"}
                    >
                        {showFull ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={copyAddress}
                        className="text-gray-400 hover:text-[#FFD700] transition-colors"
                        title="Copy address"
                    >
                        <AnimatePresence mode="wait">
                            {copied ? (
                                <motion.div
                                    key="check"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0 }}
                                >
                                    <Check className="w-4 h-4 text-green-400" />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="copy"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0 }}
                                >
                                    <Copy className="w-4 h-4" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </button>
                </div>
            </div>

            {/* Info Badge */}
            <div className="flex items-start gap-2 p-3 bg-[#FFD700]/5 border border-[#FFD700]/20 rounded">
                <div className="w-5 h-5 rounded-full bg-[#FFD700]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[#FFD700] text-xs">ℹ</span>
                </div>
                <div>
                    <p className="text-[#FFD700] text-xs font-semibold mb-1">Secured by Privy</p>
                    <p className="text-gray-400 text-[10px] leading-relaxed">
                        Your wallet is managed automatically. No need to remember private keys or seed phrases.
                    </p>
                </div>
            </div>

            {/* Explorer Link */}
            {address && (
                <a
                    href={`https://explorer.movementnetwork.xyz/account/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 flex items-center justify-center gap-2 text-[#FFD700] hover:text-[#B8860B] text-xs uppercase tracking-widest transition-colors"
                >
                    <span>View on Explorer</span>
                    <ExternalLink className="w-3 h-3" />
                </a>
            )}
        </motion.div>
    );
};

export default WalletWidget;

