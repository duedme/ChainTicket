import { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Check, X, Clock, Package, Trash2, Power, Calendar, AlertTriangle, Lock } from 'lucide-react';
import AIServiceAssistant from '../../components/AIServiceAssistant';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const ServicesManager = () => {
    const { myServices, updateService, addService, deleteService, toggleServiceActive } = useData();
    const { isGuest, connectWallet } = useAuth();
    
    useEffect(() => {
        console.log('🎨 ServicesManager: myServices changed', {
            count: myServices?.length || 0,
            services: myServices
        });
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
        schedule: { openTime: '09:00', closeTime: '18:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] }
    });

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
            totalStock: Number(formData.totalStock)
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
            schedule: formData.schedule
        });
        setNewServiceMode(false);
        setFormData({ title: '', image: '', avgTime: '', totalStock: '', schedule: { openTime: '09:00', closeTime: '18:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] } });
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

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
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
                                value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}
                            />
                            <input
                                placeholder="Image URL"
                                className="bg-black/40 border border-gray-700 p-3 rounded text-white"
                                value={formData.image} onChange={e => setFormData({ ...formData, image: e.target.value })}
                            />
                            <input
                                type="number"
                                placeholder="Duration (min)"
                                className="bg-black/40 border border-gray-700 p-3 rounded text-white"
                                value={formData.avgTime} onChange={e => setFormData({ ...formData, avgTime: e.target.value })}
                            />
                            <input
                                type="number"
                                placeholder="Total Tickets"
                                className="bg-black/40 border border-gray-700 p-3 rounded text-white"
                                value={formData.totalStock} onChange={e => setFormData({ ...formData, totalStock: e.target.value })}
                            />
                        </div>

                        <div className="mt-4 p-4 bg-black/30 rounded-lg">
                            <h4 className="text-sm font-bold text-[#FFD700] uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Calendar className="w-4 h-4" /> Schedule
                            </h4>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="text-xs text-gray-500 uppercase">Open Time</label>
                                    <input
                                        type="time"
                                        className="bg-black/40 border border-gray-700 p-2 rounded text-white w-full"
                                        value={formData.schedule.openTime}
                                        onChange={e => setFormData({ ...formData, schedule: { ...formData.schedule, openTime: e.target.value } })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase">Close Time</label>
                                    <input
                                        type="time"
                                        className="bg-black/40 border border-gray-700 p-2 rounded text-white w-full"
                                        value={formData.schedule.closeTime}
                                        onChange={e => setFormData({ ...formData, schedule: { ...formData.schedule, closeTime: e.target.value } })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase mb-2 block">Operating Days</label>
                                <div className="flex flex-wrap gap-2">
                                    {DAYS.map(day => (
                                        <button
                                            key={day}
                                            onClick={() => toggleDay(day)}
                                            className={`px-3 py-1 rounded text-sm font-bold transition-all ${
                                                formData.schedule.days.includes(day)
                                                    ? 'bg-[#FFD700] text-black'
                                                    : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                                            }`}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-4">
                            <button onClick={handleCreate} className="px-6 py-2 bg-green-600 rounded hover:bg-green-500 flex items-center gap-2">
                                <Check className="w-4 h-4" /> Create
                            </button>
                            <button onClick={() => setNewServiceMode(false)} className="px-6 py-2 bg-gray-600 rounded hover:bg-gray-500">Cancel</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid gap-6">
                <AnimatePresence>
                    {myServices.map(service => (
                        <motion.div
                            key={service.id}
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, x: -100 }}
                            className={`glass rounded-xl overflow-hidden flex flex-col md:flex-row relative ${!service.isActive ? 'opacity-60' : ''}`}
                        >
                            {!service.isActive && (
                                <div className="absolute top-2 left-2 bg-red-600/90 text-white text-xs px-2 py-1 rounded z-10 uppercase tracking-widest">
                                    Inactive
                                </div>
                            )}

                            <div className="w-full md:w-48 h-48 md:h-auto overflow-hidden relative">
                                <img src={service.image} alt={service.title} className="w-full h-full object-cover" />
                                {!service.isActive && <div className="absolute inset-0 bg-black/50" />}
                            </div>

                            <div className="p-6 flex-1 flex flex-col justify-center">
                                {editingId === service.id ? (
                                    <div className="space-y-4">
                                        <input
                                            className="bg-black/40 border border-gray-700 p-2 rounded text-white w-full font-bold text-xl"
                                            value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        />
                                        <div className="flex gap-4 flex-wrap">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-gray-400" />
                                                <input
                                                    type="number"
                                                    className="bg-black/40 border border-gray-700 p-2 rounded text-white w-24"
                                                    value={formData.avgTime} onChange={e => setFormData({ ...formData, avgTime: e.target.value })}
                                                />
                                                <span className="text-gray-400">min</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Package className="w-4 h-4 text-gray-400" />
                                                <input
                                                    type="number"
                                                    className="bg-black/40 border border-gray-700 p-2 rounded text-white w-24"
                                                    value={formData.totalStock} onChange={e => setFormData({ ...formData, totalStock: e.target.value })}
                                                />
                                                <span className="text-gray-400">tickets</span>
                                            </div>
                                        </div>

                                        {scheduleEditId === service.id && (
                                            <div className="p-4 bg-black/30 rounded-lg">
                                                <h4 className="text-sm font-bold text-[#FFD700] uppercase tracking-widest mb-3">Schedule</h4>
                                                <div className="grid grid-cols-2 gap-4 mb-4">
                                                    <div>
                                                        <label className="text-xs text-gray-500 uppercase">Open</label>
                                                        <input
                                                            type="time"
                                                            className="bg-black/40 border border-gray-700 p-2 rounded text-white w-full"
                                                            value={formData.schedule?.openTime || '09:00'}
                                                            onChange={e => setFormData({ ...formData, schedule: { ...formData.schedule, openTime: e.target.value } })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-500 uppercase">Close</label>
                                                        <input
                                                            type="time"
                                                            className="bg-black/40 border border-gray-700 p-2 rounded text-white w-full"
                                                            value={formData.schedule?.closeTime || '18:00'}
                                                            onChange={e => setFormData({ ...formData, schedule: { ...formData.schedule, closeTime: e.target.value } })}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {DAYS.map(day => (
                                                        <button
                                                            key={day}
                                                            onClick={() => toggleDay(day)}
                                                            className={`px-3 py-1 rounded text-sm font-bold transition-all ${
                                                                formData.schedule?.days?.includes(day)
                                                                    ? 'bg-[#FFD700] text-black'
                                                                    : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                                                            }`}
                                                        >
                                                            {day}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex gap-2 flex-wrap">
                                            <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-green-600/20 text-green-400 rounded hover:bg-green-600/40">
                                                <Check className="w-4 h-4" /> Save
                                            </button>
                                            <button 
                                                onClick={() => setScheduleEditId(scheduleEditId === service.id ? null : service.id)} 
                                                className="flex items-center gap-2 px-4 py-2 bg-yellow-600/20 text-yellow-400 rounded hover:bg-yellow-600/40"
                                            >
                                                <Calendar className="w-4 h-4" /> {scheduleEditId === service.id ? 'Hide Schedule' : 'Edit Schedule'}
                                            </button>
                                            <button onClick={() => { setEditingId(null); setScheduleEditId(null); }} className="flex items-center gap-2 px-4 py-2 bg-gray-600/20 text-gray-400 rounded hover:bg-gray-600/40">
                                                <X className="w-4 h-4" /> Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-2xl font-bold">{service.title}</h3>
                                            <div className="flex gap-2">
                                                {isGuest ? (
                                                    <button 
                                                        onClick={connectWallet}
                                                        className="p-2 rounded-full transition-colors hover:bg-yellow-500/20 text-yellow-400"
                                                        title="Sign in to activate services"
                                                    >
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
                                                <button onClick={() => handleEdit(service)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                                    <Edit2 className="w-5 h-5 text-gray-400" />
                                                </button>
                                                <button 
                                                    onClick={() => setDeleteConfirmId(service.id)} 
                                                    className="p-2 hover:bg-red-500/20 rounded-full transition-colors text-red-400"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>

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
                                                        <span className={`${service.totalStock - service.sold < 10 ? 'text-red-500' : 'text-white'}`}>
                                                            {service.totalStock - service.sold}
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
                                            <button 
                                                onClick={() => handleDelete(service.id)} 
                                                className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-500"
                                            >
                                                Delete
                                            </button>
                                            <button 
                                                onClick={() => setDeleteConfirmId(null)} 
                                                className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
                                            >
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
            
            {/* AI Service Assistant */}
            <AIServiceAssistant />
        </div>
    );
};

export default ServicesManager;
