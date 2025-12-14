import { createContext, useContext, useState } from 'react';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

// Multiple Vendors/Establishments
const VENDORS = [
    { id: 1, name: 'Golden Bar & Lounge', type: 'Bar', image: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?q=80&w=2574&auto=format&fit=crop' },
    { id: 2, name: 'Premium Steakhouse', type: 'Restaurant', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2670&auto=format&fit=crop' },
    { id: 3, name: 'Artisan Coffee Co.', type: 'Café', image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=2678&auto=format&fit=crop' },
];

// Services by Vendor
const INITIAL_SERVICES = [
    // Golden Bar & Lounge
    { id: 1, vendorId: 1, title: 'VIP Table Service', image: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?q=80&w=2574&auto=format&fit=crop', avgTime: 15, totalStock: 50, sold: 12 },
    { id: 2, vendorId: 1, title: 'Bottle Service Premium', image: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?q=80&w=2669&auto=format&fit=crop', avgTime: 5, totalStock: 100, sold: 45 },
    { id: 3, vendorId: 1, title: 'Cocktail Masterclass', image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=2670&auto=format&fit=crop', avgTime: 30, totalStock: 20, sold: 8 },

    // Premium Steakhouse
    { id: 4, vendorId: 2, title: 'Wagyu Steak Experience', image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=2670&auto=format&fit=crop', avgTime: 45, totalStock: 30, sold: 15 },
    { id: 5, vendorId: 2, title: 'Chef\'s Tasting Menu', image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2670&auto=format&fit=crop', avgTime: 60, totalStock: 25, sold: 10 },
    { id: 6, vendorId: 2, title: 'Wine Pairing Dinner', image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=2670&auto=format&fit=crop', avgTime: 50, totalStock: 20, sold: 5 },

    // Artisan Coffee Co.
    { id: 7, vendorId: 3, title: 'Specialty Pour Over', image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=2670&auto=format&fit=crop', avgTime: 8, totalStock: 100, sold: 60 },
    { id: 8, vendorId: 3, title: 'Latte Art Workshop', image: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?q=80&w=2574&auto=format&fit=crop', avgTime: 25, totalStock: 15, sold: 7 },
    { id: 9, vendorId: 3, title: 'Cold Brew Flight', image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?q=80&w=2669&auto=format&fit=crop', avgTime: 5, totalStock: 80, sold: 40 },
];

export const DataProvider = ({ children }) => {
    const [vendors] = useState(VENDORS);
    const [services, setServices] = useState(INITIAL_SERVICES);
    const [orders, setOrders] = useState([]);
    const [cart, setCart] = useState([]); // Shopping cart

    // Admin Actions
    const updateService = (id, updates) => {
        setServices(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const addService = (newService) => {
        setServices(prev => [...prev, { ...newService, id: Date.now(), sold: 0 }]);
    };

    // Cart Actions
    const addToCart = (serviceId) => {
        const service = services.find(s => s.id === serviceId);
        if (!service || service.sold >= service.totalStock) return null;

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

    // Client Actions - Create order from cart
    const createOrderFromCart = () => {
        if (cart.length === 0) return null;

        // Calculate wait time based on LONGEST service in cart
        const maxTime = Math.max(...cart.map(item => item.service.avgTime));

        // Update stock for all items
        cart.forEach(item => {
            updateService(item.serviceId, {
                sold: item.service.sold + item.quantity
            });
        });

        const newOrder = {
            id: `ORD-${Date.now().toString().slice(-6)}`,
            items: cart.map(item => ({
                serviceId: item.serviceId,
                serviceName: item.service.title,
                quantity: item.quantity,
                avgTime: item.service.avgTime
            })),
            status: 'pending',
            timestamp: Date.now(),
            estimatedWait: maxTime // Based on longest service
        };

        setOrders(prev => [...prev, newOrder]);
        clearCart();
        return newOrder;
    };

    return (
        <DataContext.Provider value={{
            vendors,
            services,
            orders,
            cart,
            updateService,
            addService,
            addToCart,
            removeFromCart,
            updateCartQuantity,
            clearCart,
            createOrderFromCart,
            setOrders
        }}>
            {children}
        </DataContext.Provider>
    );
};
