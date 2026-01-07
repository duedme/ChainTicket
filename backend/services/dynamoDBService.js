// backend/services/dynamoDBService.js
// ============================================
// Servicio de DynamoDB para ChainTicket
// Single-Table Design para App Data
// ============================================

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  GetCommand, 
  PutCommand, 
  QueryCommand, 
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
  BatchWriteCommand 
} from '@aws-sdk/lib-dynamodb';

// Configuración del cliente
// En EC2 usa el IAM Role automáticamente, en local usa variables de entorno
const clientConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
};

// Solo agregar credenciales si están definidas (para desarrollo local)
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  clientConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

const client = new DynamoDBClient(clientConfig);

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

// Nombres de tablas
const TABLES = {
  APP_DATA: process.env.DYNAMODB_TABLE_APP_DATA || 'chainticket-app-data-dev',
  BUSINESS_METRICS: process.env.DYNAMODB_TABLE_BUSINESS_METRICS || 'chainticket-business-metrics-dev',
  SALES_HISTORY: process.env.DYNAMODB_TABLE_SALES_HISTORY || 'chainticket-sales-history-dev',
  AI_CONVERSATIONS: process.env.DYNAMODB_TABLE_AI_CONVERSATIONS || 'chainticket-ai-conversations-dev',
};

// ============================================
// USERS
// ============================================

export async function getUserByPrivyId(privyId) {
  const command = new GetCommand({
    TableName: TABLES.APP_DATA,
    Key: { pk: `USER#${privyId}`, sk: 'PROFILE' },
  });
  const response = await docClient.send(command);
  return response.Item;
}

export async function createOrUpdateUser(userData) {
  const { privyId, walletAddress, userType, profile } = userData;
  const now = new Date().toISOString();
  
  const item = {
    pk: `USER#${privyId}`,
    sk: 'PROFILE',
    gsi1pk: 'USERS',
    gsi1sk: `USER#${privyId}`,
    gsi2pk: userType === 'vendor' ? 'VENDORS_USERS' : 'CLIENT_USERS',
    gsi2sk: `USER#${privyId}`,
    privyId,
    walletAddress,
    userType: userType || 'user',
    fullName: profile?.fullName || null,
    email: profile?.email || null,
    phone: profile?.phone || null,
    location: profile?.location || null,
    businessName: profile?.businessName || null,
    businessCategory: profile?.businessCategory || null,
    profileComplete: !!profile?.fullName,
    createdAt: now,
    updatedAt: now,
  };

  const command = new PutCommand({ TableName: TABLES.APP_DATA, Item: item });
  await docClient.send(command);
  return item;
}

export async function updateUser(privyId, updates) {
  const existing = await getUserByPrivyId(privyId);
  if (!existing) return null;
  
  const item = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  const command = new PutCommand({ TableName: TABLES.APP_DATA, Item: item });
  await docClient.send(command);
  return item;
}

// ============================================
// VENDORS
// ============================================

export async function getAllVendors() {
  const command = new QueryCommand({
    TableName: TABLES.APP_DATA,
    IndexName: 'GSI1',
    KeyConditionExpression: 'gsi1pk = :pk',
    ExpressionAttributeValues: { ':pk': 'VENDORS' },
  });
  const response = await docClient.send(command);
  return response.Items || [];
}

export async function getVendorById(vendorId) {
  const command = new GetCommand({
    TableName: TABLES.APP_DATA,
    Key: { pk: `VENDOR#${vendorId}`, sk: 'META' },
  });
  const response = await docClient.send(command);
  return response.Item;
}

export async function createVendor(vendorData) {
  const { ownerId, ownerPrivyId, name, type, image, description, vendorType, queueStrategy, avgServiceTime, usesCart } = vendorData;
  const vendorId = `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const now = new Date().toISOString();

  const item = {
    pk: `VENDOR#${vendorId}`,
    sk: 'META',
    gsi1pk: 'VENDORS',
    gsi1sk: `VENDOR#${vendorId}`,
    gsi2pk: `OWNER#${ownerPrivyId || ownerId}`,
    gsi2sk: `VENDOR#${vendorId}`,
    id: vendorId,
    ownerId,
    ownerPrivyId,
    name,
    type,
    image,
    description,
    vendorType: vendorType || 'queue',
    queueStrategy: queueStrategy || 'per_service',
    avgServiceTime: avgServiceTime || 30,
    usesCart: usesCart || false,
    createdAt: now,
    updatedAt: now,
  };

  const command = new PutCommand({ TableName: TABLES.APP_DATA, Item: item });
  await docClient.send(command);
  return item;
}

export async function updateVendorSettings(vendorId, settings) {
  const existing = await getVendorById(vendorId);
  if (!existing) return null;
  
  const item = { ...existing, ...settings, updatedAt: new Date().toISOString() };
  const command = new PutCommand({ TableName: TABLES.APP_DATA, Item: item });
  await docClient.send(command);
  return item;
}

export async function deleteVendor(vendorId) {
  const command = new DeleteCommand({
    TableName: TABLES.APP_DATA,
    Key: { pk: `VENDOR#${vendorId}`, sk: 'META' },
  });
  await docClient.send(command);
  return { success: true };
}

// ============================================
// SERVICES
// ============================================

