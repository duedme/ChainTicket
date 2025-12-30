
// backend/routes/aiRoutes.js
// ============================================
// Rutas de IA para ChainTicket
// ============================================

import express from 'express';
import { 
  generateTicketRecommendation, 
  analyzeDemandPatterns,
  suggestOptimalPricing 
} from '../services/bedrockService.js';
import { 
  getBusinessMetrics, 
  saveBusinessMetrics,
  getBusinessContextForAI 
} from '../services/dynamoDBService.js';

const router = express.Router();

/**
 * POST /api/ai/recommend
 * Obtener recomendación de IA para un negocio
 */
router.post('/recommend', async (req, res) => {
  try {
    const { businessId, question } = req.body;

    if (!businessId || !question) {
      return res.status(400).json({
        success: false,
        error: 'businessId y question son requeridos',
      });
    }

    console.log(`🤖 Generando recomendación para negocio: ${businessId}`);
    const result = await generateTicketRecommendation(businessId, question);

    res.json(result);
  } catch (error) {
    console.error('Error en /ai/recommend:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/ai/analyze-demand
 * Analizar patrones de demanda
 */
router.post('/analyze-demand', async (req, res) => {
  try {
    const { businessId } = req.body;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        error: 'businessId es requerido',
      });
    }

    const result = await analyzeDemandPatterns(businessId);
    res.json(result);
  } catch (error) {
    console.error('Error en /ai/analyze-demand:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/ai/suggest-pricing
 * Sugerir precios óptimos
 */
router.post('/suggest-pricing', async (req, res) => {
  try {
    const { businessId, eventDetails } = req.body;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        error: 'businessId es requerido',
      });
    }

    const result = await suggestOptimalPricing(businessId, eventDetails || {});
    res.json(result);
  } catch (error) {
    console.error('Error en /ai/suggest-pricing:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/ai/context/:businessId
 * Obtener el contexto actual de IA para un negocio
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
    console.error('Error en /ai/context:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/ai/update-metrics
 * Actualizar métricas de un negocio (para mejorar contexto de IA)
 */
router.post('/update-metrics', async (req, res) => {
  try {
    const { businessId, metrics } = req.body;

    if (!businessId || !metrics) {
      return res.status(400).json({
        success: false,
        error: 'businessId y metrics son requeridos',
      });
    }

    await saveBusinessMetrics(businessId, metrics);

    res.json({
      success: true,
      message: 'Métricas actualizadas correctamente',
    });
  } catch (error) {
    console.error('Error en /ai/update-metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
