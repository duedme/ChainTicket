
// backend/services/bedrockService.js
// ============================================
// Servicio de AWS Bedrock para ChainTicket
// ============================================

import { 
  BedrockRuntimeClient, 
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand 
} from '@aws-sdk/client-bedrock-runtime';
import { getBusinessContextForAI, saveAIConversation } from './dynamoDBService.js';

// Configuración del cliente
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

// Modelo por defecto (Claude 3 Haiku es rápido y económico)
const DEFAULT_MODEL = process.env.BEDROCK_MODEL_ID || 'amazon.titan-text-express-v1:0';

// ============================================
// PROMPTS TEMPLATES
// ============================================

const SYSTEM_PROMPT = `Eres un asistente experto para ChainTicket, plataforma de boletos tokenizados en blockchain.

Ayuda a administradores de negocios a:
1. Calcular cuántos tickets/boletos generar
2. Analizar ventas y demanda
3. Optimizar precios y horarios
4. Basar recomendaciones en datos históricos

REGLAS:
- Responde en español
- Sé conciso y específico con números
- Usa datos proporcionados para justificar
- Si faltan datos, pide información específica`;


/**
 * Construir el contexto del prompt basado en datos del negocio
 */
function buildContextPrompt(businessContext) {
  const { metrics, weeklyHistory, recentConversations } = businessContext;

  let context = '\n### DATOS DEL NEGOCIO:\n';

  if (metrics && Object.keys(metrics).length > 0) {
    context += `
**Información General:**
- Nombre: ${metrics.businessName || 'No especificado'}
- Tipo: ${metrics.businessType || 'No especificado'}
- Capacidad máxima: ${metrics.maxCapacity || 'No especificada'}

**Métricas Actuales:**
- Promedio tickets/viernes: ${metrics.avgTicketsPerFriday || 'N/A'}
- Promedio tickets/sábado: ${metrics.avgTicketsPerSaturday || 'N/A'}
- Hora pico: ${metrics.peakHour || 'N/A'}
- Tasa de sold-out: ${metrics.selloutRate ? (metrics.selloutRate * 100).toFixed(1) + '%' : 'N/A'}
- Tasa retorno clientes: ${metrics.customerReturnRate || 'N/A'}%
`;
  }

  if (weeklyHistory && weeklyHistory.length > 0) {
    context += '\n**Historial Reciente (últimas semanas):**\n';
    weeklyHistory.forEach(week => {
      context += `- ${week.weekId}: ${week.ticketsSold || 0} vendidos, $${week.revenue || 0} ingresos, ${week.checkIns || 0} check-ins\n`;
    });
  }

  if (recentConversations && recentConversations.length > 0) {
    context += '\n**Recomendaciones anteriores:**\n';
    const lastConv = recentConversations[0];
    if (lastConv.recommendation) {
      context += `- Última recomendación: "${lastConv.recommendation}"\n`;
      context += `- Feedback: ${lastConv.feedback || 'Sin feedback'}\n`;
    }
  }

  return context;
}

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

/**
 * Generar recomendación de tickets
 */
export async function generateTicketRecommendation(businessId, question) {
  try {
    // Obtener contexto del negocio
    const businessContext = await getBusinessContextForAI(businessId);
    const contextPrompt = buildContextPrompt(businessContext);

    // Construir el mensaje
    const messages = [
      {
        role: 'user',
        content: `${contextPrompt}\n\n### PREGUNTA DEL ADMINISTRADOR:\n${question}\n\nPor favor, proporciona una recomendación específica y justificada.`
      }
    ];

    // Invocar Bedrock
    const response = await invokeModel(messages);

    // Guardar la conversación para contexto futuro
    await saveAIConversation(businessId, {
      question,
      recommendation: response,
      context: {
        metricsUsed: !!businessContext.metrics,
        historyWeeks: businessContext.weeklyHistory?.length || 0,
      },
    });

    return {
      success: true,
      recommendation: response,
      context: {
        businessName: businessContext.metrics?.businessName,
        dataPoints: businessContext.weeklyHistory?.length || 0,
      },
    };
  } catch (error) {
    console.error('Error generando recomendación:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Invocar modelo de Bedrock (Titan)
 */
async function invokeModel(messages, options = {}) {
    const modelId = options.modelId || DEFAULT_MODEL;
  
    const payload = {
      inputText: messages[0].content,  // Titan usa inputText directo
      textGenerationConfig: {
        maxTokenCount: options.maxTokens || 1024,
        temperature: 0.7,
        topP: 0.9
      }
    };
  
    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });
  
    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
    // Titan devuelve outputText
    return responseBody.outputText;
  }
  

/**
 * Invocar modelo con streaming (para respuestas largas)
 */
export async function invokeModelStreaming(messages, onChunk) {
  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: messages,
  };

  const command = new InvokeModelWithResponseStreamCommand({
    modelId: DEFAULT_MODEL,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload),
  });

  const response = await bedrockClient.send(command);

  let fullResponse = '';
  for await (const event of response.body) {
    if (event.chunk) {
      const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes));
      if (chunk.type === 'content_block_delta') {
        const text = chunk.delta?.text || '';
        fullResponse += text;
        if (onChunk) onChunk(text);
      }
    }
  }

  return fullResponse;
}

/**
 * Analizar patrones de demanda
 */
export async function analyzeDemandPatterns(businessId) {
  const question = `Basándote en los datos históricos disponibles:
1. ¿Cuáles son los días de mayor demanda?
2. ¿Hay patrones estacionales visibles?
3. ¿Cuál es la tendencia general (crecimiento/decrecimiento)?
4. ¿Qué acciones recomiendas para optimizar las ventas?`;

  return generateTicketRecommendation(businessId, question);
}

/**
 * Sugerir precio óptimo
 */
export async function suggestOptimalPricing(businessId, eventDetails) {
  const question = `Para el siguiente evento: ${JSON.stringify(eventDetails)}

Considerando los datos históricos y el tipo de evento:
1. ¿Cuál sería el precio óptimo por ticket?
2. ¿Deberíamos tener diferentes niveles de precio (early bird, regular, VIP)?
3. ¿Cuántos tickets en cada categoría?`;

  return generateTicketRecommendation(businessId, question);
}

export default {
  generateTicketRecommendation,
  invokeModelStreaming,
  analyzeDemandPatterns,
  suggestOptimalPricing,
};
