// src/context/DataContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useX402Payment } from '../hooks/useX402Payment'; // NUEVO IMPORT

const DataContext = createContext();

export const useData = () => useContext(DataContext);

const API_URL = import.meta.env.VITE_API_URL || 'https://d4y2c4layjh2.cloudfront.net';

export const DataProvider = ({ children }) => {
  const { user, isGuest } = useAuth();
  const { payWithX402, loading: paymentLoading } = useX402Payment(); // NUEVO
  
  const [vendors, setVendors] = useState([]);
  const [services, setServices] = useState([]);
  const [myServices, setMyServices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [queueInfo, setQueueInfo] = useState({ pendingorders: 0, totalwaittime: 0 });
  const [loading, setLoading] = useState(true);
  const [paymentInProgress, setPaymentInProgress] = useState(false); // NUEVO

  // ... (mantener fetchServices, fetchMyServices, fetchMyOrders, etc. igual)

  const fetchServices = useCallback(async (activeOnly = false) => {
    try {
      const url = activeOnly ? `${API_URL}/api/services?activeOnly=true` : `${API_URL}/api/services`;
      console.log('🔍 Fetching services from:', url);
      const response = await fetch(url);
      const data = await response.json();
      console.log('📦 Services API response:', { activeOnly, servicesCount: data.services?.length || 0, data });
      
      if (data.services) {
        const formattedServices = data.services.map(s => ({
          id: s.id,
          vendorId: s.vendorid || s.vendorId, // Handle both snake_case and camelCase
          title: s.title,
          description: s.description,
          image: s.image,
          avgTime: s.avgtime || s.avgTime,
          totalStock: s.totalstock || s.totalStock,
          sold: s.sold || 0,
          price: parseFloat(s.price) || 0,
          isActive: s.isactive ?? s.isActive ?? true,
          schedule: {
            openTime: s.scheduleopentime || s.schedule?.openTime || '09:00',
            closeTime: s.scheduleclosetime || s.schedule?.closeTime || '18:00',
            days: s.scheduledays || s.schedule?.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
          }
        }));
        console.log('✅ Formatted services for clients:', formattedServices.length, formattedServices);
        setServices(formattedServices);
      } else {
        console.warn('⚠️ No services in response:', data);
        setServices([]);
      }
    } catch (error) {
      console.error('❌ Error fetching services:', error);
      setServices([]);
    }
  }, []);

  const fetchMyServices = useCallback(async () => {
    if (!user?.privyId || isGuest) {
      console.log('⚠️ fetchMyServices skipped:', { privyId: user?.privyId, isGuest });
      return;
    }
    try {
      console.log('🔍 Fetching services for privyId:', user.privyId);
      const response = await fetch(`${API_URL}/api/services/owner/${user.privyId}`);
      const data = await response.json();
      console.log('📦 Services response:', data);
      
      if (data.services) {
        const formattedServices = data.services.map(s => ({
          id: s.id,
          vendorId: s.vendorid || s.vendorId,
          title: s.title,
          description: s.description,
          image: s.image,
          avgTime: s.avgtime || s.avgTime,
          totalStock: s.totalstock || s.totalStock,
          sold: s.sold || 0,
          price: parseFloat(s.price) || 0,
          isActive: s.isactive ?? s.isActive ?? true,
          schedule: {
            openTime: s.scheduleopentime || s.schedule?.openTime || '09:00',
            closeTime: s.scheduleclosetime || s.schedule?.closeTime || '18:00',
            days: s.scheduledays || s.schedule?.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
          }
        }));
        console.log('✅ Formatted services:', formattedServices);
        setMyServices(formattedServices);
      } else {
        console.log('⚠️ No services found in response');
        setMyServices([]);
      }
    } catch (error) {
      console.error('❌ Error fetching my services:', error);
    }
  }, [user?.privyId, isGuest]);

  const fetchMyOrders = useCallback(async () => {
    if (!user?.privyId || isGuest) return;
    try {
      const response = await fetch(`${API_URL}/api/orders/user/${user.privyId}`);
      const data = await response.json();
      if (data.orders) {
        setOrders(data.orders.map(o => ({
          id: o.ordernumber,
          dbId: o.id,
          vendorId: o.vendorid,
          items: o.items?.filter(i => i.id),
          status: o.status,
          timestamp: new Date(o.createdat).getTime(),
          estimatedWait: o.estimatedwait,
          queuePosition: o.queueposition,
          totalAmount: parseFloat(o.totalamount) || 0,
          isQueueOrder: o.ordernumber?.startsWith('Q-'),
          paymentTxHash: o.paymenttxhash // NUEVO
        })));
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  }, [user?.privyId, isGuest]);

  const fetchVendorOrders = useCallback(async () => {
    if (!user?.privyId || isGuest) return;
    try {
      const response = await fetch(`${API_URL}/api/orders/vendor/${user.privyId}`);
      const data = await response.json();
      if (data.orders) {
        setOrders(data.orders.map(o => ({
          id: o.ordernumber,
          dbId: o.id,
          customerName: o.customername,
          items: o.items?.filter(i => i.id),
          status: o.status,
          timestamp: new Date(o.createdat).getTime(),
          estimatedWait: o.estimatedwait,
          queuePosition: o.queueposition
        })));
      }
    } catch (error) {
      console.error('Error fetching vendor orders:', error);
    }
  }, [user?.privyId, isGuest]);

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

  const fetchQueueInfo = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/queue/info`);
      const data = await response.json();
      setQueueInfo(data);
    } catch (error) {
      console.error('Error fetching queue info:', error);
    }
  }, []);

  const fetchVendors = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/vendors`);
      if (!response.ok) return;
      const data = await response.json();
      if (data.vendors) {
        setVendors(data.vendors);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
      setVendors([]);
    }
  }, []);

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

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchVendors();
      await fetchServices(true); // Only show ACTIVE services to clients
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
  }, [user?.privyId, user?.role, isGuest, fetchVendors, fetchServices, fetchMyServices, fetchVendorOrders, fetchMyOrders, fetchMyTickets, fetchQueueInfo]);

  // Service CRUD
  const addService = async (newService) => {
    try {
      console.log('➕ Adding new service:', newService);
      
      if (!user?.privyId) {
        console.error('❌ No user authenticated');
        return null;
      }

      // Find vendor for this admin
      console.log('🔍 Looking for vendor. User privyId:', user.privyId);
      console.log('📋 Available vendors:', vendors);
      
      let myVendor = vendors.find(v => v.owner_privy_id === user?.privyId || v.ownerPrivyId === user?.privyId);
      let vendorId = myVendor?.id;
      
      console.log('🏢 Found vendor:', myVendor);
      
      // If no vendor exists, create one automatically
      if (!vendorId) {
        console.log('⚠️ No vendor found, creating one automatically...');
        const vendorName = user.profile?.businessName || user.profile?.fullName || 'My Business';
        const vendorType = user.profile?.businessCategory || 'restaurant';
        
        console.log('📝 Creating vendor:', { vendorName, vendorType });
        
        const createVendorResponse = await fetch(`${API_URL}/api/vendors`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ownerPrivyId: user.privyId,
            name: vendorName,
            type: vendorType,
            image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2670&auto=format&fit=crop',
            description: `Business owned by ${user.name}`,
            vendorType: 'restaurant_menu',
            usesCart: false
          })
        });
        
        const vendorData = await createVendorResponse.json();
        console.log('📦 Vendor creation response:', vendorData);
        
        if (vendorData.success && vendorData.vendor) {
          vendorId = vendorData.vendor.id;
          // Refresh vendors list
          await fetchVendors();
          console.log('✅ Vendor created successfully:', vendorId);
        } else {
          console.error('❌ Failed to create vendor:', vendorData);
          return null;
        }
      }
      
      if (!vendorId) {
        console.error('❌ Could not get or create vendor');
        return null;
      }
      
      console.log('📤 Creating service with vendorId:', vendorId);
      
      const response = await fetch(`${API_URL}/api/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerPrivyId: user?.privyId,
          vendorId: vendorId,
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
      console.log('📦 Service creation response:', data);
      
      if (data.success && data.service) {
        // Format the service to match our frontend format
        const formattedService = {
          id: data.service.id,
          vendorId: data.service.vendorid || data.service.vendorId,
          title: data.service.title,
          description: data.service.description,
          image: data.service.image,
          avgTime: data.service.avgtime || data.service.avgTime,
          totalStock: data.service.totalstock || data.service.totalStock,
          sold: data.service.sold || 0,
          price: parseFloat(data.service.price) || 0,
          isActive: data.service.isactive ?? data.service.isActive ?? true,
          schedule: data.service.schedule || {
            openTime: data.service.scheduleopentime || data.service.schedule?.openTime || '09:00',
            closeTime: data.service.scheduleclosetime || data.service.schedule?.closeTime || '18:00',
            days: data.service.scheduledays || data.service.schedule?.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
          }
        };
        
        console.log('✅ Formatted service:', formattedService);
        
        // Add to state immediately so it appears right away
        console.log('📌 Adding to myServices state');
        setMyServices(prev => {
          console.log('📌 Previous myServices:', prev);
          const newState = [...prev, formattedService];
          console.log('📌 New myServices:', newState);
          return newState;
        });
        setServices(prev => [...prev, formattedService]);
        
        // Also refresh from server to ensure consistency
        console.log('🔄 Refreshing services from server...');
        await fetchMyServices();
        await fetchServices(true); // Refresh all services so clients see it
        
        console.log('✅ Service added successfully');
        return formattedService;
      } else {
        console.error('❌ Service creation failed:', data);
      }
    } catch (error) {
      console.error('❌ Error adding service:', error);
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
        const updatedService = { ...updates, schedule: updates.schedule };
        setServices(prev => prev.map(s => s.id === id ? { ...s, ...updatedService } : s));
        setMyServices(prev => prev.map(s => s.id === id ? { ...s, ...updatedService } : s));
      }
    } catch (error) {
      console.error('Error updating service:', error);
    }
  };

  const deleteService = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/services/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        setServices(prev => prev.filter(s => s.id !== id));
        setMyServices(prev => prev.filter(s => s.id !== id));
      }
    } catch (error) {
      console.error('Error deleting service:', error);
    }
  };

  const toggleServiceActive = async (id) => {
    if (isGuest) return false;
    try {
      const response = await fetch(`${API_URL}/api/services/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isGuest })
      });
      const data = await response.json();
      if (data.success) {
        const newActiveState = data.service.isActive ?? data.service.isactive;
        setServices(prev => prev.map(s => s.id === id ? { ...s, isActive: newActiveState } : s));
        setMyServices(prev => prev.map(s => s.id === id ? { ...s, isActive: newActiveState } : s));
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
        return prev.map(item => item.serviceId === serviceId ? { ...item, quantity: item.quantity + 1 } : item);
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
    setCart(prev => prev.map(item => item.serviceId === serviceId ? { ...item, quantity } : item));
  };

  const clearCart = () => setCart([]);

  // === INICIO CAMBIOS X402 ===
  
  // Compra directa CON PAGO X402
  const purchaseDirectly = async (serviceId, vendorId) => {
    if (!user?.privyId) return null;
    
    const service = services.find(s => s.id === serviceId);
    if (!service || service.sold >= service.totalStock || !service.isActive) return null;

    let paymentResult = null;
    let paymentTxHash = null;

    // Si el servicio tiene precio > 0, procesar pago x402 primero
    if (service.price > 0) {
      setPaymentInProgress(true);
      
      try {
        paymentResult = await payWithX402(service.price, service.title);
        
        if (!paymentResult.success) {
          setPaymentInProgress(false);
          console.error('Pago fallido:', paymentResult.error);
          return { error: paymentResult.error || 'Pago cancelado' };
        }
        
        paymentTxHash = paymentResult.txHash;
        console.log('✅ Pago x402 exitoso:', paymentTxHash);
        
      } catch (error) {
        setPaymentInProgress(false);
        console.error('Error en pago x402:', error);
        return { error: error.message };
      }
    }

    // Ahora crear la orden (con o sin txHash)
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
          items,
          // NUEVOS CAMPOS para x402
          paymentTxHash: paymentTxHash,
          paymentAmount: service.price || 0,
          paymentMethod: paymentTxHash ? 'x402-usdc' : 'free',
          buyerAddress: paymentResult?.buyerAddress || user.wallet
        })
      });

      const data = await response.json();
      
      setPaymentInProgress(false);

      if (data.success) {
        await fetchMyOrders();
        await fetchMyTickets();
        await fetchServices(true);
        await fetchQueueInfo();
        
        return {
          id: data.order.ordernumber,
          dbId: data.order.id,
          items,
          tickets: data.tickets,
          status: 'pending',
          estimatedWait: data.estimatedWait,
          queuePosition: data.queuePosition,
          paymentTxHash: paymentTxHash
        };
      }
    } catch (error) {
      setPaymentInProgress(false);
      console.error('Error creating order:', error);
    }
    
    return null;
  };

  // Crear orden desde carrito CON PAGO X402
  const createOrderFromCart = async () => {
    if (cart.length === 0 || !user?.privyId) return null;

    // Calcular total
    const totalAmount = cart.reduce((sum, item) => sum + (item.service.price * item.quantity), 0);
    
    let paymentResult = null;
    let paymentTxHash = null;

    // Si hay total > 0, procesar pago
    if (totalAmount > 0) {
      setPaymentInProgress(true);
      
      try {
        paymentResult = await payWithX402(totalAmount, `Carrito (${cart.length} items)`);
        
        if (!paymentResult.success) {
          setPaymentInProgress(false);
          return { error: paymentResult.error || 'Pago cancelado' };
        }
        
        paymentTxHash = paymentResult.txHash;
        console.log('✅ Pago carrito x402 exitoso:', paymentTxHash);
        
      } catch (error) {
        setPaymentInProgress(false);
        return { error: error.message };
      }
    }

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
          items,
          paymentTxHash,
          paymentAmount: totalAmount,
          paymentMethod: paymentTxHash ? 'x402-usdc' : 'free',
          buyerAddress: paymentResult?.buyerAddress || user.wallet
        })
      });

      const data = await response.json();
      
      setPaymentInProgress(false);

      if (data.success) {
        clearCart();
        await fetchMyOrders();
        await fetchMyTickets();
        await fetchServices(true);
        await fetchQueueInfo();
        
        return {
          id: data.order.ordernumber,
          items,
          tickets: data.tickets,
          status: 'pending',
          estimatedWait: data.estimatedWait,
          queuePosition: data.queuePosition,
          paymentTxHash
        };
      }
    } catch (error) {
      setPaymentInProgress(false);
      console.error('Error creating order:', error);
    }
    
    return null;
  };

  // === FIN CAMBIOS X402 ===

  const updateOrderStatus = async (orderId, status) => {
    try {
      const response = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (data.success) {
        setOrders(prev => prev.map(o => o.dbId === orderId ? { ...o, status } : o));
        await fetchQueueInfo();
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const joinQueue = async (vendorId) => {
    try {
      const response = await fetch(`${API_URL}/api/queue/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId, privyId: user?.privyId })
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

  const getQueueStatus = async (orderId) => {
    try {
      const response = await fetch(`${API_URL}/api/queue/status/${orderId}`);
      return await response.json();
    } catch (error) {
      console.error('Error getting queue status:', error);
      return null;
    }
  };

  return (
    <DataContext.Provider value={{
      vendors,
      services,
      myServices,
      orders,
      cart,
      tickets,
      queueInfo,
      loading,
      paymentInProgress, // NUEVO - para mostrar loading de pago
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
