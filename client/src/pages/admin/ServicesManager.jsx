// client/src/pages/admin/ServicesManager.jsx
import { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Edit2, Check, X, Clock, Package, Trash2, Power, 
  Calendar, AlertTriangle, Lock, Zap, CheckCircle, Loader 
} from 'lucide-react';
import AIServiceAssistant from '../../components/AIServiceAssistant';
import AIBusinessConsultant from '../../components/AIBusinessConsultant';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x2339acd68a5b699c8bfefed62febcf497959ca55527227e980c56031b3bfced9';

const ServicesManager = () => {
  const { myServices, updateService, addService, deleteService, toggleServiceActive } = useData();
  const { isGuest, connectWallet } = useAuth();

  useEffect(() => {
    console.log('ServicesManager myServices changed:', { count: myServices?.length || 0, services: myServices });
  }, [myServices]);

  const [editingId, setEditingId] = useState(null);
  const [newServiceMode, setNewServiceMode] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [scheduleEditId, setScheduleEditId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    image: '',
    avgTime: '',
    totalStock: '',
    price: '',
    schedule: { openTime: '09:00', closeTime: '18:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] }
  });

  // ========== NUEVO: Estados para Publish On-Chain ==========
  const [publishModalService, setPublishModalService] = useState(null);
  const [publishStep, setPublishStep] = useState('config'); // config | publishing | success | error
  const [publishError, setPublishError] = useState(null);
  const [publishResult, setPublishResult] = useState({ eventAddress: null, txHash: null });
  const [publishConfig, setPublishConfig] = useState({
    totalTickets: 100,
    ticketPrice: 5,
    transferable: true,
    resalable: false,
    permanent: false,
    refundable: true,
  });

  // ========== Handlers existentes ==========
  const handleEdit = (service) => {
    setEditingId(service.id);
    setFormData({
      ...service,
      schedule: service.schedule || { openTime: '09:00', closeTime: '18:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] }
    });
  };

  const handleSave = async () => {
    await updateService(editingId, {
      ...formData,
      avgTime: Number(formData.avgTime),
      totalStock: Number(formData.totalStock),
      price: Number(formData.price) || 0
    });
    setEditingId(null);
    setScheduleEditId(null);
  };

  const handleCreate = async () => {
    await addService({
      title: formData.title,
      image: formData.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2670&auto=format&fit=crop',
      avgTime: Number(formData.avgTime),
      totalStock: Number(formData.totalStock),
      price: Number(formData.price) || 0,
      schedule: formData.schedule
    });
    setNewServiceMode(false);
    setFormData({
      title: '',
      image: '',
      avgTime: '',
      totalStock: '',
      price: '',
      schedule: { openTime: '09:00', closeTime: '18:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] }
    });
  };

  const handleDelete = async (id) => {
    await deleteService(id);
    setDeleteConfirmId(null);
  };

  const toggleDay = (day) => {
    setFormData(prev => {
      const days = prev.schedule.days.includes(day)
        ? prev.schedule.days.filter(d => d !== day)
        : [...prev.schedule.days, day];
      return { ...prev, schedule: { ...prev.schedule, days } };
    });
  };

  // ========== NUEVO: Handlers para Publish On-Chain ==========
  const openPublishModal = (service) => {
    setPublishModalService(service);
    setPublishStep('config');
    setPublishError(null);
    setPublishResult({ eventAddress: null, txHash: null });
    setPublishConfig({
      totalTickets: service.totalStock || 100,
      ticketPrice: service.price || 5,
      transferable: true,
      resalable: false,
      permanent: false,
      refundable: true,
    });
  };

  const closePublishModal = () => {
    setPublishModalService(null);
    setPublishStep('config');
  };

  const handlePublish = async () => {
    setPublishStep('publishing');
    setPublishError(null);
  
    try {
      // Llamar al backend para crear el evento
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/events/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: publishModalService.title,
          description: publishModalService.description || `Tickets for ${publishModalService.title}`,
          totalTickets: publishConfig.totalTickets,
          ticketPrice: publishConfig.ticketPrice,
          transferable: publishConfig.transferable,
          resalable: publishConfig.resalable,
          permanent: publishConfig.permanent,
          refundable: publishConfig.refundable
        })
      });
  
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create event');
      }
  
      console.log('Event created:', result);
  
      setPublishResult({ eventAddress: result.eventAddress, txHash: result.txHash });
      setPublishStep('success');
  
      // Guardar eventAddress en el servicio
      await updateService(publishModalService.id, { eventAddress: result.eventAddress });
  
    } catch (err) {
      console.error('Error publishing:', err);
      setPublishError(err.message || 'Unknown error');
      setPublishStep('error');
    }
  };  

  const extractEventAddress = async (txHash) => {
    try {
      await new Promise(r => setTimeout(r, 2000));

      const response = await fetch(
        `https://testnet.movementnetwork.xyz/v1/transactions/by_hash/${txHash}`
      );
      const tx = await response.json();

      const eventCreated = tx.events?.find(e =>
        e.type.includes('ticket::EventCreated')
      );

      if (eventCreated?.data?.event_address) {
        return eventCreated.data.event_address;
      }

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

  // ========== Render ==========
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Guest Warning */}
      {isGuest && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="text-yellow-400 font-medium">Guest Preview Mode</p>
              <p className="text-sm text-gray-400">You can create services but cannot activate them until you sign in.</p>
            </div>
          </div>
          <button
            onClick={connectWallet}
            className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg text-sm transition-colors"
          >
            Sign In
          </button>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white">My Services</h2>
        <button
          onClick={() => setNewServiceMode(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Service
        </button>
      </div>

      {/* New Service Form */}
      <AnimatePresence>
        {newServiceMode && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass p-6 rounded-xl border-l-4 border-yellow-500 mb-8"
          >
            <h3 className="text-xl font-bold mb-4">New Service</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                placeholder="Title"
                className="bg-black/40 border border-gray-700 p-3 rounded text-white"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
              <input
                placeholder="Image URL"
                className="bg-black/40 border border-gray-700 p-3 rounded text-white"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              />
              <input
                type="number"
                placeholder="Duration (min)"
                className="bg-black/40 border border-gray-700 p-3 rounded text-white"
                value={formData.avgTime}
                onChange={(e) => setFormData({ ...formData, avgTime: e.target.value })}
              />
              <input
                type="number"
                placeholder="Total Tickets"
                className="bg-black/40 border border-gray-700 p-3 rounded text-white"
                value={formData.totalStock}
                onChange={(e) => setFormData({ ...formData, totalStock: e.target.value })}
              />
              <input
                type="number"
                step="0.01"
                placeholder="Price (USD)"
                className="bg-black/40 border border-gray-700 p-3 rounded text-white"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
            <div className="flex gap-4 mt-4">
              <button onClick={handleCreate} className="px-6 py-2 bg-green-600 rounded hover:bg-green-500 flex items-center gap-2">
                <Check className="w-4 h-4" />
                Create
              </button>
              <button onClick={() => setNewServiceMode(false)} className="px-6 py-2 bg-gray-600 rounded hover:bg-gray-500">
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Services Grid */}
      <div className="grid gap-6">
        <AnimatePresence>
          {myServices.map((service) => (
            <motion.div
              key={service.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -100 }}
              className={`glass rounded-xl overflow-hidden flex flex-col md:flex-row relative ${!service.isActive ? 'opacity-60' : ''}`}
            >
              {/* Inactive Badge */}
              {!service.isActive && (
                <div className="absolute top-2 left-2 bg-red-600/90 text-white text-xs px-2 py-1 rounded z-10 uppercase tracking-widest">
                  Inactive
                </div>
              )}

              {/* On-Chain Badge */}
              {service.eventAddress && (
                <div className="absolute top-2 right-2 bg-green-600/90 text-white text-xs px-2 py-1 rounded z-10 uppercase tracking-widest flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  On-Chain
                </div>
              )}

              {/* Image */}
              <div className="w-full md:w-48 h-48 md:h-auto overflow-hidden relative">
                <img src={service.image} alt={service.title} className="w-full h-full object-cover" />
                {!service.isActive && <div className="absolute inset-0 bg-black/50" />}
              </div>

              {/* Content */}
              <div className="flex-1 p-6">
                {editingId === service.id ? (
                  // Edit Mode
                  <div className="space-y-4">
                    <input
                      className="bg-black/40 border border-gray-700 p-2 rounded text-white w-full"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs text-gray-500">Duration</label>
                        <input
                          type="number"
                          className="bg-black/40 border border-gray-700 p-2 rounded text-white w-full"
                          value={formData.avgTime}
                          onChange={(e) => setFormData({ ...formData, avgTime: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Tickets</label>
                        <input
                          type="number"
                          className="bg-black/40 border border-gray-700 p-2 rounded text-white w-full"
                          value={formData.totalStock}
                          onChange={(e) => setFormData({ ...formData, totalStock: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Price (USD)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="bg-black/40 border border-gray-700 p-2 rounded text-white w-full"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleSave} className="px-4 py-2 bg-green-600 rounded hover:bg-green-500 flex items-center gap-2">
                        <Check className="w-4 h-4" /> Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white">{service.title}</h3>
                        <p className="text-[#FFD700] font-bold">${service.price || 0} USD</p>
                      </div>
                      <div className="flex gap-2">
                        {/* Publish On-Chain Button */}
                        {!service.eventAddress ? (
                          <button
                            onClick={() => openPublishModal(service)}
                            className="p-2 hover:bg-yellow-500/20 rounded-full transition-colors"
                            title="Publish On-Chain"
                          >
                            <Zap className="w-5 h-5 text-yellow-400" />
                          </button>
                        ) : (
                          <span className="p-2 text-green-400" title={`On-chain: ${service.eventAddress.slice(0, 10)}...`}>
                            <CheckCircle className="w-5 h-5" />
                          </span>
                        )}

                        {/* Toggle Active */}
                        {isGuest ? (
                          <button className="p-2 rounded-full transition-colors hover:bg-yellow-500/20 text-yellow-400" title="Sign in to activate">
                            <Lock className="w-5 h-5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleServiceActive(service.id)}
                            className={`p-2 rounded-full transition-colors ${service.isActive ? 'hover:bg-green-500/20 text-green-400' : 'hover:bg-red-500/20 text-red-400'}`}
                            title={service.isActive ? 'Deactivate' : 'Activate'}
                          >
                            <Power className="w-5 h-5" />
                          </button>
                        )}

                        {/* Edit */}
                        <button onClick={() => handleEdit(service)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                          <Edit2 className="w-5 h-5 text-gray-400" />
                        </button>

                        {/* Delete */}
                        <button onClick={() => setDeleteConfirmId(service.id)} className="p-2 hover:bg-red-500/20 rounded-full transition-colors text-red-400">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                      <div className="bg-black/20 p-3 rounded-lg flex items-center gap-3">
                        <Clock className="w-6 h-6 text-yellow-500" />
                        <div>
                          <p className="text-xs text-gray-400 uppercase">Duration</p>
                          <p className="font-bold">{service.avgTime} mins</p>
                        </div>
                      </div>
                      <div className="bg-black/20 p-3 rounded-lg flex items-center gap-3">
                        <Package className="w-6 h-6 text-yellow-500" />
                        <div>
                          <p className="text-xs text-gray-400 uppercase">Tickets</p>
                          <p className="font-bold">
                            <span className={(service.totalStock - (service.sold || 0)) < 10 ? 'text-red-500' : 'text-white'}>
                              {service.totalStock - (service.sold || 0)}
                            </span>
                            <span className="text-gray-500 text-sm"> / {service.totalStock}</span>
                          </p>
                        </div>
                      </div>
                      <div className="bg-black/20 p-3 rounded-lg flex items-center gap-3 col-span-2">
                        <Calendar className="w-6 h-6 text-yellow-500" />
                        <div>
                          <p className="text-xs text-gray-400 uppercase">Schedule</p>
                          <p className="font-bold text-sm">
                            {service.schedule?.openTime || '09:00'} - {service.schedule?.closeTime || '18:00'}
                            <span className="text-gray-500 ml-2">
                              {service.schedule?.days?.join(', ') || 'Mon-Fri'}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Delete Confirmation Overlay */}
              {deleteConfirmId === service.id && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-black/90 flex items-center justify-center z-20"
                >
                  <div className="text-center p-6">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h4 className="text-xl font-bold mb-2">Delete Service?</h4>
                    <p className="text-gray-400 mb-6">This action cannot be undone.</p>
                    <div className="flex gap-4 justify-center">
                      <button onClick={() => handleDelete(service.id)} className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-500">
                        Delete
                      </button>
                      <button onClick={() => setDeleteConfirmId(null)} className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-500">
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* AI Assistants */}
      <AIServiceAssistant />
      <AIBusinessConsultant />

      {/* ========== NUEVO: Publish On-Chain Modal ========== */}
      <AnimatePresence>
        {publishModalService && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closePublishModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#111] border border-[#333] rounded-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[#FFD700]" />
                  Publish On-Chain
                </h3>
                <button onClick={closePublishModal} className="text-gray-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Step: Config */}
              {publishStep === 'config' && (
                <>
                  <div className="space-y-4 mb-6">
                    <div className="p-4 bg-black/50 rounded-lg">
                      <p className="text-sm text-gray-400 mb-1">Service</p>
                      <p className="font-bold text-white">{publishModalService?.title}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-500 uppercase">Total Tickets</label>
                        <input
                          type="number"
                          value={publishConfig.totalTickets}
                          onChange={(e) => setPublishConfig({ ...publishConfig, totalTickets: parseInt(e.target.value) })}
                          className="w-full bg-black/40 border border-gray-700 p-3 rounded text-white mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 uppercase">Price (USD)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={publishConfig.ticketPrice}
                          onChange={(e) => setPublishConfig({ ...publishConfig, ticketPrice: parseFloat(e.target.value) })}
                          className="w-full bg-black/40 border border-gray-700 p-3 rounded text-white mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <label className="flex items-center gap-2 text-sm text-gray-300">
                        <input
                          type="checkbox"
                          checked={publishConfig.transferable}
                          onChange={(e) => setPublishConfig({ ...publishConfig, transferable: e.target.checked })}
                          className="rounded"
                        />
                        Transferable
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-300">
                        <input
                          type="checkbox"
                          checked={publishConfig.refundable}
                          onChange={(e) => setPublishConfig({ ...publishConfig, refundable: e.target.checked })}
                          className="rounded"
                        />
                        Refundable
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-300">
                        <input
                          type="checkbox"
                          checked={publishConfig.resalable}
                          onChange={(e) => setPublishConfig({ ...publishConfig, resalable: e.target.checked })}
                          className="rounded"
                        />
                        Resalable
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-300">
                        <input
                          type="checkbox"
                          checked={publishConfig.permanent}
                          onChange={(e) => setPublishConfig({ ...publishConfig, permanent: e.target.checked })}
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
                    disabled={false}
                    className="w-full py-4 bg-[#FFD700] text-black font-bold rounded-lg hover:bg-white transition-colors disabled:opacity-50"
                  >
                  'Publish to Blockchain'
                  </button>
                </>
              )}

              {/* Step: Publishing */}
              {publishStep === 'publishing' && (
                <div className="text-center py-8">
                  <Loader className="w-12 h-12 text-[#FFD700] animate-spin mx-auto mb-4" />
                  <p className="text-white font-bold">Creating Event On-Chain...</p>
                  <p className="text-sm text-gray-500 mt-2">Please confirm in your wallet</p>
                </div>
              )}

              {/* Step: Success */}
              {publishStep === 'success' && (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-white font-bold mb-2">Event Published!</p>
                  <div className="bg-black/50 p-3 rounded-lg text-left mb-4">
                    <p className="text-xs text-gray-500 uppercase mb-1">Event Address</p>
                    <p className="text-[#FFD700] text-sm font-mono break-all">{publishResult.eventAddress}</p>
                  </div>
                  <a
                    href={`https://explorer.movementlabs.xyz/txn/${publishResult.txHash}?network=custom`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:underline"
                  >
                    View on Explorer →
                  </a>
                  <button
                    onClick={closePublishModal}
                    className="w-full mt-4 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500"
                  >
                    Done
                  </button>
                </div>
              )}

              {/* Step: Error */}
              {publishStep === 'error' && (
                <div className="text-center py-8">
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className="text-white font-bold mb-2">Publication Failed</p>
                  <p className="text-sm text-gray-400 mb-4">{publishError || 'Unknown error'}</p>
                  <button
                    onClick={() => setPublishStep('config')}
                    className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ServicesManager;
