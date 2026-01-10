// backend/server.js
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import * as db from './services/dynamoDBService.js';
import aiRoutes from './routes/aiRoutes.js';
import ticketPurchaseRoutes from './routes/ticketPurchase.js';
import transactionRoutes from './routes/transactionRoutes.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Payment-Response']
}));

app.use(express.json());

// Routes
app.use('/api/ai', aiRoutes);
app.use('/api/transactions', transactionRoutes);

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
    avgServiceTime: 'avg_service_time', usesCart: 'uses_cart', eventAddress: 'event_address'
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
    
    const updates = {};
    if (userType !== undefined) updates.userType = userType;
    if (profile?.fullName !== undefined) updates.fullName = profile.fullName;
    if (profile?.email !== undefined) updates.email = profile.email;
    if (profile?.phone !== undefined) updates.phone = profile.phone;
    if (profile?.location !== undefined) updates.location = profile.location;
    if (profile?.businessName !== undefined) updates.businessName = profile.businessName;
    if (profile?.businessCategory !== undefined) updates.businessCategory = profile.businessCategory;
    if (profile?.fullName) updates.profileComplete = true;
    
    const updated = await db.updateUser(privyId, updates);
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
      ownerPrivyId, vendorId, title, description, image, avgTime, totalStock, 
      price: price || 5, schedule, isActive
    });
    res.json({ success: true, service: toSnakeCase(service) });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/services/:id', async (req, res) => {
  try {
    const { title, description, image, avgTime, totalStock, price, isActive, schedule, eventAddress } = req.body;
    const service = await db.updateService(req.params.id, {
      title, description, image, avgTime, totalStock, price, isActive, schedule, eventAddress
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
    const { userPrivyId, vendorId, items, paymentTxHash, paymentAmount, paymentMethod, buyerAddress } = req.body;

    const pending = await db.getPendingOrdersCount(vendorId);
    const queuePosition = pending.count + 1;
    const maxItemTime = Math.max(...items.map(item => (item.avgTime || 30) * item.quantity));
    const estimatedWait = pending.totalWait + maxItemTime;
    const totalAmount = items.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);

    const order = await db.createOrder({
      userPrivyId, vendorId, items,
      totalAmount: paymentAmount || totalAmount,
      queuePosition, estimatedWait,
      paymentTxHash: paymentTxHash || null,
      paymentMethod: paymentMethod || 'free',
      buyerAddress: buyerAddress || null
    });

    const createdTickets = [];
    for (const item of items) {
      for (let i = 0; i < item.quantity; i++) {
        const qrHash = crypto.createHash('sha256')
          .update(`${order.id}-${userPrivyId}-${item.serviceId}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`)
          .digest('hex');
        
        const ticket = await db.createTicket({
          orderItemId: order.id, userPrivyId,
          serviceId: item.serviceId, serviceName: item.serviceName,
          vendorId, qrHash, paymentTxHash: paymentTxHash || null
        });
        createdTickets.push(ticket);
      }
      await db.incrementServiceSold(item.serviceId, item.quantity);
    }

    if (paymentTxHash || totalAmount > 0) {
      try {
        await db.recordSale(vendorId || 'default', {
          orderId: order.id, orderNumber: order.orderNumber,
          amount: paymentAmount || totalAmount, itemCount: items.length,
          paymentMethod: paymentMethod || 'free', paymentTxHash: paymentTxHash || null,
          buyerAddress: buyerAddress || null, userPrivyId,
          items: items.map(i => ({ name: i.serviceName, qty: i.quantity, price: i.price }))
        });
      } catch (saleError) {
        console.error('Error registrando venta para IA:', saleError);
      }
    }

    res.json({
      success: true,
      order: toSnakeCase({ ...order, items }),
      tickets: toSnakeCase(createdTickets),
      queuePosition, estimatedWait
    });
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

// ============================================
// ⚡ NUEVO: CREATE EVENT ON-CHAIN (Movement)
// ============================================

app.post('/api/events/create', async (req, res) => {
  try {
    const { name, description, totalTickets, ticketPrice, transferable, resalable, permanent, refundable } = req.body;
    
    const { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } = await import('@aptos-labs/ts-sdk');
    
    const aptosConfig = new AptosConfig({
      network: Network.CUSTOM,
      fullnode: 'https://testnet.movementnetwork.xyz/v1'
    });
    const aptos = new Aptos(aptosConfig);
    
    const CONTRACT_ADDRESS = '0x2339acd68a5b699c8bfefed62febcf497959ca55527227e980c56031b3bfced9';
    
    const privateKeyHex = process.env.PAYMENT_PROCESSOR_PRIVATE_KEY;
    if (!privateKeyHex) {
      return res.status(500).json({ error: 'Server not configured for event creation' });
    }
    
    const privateKey = new Ed25519PrivateKey(privateKeyHex);
    const account = Account.fromPrivateKey({ privateKey });
    
    console.log('🚀 Creating event on Movement:', { name, totalTickets, ticketPrice });
    
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: `${CONTRACT_ADDRESS}::ticket::create_event`,
        typeArguments: [],
        functionArguments: [
          CONTRACT_ADDRESS,
          name,
          description || `Tickets for ${name}`,
          totalTickets,
          Math.floor(ticketPrice * 1000000),
          transferable ?? true,
          resalable ?? false,
          permanent ?? false,
          refundable ?? true,
          CONTRACT_ADDRESS
        ]
      }
    });
    
    const pendingTx = await aptos.signAndSubmitTransaction({ signer: account, transaction });
    console.log('📝 Transaction submitted:', pendingTx.hash);
    
    const committedTx = await aptos.waitForTransaction({ transactionHash: pendingTx.hash });
    console.log('✅ Transaction confirmed:', committedTx.hash);
    
    let eventAddress = null;
    if (committedTx.events) {
      const eventCreated = committedTx.events.find(e => e.type.includes('EventCreated'));
      eventAddress = eventCreated?.data?.event_address;
    }
    
    res.json({
      success: true,
      txHash: pendingTx.hash,
      eventAddress: eventAddress || `pending-${pendingTx.hash}`
    });
    
  } catch (error) {
    console.error('❌ Error creating event:', error);
    res.status(500).json({ error: error.message });
  }
});

