import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import aiRoutes from './routes/aiRoutes.js';
import ticketPurchaseRoutes from './routes/ticketPurchase.js';
import * as db from './services/dynamoDBService.js';
import ticketPurchaseRoutes from './routes/ticketPurchase.js';

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());

// Transform DynamoDB camelCase to snake_case for frontend compatibility
const toSnakeCase = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  
  const snakeCaseMap = {
    privyId: 'privy_id', walletAddress: 'wallet_address', userType: 'user_type',
    fullName: 'full_name', businessName: 'business_name', profileComplete: 'profile_complete',
    createdAt: 'created_at', updatedAt: 'updated_at', vendorId: 'vendor_id',
    ownerPrivyId: 'owner_privy_id', avgTime: 'avg_time', totalStock: 'total_stock',
    isActive: 'is_active', scheduleOpenTime: 'schedule_open_time', 
    scheduleCloseTime: 'schedule_close_time', scheduleDays: 'schedule_days',
    orderNumber: 'order_number', userPrivyId: 'user_privy_id', queuePosition: 'queue_position',
    estimatedWait: 'estimated_wait', totalAmount: 'total_amount', acceptedAt: 'accepted_at',
    completedAt: 'completed_at', ticketNumber: 'ticket_number', orderItemId: 'order_item_id',
    serviceId: 'service_id', serviceName: 'service_name', blockchainAddress: 'blockchain_address',
    txHash: 'tx_hash', qrHash: 'qr_hash', isUsed: 'is_used', usedAt: 'used_at',
    ownerId: 'owner_id', vendorType: 'vendor_type', queueStrategy: 'queue_strategy',
    avgServiceTime: 'avg_service_time', usesCart: 'uses_cart'
  };
  
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = snakeCaseMap[key] || key;
    result[newKey] = (typeof value === 'object' && value !== null) ? toSnakeCase(value) : value;
  }
  return result;
};

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'chainticket-backend',
    database: 'DynamoDB'
  });
});

// ============================================
// USER ROUTES
// ============================================

