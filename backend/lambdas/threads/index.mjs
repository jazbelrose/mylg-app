import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient();
const ddb = DynamoDBDocumentClient.from(client);
const TABLE = process.env.DM_THREADS_TABLE;

/** ---- CORS CONFIG ---- **/
const EXPLICIT_ALLOW = new Set([
  'http://localhost:3000',
  'http://192.168.1.200:3000',      // <— change if your LAN IP is different
  'https://mylg.studio',
  'https://www.mylg.studio',
]);

// Allow any subdomain of mylg.studio
const isAllowedHost = (hostname) =>
  hostname === 'mylg.studio' || hostname.endsWith('.mylg.studio');

const pickAllowOrigin = (reqOrigin) => {
  if (!reqOrigin) return 'http://localhost:3000';
  const normalized = reqOrigin.replace(/\/$/, '');
  if (EXPLICIT_ALLOW.has(normalized)) return normalized;
  try {
    const u = new URL(reqOrigin);
    if (isAllowedHost(u.hostname)) return `${u.protocol}//${u.host}`;
  } catch {}
  return 'http://localhost:3000';
};

const ALLOW_CREDENTIALS = false; // set true only if you actually use cookies

const buildCORS = (evt) => {
  const hdrs = evt?.headers || {};
  const reqOrigin = hdrs.origin || hdrs.Origin || hdrs.ORIGIN || '';
  const allowOrigin = pickAllowOrigin(reqOrigin);

  const base = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, X-Amz-Date, X-Amz-Security-Token, X-Amz-User-Agent',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE',
    'Access-Control-Expose-Headers': 'Authorization,x-amzn-RequestId,x-amz-apigw-id',
    'Access-Control-Max-Age': '600',
  };
  if (ALLOW_CREDENTIALS) base['Access-Control-Allow-Credentials'] = 'true';
  return base;
};

const json = (statusCode, headers, bodyObj) => ({
  statusCode,
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: bodyObj != null ? JSON.stringify(bodyObj) : ''
});

/** ---- HANDLER ---- **/
export const handler = async (evt) => {
  const method = evt?.requestContext?.http?.method?.toUpperCase?.() || '';
  const CORS = buildCORS(evt);

  try {
    if (method === 'OPTIONS') {
      return { statusCode: 204, headers: CORS };
    }

    if (method === 'GET') {
      const userId = evt.queryStringParameters?.userId;
      if (!userId) return json(400, CORS, { error: 'userId required' });

      const res = await ddb.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'userId = :u',
        ExpressionAttributeValues: { ':u': userId },
        ScanIndexForward: false
      }));
      return json(200, CORS, res.Items || []);
    }

    if (method === 'POST') {
      const {
        conversationId, senderId, recipientId,
        snippet, timestamp, preserveRead
      } = JSON.parse(evt.body || '{}');

      await ddb.send(new UpdateCommand({
        TableName: TABLE,
        Key: { userId: senderId, conversationId },
        UpdateExpression: `
          SET lastMsgTs   = :ts,
              snippet     = :snip,
              otherUserId = :other,
              #r          = :true
        `,
        ExpressionAttributeNames: { '#r': 'read' },
        ExpressionAttributeValues: {
          ':ts': timestamp,
          ':snip': snippet,
          ':other': recipientId,
          ':true': true
        }
      }));

      const updateExpr = preserveRead
        ? 'SET lastMsgTs = :ts, snippet = :snip, otherUserId = :other'
        : 'SET lastMsgTs = :ts, snippet = :snip, otherUserId = :other, #r = :false';

      const recipientParams = {
        TableName: TABLE,
        Key: { userId: recipientId, conversationId },
        UpdateExpression: updateExpr,
        ExpressionAttributeValues: {
          ':ts': timestamp,
          ':snip': snippet,
          ':other': senderId
        }
      };
      if (!preserveRead) {
        recipientParams.ExpressionAttributeNames = { '#r': 'read' };
        recipientParams.ExpressionAttributeValues[':false'] = false;
      }

      await ddb.send(new UpdateCommand(recipientParams));
      return json(200, CORS, '');
    }

    if (method === 'DELETE') {
      const { userId, conversationId } = evt.queryStringParameters || {};
      if (!userId || !conversationId) {
        return json(400, CORS, { error: 'userId and conversationId required' });
      }
      await ddb.send(new DeleteCommand({ TableName: TABLE, Key: { userId, conversationId } }));
      return json(200, CORS, '');
    }

    if (method === 'PUT') {
      const { userId, conversationId } = JSON.parse(evt.body || '{}');
      if (!userId || !conversationId) {
        return json(400, CORS, { error: 'userId and conversationId required' });
      }

      try {
        await ddb.send(new UpdateCommand({
          TableName: TABLE,
          Key: { userId, conversationId },
          UpdateExpression: 'SET #r = :true',
          ExpressionAttributeNames: { '#r': 'read' },
          ExpressionAttributeValues: { ':true': true },
          ConditionExpression: 'attribute_exists(userId) AND attribute_exists(conversationId)'
        }));
        return json(200, CORS, '');
      } catch (e) {
        if (e.name === 'ConditionalCheckFailedException') {
          return json(200, CORS, '');
        }
        throw e;
      }
    }

    return json(405, CORS, { error: 'Method Not Allowed' });

  } catch (error) {
    console.error('Unhandled Error:', error);
    return json(500, CORS, { error: 'Internal Server Error' });
  }
};
