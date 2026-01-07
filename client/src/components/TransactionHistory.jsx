import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { 
    ExternalLink, 
    ArrowUpRight, 
    ArrowDownRight, 
    CheckCircle, 
    Clock, 
    XCircle,
    Loader2,
    RefreshCw
} from 'lucide-react';

const TransactionHistory = ({ limit = 10 }) => {
    const { authenticated } = usePrivy();
    const { wallets } = useWallets();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('all'); // 'all', 'sent', 'received'

    const wallet = wallets && wallets.length > 0 ? wallets[0] : null;
    const address = wallet?.address;

    // Mock transaction data for demonstration
    // In production, this would fetch from Movement blockchain
    const mockTransactions = [
        {
            id: '1',
            hash: '0x1234...5678',
            type: 'sent',
            amount: '0.5',
            to: '0xabcd...ef01',
            from: address,
            status: 'confirmed',
            timestamp: Date.now() - 3600000,
            description: 'Ticket Purchase - Event #123'
        },
        {
            id: '2',
            hash: '0x2345...6789',
            type: 'received',
            amount: '1.2',
            to: address,
            from: '0xbcde...f012',
            status: 'confirmed',
            timestamp: Date.now() - 7200000,
            description: 'Refund - Event Cancelled'
        },
        {
            id: '3',
            hash: '0x3456...7890',
            type: 'sent',
            amount: '0.3',
            to: '0xcdef...0123',
            from: address,
            status: 'pending',
            timestamp: Date.now() - 300000,
            description: 'Service Purchase'
        },
        {
            id: '4',
            hash: '0x4567...8901',
            type: 'sent',
            amount: '0.8',
            to: '0xdef0...1234',
            from: address,
            status: 'confirmed',
            timestamp: Date.now() - 14400000,
            description: 'Ticket Transfer'
        },
        {
            id: '5',
            hash: '0x5678...9012',
            type: 'received',
            amount: '2.0',
            to: address,
            from: '0xef01...2345',
            status: 'failed',
            timestamp: Date.now() - 21600000,
            description: 'Failed Transfer'
        }
    ];

    useEffect(() => {
        if (authenticated && address) {
            fetchTransactions();
        }
    }, [authenticated, address, filter]);

    const fetchTransactions = async () => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            let filteredTxs = mockTransactions;
            if (filter !== 'all') {
                filteredTxs = mockTransactions.filter(tx => tx.type === filter);
            }
            setTransactions(filteredTxs.slice(0, limit));
            setLoading(false);
        }, 1000);
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'confirmed':
                return <CheckCircle className="w-4 h-4 text-green-400" />;
            case 'pending':
                return <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />;
            case 'failed':
                return <XCircle className="w-4 h-4 text-red-400" />;
            default:
                return <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'confirmed':
                return 'border-green-500/30 bg-green-500/5';
            case 'pending':
                return 'border-yellow-500/30 bg-yellow-500/5';
            case 'failed':
                return 'border-red-500/30 bg-red-500/5';
            default:
                return 'border-gray-500/30 bg-gray-500/5';
        }
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 3600000) { // Less than 1 hour
            const minutes = Math.floor(diff / 60000);
            return `${minutes}m ago`;
        } else if (diff < 86400000) { // Less than 1 day
            const hours = Math.floor(diff / 3600000);
            return `${hours}h ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    const formatHash = (hash) => {
        return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
    };

    if (!authenticated || !wallet) {
        return (
            <div className="glass-panel p-8 text-center border border-[#333]">
                <p className="text-gray-500">Connect your wallet to view transaction history</p>
            </div>
        );
    }

    return (
        <div className="glass-panel p-6 border-t-2 border-t-[#FFD700]">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-white font-serif text-xl mb-1">Transaction History</h3>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                        Powered by Privy Wallet
                    </p>
                </div>
                <button
                    onClick={fetchTransactions}
                    disabled={loading}
                    className="p-2 hover:bg-[#FFD700]/10 rounded transition-colors"
                    title="Refresh"
                >
                    <RefreshCw className={`w-4 h-4 text-[#FFD700] ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 text-xs uppercase tracking-widest transition-colors rounded ${
                        filter === 'all'
                            ? 'bg-[#FFD700] text-black font-bold'
                            : 'bg-black/50 text-gray-400 hover:text-white border border-[#333]'
                    }`}
                >
                    All
                </button>
                <button
                    onClick={() => setFilter('sent')}
                    className={`px-4 py-2 text-xs uppercase tracking-widest transition-colors rounded ${
                        filter === 'sent'
                            ? 'bg-[#FFD700] text-black font-bold'
                            : 'bg-black/50 text-gray-400 hover:text-white border border-[#333]'
                    }`}
                >
                    Sent
                </button>
                <button
                    onClick={() => setFilter('received')}
                    className={`px-4 py-2 text-xs uppercase tracking-widest transition-colors rounded ${
                        filter === 'received'
                            ? 'bg-[#FFD700] text-black font-bold'
                            : 'bg-black/50 text-gray-400 hover:text-white border border-[#333]'
                    }`}
                >
                    Received
                </button>
            </div>

            {/* Transaction List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin" />
                </div>
            ) : transactions.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-gray-500 text-sm">No transactions found</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <AnimatePresence>
                        {transactions.map((tx, index) => (
                            <motion.div
                                key={tx.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ delay: index * 0.05 }}
                                className={`p-4 border rounded hover:border-[#FFD700] transition-colors ${getStatusColor(tx.status)}`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    {/* Left: Icon and Info */}
                                    <div className="flex items-start gap-3 flex-1">
                                        {/* Type Icon */}
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                            tx.type === 'sent' 
                                                ? 'bg-red-500/20 border border-red-500/30' 
                                                : 'bg-green-500/20 border border-green-500/30'
                                        }`}>
                                            {tx.type === 'sent' ? (
                                                <ArrowUpRight className="w-5 h-5 text-red-400" />
                                            ) : (
                                                <ArrowDownRight className="w-5 h-5 text-green-400" />
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-white text-sm font-semibold">
                                                    {tx.type === 'sent' ? 'Sent' : 'Received'}
                                                </p>
                                                {getStatusIcon(tx.status)}
                                            </div>
                                            <p className="text-gray-400 text-xs mb-2">{tx.description}</p>
                                            <div className="flex items-center gap-2">
                                                <a
                                                    href={`https://explorer.movementnetwork.xyz/txn/${tx.hash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[#FFD700] text-xs font-mono hover:underline flex items-center gap-1"
                                                >
                                                    {formatHash(tx.hash)}
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                                <span className="text-gray-600 text-xs">•</span>
                                                <span className="text-gray-500 text-xs">{formatTime(tx.timestamp)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Amount */}
                                    <div className="text-right">
                                        <p className={`text-lg font-bold font-mono ${
                                            tx.type === 'sent' ? 'text-red-400' : 'text-green-400'
                                        }`}>
                                            {tx.type === 'sent' ? '-' : '+'}{tx.amount} MOVE
                                        </p>
                                        <p className="text-[10px] text-gray-600 uppercase tracking-wider mt-1">
                                            {tx.status}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Footer Note */}
            <div className="mt-6 pt-6 border-t border-[#333]">
                <p className="text-center text-[10px] text-gray-600 uppercase tracking-widest">
                    🔒 All transactions signed with Privy Embedded Wallet
                </p>
            </div>
        </div>
    );
};

export default TransactionHistory;

