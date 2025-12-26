import express from 'express';
import cors from 'cors';
import { Aptos, AptosConfig } from '@aptos-labs/ts-sdk';
import crypto from 'crypto';
import pg from 'pg';

const { Pool } = pg;

const app = express();
app.use(cors());
app.use(express.json());

// ============================================
// DATABASE CONFIGURATION
// ============================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ============================================
// USER ROUTES
// ============================================

// Get user by Privy ID
app.get('/api/users/:privyId', async (req, res) => {
  try {
    const { privyId } = req.params;
    const result = await pool.query(
      'SELECT * FROM users WHERE privy_id = $1',
      [privyId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ found: false });
    }
    
    res.json({ found: true, user: result.rows[0] });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create or update user
app.post('/api/users', async (req, res) => {
  try {
    const { privyId, walletAddress, userType, profile } = req.body;
    
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE privy_id = $1',
      [privyId]
    );
    
    if (existingUser.rows.length > 0) {
      // Update existing user
      const result = await pool.query(
        `UPDATE users SET 
          wallet_address = COALESCE($2, wallet_address),
          user_type = COALESCE($3, user_type),
          full_name = COALESCE($4, full_name),
          email = COALESCE($5, email),
          phone = COALESCE($6, phone),
          location = COALESCE($7, location),
          business_name = COALESCE($8, business_name),
          profile_complete = COALESCE($9, profile_complete),
          updated_at = CURRENT_TIMESTAMP
        WHERE privy_id = $1
        RETURNING *`,
        [
          privyId,
          walletAddress,
          userType,
          profile?.fullName,
          profile?.email,
          profile?.phone,
          profile?.location,
          profile?.businessName,
          profile?.fullName ? true : false
        ]
      );
      return res.json({ success: true, user: result.rows[0], isNew: false });
    }
    
    // Create new user
    const result = await pool.query(
      `INSERT INTO users (privy_id, wallet_address, user_type, full_name, email, phone, location, business_name, profile_complete)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        privyId,
        walletAddress,
        userType || 'user',
        profile?.fullName,
        profile?.email,
        profile?.phone,
        profile?.location,
        profile?.businessName,
        profile?.fullName ? true : false
      ]
    );
    
    res.json({ success: true, user: result.rows[0], isNew: true });
  } catch (error) {
    console.error('Error creating/updating user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
app.patch('/api/users/:privyId', async (req, res) => {
  try {
    const { privyId } = req.params;
    const { userType, profile } = req.body;
    
    const result = await pool.query(
      `UPDATE users SET 
        user_type = COALESCE($2, user_type),
        full_name = COALESCE($3, full_name),
        email = COALESCE($4, email),
        phone = COALESCE($5, phone),
        location = COALESCE($6, location),
        business_name = COALESCE($7, business_name),
        profile_complete = COALESCE($8, profile_complete),
        updated_at = CURRENT_TIMESTAMP
      WHERE privy_id = $1
      RETURNING *`,
      [
        privyId,
        userType,
        profile?.fullName,
        profile?.email,
        profile?.phone,
        profile?.location,
        profile?.businessName,
        profile?.fullName ? true : false
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SERVICES ROUTES
// ============================================

// Get all services (for clients to browse)
app.get('/api/services', async (req, res) => {
  try {
    const { vendorId, activeOnly } = req.query;
    let query = 'SELECT * FROM services';
    const params = [];
    const conditions = [];
    
    if (vendorId) {
      params.push(vendorId);
      conditions.push(`vendor_id = $${params.length}`);
    }
    if (activeOnly === 'true') {
      conditions.push('is_active = true');
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    res.json({ services: result.rows });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get services by owner (for admin dashboard)
app.get('/api/services/owner/:privyId', async (req, res) => {
  try {
    const { privyId } = req.params;
    const result = await pool.query(
      'SELECT * FROM services WHERE owner_privy_id = $1 ORDER BY created_at DESC',
      [privyId]
    );
    res.json({ services: result.rows });
  } catch (error) {
    console.error('Error fetching owner services:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create service
app.post('/api/services', async (req, res) => {
  try {
    const { ownerPrivyId, vendorId, title, description, image, avgTime, totalStock, price, schedule, isActive } = req.body;
    
    const result = await pool.query(
      `INSERT INTO services (owner_privy_id, vendor_id, title, description, image, avg_time, total_stock, price, is_active, schedule_open_time, schedule_close_time, schedule_days)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        ownerPrivyId,
        vendorId || null,
        title,
        description || '',
        image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2670&auto=format&fit=crop',
        avgTime || 30,
        totalStock || 100,
        price || 0,
        isActive !== undefined ? isActive : true,
        schedule?.openTime || '09:00',
        schedule?.closeTime || '18:00',
        schedule?.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
      ]
    );
    
    res.json({ success: true, service: result.rows[0] });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update service
app.patch('/api/services/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, image, avgTime, totalStock, price, isActive, schedule } = req.body;
    
    const result = await pool.query(
      `UPDATE services SET 
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        image = COALESCE($4, image),
        avg_time = COALESCE($5, avg_time),
        total_stock = COALESCE($6, total_stock),
        price = COALESCE($7, price),
        is_active = COALESCE($8, is_active),
        schedule_open_time = COALESCE($9, schedule_open_time),
        schedule_close_time = COALESCE($10, schedule_close_time),
        schedule_days = COALESCE($11, schedule_days),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *`,
      [
        id,
        title,
        description,
        image,
        avgTime,
        totalStock,
        price,
        isActive,
        schedule?.openTime,
        schedule?.closeTime,
        schedule?.days
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    res.json({ success: true, service: result.rows[0] });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ error: error.message });
  }
});

// Toggle service active status
app.patch('/api/services/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const { isGuest } = req.body;
    
    if (isGuest) {
      return res.status(403).json({ error: 'Guests cannot activate services' });
    }
    
    const result = await pool.query(
      `UPDATE services SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    res.json({ success: true, service: result.rows[0] });
  } catch (error) {
    console.error('Error toggling service:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete service
app.delete('/api/services/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM services WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ORDERS ROUTES
// ============================================

// Get orders by user
app.get('/api/orders/user/:privyId', async (req, res) => {
  try {
    const { privyId } = req.params;
    const { status } = req.query;
    
    let query = `
      SELECT o.*, 
        json_agg(json_build_object(
          'id', oi.id,
          'serviceId', oi.service_id,
          'serviceName', oi.service_name,
          'quantity', oi.quantity,
          'avgTime', oi.avg_time,
          'price', oi.price
        )) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_privy_id = $1
    `;
    const params = [privyId];
    
    if (status) {
      params.push(status);
      query += ` AND o.status = $${params.length}`;
    }
    
    query += ' GROUP BY o.id ORDER BY o.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json({ orders: result.rows });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get orders for vendor (admin view)
app.get('/api/orders/vendor/:privyId', async (req, res) => {
  try {
    const { privyId } = req.params;
    const { status } = req.query;
    
    let query = `
      SELECT o.*, 
        u.full_name as customer_name,
        json_agg(json_build_object(
          'id', oi.id,
          'serviceId', oi.service_id,
          'serviceName', oi.service_name,
          'quantity', oi.quantity,
          'avgTime', oi.avg_time
        )) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN users u ON o.user_privy_id = u.privy_id
      WHERE EXISTS (
        SELECT 1 FROM services s WHERE s.id = oi.service_id AND s.owner_privy_id = $1
      )
    `;
    const params = [privyId];
    
    if (status) {
      params.push(status);
      query += ` AND o.status = $${params.length}`;
    }
    
    query += ' GROUP BY o.id, u.full_name ORDER BY o.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json({ orders: result.rows });
  } catch (error) {
    console.error('Error fetching vendor orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create order
app.post('/api/orders', async (req, res) => {
  try {
    const { userPrivyId, vendorId, items } = req.body;
    
    // Calculate queue position based on pending orders
    const pendingOrders = await pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(estimated_wait), 0) as total_wait 
       FROM orders WHERE status = 'pending'`
    );
    
    const queuePosition = parseInt(pendingOrders.rows[0].count) + 1;
    const baseWait = parseInt(pendingOrders.rows[0].total_wait) || 0;
    
    // Calculate estimated wait time based on items
    const maxItemTime = Math.max(...items.map(item => (item.avgTime || 30) * item.quantity));
    const estimatedWait = baseWait + maxItemTime;
    
    // Generate order number
    const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;
    
    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
    
    // Create order
    const orderResult = await pool.query(
      `INSERT INTO orders (order_number, user_privy_id, vendor_id, status, estimated_wait, queue_position, total_amount)
       VALUES ($1, $2, $3, 'pending', $4, $5, $6)
       RETURNING *`,
      [orderNumber, userPrivyId, vendorId, estimatedWait, queuePosition, totalAmount]
    );
    
    const order = orderResult.rows[0];
    
    // Create order items and update service sold counts
    for (const item of items) {
      await pool.query(
        `INSERT INTO order_items (order_id, service_id, service_name, quantity, avg_time, price)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [order.id, item.serviceId, item.serviceName, item.quantity, item.avgTime, item.price || 0]
      );
      
      // Update sold count
      await pool.query(
        `UPDATE services SET sold = sold + $1 WHERE id = $2`,
        [item.quantity, item.serviceId]
      );
    }
    
    res.json({ 
      success: true, 
      order: { ...order, items },
      queuePosition,
      estimatedWait
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update order status
app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const completedAt = status === 'completed' ? 'CURRENT_TIMESTAMP' : 'NULL';
    
    const result = await pool.query(
      `UPDATE orders SET 
        status = $2, 
        completed_at = ${status === 'completed' ? 'CURRENT_TIMESTAMP' : 'completed_at'},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *`,
      [id, status]
    );
    
    // If order completed, recalculate queue positions
    if (status === 'completed') {
      await pool.query(`
        UPDATE orders SET queue_position = queue_position - 1
        WHERE status = 'pending' AND queue_position > 0
      `);
    }
    
    res.json({ success: true, order: result.rows[0] });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get queue info
app.get('/api/queue/info', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
        COALESCE(SUM(estimated_wait) FILTER (WHERE status = 'pending'), 0) as total_wait_time,
        COUNT(*) FILTER (WHERE status = 'completed' AND DATE(completed_at) = CURRENT_DATE) as completed_today
      FROM orders
    `);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching queue info:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// TICKETS ROUTES
// ============================================

// Get tickets by user
app.get('/api/tickets/user/:privyId', async (req, res) => {
  try {
    const { privyId } = req.params;
    const result = await pool.query(
      `SELECT t.*, s.title as service_title, s.image as service_image
       FROM tickets t
       LEFT JOIN services s ON t.service_id = s.id
       WHERE t.user_privy_id = $1
       ORDER BY t.created_at DESC`,
      [privyId]
    );
    res.json({ tickets: result.rows });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create ticket (after blockchain mint)
app.post('/api/tickets', async (req, res) => {
  try {
    const { orderItemId, userPrivyId, serviceId, ticketNumber, blockchainAddress, txHash, qrHash } = req.body;
    
    const result = await pool.query(
      `INSERT INTO tickets (order_item_id, user_privy_id, service_id, ticket_number, blockchain_address, tx_hash, qr_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [orderItemId, userPrivyId, serviceId, ticketNumber, blockchainAddress, txHash, qrHash]
    );
    
    res.json({ success: true, ticket: result.rows[0] });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: error.message });
  }
});

// Use ticket (mark as used)
app.patch('/api/tickets/:id/use', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE tickets SET is_used = true, used_at = CURRENT_TIMESTAMP, status = 'used' WHERE id = $1 RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    res.json({ success: true, ticket: result.rows[0] });
  } catch (error) {
    console.error('Error using ticket:', error);
    res.status(500).json({ error: error.message });
  }
});

// Validate ticket (for QR scanning)
app.post('/api/tickets/validate', async (req, res) => {
  try {
    const { ticketId, qrHash } = req.body;
    
    const result = await pool.query(
      `SELECT t.*, s.title as service_title
       FROM tickets t
       LEFT JOIN services s ON t.service_id = s.id
       WHERE t.id = $1 AND t.qr_hash = $2`,
      [ticketId, qrHash]
    );
    
    if (result.rows.length === 0) {
      return res.json({ valid: false, error: 'Invalid ticket or QR code' });
    }
    
    const ticket = result.rows[0];
    
    if (ticket.is_used) {
      return res.json({ valid: false, error: 'Ticket already used', ticket });
    }
    
    res.json({ valid: true, ticket });
  } catch (error) {
    console.error('Error validating ticket:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// VENDORS ROUTES
// ============================================

// Get all vendors
app.get('/api/vendors', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vendors ORDER BY created_at DESC');
    res.json({ vendors: result.rows });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create vendor
app.post('/api/vendors', async (req, res) => {
  try {
    const { ownerId, name, type, image, description } = req.body;
    
    const result = await pool.query(
      `INSERT INTO vendors (owner_id, name, type, image, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [ownerId, name, type, image, description]
    );
    
    res.json({ success: true, vendor: result.rows[0] });
  } catch (error) {
    console.error('Error creating vendor:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CONFIGURACIÓN
// ============================================

const CONTRACT_ADDRESS = '0x0a10dde9540e854e79445a37ed6636086128cfc4d13638077e983a14a4398056';

// Tu wallet que recibe los pagos (también será el payment_processor en el contrato)
const MERCHANT_WALLET = process.env.MERCHANT_WALLET || '0xTU_WALLET_ADDRESS';

// Clave privada del payment_processor para firmar txs en Movement
const PAYMENT_PROCESSOR_PRIVATE_KEY = process.env.PAYMENT_PROCESSOR_PRIVATE_KEY;

// Movement Network Config
const movementConfig = new AptosConfig({
  network: 'custom',
  fullnode: 'https://aptos.testnet.porto.movementlabs.xyz/v1',
});
const aptos = new Aptos(movementConfig);

// ============================================
// UTILIDADES
// ============================================

// Generar QR hash único para cada ticket
const generateQrHash = (eventAddress, buyer, timestamp) => {
  const data = `${eventAddress}-${buyer}-${timestamp}-${crypto.randomBytes(16).toString('hex')}`;
  return Array.from(crypto.createHash('sha256').update(data).digest());
};

// Función para mintear ticket en Movement después del pago
const mintTicketOnChain = async (eventObjectAddress, buyerAddress, qrHash) => {
  try {
    // Crear cuenta del payment processor
    const account = Account.fromPrivateKey({
      privateKey: new Ed25519PrivateKey(PAYMENT_PROCESSOR_PRIVATE_KEY),
    });

    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: `${CONTRACT_ADDRESS}::ticket::mint_ticket_after_payment`,
        functionArguments: [eventObjectAddress, buyerAddress, qrHash],
      },
    });

    const pendingTx = await aptos.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    const result = await aptos.waitForTransaction({
      transactionHash: pendingTx.hash,
    });

    return {
      success: true,
      txHash: pendingTx.hash,
      ticketAddress: result.events?.find(e => e.type.includes('TicketPurchased'))?.data?.ticket_address,
    };
  } catch (error) {
    console.error('Error minting ticket:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// RUTAS SIN PAGO
// ============================================

// Obtener todos los eventos disponibles
app.get('/api/events', async (req, res) => {
  try {
    // Aquí consultarías el indexer de Movement
    // Por ahora retornamos datos de ejemplo
    res.json({
      events: [
        {
          address: '0x123...', // Dirección del objeto Event en Movement
          name: 'VIP Gala Night',
          description: 'Exclusive event',
          totalTickets: 200,
          ticketsSold: 75,
          ticketPrice: 1000000, // En USDC atomic units (6 decimals) = $1
          isActive: true,
        }
      ]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener info de un evento específico
app.get('/api/events/:eventAddress', async (req, res) => {
  try {
    const { eventAddress } = req.params;
    
    // Llamar view function en Movement
    const response = await fetch(`${movementConfig.fullnode}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: `${CONTRACT_ADDRESS}::ticket::get_event_info`,
        type_arguments: [],
        arguments: [eventAddress],
      }),
    });
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener tickets de un usuario (via indexer)
app.get('/api/tickets/:ownerAddress', async (req, res) => {
  try {
    const { ownerAddress } = req.params;
    
    const query = `
      query GetTicketsByOwner($address: String!) {
        events(
          where: {
            type: { _eq: "${CONTRACT_ADDRESS}::ticket::TicketPurchased" },
            data: { _contains: { buyer: $address } }
          }
          order_by: { transaction_version: desc }
        ) {
          data
          transaction_version
        }
      }
    `;
    
    const response = await fetch('https://indexer.testnet.porto.movementnetwork.xyz/v1/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { address: ownerAddress } }),
    });
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// RUTAS DE COMPRA DE TICKETS (Pendiente configuración x402)
// ============================================

// Endpoint de compra de tickets (sin x402 por ahora - configurar después)
app.post('/api/purchase-ticket', async (req, res) => {
  try {
    const { eventAddress, buyerAddress } = req.body;
    
    const qrHash = generateQrHash(eventAddress, buyerAddress, Date.now());
    const result = await mintTicketOnChain(eventAddress, buyerAddress, qrHash);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Ticket purchased successfully!',
        ticketAddress: result.ticketAddress,
        txHash: result.txHash,
        qrData: Buffer.from(qrHash).toString('base64'),
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to mint ticket on chain',
        details: result.error,
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// AI RECOMMENDATIONS (AWS Bedrock)
// ============================================

app.post('/api/ai/recommendations', async (req, res) => {
  const { businessProfileData, question } = req.body;
  
  // Aquí integrarías AWS Bedrock
  // Por ahora un placeholder
  const prompt = `
    Eres un asistente de negocios para eventos. 
    Datos del negocio:
    - Capacidad máxima: ${businessProfileData.maxCapacity}
    - Días pico: ${businessProfileData.peakDays}
    - Tasa de retorno: ${businessProfileData.customerReturnRate}%
    
    Pregunta: ${question}
    
    Responde de forma concisa y profesional.
  `;
  
  // TODO: Llamar a AWS Bedrock aquí
  res.json({
    recommendation: `Basado en tu capacidad de ${businessProfileData.maxCapacity} y una tasa de retorno del ${businessProfileData.customerReturnRate}%, te recomiendo crear 150 tickets para tu próximo evento.`,
  });
});

// ============================================
// SERVIDOR
// ============================================

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`💰 Merchant wallet: ${MERCHANT_WALLET}`);
});