app.get('/api/users/:privyId', async (req, res) => {
  try {
    const user = await db.getUserByPrivyId(req.params.privyId);
    if (!user) return res.status(404).json({ found: false });
    res.json({ found: true, user: toSnakeCase(user) });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { privyId, walletAddress, userType, profile } = req.body;
    const existing = await db.getUserByPrivyId(privyId);
    
    if (existing) {
      const updated = await db.updateUser(privyId, {
        walletAddress: walletAddress || existing.walletAddress,
        userType: userType || existing.userType,
        fullName: profile?.fullName || existing.fullName,
        email: profile?.email || existing.email,
        phone: profile?.phone || existing.phone,
        location: profile?.location || existing.location,
        businessName: profile?.businessName || existing.businessName,
        profileComplete: !!profile?.fullName,
      });
      return res.json({ success: true, user: toSnakeCase(updated), isNew: false });
    }
    
    const user = await db.createOrUpdateUser({ privyId, walletAddress, userType, profile });
    res.json({ success: true, user: toSnakeCase(user), isNew: true });
  } catch (error) {
    console.error('Error creating/updating user:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/users/:privyId', async (req, res) => {
  try {
    const { privyId } = req.params;
    const { userType, profile } = req.body;
    
    const updated = await db.updateUser(privyId, {
      userType,
      fullName: profile?.fullName,
      email: profile?.email,
      phone: profile?.phone,
      location: profile?.location,
      businessName: profile?.businessName,
      profileComplete: !!profile?.fullName,
    });
    
    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, user: toSnakeCase(updated) });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SERVICES ROUTES
// ============================================

app.get('/api/services', async (req, res) => {
  try {
    const { vendorId, activeOnly } = req.query;
    const services = await db.getAllServices({ vendorId, activeOnly: activeOnly === 'true' });
    res.json({ services: toSnakeCase(services) });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/services/owner/:privyId', async (req, res) => {
  try {
    const services = await db.getServicesByOwner(req.params.privyId);
    res.json({ services: toSnakeCase(services) });
  } catch (error) {
    console.error('Error fetching owner services:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/services', async (req, res) => {
  try {
    const { ownerPrivyId, vendorId, title, description, image, avgTime, totalStock, price, schedule, isActive } = req.body;
    const service = await db.createService({
      ownerPrivyId, vendorId, title, description, image, avgTime, totalStock, price, schedule, isActive
    });
    res.json({ success: true, service: toSnakeCase(service) });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/services/:id', async (req, res) => {
  try {
    const { title, description, image, avgTime, totalStock, price, isActive, schedule } = req.body;
    const service = await db.updateService(req.params.id, {
      title, description, image, avgTime, totalStock, price, isActive, schedule
    });
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.json({ success: true, service: toSnakeCase(service) });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/services/:id/toggle', async (req, res) => {
  try {
    if (req.body.isGuest) return res.status(403).json({ error: 'Guests cannot activate services' });
    const service = await db.toggleServiceActive(req.params.id);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.json({ success: true, service: toSnakeCase(service) });
  } catch (error) {
    console.error('Error toggling service:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/services/:id', async (req, res) => {
  try {
    await db.deleteService(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ORDERS ROUTES
// ============================================

app.get('/api/orders/user/:privyId', async (req, res) => {
  try {
    const orders = await db.getOrdersByUser(req.params.privyId, req.query.status);
    res.json({ orders: toSnakeCase(orders) });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders/vendor/:privyId', async (req, res) => {
  try {
    // Get vendor by owner first
    const vendors = await db.getAllVendors();
    const vendor = vendors.find(v => v.ownerPrivyId === req.params.privyId);
    if (!vendor) return res.json({ orders: [] });
    
    const orders = await db.getOrdersByVendor(vendor.id, req.query.status);
    res.json({ orders: toSnakeCase(orders) });
  } catch (error) {
    console.error('Error fetching vendor orders:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { userPrivyId, vendorId, items } = req.body;
    
    // Calculate queue position
    const pending = await db.getPendingOrdersCount(vendorId);
    const queuePosition = pending.count + 1;
    const maxItemTime = Math.max(...items.map(item => (item.avgTime || 30) * item.quantity));
    const estimatedWait = pending.totalWait + maxItemTime;
    const totalAmount = items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
    
    const order = await db.createOrder({
      userPrivyId, vendorId, items, totalAmount, queuePosition, estimatedWait
    });
    
    // Create tickets for each item
    const createdTickets = [];
    for (const item of items) {
      for (let i = 0; i < item.quantity; i++) {
        const qrHash = crypto.createHash('sha256')
          .update(`${order.id}-${userPrivyId}-${item.serviceId}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`)
          .digest('hex');
        
        const ticket = await db.createTicket({
          orderItemId: order.id,
          userPrivyId,
          serviceId: item.serviceId,
          serviceName: item.serviceName,
          vendorId,
          qrHash
        });
        createdTickets.push(ticket);
      }
      // Update sold count
      await db.incrementServiceSold(item.serviceId, item.quantity);
    }
    
    res.json({ success: true, order: toSnakeCase({ ...order, items }), tickets: toSnakeCase(createdTickets), queuePosition, estimatedWait });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const order = await db.updateOrderStatus(req.params.id, req.body.status);
    res.json({ success: true, order: toSnakeCase(order) });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/queue/info', async (req, res) => {
  try {
    const info = await db.getQueueInfo();
    res.json(info);
  } catch (error) {
    console.error('Error fetching queue info:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// TICKETS ROUTES
// ============================================

app.use('/api/tickets', ticketPurchaseRoutes);

app.get('/api/tickets/user/:privyId', async (req, res) => {
  try {
    const tickets = await db.getTicketsByUser(req.params.privyId);
    res.json({ tickets: toSnakeCase(tickets) });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tickets', async (req, res) => {
  try {
    const ticket = await db.createTicket(req.body);
    res.json({ success: true, ticket: toSnakeCase(ticket) });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/tickets/:id/use', async (req, res) => {
  try {
    const ticket = await db.useTicket(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ success: true, ticket: toSnakeCase(ticket) });
  } catch (error) {
    console.error('Error using ticket:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tickets/validate', async (req, res) => {
  try {
    const { ticketId, qrHash } = req.body;
    const result = await db.validateTicket(ticketId, qrHash);
    res.json(result.ticket ? { ...result, ticket: toSnakeCase(result.ticket) } : result);
  } catch (error) {
    console.error('Error validating ticket:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// VENDORS ROUTES
// ============================================

app.get('/api/vendors', async (req, res) => {
  try {
    const vendors = await db.getAllVendors();
    res.json({ vendors: toSnakeCase(vendors) });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/vendors', async (req, res) => {
  try {
    const vendor = await db.createVendor(req.body);
    res.json({ success: true, vendor: toSnakeCase(vendor) });
  } catch (error) {
    console.error('Error creating vendor:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/vendors/:id/settings', async (req, res) => {
  try {
    const vendor = await db.updateVendorSettings(req.params.id, { usesCart: req.body.uses_cart });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    res.json({ success: true, vendor: toSnakeCase(vendor) });
  } catch (error) {
    console.error('Error updating vendor settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// QUEUE ROUTES
// ============================================

app.post('/api/queue/join', async (req, res) => {
  try {
    const { vendorId, privyId } = req.body;
    
    const vendor = await db.getVendorById(vendorId);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    
    const avgServiceTime = vendor.avgServiceTime || 5;
    const pending = await db.getPendingOrdersCount(vendorId);
    const position = pending.count + 1;
    const estimatedWait = position * avgServiceTime;
    
    const order = await db.createOrder({
      userPrivyId: privyId || null,
      vendorId,
      items: [],
      totalAmount: 0,
      queuePosition: position,
      estimatedWait
    });
    
    const qrHash = crypto.createHash('sha256')
      .update(`${vendorId}-${privyId}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`)
      .digest('hex').slice(0, 32);
    
    const ticket = await db.createTicket({
      orderItemId: order.id,
      userPrivyId: privyId || null,
      serviceId: null,
      serviceName: 'Queue Ticket',
      vendorId,
      qrHash
    });
    
    res.json({ success: true, order: toSnakeCase(order), ticket: toSnakeCase(ticket), queuePosition: position, estimatedWait });
  } catch (error) {
    console.error('Error joining queue:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/queue/status/:orderId', async (req, res) => {
  try {
    const order = await db.getOrderById(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    const vendor = await db.getVendorById(order.vendorId);
    const avgServiceTime = vendor?.avgServiceTime || 5;
    
    // Recalculate position
    const allOrders = await db.getOrdersByVendor(order.vendorId);
    const aheadOrders = allOrders.filter(o => 
      (o.status === 'pending' || o.status === 'accepted') && 
      new Date(o.createdAt) < new Date(order.createdAt)
    );
    
    const position = aheadOrders.length + 1;
    const estimatedWait = position * avgServiceTime;
    
    res.json({ order: toSnakeCase(order), queuePosition: position, estimatedWait, status: order.status });
  } catch (error) {
    console.error('Error getting queue status:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SEED DATA ENDPOINT
// ============================================

app.post('/api/seed', async (req, res) => {
  try {
    const result = await db.seedData();
    res.json(result);
  } catch (error) {
    console.error('Error seeding data:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// AI ROUTES
// ============================================

app.use('/api/ai', aiRoutes);

app.post('/api/ai/recommendations', async (req, res) => {
  const { businessProfileData, question } = req.body;
  res.json({
    recommendation: `Basado en tu capacidad de ${businessProfileData?.maxCapacity || 100} y una tasa de retorno del ${businessProfileData?.customerReturnRate || 30}%, te recomiendo crear 150 tickets para tu próximo evento.`,
  });
});

app.use('/api/tickets', ticketPurchaseRoutes);

// ============================================
// SERVER
// ============================================

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📦 Using DynamoDB for data storage`);
});
