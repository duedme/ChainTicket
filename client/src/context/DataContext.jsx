import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

const API_URL = import.meta.env.VITE_API_URL || 'http://44.219.206.243:3001';

export const DataProvider = ({ children }) => {
    const { user, isGuest } = useAuth();
    const [vendors, setVendors] = useState([]);
    const [services, setServices] = useState([]);
    const [orders, setOrders] = useState([]);
    const [cart, setCart] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [queueInfo, setQueueInfo] = useState({ pending_orders: 0, total_wait_time: 0 });
    const [loading, setLoading] = useState(true);

    // Fetch all services for clients to browse
    const fetchServices = useCallback(async (activeOnly = false) => {
        try {
            const url = activeOnly 
                ? `${API_URL}/api/services?activeOnly=true`
                : `${API_URL}/api/services`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.services) {
                const formattedServices = data.services.map(s => ({
                    id: s.id,
                    vendorId: s.vendor_id,
                    title: s.title,
                    description: s.description,
                    image: s.image,
                    avgTime: s.avg_time,
                    totalStock: s.total_stock,
                    sold: s.sold || 0,
                    price: parseFloat(s.price) || 0,
                    isActive: s.is_active,
                    schedule: {
                        openTime: s.schedule_open_time,
                        closeTime: s.schedule_close_time,
                        days: s.schedule_days || []
                    }
                }));
                setServices(formattedServices);
            }
        } catch (error) {
            console.error('Error fetching services:', error);
        }
    }, []);

    // Fetch services owned by the current user (for admin)
    const fetchMyServices = useCallback(async () => {
        if (!user?.privyId || isGuest) return;
        try {
            const response = await fetch(`${API_URL}/api/services/owner/${user.privyId}`);
            const data = await response.json();
            if (data.services) {
                const formattedServices = data.services.map(s => ({
                    id: s.id,
                    vendorId: s.vendor_id,
                    title: s.title,
                    description: s.description,
                    image: s.image,
                    avgTime: s.avg_time,
                    totalStock: s.total_stock,
                    sold: s.sold || 0,
                    price: parseFloat(s.price) || 0,
                    isActive: s.is_active,
                    schedule: {
                        openTime: s.schedule_open_time,
                        closeTime: s.schedule_close_time,
                        days: s.schedule_days || []
                    }
                }));
                setServices(formattedServices);
            }
        } catch (error) {
            console.error('Error fetching my services:', error);
        }
    }, [user?.privyId, isGuest]);

    // Fetch orders for the current user
    const fetchMyOrders = useCallback(async () => {
        if (!user?.privyId || isGuest) return;
        try {
            const response = await fetch(`${API_URL}/api/orders/user/${user.privyId}`);
            const data = await response.json();
            if (data.orders) {
                setOrders(data.orders.map(o => ({
                    id: o.order_number,
                    dbId: o.id,
                    vendorId: o.vendor_id,
                    items: o.items?.filter(i => i.id) || [],
                    status: o.status,
                    timestamp: new Date(o.created_at).getTime(),
                    estimatedWait: o.estimated_wait,
                    queuePosition: o.queue_position,
                    totalAmount: parseFloat(o.total_amount) || 0,
                    isQueueOrder: o.order_number?.startsWith('Q-')
                })));
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    }, [user?.privyId, isGuest]);

    // Fetch orders for vendor (admin)
    const fetchVendorOrders = useCallback(async () => {
        if (!user?.privyId || isGuest) return;
        try {
            const response = await fetch(`${API_URL}/api/orders/vendor/${user.privyId}`);
            const data = await response.json();
            if (data.orders) {
                setOrders(data.orders.map(o => ({
                    id: o.order_number,
                    dbId: o.id,
                    customerName: o.customer_name,
                    items: o.items?.filter(i => i.id) || [],
                    status: o.status,
                    timestamp: new Date(o.created_at).getTime(),
                    estimatedWait: o.estimated_wait,
                    queuePosition: o.queue_position
                })));
            }
        } catch (error) {
            console.error('Error fetching vendor orders:', error);
        }
    }, [user?.privyId, isGuest]);

    // Fetch tickets for user
    const fetchMyTickets = useCallback(async () => {
        if (!user?.privyId || isGuest) return;
        try {
            const response = await fetch(`${API_URL}/api/tickets/user/${user.privyId}`);
            const data = await response.json();
            if (data.tickets) {
                setTickets(data.tickets);
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
        }
    }, [user?.privyId, isGuest]);

    // Fetch queue info
    const fetchQueueInfo = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/api/queue/info`);
            const data = await response.json();
            setQueueInfo(data);
        } catch (error) {
            console.error('Error fetching queue info:', error);
        }
    }, []);

    // Fetch vendors (establishments)
    const fetchVendors = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/api/vendors`);
            const data = await response.json();
            if (data.vendors) {
                setVendors(data.vendors);
            }
        } catch (error) {
            console.error('Error fetching vendors:', error);
        }
    }, []);

    // Update vendor settings (uses_cart, etc.)
    const updateVendorSettings = async (vendorId, settings) => {
        try {
            const response = await fetch(`${API_URL}/api/vendors/${vendorId}/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            const data = await response.json();
            if (data.success) {
                await fetchVendors();
                return true;
            }
        } catch (error) {
            console.error('Error updating vendor settings:', error);
        }
        return false;
    };

    // Load initial data
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await fetchVendors();
            await fetchServices(true);
            await fetchQueueInfo();
            if (user?.privyId && !isGuest) {
                if (user.role === 'admin') {
                    await fetchMyServices();
                    await fetchVendorOrders();
                } else {
                    await fetchMyOrders();
                    await fetchMyTickets();
                }
            }
            setLoading(false);
        };
        loadData();
    }, [user?.privyId, user?.role, isGuest, fetchVendors]);

    // Service CRUD operations
    const addService = async (newService) => {
        try {
            const response = await fetch(`${API_URL}/api/services`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ownerPrivyId: user?.privyId,
                    title: newService.title,
                    description: newService.description,
                    image: newService.image,
                    avgTime: newService.avgTime,
                    totalStock: newService.totalStock,
                    price: newService.price || 0,
                    schedule: newService.schedule,
                    isActive: isGuest ? false : true
                })
            });
            const data = await response.json();
            if (data.success) {
                await fetchMyServices();
                return data.service;
            }
        } catch (error) {
            console.error('Error adding service:', error);
        }
        return null;
    };

    const updateService = async (id, updates) => {
        try {
            const response = await fetch(`${API_URL}/api/services/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: updates.title,
                    description: updates.description,
                    image: updates.image,
                    avgTime: updates.avgTime,
                    totalStock: updates.totalStock,
                    price: updates.price,
                    isActive: updates.isActive,
                    schedule: updates.schedule
                })
            });
            const data = await response.json();
            if (data.success) {
                setServices(prev => prev.map(s => s.id === id ? {
                    ...s,
                    ...updates,
                    schedule: updates.schedule || s.schedule
                } : s));
            }
        } catch (error) {
            console.error('Error updating service:', error);
        }
    };

    const deleteService = async (id) => {
        try {
            const response = await fetch(`${API_URL}/api/services/${id}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            if (data.success) {
                setServices(prev => prev.filter(s => s.id !== id));
            }
        } catch (error) {
            console.error('Error deleting service:', error);
        }
    };

    const toggleServiceActive = async (id) => {
        if (isGuest) {
            console.warn('Guests cannot activate services');
            return false;
        }
        try {
            const response = await fetch(`${API_URL}/api/services/${id}/toggle`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isGuest })
            });
            const data = await response.json();
            if (data.success) {
                setServices(prev => prev.map(s => 
                    s.id === id ? { ...s, isActive: data.service.is_active } : s
                ));
                return true;
            }
        } catch (error) {
            console.error('Error toggling service:', error);
        }
        return false;
    };

    // Cart operations
    const addToCart = (serviceId) => {
        const service = services.find(s => s.id === serviceId);
        if (!service || service.sold >= service.totalStock || !service.isActive) return null;

        setCart(prev => {
            const existing = prev.find(item => item.serviceId === serviceId);
            if (existing) {
                return prev.map(item =>
                    item.serviceId === serviceId
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { serviceId, quantity: 1, service }];
        });
        return service;
    };

    const removeFromCart = (serviceId) => {
        setCart(prev => prev.filter(item => item.serviceId !== serviceId));
    };

    const updateCartQuantity = (serviceId, quantity) => {
        if (quantity <= 0) {
            removeFromCart(serviceId);
            return;
        }
        setCart(prev => prev.map(item =>
            item.serviceId === serviceId ? { ...item, quantity } : item
        ));
    };

    const clearCart = () => setCart([]);

    // Purchase a single ticket directly (no cart)
    const purchaseDirectly = async (serviceId, vendorId) => {
        if (!user?.privyId) return null;
        const service = services.find(s => s.id === serviceId);
        if (!service || service.sold >= service.totalStock || !service.isActive) return null;

        try {
            const items = [{
                serviceId,
                serviceName: service.title,
                quantity: 1,
                avgTime: service.avgTime,
                price: service.price || 0
            }];

            const response = await fetch(`${API_URL}/api/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userPrivyId: user.privyId,
                    vendorId,
                    items
                })
            });

            const data = await response.json();
            if (data.success) {
                await fetchMyOrders();
                await fetchMyTickets();
                await fetchServices(true);
                await fetchQueueInfo();
                return {
                    id: data.order.order_number,
                    dbId: data.order.id,
                    items,
                    tickets: data.tickets,
                    status: 'pending',
                    estimatedWait: data.estimatedWait,
                    queuePosition: data.queuePosition
                };
            }
        } catch (error) {
            console.error('Error purchasing directly:', error);
        }
        return null;
    };

    // Create order from cart
    const createOrderFromCart = async () => {
        if (cart.length === 0 || !user?.privyId) return null;

        try {
            const items = cart.map(item => ({
                serviceId: item.serviceId,
                serviceName: item.service.title,
                quantity: item.quantity,
                avgTime: item.service.avgTime,
                price: item.service.price || 0
            }));

            const response = await fetch(`${API_URL}/api/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userPrivyId: user.privyId,
                    vendorId: null,
                    items
                })
            });

            const data = await response.json();
            if (data.success) {
                clearCart();
                await fetchMyOrders();
                await fetchMyTickets();
                await fetchServices(true);
                await fetchQueueInfo();
                return {
                    id: data.order.order_number,
                    items,
                    tickets: data.tickets,
                    status: 'pending',
                    estimatedWait: data.estimatedWait,
                    queuePosition: data.queuePosition
                };
            }
        } catch (error) {
            console.error('Error creating order:', error);
        }
        return null;
    };

    // Update order status (for admin)
    const updateOrderStatus = async (orderId, status) => {
        try {
            const response = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            const data = await response.json();
            if (data.success) {
                setOrders(prev => prev.map(o => 
                    o.dbId === orderId ? { ...o, status } : o
                ));
                await fetchQueueInfo();
            }
        } catch (error) {
            console.error('Error updating order status:', error);
        }
    };

    // Join queue (for supermarket/queue-only vendors)
    const joinQueue = async (vendorId) => {
        try {
            const response = await fetch(`${API_URL}/api/queue/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vendorId,
                    privyId: user?.privyId
                })
            });
            const data = await response.json();
            if (data.success) {
                await fetchMyOrders();
                await fetchMyTickets();
                return {
                    order: data.order,
                    ticket: data.ticket,
                    queuePosition: data.queuePosition,
                    estimatedWait: data.estimatedWait
                };
            }
        } catch (error) {
            console.error('Error joining queue:', error);
        }
        return null;
    };

    // Get queue status for an order
    const getQueueStatus = async (orderId) => {
        try {
            const response = await fetch(`${API_URL}/api/queue/status/${orderId}`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error getting queue status:', error);
        }
        return null;
    };

    return (
        <DataContext.Provider value={{
            vendors,
            services,
            orders,
            cart,
            tickets,
            queueInfo,
            loading,
            fetchServices,
            fetchMyServices,
            fetchMyOrders,
            fetchVendorOrders,
            fetchMyTickets,
            fetchQueueInfo,
            updateVendorSettings,
            updateService,
            addService,
            deleteService,
            toggleServiceActive,
            addToCart,
            removeFromCart,
            updateCartQuantity,
            clearCart,
            purchaseDirectly,
            createOrderFromCart,
            updateOrderStatus,
            setOrders,
            joinQueue,
            getQueueStatus
        }}>
            {children}
        </DataContext.Provider>
    );
};
