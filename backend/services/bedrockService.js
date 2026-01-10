// backend/services/bedrockService.js
// Servicio de AWS Bedrock para ChainTicket

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand
} from "@aws-sdk/client-bedrock-runtime";
import { getBusinessContextForAI, saveAIConversation } from "./dynamoDBService.js";

// Configuración del cliente
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
});

// Modelo por defecto - Nova Micro
const DEFAULT_MODEL = process.env.BEDROCK_MODEL_ID || "amazon.nova-micro-v1:0";

// SYSTEM PROMPT
const SYSTEM_PROMPT = `Eres un asistente experto para ChainTicket, plataforma de boletos tokenizados en blockchain.
Ayuda a administradores de negocios a:
1. Calcular cuántos tickets/boletos generar
2. Analizar ventas y demanda
3. Optimizar precios y horarios
4. Basar recomendaciones en datos históricos

REGLAS:
- Responde en inglés
- Sé conciso y específico con números
- Usa datos proporcionados para justificar
- Si faltan datos, pide información específica`;

// Construir el contexto del prompt basado en datos del negocio
function buildContextPrompt(businessContext, additionalInfo) {
  const { metrics, weeklyHistory } = businessContext;
  let context = "## BUSINESS DATA\n";
  
  const hasHistoricalData = metrics && Object.keys(metrics).length > 0;
  
  if (hasHistoricalData) {
    context += `
General Info:
- Name: ${metrics.businessName || "Not specified"}
- Type: ${metrics.businessType || "Not specified"}
- Max capacity: ${metrics.maxCapacity || "Not specified"}

Historical Metrics:
- Avg tickets/Friday: ${metrics.avgTicketsPerFriday || "N/A"}
- Avg tickets/Saturday: ${metrics.avgTicketsPerSaturday || "N/A"}
- Peak hour: ${metrics.peakHour || "N/A"}`;
  } else {
    const bizType = additionalInfo?.businessType || "general";
    context += `
New Business (no historical data):
- Type: ${bizType}
- Location: ${additionalInfo?.location || "Not specified"}
- Capacity: ${additionalInfo?.maxCapacity || "Not specified"}
- Target day: ${additionalInfo?.targetDay || "Not specified"}
- Hours: ${additionalInfo?.schedule || "Not specified"}

Industry benchmarks by business type:
- Bar/Lounge (100-150 cap): 60-80 tickets Friday night
- Concert/Event: 70-80% capacity as initial target
- Restaurant: 70-85% capacity for reservations
- Spa/Beauty: 80-90% appointment slots
- Supermarket queue: 15-20 tickets per checkout line per hour
- Club/Nightlife: 80% Fri, 100% Saturday

General guidelines:
- Fri/Sat typically +40-60% vs weekdays
- Start conservative for new businesses
- High-traffic areas (downtown): +20-30%`;
  }
  
  if (weeklyHistory && weeklyHistory.length > 0) {
    context += "\n\n## History:\n";
    weeklyHistory.slice(0, 4).forEach(week => {
      context += `- ${week.weekId}: ${week.ticketsSold || 0} sold\n`;
    });
  }
  
  return context;
}

// FUNCIONES PRINCIPALES

