import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

const dynamo = DynamoDBDocument.from(new DynamoDB({}));

const PROJECTS_TABLE = process.env.PROJECTS_TABLE || 'Projects';
const REVISIONS_TABLE = process.env.PROJECT_REVISIONS_TABLE || 'ProjectRevisionHistory';

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
    'Access-Control-Allow-Methods': 'OPTIONS,GET,PUT',
    'Access-Control-Expose-Headers': 'Authorization,x-amzn-RequestId,x-amz-apigw-id',
    'Access-Control-Max-Age': '600',
  };
  if (ALLOW_CREDENTIALS) base['Access-Control-Allow-Credentials'] = 'true';
  return base;
};
const json = (statusCode, headers, body) => ({
  statusCode: Number(statusCode),
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: body != null ? JSON.stringify(body) : '',
});
const getMethod = (e) =>
  e?.requestContext?.http?.method?.toUpperCase?.() ||
  e?.httpMethod?.toUpperCase?.() ||
  '';

export const handler = async (event) => {
  let statusCode = 200;
  let body;
  const CORS = buildCORS(event);
  const method = getMethod(event);

  // Preflight
  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  try {
    switch (method) {
      case 'GET': {
        const q = event.queryStringParameters || {};
        const projectId = q.projectId;
        if (!projectId) {
          return json(400, CORS, 'projectId is missing');
        }

        const res = await dynamo.get({
          TableName: PROJECTS_TABLE,
          Key: { projectId },
        });

        if (!res.Item) {
          return json(404, CORS, { error: 'Project not found' });
        }
        return json(200, CORS, res.Item);
      }

      case 'PUT': {
        const q = event.queryStringParameters || {};
        const projectId = q.projectId || ((() => {
          try { return JSON.parse(event.body || '{}')?.projectId; } catch { return undefined; }
        })());
        if (!projectId) {
          return json(400, CORS, 'projectId is missing');
        }

        let updateData;
        try {
          updateData = JSON.parse(event.body || '{}');
        } catch {
          return json(400, CORS, { error: 'Invalid JSON body' });
        }

        // Optional: log safely
        console.log('PUT payload (keys):', Object.keys(updateData || {}));

        // Handle galleryUpdate merge
        if (updateData.galleryUpdate && updateData.galleryUpdate.id) {
          const current = await dynamo.get({
            TableName: PROJECTS_TABLE,
            Key: { projectId },
          });

          const item = current.Item || {};
          const fieldName = Array.isArray(item?.galleries)
            ? 'galleries'
            : Array.isArray(item?.gallery)
            ? 'gallery'
            : null;

          if (fieldName) {
            const arr = Array.isArray(item[fieldName]) ? [...item[fieldName]] : [];
            const idx = arr.findIndex((g) => g?.id === updateData.galleryUpdate.id);
            if (idx >= 0) {
              const updateFields = { ...updateData.galleryUpdate };
              delete updateFields.id;
              arr[idx] = { ...arr[idx], ...updateFields };
              updateData[fieldName] = arr;
            }
          }
          delete updateData.galleryUpdate;
        }

        // Save description revision
        try {
          const existing = await dynamo.get({
            TableName: PROJECTS_TABLE,
            Key: { projectId },
            ProjectionExpression: 'description',
          });
          const previousDescription = existing.Item?.description ?? '';
          await dynamo.put({
            TableName: REVISIONS_TABLE,
            Item: {
              projectId,
              revisionId: new Date().toISOString(),
              description: previousDescription,
              author: updateData.author || 'Unknown',
              revisionDate: new Date().toISOString(),
            },
          });
        } catch (e) {
          console.warn('Revision write warning:', e?.message);
        }

        // Build UpdateExpression (exclude immutable keys)
        const fieldsToExclude = ['projectId'];
        const entries = Object.entries(updateData || {}).filter(
          ([k]) => !fieldsToExclude.includes(k)
        );

        if (entries.length === 0) {
          return json(400, CORS, { error: 'No updatable fields provided' });
        }

        let updateExpression = 'SET ';
        const ExpressionAttributeNames = {};
        const ExpressionAttributeValues = {};
        entries.forEach(([key, value], i) => {
          const name = `#${key}`;
          const val = `:${key}`;
          updateExpression += `${i ? ', ' : ''}${name} = ${val}`;
          ExpressionAttributeNames[name] = key;
          ExpressionAttributeValues[val] = value;
        });

        const updated = await dynamo.update({
          TableName: PROJECTS_TABLE,
          Key: { projectId },
          UpdateExpression: updateExpression,
          ExpressionAttributeNames,
          ExpressionAttributeValues,
          ReturnValues: 'ALL_NEW',
        });

        return json(200, CORS, updated.Attributes || {});
      }

      default:
        return json(405, CORS, { error: `Unsupported method "${method}"` });
    }
  } catch (err) {
    console.error('Handler error:', err);
    statusCode = err?.$metadata?.httpStatusCode || err?.statusCode || 500;
    body = { error: err?.message || 'Internal Server Error' };
    return json(statusCode, CORS, body);
  }
};
