import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, CheckCircle, Loader, AlertTriangle } from 'lucide-react';
import { useMovement } from '../hooks/useMovement';

const CONTRACT_ADDRESS = '0x2339acd68a5b699c8bfefed62febcf497959ca55527227e980c56031b3bfced9';

const PublishOnChainModal = ({ 
  isOpen, 
  onClose, 
  service, 
  onSuccess 
}) => {
  const { createEvent, loading, error, wallet } = useMovement();
  const [step, setStep] = useState('config'); // config | publishing | success | error
  const [eventAddress, setEventAddress] = useState(null);
  const [txHash, setTxHash] = useState(null);
  
  const [config, setConfig] = useState({
    totalTickets: service?.totalStock || 100,
    ticketPrice: (service?.price || 5) * 1000000, // Convert to 6 decimals
    transferable: true,
    resalable: false,
    permanent: false,
    refundable: true,
  });

  const handlePublish = async () => {
    if (!wallet) {
      alert('Wallet not connected');
      return;
    }

    setStep('publishing');
    
    try {
      // Admin registry = contract address (tu wallet)
      const adminRegistry = CONTRACT_ADDRESS;
      // Payment processor = contract address (backend wallet)
      const paymentProcessor = CONTRACT_ADDRESS;
      
      const result = await createEvent(
        adminRegistry,
        service.title,
        service.description || `Ticket for ${service.title}`,
        config.totalTickets,
        config.ticketPrice,
        config.transferable,
        config.resalable,
        config.permanent,
        config.refundable,
        paymentProcessor
      );
      
      console.log('Event created:', result);
      
      // Extract event address from transaction events
      // Por ahora usamos el hash como referencia temporal
      // En producción, parseamos los eventos para obtener el eventAddress real
      const newEventAddress = await extractEventAddress(result.hash);
      
      setEventAddress(newEventAddress);
      setTxHash(result.hash);
      setStep('success');
      
      // Notify parent to save eventAddress
      if (onSuccess) {
        onSuccess(newEventAddress, result.hash);
      }
      
    } catch (err) {
      console.error('Error publishing:', err);
      setStep('error');
    }
  };

  // Helper para extraer event address del resultado
  const extractEventAddress = async (txHash) => {
    try {
      // Esperar un poco para que la tx se indexe
      await new Promise(r => setTimeout(r, 2000));
      
      const response = await fetch(
        `https://testnet.movementnetwork.xyz/v1/transactions/by_hash/${txHash}`
      );
      const tx = await response.json();
      
      // Buscar el evento EventCreated
      const eventCreated = tx.events?.find(e => 
        e.type.includes('ticket::EventCreated')
      );
      
      if (eventCreated?.data?.event_address) {
        return eventCreated.data.event_address;
      }
      
      // Fallback: buscar en changes
      const objectChange = tx.changes?.find(c => 
        c.type === 'write_resource' && 
        c.data?.type?.includes('ticket::Event')
      );
      
      return objectChange?.address || `pending-${txHash}`;
    } catch (err) {
      console.error('Error extracting event address:', err);
      return `pending-${txHash}`;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#111] border border-[#333] rounded-xl max-w-md w-full p-6"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#FFD700]" />
              Publish On-Chain
            </h3>
            <button onClick={onClose} className="text-gray-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step: Config */}
          {step === 'config' && (
            <>
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-black/50 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">Service</p>
                  <p className="font-bold text-white">{service?.title}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 uppercase">Total Tickets</label>
                    <input
                      type="number"
                      value={config.totalTickets}
                      onChange={e => setConfig({...config, totalTickets: parseInt(e.target.value)})}
                      className="w-full bg-black/40 border border-gray-700 p-3 rounded text-white mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase">Price (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={config.ticketPrice / 1000000}
                      onChange={e => setConfig({...config, ticketPrice: parseFloat(e.target.value) * 1000000})}
                      className="w-full bg-black/40 border border-gray-700 p-3 rounded text-white mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={config.transferable}
                      onChange={e => setConfig({...config, transferable: e.target.checked})}
                      className="rounded"
                    />
                    Transferable
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={config.refundable}
                      onChange={e => setConfig({...config, refundable: e.target.checked})}
                      className="rounded"
                    />
                    Refundable
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={config.resalable}
                      onChange={e => setConfig({...config, resalable: e.target.checked})}
                      className="rounded"
                    />
                    Resalable
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={config.permanent}
                      onChange={e => setConfig({...config, permanent: e.target.checked})}
                      className="rounded"
                    />
                    Permanent (reusable)
                  </label>
                </div>

                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-xs text-yellow-400">
                    ⚡ This will create a blockchain event on Movement Network. 
                    Gas fees apply (~0.001 MOVE).
                  </p>
                </div>
              </div>

              <button
                onClick={handlePublish}
                disabled={!wallet}
                className="w-full py-4 bg-[#FFD700] text-black font-bold rounded-lg hover:bg-white transition-colors disabled:opacity-50"
              >
                {wallet ? 'Publish to Blockchain' : 'Connect Wallet First'}
              </button>
            </>
          )}

          {/* Step: Publishing */}
          {step === 'publishing' && (
            <div className="text-center py-8">
              <Loader className="w-12 h-12 text-[#FFD700] animate-spin mx-auto mb-4" />
              <p className="text-white font-bold">Creating Event On-Chain...</p>
              <p className="text-sm text-gray-500 mt-2">Please confirm in your wallet</p>
            </div>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-white font-bold mb-2">Event Published!</p>
              <div className="bg-black/50 p-3 rounded-lg text-left mb-4">
                <p className="text-xs text-gray-500 uppercase mb-1">Event Address</p>
                <p className="text-[#FFD700] text-sm font-mono break-all">{eventAddress}</p>
              </div>
              <a
                href={`https://explorer.movementlabs.xyz/txn/${txHash}?network=custom`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:underline"
              >
                View on Explorer →
              </a>
              <button
                onClick={onClose}
                className="w-full mt-4 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500"
              >
                Done
              </button>
            </div>
          )}

          {/* Step: Error */}
          {step === 'error' && (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-white font-bold mb-2">Publication Failed</p>
              <p className="text-sm text-gray-400 mb-4">{error || 'Unknown error'}</p>
              <button
                onClick={() => setStep('config')}
                className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Try Again
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PublishOnChainModal;
