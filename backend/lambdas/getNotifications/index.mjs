import AWS from 'aws-sdk';

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.NOTIFICATIONS_TABLE;

/** ---- CORS CONFIG ---- **/
const EXPLICIT_ALLOW = new Set([
  'http://localhost:3000',
  'http://192.168.1.200:3000',     // ← change if your LAN IP differs
  'https://mylg.studio',
  'https://www.mylg.studio',
]);

// allow any subdomain of mylg.studio
const hostAllowed = (h) => h === 'mylg.studio' || h.endsWith('.mylg.studio');

const pickAllowOrigin = (reqOrigin) => {
  if (!reqOrigin) return 'http://localhost:3000';
  const normalized = reqOrigin.replace(/\/$/, '');
  if (EXPLICIT_ALLOW.has(normalized)) return normalized;
  try {
    const u = new URL(reqOrigin);
    if (hostAllowed(u.hostname)) return `${u.protocol}//${u.host}`;
  } catch {}
  return 'http://localhost:3000';
};

const ALLOW_CREDENTIALS = false; // set true only if you actually use cookies

const buildCORS = (event) => {
  const hdrs = event?.headers || {};
  const reqOrigin = hdrs.origin || hdrs.Origin || hdrs.ORIGIN || '';
  const allowOrigin = pickAllowOrigin(reqOrigin);

  const base = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Requested-With, X-CSRF-Token, X-Amz-Date, X-Amz-Security-Token, X-Amz-User-Agent',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,DELETE,PUT,PATCH',
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

export const handler = async (event) => {
  console.log('📡 Received Notification Request:', JSON.stringify(event, null, 2));

  const method =
    event?.requestContext?.http?.method?.toUpperCase?.() ||
    event?.httpMethod?.toUpperCase?.() ||
    '';

  const CORS = buildCORS(event);

  // --- 1) OPTIONS: CORS ---
  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  try {
    // --- 2) GET: Fetch notifications for userId ---
    if (method === 'GET') {
      const userId = event.queryStringParameters?.userId;
      if (!userId) return json(400, CORS, { error: 'Missing userId' });

      const params = {
        TableName: TABLE_NAME,
        KeyConditionExpression: 'userId = :u',
        ExpressionAttributeValues: { ':u': userId },
        ScanIndexForward: false, // newest first
        Limit: 100,
      };

      const result = await dynamoDb.query(params).promise();
      return json(200, CORS, result.Items || []);
    }

    // --- 3) PUT/PATCH: Mark notification as read ---
    if (method === 'PUT' || method === 'PATCH') {
      const { userId, 'timestamp#uuid': sortKey } = event.queryStringParameters || {};
      if (!userId || !sortKey) {
        return json(400, CORS, { error: 'Missing userId or timestamp#uuid' });
      }

      const params = {
        TableName: TABLE_NAME,
        Key: { userId, 'timestamp#uuid': sortKey },
        UpdateExpression: 'SET #r = :true',
        ExpressionAttributeNames: { '#r': 'read' },
        ExpressionAttributeValues: { ':true': true },
      };

      await dynamoDb.update(params).promise();
      return json(200, CORS, { success: true });
    }

    // --- 4) DELETE: Remove by userId + timestamp#uuid ---
    if (method === 'DELETE') {
      const { userId, 'timestamp#uuid': sortKey } = event.queryStringParameters || {};
      if (!userId || !sortKey) {
        return json(400, CORS, { error: 'Missing userId or timestamp#uuid' });
      }

      const params = { TableName: TABLE_NAME, Key: { userId, 'timestamp#uuid': sortKey } };
      await dynamoDb.delete(params).promise();
      return json(200, CORS, { success: true });
    }

    // --- 5) METHOD NOT ALLOWED ---
    return json(405, CORS, { error: 'Method Not Allowed' });
  } catch (err) {
    console.error('❌ Handler error:', err);
    return json(500, CORS, { error: 'Internal Server Error', details: err?.message });
  }
};
