
// backend/services/dynamoDBService.js
// ============================================
// Servicio de DynamoDB para ChainTicket
// ============================================

import { 
  DynamoDBClient 
} from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  GetCommand, 
  PutCommand, 
  QueryCommand, 
  UpdateCommand,
  BatchWriteCommand 
} from '@aws-sdk/lib-dynamodb';

// Configuración del cliente
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

// Nombres de tablas desde variables de entorno
const TABLES = {
  BUSINESS_METRICS: process.env.DYNAMODB_TABLE_BUSINESS_METRICS || 'chainticket-business-metrics-dev',
  SALES_HISTORY: process.env.DYNAMODB_TABLE_SALES_HISTORY || 'chainticket-sales-history-dev',
  AI_CONVERSATIONS: process.env.DYNAMODB_TABLE_AI_CONVERSATIONS || 'chainticket-ai-conversations-dev',
};

// ============================================
// BUSINESS METRICS
// ============================================

/**
 * Obtener métricas de un negocio (para contexto de IA)
 */
export async function getBusinessMetrics(businessId) {
  const command = new GetCommand({
    TableName: TABLES.BUSINESS_METRICS,
    Key: {
      pk: `BUSINESS#${businessId}`,
      sk: 'METRICS',
    },
  });

  const response = await docClient.send(command);
  return response.Item;
}

/**
 * Guardar/actualizar métricas de un negocio
 */
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

/**
 * Obtener historial semanal de un negocio
 */
export async function getWeeklyHistory(businessId, weeksBack = 8) {
  const command = new QueryCommand({
    TableName: TABLES.BUSINESS_METRICS,
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
    ExpressionAttributeValues: {
      ':pk': `BUSINESS#${businessId}`,
      ':prefix': 'WEEK#',
    },
    ScanIndexForward: false, // Más reciente primero
    Limit: weeksBack,
  });

  const response = await docClient.send(command);
  return response.Items || [];
}

/**
 * Guardar datos de una semana
 */
export async function saveWeeklyData(businessId, weekId, data) {
  const command = new PutCommand({
    TableName: TABLES.BUSINESS_METRICS,
    Item: {
      pk: `BUSINESS#${businessId}`,
      sk: `WEEK#${weekId}`, // Formato: 2025-W52
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

/**
 * Registrar una venta
 */
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
      saleDate: timestamp.split('T')[0], // Para el GSI
      ...saleData,
      createdAt: timestamp,
    },
  });

  await docClient.send(command);
  return { success: true, saleId };
}

/**
 * Obtener ventas de un negocio por rango de fechas
 */
export async function getSalesByDateRange(businessId, startDate, endDate) {
  const command = new QueryCommand({
    TableName: TABLES.SALES_HISTORY,
    KeyConditionExpression: 'pk = :pk AND sk BETWEEN :start AND :end',
    ExpressionAttributeValues: {
      ':pk': `BUSINESS#${businessId}`,
      ':start': `SALE#${startDate}`,
      ':end': `SALE#${endDate}Z`, // Z para incluir todo el día
    },
  });

  const response = await docClient.send(command);
  return response.Items || [];
}

/**
 * Agregar métricas diarias
 */
export async function saveDailyAggregate(businessId, date, aggregates) {
  const command = new PutCommand({
    TableName: TABLES.SALES_HISTORY,
    Item: {
      pk: `BUSINESS#${businessId}`,
      sk: `DAY#${date}`,
      businessId,
      date,
      saleDate: date, // Para el GSI
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

/**
 * Guardar una conversación con IA
 */
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
      // TTL: expirar después de 90 días
      expiresAt: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60),
    },
  });

  await docClient.send(command);
  return { success: true };
}

/**
 * Obtener últimas conversaciones de un negocio
 */
export async function getRecentConversations(businessId, limit = 10) {
  const command = new QueryCommand({
    TableName: TABLES.AI_CONVERSATIONS,
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
    ExpressionAttributeValues: {
      ':pk': `BUSINESS#${businessId}`,
      ':prefix': 'CONV#',
    },
    ScanIndexForward: false,
    Limit: limit,
  });

  const response = await docClient.send(command);
  return response.Items || [];
}

// ============================================
// HELPERS PARA CONTEXTO DE IA
// ============================================

/**
 * Obtener contexto completo de un negocio para prompts de IA
 */
export async function getBusinessContextForAI(businessId) {
  const [metrics, weeklyHistory, recentConversations] = await Promise.all([
    getBusinessMetrics(businessId),
    getWeeklyHistory(businessId, 4),
    getRecentConversations(businessId, 5),
  ]);

  return {
    metrics: metrics || {},
    weeklyHistory,
    recentConversations,
    lastUpdated: new Date().toISOString(),
  };
}

export default {
  getBusinessMetrics,
  saveBusinessMetrics,
  getWeeklyHistory,
  saveWeeklyData,
  recordSale,
  getSalesByDateRange,
  saveDailyAggregate,
  saveAIConversation,
  getRecentConversations,
  getBusinessContextForAI,
};