// Generar recomendación de tickets
export async function generateTicketRecommendation(businessId, question, additionalContext = "") {
  try {
    // Obtener contexto del negocio
    const businessContext = await getBusinessContextForAI(businessId);
    const contextPrompt = buildContextPrompt(businessContext);
    
    // Construir el mensaje completo
    const userMessage = `${contextPrompt}\n\n${additionalContext ? `## ADDITIONAL CONTEXT\n${additionalContext}\n\n` : ''}## ADMIN QUESTION:\n${question}\n\nProvide a specific recommendation with concrete numbers and brief justification.`;
    
    // Invocar Bedrock
    const response = await invokeModel(userMessage);
    
    // Guardar la conversación para contexto futuro
    await saveAIConversation(businessId, {
      question,
      recommendation: response,
      context: {
        metricsUsed: !!businessContext.metrics,
        historyWeeks: businessContext.weeklyHistory?.length || 0,
      }
    });
    
    return {
      success: true,
      recommendation: response,
      context: {
        businessName: businessContext.metrics?.businessName,
        dataPoints: businessContext.weeklyHistory?.length || 0,
      }
    };
  } catch (error) {
    console.error("Error generando recomendación:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Invocar modelo de Bedrock - FORMATO NOVA
async function invokeModel(userMessage, options = {}) {
  const modelId = options.modelId || DEFAULT_MODEL;
  
  // Detectar tipo de modelo y usar formato apropiado
  if (modelId.includes('nova')) {
    return invokeNovaModel(userMessage, modelId, options);
  } else if (modelId.includes('titan')) {
    return invokeTitanModel(userMessage, modelId, options);
  } else if (modelId.includes('anthropic') || modelId.includes('claude')) {
    return invokeClaudeModel(userMessage, modelId, options);
  }
  
  // Default a Nova
  return invokeNovaModel(userMessage, modelId, options);
}

// Formato específico para Nova (Micro, Lite, Pro)
async function invokeNovaModel(userMessage, modelId, options = {}) {
  const payload = {
    schemaVersion: "messages-v1",
    messages: [
      {
        role: "user",
        content: [{ text: userMessage }]
      }
    ],
    system: [{ text: SYSTEM_PROMPT }],
    inferenceConfig: {
      maxTokens: options.maxTokens || 1024,
      temperature: 0.7,
      topP: 0.9
    }
  };
  
  const command = new InvokeModelCommand({
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(payload),
  });
  
  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  // Nova devuelve en output.message.content[0].text
  return responseBody.output?.message?.content?.[0]?.text || "No response from model";
}

// Formato específico para Titan
async function invokeTitanModel(userMessage, modelId, options = {}) {
  const payload = {
    inputText: `${SYSTEM_PROMPT}\n\n${userMessage}`,
    textGenerationConfig: {
      maxTokenCount: options.maxTokens || 1024,
      temperature: 0.7,
      topP: 0.9
    }
  };
  
  const command = new InvokeModelCommand({
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(payload),
  });
  
  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  // Titan devuelve en results[0].outputText
  return responseBody.results?.[0]?.outputText || "No response from model";
}

// Formato específico para Claude/Anthropic
async function invokeClaudeModel(userMessage, modelId, options = {}) {
  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: options.maxTokens || 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: userMessage
      }
    ]
  };
  
  const command = new InvokeModelCommand({
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(payload),
  });
  
  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  // Claude devuelve en content[0].text
  return responseBody.content?.[0]?.text || "No response from model";
}

// Invocar modelo con streaming para respuestas largas (Nova)
export async function invokeModelStreaming(messages, onChunk) {
  const modelId = DEFAULT_MODEL;
  
  const payload = {
    schemaVersion: "messages-v1",
    messages: messages.map(m => ({
      role: m.role,
      content: [{ text: m.content }]
    })),
    system: [{ text: SYSTEM_PROMPT }],
    inferenceConfig: {
      maxTokens: 2048,
      temperature: 0.7,
      topP: 0.9
    }
  };
  
  const command = new InvokeModelWithResponseStreamCommand({
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(payload),
  });
  
  const response = await bedrockClient.send(command);
  let fullResponse = "";
  
  for await (const event of response.body) {
    if (event.chunk) {
      const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes));
      // Nova streaming devuelve en contentBlockDelta.delta.text
      if (chunk.contentBlockDelta) {
        const text = chunk.contentBlockDelta?.delta?.text;
        if (text) {
          fullResponse += text;
          if (onChunk) onChunk(text);
        }
      }
    }
  }
  
  return fullResponse;
}

// Analizar patrones de demanda
export async function analyzeDemandPatterns(businessId) {
  const question = `Basándote en los datos históricos disponibles:
1. ¿Cuáles son los días de mayor demanda?
2. ¿Hay patrones estacionales visibles?
3. ¿Cuál es la tendencia general (crecimiento/decrecimiento)?
4. ¿Qué acciones recomiendas para optimizar las ventas?`;
  
  return generateTicketRecommendation(businessId, question);
}

// Sugerir precio óptimo
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
