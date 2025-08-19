import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const TABLE_NAME = process.env.TABLE_NAME || 'Galleries';
const GSI_NAME = 'projectId-index'; // Name of the GSI you created in DynamoDB
const dynamo = DynamoDBDocument.from(new DynamoDB({}));

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

const ALLOW_CREDENTIALS = false; // set true only if you use cookies

const buildCORS = (event) => {
  const hdrs = event?.headers || {};
  const reqOrigin = hdrs.origin || hdrs.Origin || hdrs.ORIGIN || '';
  const allowOrigin = pickAllowOrigin(reqOrigin);

  const base = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Requested-With, X-CSRF-Token, X-Amz-Date, X-Amz-Security-Token, X-Amz-User-Agent',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Expose-Headers': 'Authorization,x-amzn-RequestId,x-amz-apigw-id',
    'Access-Control-Max-Age': '600',
  };
  if (ALLOW_CREDENTIALS) base['Access-Control-Allow-Credentials'] = 'true';
  return base;
};

const json = (statusCode, headers, body) => ({
  statusCode: Number(statusCode),
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: typeof body === 'string' ? body : JSON.stringify(body ?? ''),
});

export const handler = async (event) => {
  console.log(JSON.stringify(event, null, 2));

  const method =
    event?.requestContext?.http?.method?.toUpperCase?.() ||
    event?.httpMethod?.toUpperCase?.() ||
    '';

  const CORS = buildCORS(event);

  // Preflight
  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  try {
    switch (method) {
      case 'POST': {
        const postData = JSON.parse(event.body || '{}');
        if (!postData.projectId || !postData.name) {
          return json(400, CORS, 'projectId and name are required');
        }
        const galleryId = uuidv4();
        const now = Math.floor(Date.now() / 1000);

        const item = {
          ...postData,
          galleryId, // PK
          createdAt: now,
          updatedAt: now,
        };

        await dynamo.put({ TableName: TABLE_NAME, Item: item });
        return json(201, CORS, item);
      }

      case 'PUT': {
        const putData = JSON.parse(event.body || '{}');
        const galleryId =
          putData.galleryId || event.queryStringParameters?.galleryId;

        if (!galleryId) {
          return json(400, CORS, 'galleryId is required for PUT');
        }

        // Fetch existing gallery so we can merge fields instead of overwriting
        const existing = await dynamo.get({
          TableName: TABLE_NAME,
          Key: { galleryId },
        });

        const merged = {
          ...existing.Item,
          ...putData,
          galleryId,
          updatedAt: Math.floor(Date.now() / 1000),
        };

        await dynamo.put({ TableName: TABLE_NAME, Item: merged });
        return json(200, CORS, merged);
      }

      case 'GET': {
        const q = event.queryStringParameters || {};

        if (q.galleryId) {
          // Get a single gallery by galleryId (PK)
          const res = await dynamo.get({
            TableName: TABLE_NAME,
            Key: { galleryId: q.galleryId },
          });
          return json(200, CORS, res.Item || null);
        }

        if (q.projectId) {
          // Query all galleries for a projectId using the GSI
          const queryRes = await dynamo.query({
            TableName: TABLE_NAME,
            IndexName: GSI_NAME,
            KeyConditionExpression: 'projectId = :pid',
            ExpressionAttributeValues: { ':pid': q.projectId },
          });
          return json(200, CORS, queryRes.Items || []);
        }

        return json(400, CORS, 'galleryId or projectId required for GET');
      }

      case 'DELETE': {
        const q = event.queryStringParameters || {};
        if (!q.galleryId) {
          return json(400, CORS, 'galleryId is required for DELETE');
        }
        await dynamo.delete({
          TableName: TABLE_NAME,
          Key: { galleryId: q.galleryId },
        });
        return json(200, CORS, { success: true });
      }

      default:
        return json(400, CORS, `Unsupported method "${method}"`);
    }
  } catch (err) {
    console.error(err);
    return json(400, CORS, err.message);
  }
};
