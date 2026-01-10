// backend/routes/aiRoutes.js
import express from 'express';
import { 
  generateTicketRecommendation, 
  analyzeDemandPatterns,
  suggestOptimalPricing 
} from '../services/bedrockService.js';
import { 
  getBusinessMetrics, 
  saveBusinessMetrics,
  getBusinessContextForAI,
  getSalesMetricsForAI  // AGREGAR ESTE IMPORT
} from '../services/dynamoDBService.js';

const router = express.Router();

/**
 * POST /api/ai/recommend
 */
router.post('/recommend', async (req, res) => {
  try {
    const { businessId, question } = req.body;

    if (!businessId || !question) {
      return res.status(400).json({
        success: false,
        error: 'businessId and question are required',
      });
    }

    console.log(`🤖 Generating recommendation for business: ${businessId}`);
    
    // Obtener métricas financieras para enriquecer el contexto
    let additionalContext = "";
    try {
      const salesMetrics = await getSalesMetricsForAI(businessId, 30);
      additionalContext = `Financial Summary (Last 30 days):
- Total Sales: ${salesMetrics.totalSales}
- Total Revenue: $${salesMetrics.totalRevenue.toFixed(2)}
- Crypto Sales (USDC): ${salesMetrics.crypto.salesCount} transactions
- Crypto Revenue: $${salesMetrics.crypto.revenue.toFixed(2)} USDC
- Crypto Adoption: ${salesMetrics.crypto.percentage}%`;
    } catch (metricError) {
      console.error('Error fetching metrics for recommendation:', metricError);
    }

    const result = await generateTicketRecommendation(businessId, question, additionalContext);

    res.json(result);
  } catch (error) {
    console.error('Error in /ai/recommend:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/ai/analyze-demand
 */
router.post('/analyze-demand', async (req, res) => {
  try {
    const { businessId } = req.body;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        error: 'businessId is required',
      });
    }

    const result = await analyzeDemandPatterns(businessId);
    res.json(result);
  } catch (error) {
    console.error('Error in /ai/analyze-demand:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/ai/suggest-pricing
 */
router.post('/suggest-pricing', async (req, res) => {
  try {
    const { businessId, eventDetails } = req.body;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        error: 'businessId is required',
      });
    }

    const result = await suggestOptimalPricing(businessId, eventDetails || {});
    res.json(result);
  } catch (error) {
    console.error('Error in /ai/suggest-pricing:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/ai/context/:businessId
 */
router.get('/context/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const context = await getBusinessContextForAI(businessId);

    res.json({
      success: true,
      context,
    });
  } catch (error) {
    console.error('Error in /ai/context:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/ai/update-metrics
 */
router.post('/update-metrics', async (req, res) => {
  try {
    const { businessId, metrics } = req.body;

    if (!businessId || !metrics) {
      return res.status(400).json({
        success: false,
        error: 'businessId and metrics are required',
      });
    }

    await saveBusinessMetrics(businessId, metrics);

    res.json({
      success: true,
      message: 'Metrics updated successfully',
    });
  } catch (error) {
    console.error('Error in /ai/update-metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/ai/chat - Chat con métricas crypto
 * ✅ CORREGIDO: usar router.post en lugar de app.post
 */
router.post('/chat', async (req, res) => {
  try {
    const { businessId, question } = req.body;
    
    if (!businessId || !question) {
      return res.status(400).json({
        success: false,
        error: 'businessId and question are required',
      });
    }

    // Get metrics including crypto payments
    const metrics = await getSalesMetricsForAI(businessId, 30);
    
    // Build context for AI (in English)
    const context = `
      Business Data:
      - ${metrics.summary}
      - Crypto payments (USDC): ${metrics.crypto.salesCount} transactions
      - Crypto revenue: $${metrics.crypto.revenue} USDC
      - Crypto sales percentage: ${metrics.crypto.percentage}%
      ${metrics.crypto.recentTransactions.length > 0 ? 
        `- Recent crypto transactions: ${metrics.crypto.recentTransactions.map(t => 
          `$${t.amount} (${t.date})`).join(', ')}` : ''}
    `;
    
    // Call Bedrock with context
    const result = await generateTicketRecommendation(businessId, question, context);
    
    res.json({ 
      success: true,
      response: result.recommendation || result,
      metrics 
    });
  } catch (error) {
    console.error('Error in AI chat:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

export default router;
