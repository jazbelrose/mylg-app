import AWS from 'aws-sdk';

// DynamoDB v2 DocumentClient with retry settings
const dynamo = new AWS.DynamoDB.DocumentClient({
  maxRetries: 5,
  retryDelayOptions: { base: 200 },
});

const DM_TABLE = process.env.DM_TABLE_NAME || process.env.DM_MESSAGES_TABLE;
const PROJECT_TABLE = process.env.PROJECT_MESSAGES_TABLE;

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
    'Access-Control-Allow-Methods': 'OPTIONS,PATCH',
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

// Exponential backoff helper
async function withBackoff(operation, retries = 5, delay = 100) {
  try {
    return await operation();
  } catch (err) {
    if (
      retries > 0 &&
      (err.code === 'ProvisionedThroughputExceededException' || err.code === 'ThrottlingException')
    ) {
      await new Promise((res) => setTimeout(res, delay));
      return withBackoff(operation, retries - 1, delay * 2);
    }
    throw err;
  }
}

// Minimal JWT parser fallback if no authorizer is attached
function getJwtClaimsFromHeader(event) {
  try {
    const h = event?.headers || {};
    const auth = h.authorization || h.Authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return {};
    const [, payload] = token.split('.');
    if (!payload) return {};
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.padEnd(b64.length + (4 - (b64.length % 4 || 4)) % 4, '=');
    return JSON.parse(Buffer.from(pad, 'base64').toString('utf8')) || {};
  } catch {
    return {};
  }
}

// Helper to update message in DynamoDB
async function updateMessage(table, key, content, editedBy, timestamp = new Date().toISOString()) {
  const params = {
    TableName: table,
    Key: key,
    UpdateExpression: 'SET #t = :c, edited = :e, editedAt = :ts, editedBy = :eb',
    ExpressionAttributeNames: { '#t': 'text' },
    ExpressionAttributeValues: {
      ':c': content,
      ':e': true,
      ':ts': timestamp,
      ':eb': editedBy,
    },
    ReturnValues: 'ALL_NEW',
  };
  return withBackoff(() => dynamo.update(params).promise());
}

export const handler = async (event) => {
  const method =
    event?.requestContext?.http?.method?.toUpperCase?.() ||
    event?.httpMethod?.toUpperCase?.() ||
    '';

  const CORS = buildCORS(event);

  // Preflight
  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  if (method !== 'PATCH') {
    return json(405, CORS, { error: 'Method Not Allowed' });
  }

  try {
    console.log('EVENT:', JSON.stringify(event, null, 2));

    const { type, messageId } = event.pathParameters || {};
    if (!['direct', 'project'].includes(type) || !messageId) {
      return json(400, CORS, { error: 'Invalid path parameters' });
    }

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return json(400, CORS, { error: 'Invalid JSON body' });
    }

    const { content, editedBy } = body || {};
    if (!content || !editedBy) {
      return json(400, CORS, { error: 'content and editedBy required' });
    }

    // Partition key requirements
    let partitionKeyName, partitionKeyValue;
    if (type === 'direct') {
      partitionKeyName = 'conversationId';
      partitionKeyValue = body.conversationId;
    } else {
      partitionKeyName = 'projectId';
      partitionKeyValue = body.projectId;
    }
    if (!partitionKeyValue) {
      return json(400, CORS, { error: `${partitionKeyName} required in body` });
    }

    // Requester identity via APIGW authorizer or JWT fallback
    const auth = event.requestContext?.authorizer || {};
    const claimsFromAuth = auth.jwt?.claims || auth.claims || {};
    const claimsFromHeader = getJwtClaimsFromHeader(event);
    const claims = { ...claimsFromHeader, ...claimsFromAuth }; // authorizer takes precedence if present

    const requester = auth.userId || claims.userId || claims.sub;
    const role = auth.role || claims.role || '';
    const isAdmin = String(role || '').toLowerCase() === 'admin';

    if (!requester) {
      return json(401, CORS, { error: 'Unauthorized' });
    }

    const table = type === 'direct' ? DM_TABLE : PROJECT_TABLE;

    // Load message
    const getParams = {
      TableName: table,
      Key: {
        [partitionKeyName]: partitionKeyValue,
        messageId: messageId,
      },
    };

    let item;
    try {
      const res = await withBackoff(() => dynamo.get(getParams).promise());
      item = res.Item;
      console.log('Found item:', item);
      if (!item) return json(404, CORS, { error: 'Message not found' });
    } catch (err) {
      console.error('Error fetching message:', err);
      return json(500, CORS, { error: 'Error fetching message', details: err.message });
    }

    // Only the original sender or an admin may edit
    if (item.senderId !== requester && !isAdmin) {
      return json(403, CORS, { error: 'Forbidden' });
    }

    try {
      const result = await updateMessage(table, getParams.Key, content, editedBy);
      return json(200, CORS, result.Attributes);
    } catch (err) {
      console.error('Error updating message:', err);
      return json(500, CORS, { error: 'Error updating message', details: err.message });
    }
  } catch (err) {
    console.error('Unhandled error in handler:', err);
    return json(500, CORS, { error: 'Internal Server Error', details: err.message });
  }
};

// Export for testing
export { updateMessage, dynamo };