export async function getAllServices(filters = {}) {
  let command;
  
  if (filters.vendorId) {
    command = new QueryCommand({
      TableName: TABLES.APP_DATA,
      IndexName: 'GSI2',
      KeyConditionExpression: 'gsi2pk = :pk',
      ExpressionAttributeValues: { ':pk': `VENDOR#${filters.vendorId}` },
    });
  } else {
    command = new QueryCommand({
      TableName: TABLES.APP_DATA,
      IndexName: 'GSI1',
      KeyConditionExpression: 'gsi1pk = :pk',
      ExpressionAttributeValues: { ':pk': 'SERVICES' },
    });
  }
  
  const response = await docClient.send(command);
  let services = response.Items || [];
  
  if (filters.activeOnly) {
    services = services.filter(s => s.isActive);
  }
  
  return services;
}

export async function getServicesByOwner(ownerPrivyId) {
  const command = new QueryCommand({
    TableName: TABLES.APP_DATA,
    IndexName: 'GSI2',
    KeyConditionExpression: 'gsi2pk = :pk',
    ExpressionAttributeValues: { ':pk': `OWNER#${ownerPrivyId}` },
  });
  const response = await docClient.send(command);
  return (response.Items || []).filter(item => item.pk.startsWith('SERVICE#'));
}

export async function getServiceById(serviceId) {
  const command = new GetCommand({
    TableName: TABLES.APP_DATA,
    Key: { pk: `SERVICE#${serviceId}`, sk: 'META' },
  });
  const response = await docClient.send(command);
  return response.Item;
}

export async function createService(serviceData) {
  const { ownerPrivyId, vendorId, title, description, image, avgTime, totalStock, price, schedule, isActive } = serviceData;
  const serviceId = `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const now = new Date().toISOString();

  const item = {
    pk: `SERVICE#${serviceId}`,
    sk: 'META',
    gsi1pk: 'SERVICES',
    gsi1sk: `SERVICE#${serviceId}`,
    gsi2pk: vendorId ? `VENDOR#${vendorId}` : `OWNER#${ownerPrivyId}`,
    gsi2sk: `SERVICE#${serviceId}`,
    id: serviceId,
    ownerPrivyId,
    vendorId,
    title,
    description: description || '',
    image: image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
    avgTime: avgTime || 30,
    totalStock: totalStock || 100,
    sold: 0,
    price: price || 0,
    isActive: isActive !== undefined ? isActive : true,
    scheduleOpenTime: schedule?.openTime || '09:00',
    scheduleCloseTime: schedule?.closeTime || '18:00',
    scheduleDays: schedule?.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    createdAt: now,
    updatedAt: now,
  };

  const command = new PutCommand({ TableName: TABLES.APP_DATA, Item: item });
  await docClient.send(command);
  return item;
}

export async function updateService(serviceId, updates) {
  const existing = await getServiceById(serviceId);
  if (!existing) return null;
  
  const item = { 
    ...existing, 
    ...updates,
    scheduleOpenTime: updates.schedule?.openTime || existing.scheduleOpenTime,
    scheduleCloseTime: updates.schedule?.closeTime || existing.scheduleCloseTime,
    scheduleDays: updates.schedule?.days || existing.scheduleDays,
    updatedAt: new Date().toISOString() 
  };
  delete item.schedule;
  
  const command = new PutCommand({ TableName: TABLES.APP_DATA, Item: item });
  await docClient.send(command);
  return item;
}

export async function toggleServiceActive(serviceId) {
  const existing = await getServiceById(serviceId);
  if (!existing) return null;
  
  const item = { ...existing, isActive: !existing.isActive, updatedAt: new Date().toISOString() };
  const command = new PutCommand({ TableName: TABLES.APP_DATA, Item: item });
  await docClient.send(command);
  return item;
}

export async function deleteService(serviceId) {
  const command = new DeleteCommand({
    TableName: TABLES.APP_DATA,
    Key: { pk: `SERVICE#${serviceId}`, sk: 'META' },
  });
  await docClient.send(command);
  return { success: true };
}

export async function incrementServiceSold(serviceId, quantity) {
  const existing = await getServiceById(serviceId);
  if (!existing) return null;
  
  const item = { ...existing, sold: (existing.sold || 0) + quantity, updatedAt: new Date().toISOString() };
  const command = new PutCommand({ TableName: TABLES.APP_DATA, Item: item });
  await docClient.send(command);
  return item;
}

// ============================================
// ORDERS
// ============================================

