import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { motion } from 'framer-motion';
import { Plus, Edit2, Check, X, Clock, Package } from 'lucide-react';

const ServicesManager = () => {
    const { services, updateService, addService } = useData();
    const [editingId, setEditingId] = useState(null);
    const [newServiceMode, setNewServiceMode] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        image: '',
        avgTime: '',
        totalStock: ''
    });

    const handleEdit = (service) => {
        setEditingId(service.id);
        setFormData(service);
    };

    const handleSave = () => {
        updateService(editingId, {
            ...formData,
            avgTime: Number(formData.avgTime),
            totalStock: Number(formData.totalStock)
        });
        setEditingId(null);
    };

    const handleCreate = () => {
        addService({
            title: formData.title,
            image: formData.image || 'https://via.placeholder.com/400',
            avgTime: Number(formData.avgTime),
            totalStock: Number(formData.totalStock)
        });
        setNewServiceMode(false);
        setFormData({ title: '', image: '', avgTime: '', totalStock: '' });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
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

            {newServiceMode && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
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
                            placeholder="Avg Wait Time (min)"
                            className="bg-black/40 border border-gray-700 p-3 rounded text-white"
                            value={formData.avgTime} onChange={e => setFormData({ ...formData, avgTime: e.target.value })}
                        />
                        <input
                            type="number"
                            placeholder="Total Stock/Itinerary"
                            className="bg-black/40 border border-gray-700 p-3 rounded text-white"
                            value={formData.totalStock} onChange={e => setFormData({ ...formData, totalStock: e.target.value })}
                        />
                    </div>
                    <div className="flex gap-4 mt-4">
                        <button onClick={handleCreate} className="px-6 py-2 bg-green-600 rounded hover:bg-green-500">Save</button>
                        <button onClick={() => setNewServiceMode(false)} className="px-6 py-2 bg-gray-600 rounded hover:bg-gray-500">Cancel</button>
                    </div>
                </motion.div>
            )}

            <div className="grid gap-6">
                {services.map(service => (
                    <motion.div
                        key={service.id}
                        layout
                        className="glass rounded-xl overflow-hidden flex flex-col md:flex-row"
                    >
                        <div className="w-full md:w-48 h-48 md:h-auto overflow-hidden">
                            <img src={service.image} alt={service.title} className="w-full h-full object-cover" />
                        </div>

                        <div className="p-6 flex-1 flex flex-col justify-center">
                            {editingId === service.id ? (
                                <div className="space-y-4">
                                    <input
                                        className="bg-black/40 border border-gray-700 p-2 rounded text-white w-full font-bold text-xl"
                                        value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    />
                                    <div className="flex gap-4">
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
                                            <span className="text-gray-400">stock</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-green-600/20 text-green-400 rounded hover:bg-green-600/40"><Check className="w-4 h-4" /> Save</button>
                                        <button onClick={() => setEditingId(null)} className="flex items-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 rounded hover:bg-red-600/40"><X className="w-4 h-4" /> Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-2xl font-bold">{service.title}</h3>
                                        <button onClick={() => handleEdit(service)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                            <Edit2 className="w-5 h-5 text-gray-400" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                        <div className="bg-black/20 p-3 rounded-lg flex items-center gap-3">
                                            <Clock className="w-6 h-6 text-yellow-500" />
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase">Avg Wait</p>
                                                <p className="font-bold">{service.avgTime} mins</p>
                                            </div>
                                        </div>
                                        <div className="bg-black/20 p-3 rounded-lg flex items-center gap-3">
                                            <Package className="w-6 h-6 text-yellow-500" />
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase">Stock/Itinerary</p>
                                                <p className="font-bold">
                                                    <span className={`${service.totalStock - service.sold < 10 ? 'text-red-500' : 'text-white'}`}>
                                                        {service.totalStock - service.sold}
                                                    </span>
                                                    <span className="text-gray-500 text-sm"> / {service.totalStock} left</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default ServicesManager;
