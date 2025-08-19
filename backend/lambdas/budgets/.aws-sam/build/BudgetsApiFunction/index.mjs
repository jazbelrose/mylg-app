import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const TABLE_NAME = process.env.TABLE_NAME || 'Budgets';
const BUDGET_ID_INDEX = 'budgetId-index';
const BUDGET_ITEM_ID_INDEX = 'budgetItemId-index';

const dynamo = DynamoDBDocument.from(new DynamoDB({}));

/** ---- CORS CONFIG ---- **/
const EXPLICIT_ALLOW = new Set([
  'http://localhost:3000',
  'http://192.168.1.200:3000', // ← update if your LAN IP differs
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

const ALLOW_CREDENTIALS = false; // set to true only if you actually use cookies

const buildCORS = (event) => {
  const hdrs = event?.headers || {};
  const reqOrigin = hdrs.origin || hdrs.Origin || hdrs.ORIGIN || '';
  const allowOrigin = pickAllowOrigin(reqOrigin);

  const base = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Requested-With, X-CSRF-Token, X-Amz-Date, X-Amz-Security-Token, X-Amz-User-Agent',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Expose-Headers': 'Authorization,x-amzn-RequestId,x-amz-apigw-id',
    'Access-Control-Max-Age': '600',
  };
  if (ALLOW_CREDENTIALS) base['Access-Control-Allow-Credentials'] = 'true';
  return base;
};

const json = (statusCode, headers, body) => ({
  statusCode: String(statusCode),
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

  // CORS preflight
  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  try {
    switch (method) {
      /* -------- CREATE (POST) -------- */
      case 'POST': {
        const data = JSON.parse(event.body || '{}');
        requireFields(data, ['projectId']);

        const isHeader = data.isHeader === true || !data.budgetId;

        // budgetId logic
        if (isHeader && !data.budgetId) {
          data.budgetId = uuidv4();
        } else if (!isHeader && !data.budgetId) {
          return json(400, CORS, 'budgetId required for line item creation');
        }

        // budgetItemId logic
        let budgetItemId = data.budgetItemId;
        if (!budgetItemId) {
          budgetItemId = (isHeader ? 'HEADER-' : 'LINE-') + uuidv4();
        }
        enforcePrefix(budgetItemId);

        const timestamp = new Date().toISOString();

        const item = {
          projectId: data.projectId,
          budgetId: data.budgetId,
          budgetItemId,
          createdAt: timestamp,
          updatedAt: timestamp,
          revision: data.revision ?? 1,
          ...stripFields(data, ['isHeader', 'budgetItemId']), // exclude control flags
        };

        await dynamo.put({
          TableName: TABLE_NAME,
          Item: item,
          ConditionExpression:
            'attribute_not_exists(projectId) AND attribute_not_exists(budgetItemId)',
        });

        return json(201, CORS, item);
      }

      /* -------- FULL UPSERT (PUT) -------- */
      case 'PUT': {
        const data = JSON.parse(event.body || '{}');
        requireFields(data, ['projectId', 'budgetItemId', 'budgetId']);
        enforcePrefix(data.budgetItemId);

        const timestamp = new Date().toISOString();
        const item = {
          ...data,
          updatedAt: timestamp,
          createdAt: data.createdAt || timestamp,
          revision: data.revision ?? 1,
        };

        await dynamo.put({ TableName: TABLE_NAME, Item: item });
        return json(200, CORS, item);
      }

      /* -------- PARTIAL UPDATE (PATCH) -------- */
      case 'PATCH': {
        const data = JSON.parse(event.body || '{}');
        const { projectId, budgetItemId, ...rest } = data;
        if (!projectId || !budgetItemId) {
          return json(400, CORS, 'projectId and budgetItemId required');
        }
        enforcePrefix(budgetItemId);
        if (Object.keys(rest).length === 0) {
          return json(400, CORS, 'No fields to update');
        }

        rest.updatedAt = new Date().toISOString();

        const exprNames = {};
        const exprValues = {};
        const sets = [];
        for (const [k, v] of Object.entries(rest)) {
          exprNames['#' + k] = k;
          exprValues[':' + k] = v;
          sets.push(`#${k} = :${k}`);
        }

        const updated = await dynamo.update({
          TableName: TABLE_NAME,
          Key: { projectId, budgetItemId },
          UpdateExpression: 'SET ' + sets.join(', '),
          ExpressionAttributeNames: exprNames,
          ExpressionAttributeValues: exprValues,
          ReturnValues: 'ALL_NEW',
        });

        return json(200, CORS, updated.Attributes);
      }

      /* -------- READ (GET) -------- */
      case 'GET': {
        const q = event.queryStringParameters || {};

        if (q.projectId && q.headers === 'true') {
          const r = await dynamo.query({
            TableName: TABLE_NAME,
            KeyConditionExpression:
              'projectId = :p AND begins_with(budgetItemId, :h)',
            ExpressionAttributeValues: { ':p': q.projectId, ':h': 'HEADER-' },
          });
          return json(200, CORS, r.Items || []);
        }

        if (q.projectId && q.budgetItemId) {
          enforcePrefix(q.budgetItemId); // optional (no-op if valid)
          const r = await dynamo.get({
            TableName: TABLE_NAME,
            Key: { projectId: q.projectId, budgetItemId: q.budgetItemId },
          });
          return json(200, CORS, r.Item || null);
        }

        if (q.projectId) {
          const r = await dynamo.query({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'projectId = :p',
            ExpressionAttributeValues: { ':p': q.projectId },
          });
          return json(200, CORS, r.Items || []);
        }

        if (q.budgetId) {
          const r = await dynamo.query({
            TableName: TABLE_NAME,
            IndexName: BUDGET_ID_INDEX,
            KeyConditionExpression: 'budgetId = :b',
            ExpressionAttributeValues: { ':b': q.budgetId },
          });
          return json(200, CORS, r.Items || []);
        }

        if (q.singleBudgetItemId) {
          enforcePrefix(q.singleBudgetItemId);
          const r = await dynamo.query({
            TableName: TABLE_NAME,
            IndexName: BUDGET_ITEM_ID_INDEX,
            KeyConditionExpression: 'budgetItemId = :bi',
            ExpressionAttributeValues: { ':bi': q.singleBudgetItemId },
          });
          return json(200, CORS, (r.Items && r.Items[0]) || null);
        }

        return json(
          400,
          CORS,
          'Provide one of: projectId(+headers=true), (projectId+budgetItemId), budgetId, singleBudgetItemId'
        );
      }

      /* -------- DELETE -------- */
      case 'DELETE': {
        const q = event.queryStringParameters || {};
        if (!q.projectId || !q.budgetItemId) {
          return json(400, CORS, 'projectId and budgetItemId required');
        }
        enforcePrefix(q.budgetItemId);

        await dynamo.delete({
          TableName: TABLE_NAME,
          Key: { projectId: q.projectId, budgetItemId: q.budgetItemId },
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

/* ---- Utility Functions ---- */
function requireFields(obj, fields) {
  for (const f of fields) {
    if (obj[f] === undefined || obj[f] === null || obj[f] === '') {
      throw new Error(`${f} required`);
    }
  }
}

function enforcePrefix(id) {
  if (!id.startsWith('HEADER-') && !id.startsWith('LINE-')) {
    throw new Error('budgetItemId must start with HEADER- or LINE-');
  }
}

function stripFields(obj, toStrip) {
  const out = { ...obj };
  for (const k of toStrip) delete out[k];
  return out;
}