export async function getOrdersByUser(userPrivyId, status = null) {
  const command = new QueryCommand({
    TableName: TABLES.APP_DATA,
    IndexName: 'GSI2',
    KeyConditionExpression: 'gsi2pk = :pk',
    ExpressionAttributeValues: { ':pk': `USER#${userPrivyId}` },
  });
  const response = await docClient.send(command);
  let orders = (response.Items || []).filter(item => item.pk.startsWith('ORDER#'));
  
  if (status) {
    orders = orders.filter(o => o.status === status);
  }
  return orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getOrdersByVendor(vendorId, status = null) {
  const command = new QueryCommand({
    TableName: TABLES.APP_DATA,
    IndexName: 'GSI1',
    KeyConditionExpression: 'gsi1pk = :pk',
    ExpressionAttributeValues: { ':pk': `VENDOR_ORDERS#${vendorId}` },
  });
  const response = await docClient.send(command);
  let orders = response.Items || [];
  
  if (status) {
    orders = orders.filter(o => o.status === status);
  }
  return orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getOrderById(orderId) {
  const command = new GetCommand({
    TableName: TABLES.APP_DATA,
    Key: { pk: `ORDER#${orderId}`, sk: 'META' },
  });
  const response = await docClient.send(command);
  return response.Item;
}

export async function getPendingOrdersCount(vendorId = null) {
  const command = new QueryCommand({
    TableName: TABLES.APP_DATA,
    IndexName: 'GSI1',
    KeyConditionExpression: 'gsi1pk = :pk',
    ExpressionAttributeValues: { ':pk': vendorId ? `VENDOR_ORDERS#${vendorId}` : 'ORDERS' },
  });
  const response = await docClient.send(command);
  const orders = (response.Items || []).filter(o => o.status === 'pending');
  return {
    count: orders.length,
    totalWait: orders.reduce((sum, o) => sum + (o.estimatedWait || 0), 0)
  };
}

export async function createOrder(orderData) {
  const { 
    userPrivyId, 
    vendorId, 
    items, 
    totalAmount, 
    queuePosition, 
    estimatedWait,
    // x402
    paymentTxHash,
    paymentMethod,
    buyerAddress
  } = orderData;
  
  const orderId = `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;
  const now = new Date().toISOString();

  const order = {
    pk: `ORDER#${orderId}`,
    sk: 'META',
    gsi1pk: vendorId ? `VENDORORDERS#${vendorId}` : 'ORDERS',
    gsi1sk: `ORDER#${now}`,
    gsi2pk: `USER#${userPrivyId}`,
    gsi2sk: `ORDER#${orderId}`,
    id: orderId,
    orderNumber,
    userPrivyId,
    vendorId,
    items,
    status: 'pending',
    estimatedWait: estimatedWait || 0,
    queuePosition: queuePosition || 1,
    totalAmount: totalAmount || 0,
    // x402
    paymentTxHash: paymentTxHash || null,
    paymentMethod: paymentMethod || 'free',
    buyerAddress: buyerAddress || null,
    createdAt: now,
    updatedAt: now,
  };

  const command = new PutCommand({
    TableName: TABLES.APPDATA,
    Item: order
  });
  
  await docClient.send(command);
  return order;
}

export async function updateOrderStatus(orderId, status) {
  const existing = await getOrderById(orderId);
  if (!existing) return null;
  
  const updates = { status, updatedAt: new Date().toISOString() };
  if (status === 'accepted') updates.acceptedAt = new Date().toISOString();
  if (status === 'completed') updates.completedAt = new Date().toISOString();
  
  const item = { ...existing, ...updates };
  const command = new PutCommand({ TableName: TABLES.APP_DATA, Item: item });
  await docClient.send(command);
  return item;
}

export async function getQueueInfo(vendorId = null) {
  const pending = await getPendingOrdersCount(vendorId);
  return {
    pending_orders: pending.count,
    total_wait_time: pending.totalWait,
    completed_today: 0 // Simplified for now
  };
}

// ============================================
// TICKETS
// ============================================

export async function getTicketsByUser(userPrivyId) {
  const command = new QueryCommand({
    TableName: TABLES.APP_DATA,
    IndexName: 'GSI2',
    KeyConditionExpression: 'gsi2pk = :pk',
    ExpressionAttributeValues: { ':pk': `USER#${userPrivyId}` },
  });
  const response = await docClient.send(command);
  return (response.Items || [])
    .filter(item => item.pk.startsWith('TICKET#'))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getTicketById(ticketId) {
  const command = new GetCommand({
    TableName: TABLES.APP_DATA,
    Key: { pk: `TICKET#${ticketId}`, sk: 'META' },
  });
  const response = await docClient.send(command);
  return response.Item;
}

export async function createTicket(ticketData) {
  const { orderItemId, userPrivyId, serviceId, serviceName, vendorId, blockchainAddress, txHash, qrHash } = ticketData;
  const ticketId = `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const ticketNumber = `TKT-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const now = new Date().toISOString();

  const ticket = {
    pk: `TICKET#${ticketId}`,
    sk: 'META',
    gsi1pk: 'TICKETS',
    gsi1sk: `TICKET#${ticketId}`,
    gsi2pk: `USER#${userPrivyId}`,
    gsi2sk: `TICKET#${ticketId}`,
    id: ticketId,
    ticketNumber,
    orderItemId,
    userPrivyId,
    serviceId,
    serviceName,
    vendorId,
    blockchainAddress,
    txHash,
    qrHash: qrHash || `${ticketId}-${Date.now()}`,
    status: 'active',
    isUsed: false,
    createdAt: now,
  };

  const command = new PutCommand({ TableName: TABLES.APP_DATA, Item: ticket });
  await docClient.send(command);
  return ticket;
}

export async function useTicket(ticketId) {
  const existing = await getTicketById(ticketId);
  if (!existing) return null;
  
  const item = { 
    ...existing, 
    isUsed: true, 
    usedAt: new Date().toISOString(), 
    status: 'used' 
  };
  const command = new PutCommand({ TableName: TABLES.APP_DATA, Item: item });
  await docClient.send(command);
  return item;
}

export async function validateTicket(ticketId, qrHash) {
  const ticket = await getTicketById(ticketId);
  if (!ticket || ticket.qrHash !== qrHash) {
    return { valid: false, error: 'Invalid ticket or QR code' };
  }
  if (ticket.isUsed) {
    return { valid: false, error: 'Ticket already used', ticket };
  }
  return { valid: true, ticket };
}

// ============================================
// SEED DATA
// ============================================

export async function seedData() {
  const now = new Date().toISOString();
  
  // Check if data already exists
  const existingVendors = await getAllVendors();
  if (existingVendors.length > 0) {
    return { success: true, message: 'Seed data already exists' };
  }

  // Users (Vendors/Admins)
  const users = [
    { privyId: 'demo_events_admin', walletAddress: '0xDemo1234567890EventsAdmin1234567890ABCDEF', userType: 'vendor', fullName: 'Carlos Eventos', email: 'carlos@eliteevents.com', phone: '+52 55 1234 5678', location: 'Ciudad de Mexico', businessName: 'Elite Events' },
    { privyId: 'demo_restaurant_admin', walletAddress: '0xDemo1234567890RestaurantAdmin1234567890AB', userType: 'vendor', fullName: 'Maria Garcia', email: 'maria@premiumsteakhouse.com', phone: '+52 55 2345 6789', location: 'Polanco, CDMX', businessName: 'Premium Steakhouse' },
    { privyId: 'demo_bar_admin', walletAddress: '0xDemo1234567890BarAdmin1234567890ABCDEFGH', userType: 'vendor', fullName: 'Roberto Martinez', email: 'roberto@goldenbar.com', phone: '+52 55 3456 7890', location: 'Roma Norte, CDMX', businessName: 'Golden Bar & Lounge' },
    { privyId: 'demo_spa_admin', walletAddress: '0xDemo1234567890SpaAdmin1234567890ABCDEFGH', userType: 'vendor', fullName: 'Laura Belleza', email: 'laura@luxuryspa.com', phone: '+52 55 4567 8901', location: 'Santa Fe, CDMX', businessName: 'Luxury Spa & Beauty' },
    { privyId: 'demo_super_admin', walletAddress: '0xDemo1234567890SuperAdmin1234567890ABCDEF', userType: 'vendor', fullName: 'Pedro Mercado', email: 'pedro@megasuper.com', phone: '+52 55 5678 9012', location: 'Insurgentes, CDMX', businessName: 'MegaSuper Express' },
    { privyId: 'demo_menu_admin', walletAddress: '0xDemo1234567890MenuAdmin1234567890ABCDEFG', userType: 'vendor', fullName: 'Chef Antonio', email: 'antonio@latrattoria.com', phone: '+52 55 6789 0123', location: 'Condesa, CDMX', businessName: 'La Trattoria Italiana' },
  ];

  // Vendors with fixed IDs
  const vendors = [
    { id: '1', ownerPrivyId: 'demo_events_admin', name: 'Elite Events', type: 'Social Events', image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800', description: 'Exclusive social events and premium experiences', vendorType: 'events' },
    { id: '2', ownerPrivyId: 'demo_restaurant_admin', name: 'Premium Steakhouse', type: 'Restaurant', image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800', description: 'Fine dining steakhouse with world-class cuisine', vendorType: 'restaurant' },
    { id: '3', ownerPrivyId: 'demo_bar_admin', name: 'Golden Bar & Lounge', type: 'Bar', image: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800', description: 'Premium cocktail bar and lounge', vendorType: 'bar' },
    { id: '4', ownerPrivyId: 'demo_spa_admin', name: 'Luxury Spa & Beauty', type: 'Spa', image: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=800', description: 'Premium spa and beauty services', vendorType: 'spa_beauty', usesCart: true },
    { id: '5', ownerPrivyId: 'demo_super_admin', name: 'MegaSuper Express', type: 'Supermarket', image: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800', description: 'Fast checkout virtual queue', vendorType: 'supermarket', queueStrategy: 'queue_only', avgServiceTime: 5 },
    { id: '6', ownerPrivyId: 'demo_menu_admin', name: 'La Trattoria Italiana', type: 'Restaurant Menu', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800', description: 'Authentic Italian cuisine with full menu', vendorType: 'restaurant_menu', usesCart: true },
  ];

  // Services
  const services = [
    // Elite Events (vendor 1)
    { vendorId: '1', ownerPrivyId: 'demo_events_admin', title: 'VIP Gala Night', description: 'Exclusive black-tie gala with live orchestra and gourmet dinner', image: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=800', avgTime: 240, totalStock: 200, price: 150.00, scheduleOpenTime: '19:00', scheduleCloseTime: '02:00', scheduleDays: ['Friday', 'Saturday'] },
    { vendorId: '1', ownerPrivyId: 'demo_events_admin', title: 'Networking Cocktail Party', description: 'Premium networking event with open bar and appetizers', image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800', avgTime: 180, totalStock: 100, price: 75.00, scheduleOpenTime: '18:00', scheduleCloseTime: '23:00', scheduleDays: ['Thursday', 'Friday'] },
    { vendorId: '1', ownerPrivyId: 'demo_events_admin', title: 'Live Concert Experience', description: 'Intimate concert with top artists and VIP seating', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800', avgTime: 180, totalStock: 500, price: 85.00, scheduleOpenTime: '20:00', scheduleCloseTime: '01:00', scheduleDays: ['Friday', 'Saturday'] },
    { vendorId: '1', ownerPrivyId: 'demo_events_admin', title: 'Art Exhibition Opening', description: 'Exclusive preview of contemporary art with wine tasting', image: 'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=800', avgTime: 120, totalStock: 80, price: 45.00, scheduleOpenTime: '17:00', scheduleCloseTime: '22:00', scheduleDays: ['Wednesday', 'Thursday', 'Friday'] },
    { vendorId: '1', ownerPrivyId: 'demo_events_admin', title: 'Rooftop Party', description: 'Sunset rooftop party with DJ and panoramic city views', image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800', avgTime: 240, totalStock: 150, price: 60.00, scheduleOpenTime: '18:00', scheduleCloseTime: '02:00', scheduleDays: ['Friday', 'Saturday', 'Sunday'] },
    { vendorId: '1', ownerPrivyId: 'demo_events_admin', title: 'Wine Tasting Soiree', description: 'Curated wine tasting with sommelier and cheese pairing', image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800', avgTime: 150, totalStock: 40, price: 95.00, scheduleOpenTime: '19:00', scheduleCloseTime: '23:00', scheduleDays: ['Thursday', 'Friday', 'Saturday'] },
    
    // Premium Steakhouse (vendor 2)
    { vendorId: '2', ownerPrivyId: 'demo_restaurant_admin', title: 'Chef Table Experience', description: 'Exclusive 7-course tasting menu at the chef table', image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800', avgTime: 180, totalStock: 8, price: 250.00, scheduleOpenTime: '19:00', scheduleCloseTime: '23:00', scheduleDays: ['Wednesday', 'Thursday', 'Friday', 'Saturday'] },
    { vendorId: '2', ownerPrivyId: 'demo_restaurant_admin', title: 'Weekend Brunch Reservation', description: 'Gourmet brunch with bottomless mimosas', image: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=800', avgTime: 120, totalStock: 50, price: 65.00, scheduleOpenTime: '10:00', scheduleCloseTime: '15:00', scheduleDays: ['Saturday', 'Sunday'] },
    { vendorId: '2', ownerPrivyId: 'demo_restaurant_admin', title: 'Private Dining Room', description: 'Exclusive private room for special occasions', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800', avgTime: 180, totalStock: 4, price: 500.00, scheduleOpenTime: '18:00', scheduleCloseTime: '23:00', scheduleDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] },
    { vendorId: '2', ownerPrivyId: 'demo_restaurant_admin', title: 'Prime Steak Dinner', description: 'Premium USDA Prime ribeye dinner for two', image: 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=800', avgTime: 90, totalStock: 30, price: 180.00, scheduleOpenTime: '17:00', scheduleCloseTime: '22:00', scheduleDays: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] },
    { vendorId: '2', ownerPrivyId: 'demo_restaurant_admin', title: 'Wine Pairing Dinner', description: '5-course dinner with premium wine pairings', image: 'https://images.unsplash.com/photo-1516594798947-e65505dbb29d?w=800', avgTime: 150, totalStock: 20, price: 195.00, scheduleOpenTime: '19:00', scheduleCloseTime: '23:00', scheduleDays: ['Thursday', 'Friday', 'Saturday'] },
    
    // Golden Bar (vendor 3)
    { vendorId: '3', ownerPrivyId: 'demo_bar_admin', title: 'VIP Table Reservation', description: 'Premium table with bottle service and dedicated waitress', image: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800', avgTime: 240, totalStock: 10, price: 300.00, scheduleOpenTime: '21:00', scheduleCloseTime: '04:00', scheduleDays: ['Thursday', 'Friday', 'Saturday'] },
    { vendorId: '3', ownerPrivyId: 'demo_bar_admin', title: 'Cocktail Masterclass', description: 'Learn to craft signature cocktails with our mixologist', image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800', avgTime: 120, totalStock: 12, price: 85.00, scheduleOpenTime: '18:00', scheduleCloseTime: '20:00', scheduleDays: ['Tuesday', 'Wednesday', 'Thursday'] },
    { vendorId: '3', ownerPrivyId: 'demo_bar_admin', title: 'Happy Hour Pass', description: '2-for-1 drinks and appetizers during happy hour', image: 'https://images.unsplash.com/photo-1575444758702-4a6b9222336e?w=800', avgTime: 120, totalStock: 100, price: 25.00, scheduleOpenTime: '17:00', scheduleCloseTime: '20:00', scheduleDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
    { vendorId: '3', ownerPrivyId: 'demo_bar_admin', title: 'Live Jazz Night', description: 'Exclusive entry to live jazz performance with welcome drink', image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800', avgTime: 180, totalStock: 60, price: 40.00, scheduleOpenTime: '20:00', scheduleCloseTime: '01:00', scheduleDays: ['Friday', 'Saturday'] },
    { vendorId: '3', ownerPrivyId: 'demo_bar_admin', title: 'Whiskey Tasting Flight', description: 'Premium whiskey tasting with 5 rare selections', image: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=800', avgTime: 90, totalStock: 20, price: 75.00, scheduleOpenTime: '19:00', scheduleCloseTime: '23:00', scheduleDays: ['Wednesday', 'Thursday', 'Friday', 'Saturday'] },
    
    // Luxury Spa (vendor 4)
    { vendorId: '4', ownerPrivyId: 'demo_spa_admin', title: 'Manicure & Pedicure', description: 'Complete nail care with premium polish', image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800', avgTime: 60, totalStock: 20, price: 45.00, scheduleOpenTime: '09:00', scheduleCloseTime: '20:00', scheduleDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] },
    { vendorId: '4', ownerPrivyId: 'demo_spa_admin', title: 'Haircut & Styling', description: 'Professional haircut with wash and style', image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800', avgTime: 45, totalStock: 15, price: 55.00, scheduleOpenTime: '09:00', scheduleCloseTime: '20:00', scheduleDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] },
    { vendorId: '4', ownerPrivyId: 'demo_spa_admin', title: 'Full Body Massage', description: 'Relaxing 60-minute full body massage', image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800', avgTime: 75, totalStock: 10, price: 85.00, scheduleOpenTime: '10:00', scheduleCloseTime: '19:00', scheduleDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
    { vendorId: '4', ownerPrivyId: 'demo_spa_admin', title: 'Facial Treatment', description: 'Deep cleansing facial with premium products', image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800', avgTime: 50, totalStock: 12, price: 65.00, scheduleOpenTime: '09:00', scheduleCloseTime: '18:00', scheduleDays: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] },
    { vendorId: '4', ownerPrivyId: 'demo_spa_admin', title: 'Hair Coloring', description: 'Professional hair coloring service', image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800', avgTime: 120, totalStock: 8, price: 120.00, scheduleOpenTime: '10:00', scheduleCloseTime: '18:00', scheduleDays: ['Wednesday', 'Thursday', 'Friday', 'Saturday'] },
    
    // La Trattoria (vendor 6 - menu items)
    { vendorId: '6', ownerPrivyId: 'demo_menu_admin', title: 'Pasta Carbonara', description: 'Classic Roman pasta with guanciale and pecorino', image: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800', avgTime: 25, totalStock: 50, price: 18.00, scheduleOpenTime: '12:00', scheduleCloseTime: '23:00', scheduleDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
    { vendorId: '6', ownerPrivyId: 'demo_menu_admin', title: 'Margherita Pizza', description: 'Traditional pizza with fresh mozzarella and basil', image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800', avgTime: 20, totalStock: 100, price: 16.00, scheduleOpenTime: '12:00', scheduleCloseTime: '23:00', scheduleDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
    { vendorId: '6', ownerPrivyId: 'demo_menu_admin', title: 'Tiramisu', description: 'Authentic Italian dessert with mascarpone', image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800', avgTime: 5, totalStock: 30, price: 9.00, scheduleOpenTime: '12:00', scheduleCloseTime: '23:00', scheduleDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
    { vendorId: '6', ownerPrivyId: 'demo_menu_admin', title: 'Bruschetta', description: 'Toasted bread with tomatoes and fresh basil', image: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=800', avgTime: 10, totalStock: 40, price: 8.00, scheduleOpenTime: '12:00', scheduleCloseTime: '23:00', scheduleDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
    { vendorId: '6', ownerPrivyId: 'demo_menu_admin', title: 'Risotto ai Funghi', description: 'Creamy mushroom risotto with parmesan', image: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800', avgTime: 30, totalStock: 25, price: 22.00, scheduleOpenTime: '12:00', scheduleCloseTime: '23:00', scheduleDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
    { vendorId: '6', ownerPrivyId: 'demo_menu_admin', title: 'Italian Red Wine', description: 'House Chianti by the glass', image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800', avgTime: 2, totalStock: 200, price: 12.00, scheduleOpenTime: '12:00', scheduleCloseTime: '23:00', scheduleDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
    { vendorId: '6', ownerPrivyId: 'demo_menu_admin', title: 'Espresso', description: 'Traditional Italian espresso', image: 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=800', avgTime: 3, totalStock: 200, price: 4.00, scheduleOpenTime: '12:00', scheduleCloseTime: '23:00', scheduleDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
  ];

  // Batch write users
  for (const user of users) {
    const userItem = {
      pk: `USER#${user.privyId}`,
      sk: 'PROFILE',
      gsi1pk: 'USERS',
      gsi1sk: `USER#${user.privyId}`,
      gsi2pk: 'VENDORS_USERS',
      gsi2sk: `USER#${user.privyId}`,
      privyId: user.privyId,
      walletAddress: user.walletAddress,
      userType: user.userType,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      location: user.location,
      businessName: user.businessName,
      profileComplete: true,
      createdAt: now,
      updatedAt: now,
    };
    await docClient.send(new PutCommand({ TableName: TABLES.APP_DATA, Item: userItem }));
  }

  // Batch write vendors
  for (const vendor of vendors) {
    const vendorItem = {
      pk: `VENDOR#${vendor.id}`,
      sk: 'META',
      gsi1pk: 'VENDORS',
      gsi1sk: `VENDOR#${vendor.id}`,
      gsi2pk: `OWNER#${vendor.ownerPrivyId}`,
      gsi2sk: `VENDOR#${vendor.id}`,
      id: vendor.id,
      ownerPrivyId: vendor.ownerPrivyId,
      name: vendor.name,
      type: vendor.type,
      image: vendor.image,
      description: vendor.description,
      vendorType: vendor.vendorType || 'queue',
      queueStrategy: vendor.queueStrategy || 'per_service',
      avgServiceTime: vendor.avgServiceTime || 30,
      usesCart: vendor.usesCart || false,
      createdAt: now,
      updatedAt: now,
    };
    await docClient.send(new PutCommand({ TableName: TABLES.APP_DATA, Item: vendorItem }));
  }

  // Batch write services
  for (const service of services) {
    const serviceId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const serviceItem = {
      pk: `SERVICE#${serviceId}`,
      sk: 'META',
      gsi1pk: 'SERVICES',
      gsi1sk: `SERVICE#${serviceId}`,
      gsi2pk: `VENDOR#${service.vendorId}`,
      gsi2sk: `SERVICE#${serviceId}`,
      id: serviceId,
      ownerPrivyId: service.ownerPrivyId,
      vendorId: service.vendorId,
      title: service.title,
      description: service.description,
      image: service.image,
      avgTime: service.avgTime,
      totalStock: service.totalStock,
      sold: 0,
      price: service.price,
      isActive: true,
      scheduleOpenTime: service.scheduleOpenTime,
      scheduleCloseTime: service.scheduleCloseTime,
      scheduleDays: service.scheduleDays,
      createdAt: now,
      updatedAt: now,
    };
    await docClient.send(new PutCommand({ TableName: TABLES.APP_DATA, Item: serviceItem }));
  }

  return {
    success: true,
    message: 'Seed data created successfully',
    data: { users: users.length, vendors: vendors.length, services: services.length }
  };
}

// ============================================
// BUSINESS METRICS (AI Context) - Keep existing
// ============================================

export async function getBusinessMetrics(businessId) {
  const command = new GetCommand({
    TableName: TABLES.BUSINESS_METRICS,
    Key: { pk: `BUSINESS#${businessId}`, sk: 'METRICS' },
  });
  const response = await docClient.send(command);
  return response.Item;
}

export async function saveBusinessMetrics(businessId, metrics) {
  const command = new PutCommand({
    TableName: TABLES.BUSINESS_METRICS,
    Item: {
      pk: `BUSINESS#${businessId}`,
      sk: 'METRICS',
      businessId,
      ...metrics,
      updatedAt: new Date().toISOString(),
    },
  });
  await docClient.send(command);
  return { success: true };
}

export async function getWeeklyHistory(businessId, weeksBack = 8) {
  const command = new QueryCommand({
    TableName: TABLES.BUSINESS_METRICS,
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
    ExpressionAttributeValues: { ':pk': `BUSINESS#${businessId}`, ':prefix': 'WEEK#' },
    ScanIndexForward: false,
    Limit: weeksBack,
  });
  const response = await docClient.send(command);
  return response.Items || [];
}

export async function saveWeeklyData(businessId, weekId, data) {
  const command = new PutCommand({
    TableName: TABLES.BUSINESS_METRICS,
    Item: {
      pk: `BUSINESS#${businessId}`,
      sk: `WEEK#${weekId}`,
      businessId,
      weekId,
      ...data,
      createdAt: new Date().toISOString(),
    },
  });
  await docClient.send(command);
  return { success: true };
}

// ============================================
// SALES HISTORY
// ============================================

export async function recordSale(businessId, saleData) {
  const timestamp = new Date().toISOString();
  const saleId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const command = new PutCommand({
    TableName: TABLES.SALES_HISTORY,
    Item: {
      pk: `BUSINESS#${businessId}`,
      sk: `SALE#${timestamp}`,
      saleId,
      businessId,
      saleDate: timestamp.split('T')[0],
      ...saleData,
      createdAt: timestamp,
    },
  });

  await docClient.send(command);
  return { success: true, saleId };
}

export async function getSalesByDateRange(businessId, startDate, endDate) {
  const command = new QueryCommand({
    TableName: TABLES.SALES_HISTORY,
    KeyConditionExpression: 'pk = :pk AND sk BETWEEN :start AND :end',
    ExpressionAttributeValues: {
      ':pk': `BUSINESS#${businessId}`,
      ':start': `SALE#${startDate}`,
      ':end': `SALE#${endDate}Z`,
    },
  });
  const response = await docClient.send(command);
  return response.Items || [];
}

export async function saveDailyAggregate(businessId, date, aggregates) {
  const command = new PutCommand({
    TableName: TABLES.SALES_HISTORY,
    Item: {
      pk: `BUSINESS#${businessId}`,
      sk: `DAY#${date}`,
      businessId,
      date,
      saleDate: date,
      ...aggregates,
      updatedAt: new Date().toISOString(),
    },
  });
  await docClient.send(command);
  return { success: true };
}

// ============================================
// AI CONVERSATIONS
// ============================================

export async function saveAIConversation(businessId, conversation) {
  const timestamp = new Date().toISOString();
  const command = new PutCommand({
    TableName: TABLES.AI_CONVERSATIONS,
    Item: {
      pk: `BUSINESS#${businessId}`,
      sk: `CONV#${timestamp}`,
      businessId,
      ...conversation,
      createdAt: timestamp,
      expiresAt: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60),
    },
  });
  await docClient.send(command);
  return { success: true };
}

export async function getRecentConversations(businessId, limit = 10) {
  const command = new QueryCommand({
    TableName: TABLES.AI_CONVERSATIONS,
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
    ExpressionAttributeValues: { ':pk': `BUSINESS#${businessId}`, ':prefix': 'CONV#' },
    ScanIndexForward: false,
    Limit: limit,
  });
  const response = await docClient.send(command);
  return response.Items || [];
}

export async function getBusinessContextForAI(businessId) {
  const [metrics, weeklyHistory, recentConversations] = await Promise.all([
    getBusinessMetrics(businessId),
    getWeeklyHistory(businessId, 4),
    getRecentConversations(businessId, 5),
  ]);
  return { metrics: metrics || {}, weeklyHistory, recentConversations, lastUpdated: new Date().toISOString() };
}

// Obtener resumen de ventas con info de pagos crypto para la IA
export async function getSalesMetricsForAI(businessId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const command = new QueryCommand({
    TableName: TABLES.SALES_HISTORY,
    KeyConditionExpression: 'pk = :pk AND sk >= :startDate',
    ExpressionAttributeValues: {
      ':pk': `BUSINESS#${businessId}`,
      ':startDate': `SALE#${startDate.toISOString()}`
    }
  });

  const result = await docClient.send(command);
  const sales = result.Items || [];

  // Calcular métricas
  const totalSales = sales.length;
  const totalRevenue = sales.reduce((sum, s) => sum + (s.amount || 0), 0);
  
  // Separar por método de pago
  const cryptoSales = sales.filter(s => s.paymentMethod === 'x402-usdc');
  const freeSales = sales.filter(s => s.paymentMethod === 'free' || !s.paymentMethod);
  
  const cryptoRevenue = cryptoSales.reduce((sum, s) => sum + (s.amount || 0), 0);
  const cryptoCount = cryptoSales.length;

  return {
    period: `${days} days`,
    totalSales,
    totalRevenue,
    // Métricas crypto específicas
    crypto: {
      salesCount: cryptoCount,
      revenue: cryptoRevenue,
      percentage: totalSales > 0 ? ((cryptoCount / totalSales) * 100).toFixed(1) : 0,
      recentTransactions: cryptoSales.slice(0, 5).map(s => ({
        txHash: s.paymentTxHash,
        amount: s.amount,
        date: s.createdAt
      }))
    },
    free: {
      salesCount: freeSales.length
    },
    // Para que la IA tenga contexto
    summary: `${totalSales} ventas totales ($${totalRevenue.toFixed(2)}). ` +
             `${cryptoCount} pagos crypto ($${cryptoRevenue.toFixed(2)} USDC via x402).`
  };
}

// ============================================
// TRANSACTIONS (Privy Wallet)
// ============================================

/**
 * Save a transaction record for a user's Privy wallet
 */
export async function saveTransaction(transactionData) {
  const { 
    walletAddress, 
    txHash, 
    type, // 'sent' or 'received'
    amount, 
    to, 
    from, 
    status, // 'pending', 'confirmed', 'failed'
    description,
    chainId = '250' // Movement testnet
  } = transactionData;

  const timestamp = Date.now();
  const now = new Date().toISOString();

  const item = {
    pk: `WALLET#${walletAddress}`,
    sk: `TX#${timestamp}#${txHash}`,
    gsi1pk: 'TRANSACTIONS',
    gsi1sk: `TX#${timestamp}`,
    gsi2pk: `STATUS#${status}`,
    gsi2sk: `TX#${timestamp}`,
    
    walletAddress,
    txHash,
    type,
    amount,
    to,
    from,
    status,
    description: description || null,
    chainId,
    timestamp,
    createdAt: now,
    updatedAt: now,
  };

  const command = new PutCommand({ TableName: TABLES.APP_DATA, Item: item });
  await docClient.send(command);
  return item;
}

/**
 * Get transactions for a wallet address
 */
export async function getTransactionsByWallet(walletAddress, limit = 50) {
  const command = new QueryCommand({
    TableName: TABLES.APP_DATA,
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
    ExpressionAttributeValues: {
      ':pk': `WALLET#${walletAddress}`,
      ':skPrefix': 'TX#',
    },
    ScanIndexForward: false, // Most recent first
    Limit: limit,
  });

  const response = await docClient.send(command);
  return response.Items || [];
}

/**
 * Update transaction status
 */
export async function updateTransactionStatus(walletAddress, txHash, status) {
  const transactions = await getTransactionsByWallet(walletAddress);
  const transaction = transactions.find(tx => tx.txHash === txHash);
  
  if (!transaction) {
    throw new Error('Transaction not found');
  }

  const updatedItem = {
    ...transaction,
    status,
    updatedAt: new Date().toISOString(),
  };

  const command = new PutCommand({ TableName: TABLES.APP_DATA, Item: updatedItem });
  await docClient.send(command);
  return updatedItem;
}

/**
 * Get transaction by hash
 */
export async function getTransactionByHash(txHash) {
  const command = new QueryCommand({
    TableName: TABLES.APP_DATA,
    IndexName: 'GSI1',
    KeyConditionExpression: 'gsi1pk = :gsi1pk',
    FilterExpression: 'txHash = :txHash',
    ExpressionAttributeValues: {
      ':gsi1pk': 'TRANSACTIONS',
      ':txHash': txHash,
    },
    Limit: 1,
  });

  const response = await docClient.send(command);
  return response.Items?.[0] || null;
}

/**
 * Get transactions by type (sent/received)
 */
export async function getTransactionsByType(walletAddress, type, limit = 50) {
  const allTransactions = await getTransactionsByWallet(walletAddress, 100);
  return allTransactions
    .filter(tx => tx.type === type)
    .slice(0, limit);
}

/**
 * Get pending transactions for a wallet
 */
export async function getPendingTransactions(walletAddress) {
  const allTransactions = await getTransactionsByWallet(walletAddress, 100);
  return allTransactions.filter(tx => tx.status === 'pending');
}

export default {
  // Users
  getUserByPrivyId, createOrUpdateUser, updateUser,
  // Vendors
  getAllVendors, getVendorById, createVendor, updateVendorSettings,
  // Services
  getAllServices, getServicesByOwner, getServiceById, createService, updateService, toggleServiceActive, deleteService, incrementServiceSold,
  // Orders
  getOrdersByUser, getOrdersByVendor, getOrderById, getPendingOrdersCount, createOrder, updateOrderStatus, getQueueInfo,
  // Tickets
  getTicketsByUser, getTicketById, createTicket, useTicket, validateTicket,
  // Seed
  seedData,
  // Business Metrics
  getBusinessMetrics, saveBusinessMetrics, getWeeklyHistory, saveWeeklyData,
  // Sales
  recordSale, getSalesByDateRange, saveDailyAggregate, getSalesMetricsForAI,
  // AI
  saveAIConversation, getRecentConversations, getBusinessContextForAI,
  // Transactions
  saveTransaction, getTransactionsByWallet, updateTransactionStatus, getTransactionByHash, getTransactionsByType, getPendingTransactions,
};