// DEV MODE - Direct mint (add this to server.js)
app.post('/api/dev/mint', async (req, res) => {
  const { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } = await import('@aptos-labs/ts-sdk');
  const aptos = new Aptos(new AptosConfig({ network: Network.CUSTOM, fullnode: 'https://testnet.movementnetwork.xyz/v1' }));
  const account = Account.fromPrivateKey({ privateKey: new Ed25519PrivateKey(process.env.PAYMENT_PROCESSOR_PRIVATE_KEY || '0x924c5893522a929693538af5ace224c0419d278c46b6f7b97d144520bb6c4af7') });
  const CONTRACT = '0x2339acd68a5b699c8bfefed62febcf497959ca55527227e980c56031b3bfced9';
  const EVENT = req.body.eventAddress || '0x9a434df612a05061f3404dd1fbf2f6035457dfd93caabb3b7034261c92b0a67a';
  const buyer = req.body.buyerAddress || account.accountAddress.toString();
  
  try {
    const tx = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: { function: `${CONTRACT}::ticket::mint_ticket`, typeArguments: [], functionArguments: [EVENT, buyer] }
    });
    const pending = await aptos.signAndSubmitTransaction({ signer: account, transaction: tx });
    const result = await aptos.waitForTransaction({ transactionHash: pending.hash });
    res.json({ success: true, txHash: pending.hash, explorer: `https://explorer.movementlabs.xyz/txn/${pending.hash}?network=bardock+testnet` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// ============================================
// START SERVER
// ============================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ChainTicket Backend running on port ${PORT}`);
  console.log(`📊 Database: DynamoDB`);
  console.log(`⛓️ Blockchain: Movement Network`);
});

export default app;
