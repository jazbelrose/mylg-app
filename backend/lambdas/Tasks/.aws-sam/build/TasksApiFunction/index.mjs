import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const TABLE_NAME = process.env.TASKS_TABLE_NAME || 'Tasks';
const PROJECT_ID_INDEX = 'ProjectIdIndex'; // if your GSI name differs, update here

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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
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

  // CORS preflight
  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  try {
    switch (method) {
      /* -------- CREATE (POST) -------- */
      case 'POST': {
        const raw = JSON.parse(event.body || '{}');
        if (typeof raw.budgetItemId === 'string' && raw.budgetItemId.trim() === '') delete raw.budgetItemId;
        if (raw.budgetItemId === null) delete raw.budgetItemId;
        requireFields(raw, ['projectId', 'name']);

        const status = normalizeStatus(raw.status);
        const now = new Date().toISOString();
        const taskId = uuidv4();
        const dueDate = (raw.dueDate || '').slice(0, 10); // YYYY-MM-DD
        const budgetItemSortKey = `${status}#${dueDate}#${taskId}`;

        const item = {
          projectId: raw.projectId,
          taskId,
          name: raw.name,
          assignedTo: raw.assignedTo,
          budgetItemId: raw.budgetItemId,
          dueDate,
          priority: raw.priority,
          status,
          comments: raw.comments ?? '',
          createdAt: now,
          updatedAt: now,
          budgetItemSortKey,
        };

        await dynamo.put({
          TableName: TABLE_NAME,
          Item: item,
          ConditionExpression: 'attribute_not_exists(projectId) AND attribute_not_exists(taskId)',
        });

        return json(201, CORS, item);
      }

      /* -------- FULL UPSERT (PUT) -------- */
      case 'PUT': {
        const raw = JSON.parse(event.body || '{}');
        if (typeof raw.budgetItemId === 'string' && raw.budgetItemId.trim() === '') delete raw.budgetItemId;
        if (raw.budgetItemId === null) delete raw.budgetItemId;
        requireFields(raw, ['taskId', 'projectId', 'name']);

        const status = normalizeStatus(raw.status);
        const now = new Date().toISOString();
        const dueDate = (raw.dueDate || '').slice(0, 10);
        const budgetItemSortKey = `${status}#${dueDate}#${raw.taskId}`;

        const item = {
          ...raw,
          status,
          comments: raw.comments ?? '',
          updatedAt: now,
          createdAt: raw.createdAt || now,
          budgetItemSortKey,
          dueDate,
        };

        await dynamo.put({ TableName: TABLE_NAME, Item: item });
        return json(200, CORS, item);
      }

      /* -------- PARTIAL UPDATE (PATCH) -------- */
      case 'PATCH': {
        const raw = JSON.parse(event.body || '{}');
        const unassign =
          Object.prototype.hasOwnProperty.call(raw, 'budgetItemId') &&
          (raw.budgetItemId === '' || raw.budgetItemId === null);
        if (typeof raw.budgetItemId === 'string' && raw.budgetItemId.trim() === '') delete raw.budgetItemId;
        if (raw.budgetItemId === null) delete raw.budgetItemId;

        requireFields(raw, ['projectId', 'taskId']);

        let updateExpr = [];
        let exprNames = {};
        let exprValues = {};

        const fields = ['name', 'assignedTo', 'budgetItemId', 'dueDate', 'priority', 'status', 'comments'];
        let status, dueDate;

        for (const field of fields) {
          if (Object.prototype.hasOwnProperty.call(raw, field)) {
            if (field === 'status') {
              status = normalizeStatus(raw.status);
              updateExpr.push(`#${field} = :${field}`);
              exprNames[`#${field}`] = field;
              exprValues[`:${field}`] = status;
            } else if (field === 'dueDate') {
              dueDate = (raw.dueDate || '').slice(0, 10);
              updateExpr.push(`#${field} = :${field}`);
              exprNames[`#${field}`] = field;
              exprValues[`:${field}`] = dueDate;
            } else {
              updateExpr.push(`#${field} = :${field}`);
              exprNames[`#${field}`] = field;
              exprValues[`:${field}`] = raw[field];
            }
          }
        }

        // If status or dueDate changed, update budgetItemSortKey
        if (status || dueDate) {
          const s = status || undefined;
          const d = dueDate || undefined;
          const sortKey = `${s || raw.status || 'TODO'}#${d || (raw.dueDate || '').slice(0, 10)}#${raw.taskId}`;
          updateExpr.push('#budgetItemSortKey = :sortKey');
          exprNames['#budgetItemSortKey'] = 'budgetItemSortKey';
          exprValues[':sortKey'] = sortKey;
        }

        if (updateExpr.length === 0 && !unassign) {
          return json(400, CORS, 'No valid fields to update');
        }

        updateExpr.push('updatedAt = :u');
        exprValues[':u'] = new Date().toISOString();

        let UpdateExpression = 'SET ' + updateExpr.join(', ');
        if (unassign) {
          UpdateExpression += ' REMOVE budgetItemId';
        }

        const updated = await dynamo.update({
          TableName: TABLE_NAME,
          Key: { projectId: raw.projectId, taskId: raw.taskId },
          UpdateExpression,
          ExpressionAttributeNames: exprNames,
          ExpressionAttributeValues: exprValues,
          ReturnValues: 'ALL_NEW',
        });

        return json(200, CORS, updated.Attributes);
      }

      /* -------- READ (GET) -------- */
      case 'GET': {
        const q = event.queryStringParameters || {};

        // Get by projectId + taskId
        if (q.projectId && q.taskId) {
          const r = await dynamo.get({
            TableName: TABLE_NAME,
            Key: { projectId: q.projectId, taskId: q.taskId },
          });
          return json(200, CORS, r.Item || null);
        }

        // Get all tasks for a project (table PK)
        if (q.projectId) {
          const r = await dynamo.query({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'projectId = :pid',
            ExpressionAttributeValues: { ':pid': q.projectId },
          });
          return json(200, CORS, r.Items || []);
        }

        // Get all tasks for a budgetItemId (GSI)
        if (q.budgetItemId) {
          let KeyConditionExpression = 'budgetItemId = :bid';
          let ExpressionAttributeValues = { ':bid': q.budgetItemId };
          if (q.status) {
            KeyConditionExpression += ' AND begins_with(budgetItemSortKey, :sk)';
            ExpressionAttributeValues[':sk'] = normalizeStatus(q.status) + '#';
          }
          const r = await dynamo.query({
            TableName: TABLE_NAME,
            IndexName: 'BudgetItemIdIndex',
            KeyConditionExpression,
            ExpressionAttributeValues,
          });
          return json(200, CORS, r.Items || []);
        }

        // Fallback: return all (may cost a lot)
        const r = await dynamo.scan({ TableName: TABLE_NAME });
        return json(200, CORS, r.Items || []);
      }

      /* -------- DELETE -------- */
      case 'DELETE': {
        const q = event.queryStringParameters || {};
        requireFields(q, ['projectId', 'taskId']);

        await dynamo.delete({
          TableName: TABLE_NAME,
          Key: { projectId: q.projectId, taskId: q.taskId },
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

function normalizeStatus(status) {
  const enums = ['TODO', 'INPROGRESS', 'BLOCKED', 'COMPLETE'];
  if (!status) return 'TODO';
  const s = String(status).toUpperCase().replace(/\s+/g, '');
  return enums.includes(s) ? s : 'TODO';
}
