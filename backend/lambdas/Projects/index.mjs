import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

const dynamo = DynamoDBDocument.from(new DynamoDB({}));
const TABLE_NAME = process.env.PROJECTS_TABLE || 'Projects';

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
    'Access-Control-Allow-Methods': 'OPTIONS,GET',
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
  // console.log('Received event:', JSON.stringify(event, null, 2));
  const method =
    event?.requestContext?.http?.method?.toUpperCase?.() ||
    event?.httpMethod?.toUpperCase?.() ||
    '';

  const CORS = buildCORS(event);

  // CORS preflight
  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  try {
    switch (method) {
      case 'GET': {
        const q = event.queryStringParameters || {};
        const projectId = q.projectId;

        if (projectId) {
          // Query by partition key (assumes projectId is the table PK)
          const params = {
            TableName: TABLE_NAME,
            KeyConditionExpression: 'projectId = :projectId',
            ExpressionAttributeValues: { ':projectId': projectId },
          };
          const res = await dynamo.query(params);
          return json(200, CORS, res.Items || []);
        }

        // Fallback: table scan (use sparingly; can be costly)
        const res = await dynamo.scan({ TableName: TABLE_NAME });
        return json(200, CORS, res.Items || []);
      }

      default:
        return json(405, CORS, { error: 'Method Not Allowed' });
    }
  } catch (err) {
    console.error('Error:', err);
    const status = err?.statusCode || err?.$metadata?.httpStatusCode || 500;
    return json(status, CORS, { error: err?.message || 'Internal Server Error', stack: err?.stack });
  }
};
