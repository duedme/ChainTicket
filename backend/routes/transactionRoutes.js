// backend/routes/transactionRoutes.js
// Routes for Privy wallet transactions

import express from 'express';
import dynamoDB from '../services/dynamoDBService.js';

const router = express.Router();

/**
 * POST /api/transactions
 * Save a new transaction
 */
router.post('/', async (req, res) => {
  try {
    const { 
      walletAddress, 
      txHash, 
      type, 
      amount, 
      to, 
      from, 
      status, 
      description,
      chainId 
    } = req.body;

    if (!walletAddress || !txHash || !type || !amount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: walletAddress, txHash, type, amount' 
      });
    }

    const transaction = await dynamoDB.saveTransaction({
      walletAddress,
      txHash,
      type,
      amount,
      to,
      from,
      status: status || 'pending',
      description,
      chainId
    });

    res.json({ success: true, transaction });
  } catch (error) {
    console.error('Error saving transaction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/transactions/:walletAddress
 * Get all transactions for a wallet
 */
router.get('/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { limit = 50, type } = req.query;

    let transactions;
    
    if (type && (type === 'sent' || type === 'received')) {
      transactions = await dynamoDB.getTransactionsByType(walletAddress, type, parseInt(limit));
    } else {
      transactions = await dynamoDB.getTransactionsByWallet(walletAddress, parseInt(limit));
    }

    res.json({ success: true, transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/transactions/:walletAddress/pending
 * Get pending transactions for a wallet
 */
router.get('/:walletAddress/pending', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const transactions = await dynamoDB.getPendingTransactions(walletAddress);

    res.json({ success: true, transactions });
  } catch (error) {
    console.error('Error fetching pending transactions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/transactions/:walletAddress/:txHash
 * Update transaction status
 */
router.patch('/:walletAddress/:txHash', async (req, res) => {
  try {
    const { walletAddress, txHash } = req.params;
    const { status } = req.body;

    if (!status || !['pending', 'confirmed', 'failed'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid status. Must be: pending, confirmed, or failed' 
      });
    }

    const transaction = await dynamoDB.updateTransactionStatus(walletAddress, txHash, status);

    res.json({ success: true, transaction });
  } catch (error) {
    console.error('Error updating transaction status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/transactions/hash/:txHash
 * Get transaction by hash
 */
router.get('/hash/:txHash', async (req, res) => {
  try {
    const { txHash } = req.params;
    const transaction = await dynamoDB.getTransactionByHash(txHash);

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    res.json({ success: true, transaction });
  } catch (error) {
    console.error('Error fetching transaction by hash:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

