/**
 * Lambda: getProjectMessages
 * Route: GET /projects/{projectId}/messages
 * Auth: Cognito JWT (role: MEMBER+)
 * Input: query { cursor?: string, limit?: number }
 * Output: { items: Message[], nextCursor?: string }
 * Side effects: reads DynamoDB PROJECT_MESSAGES by projectId
 */

// index.mjs
import AWS from 'aws-sdk';

// DynamoDB client with retry/backoff
const dynamoDb = new AWS.DynamoDB.DocumentClient({
  maxRetries: 5,
  retryDelayOptions: { base: 200 },
});
const TABLE_NAME = process.env.PROJECT_MESSAGES_TABLE;

/** ---- CORS CONFIG ---- **/
const EXPLICIT_ALLOW = new Set([
  'http://localhost:3000',
  'http://192.168.1.200:3000', // ← change if your LAN IP differs
  'https://mylg.studio',
  'https://www.mylg.studio',
]);

const hostAllowed = (h) => h === 'mylg.studio' || h.endsWith('.mylg.studio');

const pickAllowOrigin = (reqOrigin) => {
  if (!reqOrigin) return 'http://localhost:3000';
  const normalized = String(reqOrigin).replace(/\/$/, '');
  if (EXPLICIT_ALLOW.has(normalized)) return normalized;
  try {
    const u = new URL(reqOrigin);
    if (hostAllowed(u.hostname)) return `${u.protocol}//${u.host}`;
  } catch {}
  return 'http://localhost:3000';
};

const ALLOW_CREDENTIALS = false; // set to true only if you use cookies

const buildCORS = (event) => {
  const hdrs = event?.headers || {};
  const reqOrigin = hdrs.origin || hdrs.Origin || hdrs.ORIGIN || '';
  const allowOrigin = pickAllowOrigin(reqOrigin);

  const base = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Requested-With, X-CSRF-Token, X-Amz-Date, X-Amz-Security-Token, X-Amz-User-Agent',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,DELETE',
    'Access-Control-Expose-Headers': 'Authorization,x-amzn-RequestId,x-amz-apigw-id',
    'Access-Control-Max-Age': '600',
  };
  if (ALLOW_CREDENTIALS) base['Access-Control-Allow-Credentials'] = 'true';
  return base;
};

const json = (statusCode, headers, body) => ({
  statusCode,
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: body != null ? JSON.stringify(body) : '',
});

// Simple exponential backoff helper
async function withBackoff(operation, retries = 5, delay = 100) {
  try {
    return await operation();
  } catch (err) {
    if (err.code === 'ProvisionedThroughputExceededException' && retries > 0) {
      await new Promise((res) => setTimeout(res, delay));
      return withBackoff(operation, retries - 1, delay * 2);
    }
    throw err;
  }
}

export const handler = async (event) => {
  console.log('📡 Received Request:', JSON.stringify(event, null, 2));

  const method =
    event?.requestContext?.http?.method?.toUpperCase?.() ||
    event?.httpMethod?.toUpperCase?.() ||
    '';

  const CORS = buildCORS(event);

  // 1) Preflight
  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  try {
    // 2) GET: fetch all messages for a project
    if (method === 'GET') {
      const projectId = event.queryStringParameters?.projectId;
      if (!projectId) return json(400, CORS, { error: 'Missing projectId' });

      const params = {
        TableName: TABLE_NAME,
        KeyConditionExpression: 'projectId = :projectId',
        ExpressionAttributeValues: { ':projectId': projectId },
        ScanIndexForward: true, // oldest first
      };

      const result = await withBackoff(() => dynamoDb.query(params).promise());
      return json(200, CORS, result.Items || []);
    }

    // 3) DELETE: remove a message by projectId + messageId
    if (method === 'DELETE') {
      const { projectId, messageId } = event.queryStringParameters || {};
      if (!projectId || !messageId) {
        return json(400, CORS, { error: 'Missing projectId or messageId' });
      }

      const params = { TableName: TABLE_NAME, Key: { projectId, messageId } };
      await withBackoff(() => dynamoDb.delete(params).promise());
      return json(200, CORS, { success: true });
    }

    // 4) Method not allowed
    return json(405, CORS, { error: 'Method Not Allowed' });
  } catch (err) {
    console.error('❌ Handler error:', err);
    return json(500, CORS, { error: 'Internal Server Error', details: err?.message });
  }
};
