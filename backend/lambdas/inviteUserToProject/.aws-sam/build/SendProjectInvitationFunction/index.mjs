import AWS from 'aws-sdk';
import { v4 as uuid } from 'uuid';

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const apigwManagementApi = new AWS.ApiGatewayManagementApi({
  endpoint: process.env.WEBSOCKET_ENDPOINT,
});

const INVITES_TABLE = process.env.INVITES_TABLE || 'ProjectInvitations';
const NOTIFICATIONS_TABLE = process.env.NOTIFICATIONS_TABLE;
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE;

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    // Allow GET in addition to POST so the front-end can fetch pending invites
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  const method = event.httpMethod || event.requestContext?.http?.method;
  if (method === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  // Handle fetching pending invites for a given userId via GET
  if (method === 'GET') {
    const userId = event.queryStringParameters?.userId;
    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'userId required' }),
      };
    }
    try {
      const { Items } = await dynamoDb.scan({ TableName: INVITES_TABLE }).promise();
      const invites = (Items || []).filter(
        (i) => i.recipientId === userId || i.senderId === userId
      );
      return { statusCode: 200, headers, body: JSON.stringify(invites) };
    } catch (err) {
      console.error('Error fetching invitations', err);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      };
    }
  }

  if (method !== 'POST')
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };

  let body;
  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch (err) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { projectId, senderId, recipientId } = body || {};
  if (!projectId || !senderId || !recipientId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'projectId, senderId and recipientId required' }) };
  }

  const inviteId = uuid();
  const item = { inviteId, projectId, senderId, recipientId, status: 'pending' };

  try {
    await dynamoDb.put({ TableName: INVITES_TABLE, Item: item }).promise();
    await saveNotification(recipientId, `Project invite from ${senderId}`, `invite#${inviteId}`, new Date().toISOString(), senderId, projectId);
    return { statusCode: 200, headers, body: JSON.stringify({ inviteId }) };
  } catch (err) {
    console.error('Error saving invitation', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal Server Error' }) };
  }
};

async function broadcastToUser(userId, payload) {
  const data = await dynamoDb.scan({ TableName: CONNECTIONS_TABLE }).promise();
  const conns = (data.Items || []).filter(c => c.userId === userId).map(c => c.connectionId);
  await Promise.allSettled(
    conns.map(id => apigwManagementApi.postToConnection({ ConnectionId: id, Data: JSON.stringify(payload) }).promise())
  );
}

async function saveNotification(userId, message, dedupeId, timestamp, senderId, projectId) {
  if (!NOTIFICATIONS_TABLE) return;
  try {
    const existing = await dynamoDb.query({
      TableName: NOTIFICATIONS_TABLE,
      KeyConditionExpression: 'userId = :u',
      ExpressionAttributeValues: { ':u': userId },
      ScanIndexForward: false,
      Limit: 5,
    }).promise();

    if (existing.Items && existing.Items.some(n => n.dedupeId === dedupeId)) {
      return;
    }

    const ts = timestamp || new Date().toISOString();
    const sortKeyValue = `${ts}#${uuid()}`;
    const notif = { userId, 'timestamp#uuid': sortKeyValue, timestamp: ts, dedupeId, message, read: false, senderId, projectId };
    await dynamoDb.put({ TableName: NOTIFICATIONS_TABLE, Item: notif }).promise();
    await broadcastToUser(userId, { action: 'notification', ...notif });
  } catch (err) {
    console.error('saveNotification error', err);
  }
}