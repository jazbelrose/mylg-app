import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

const dynamo = DynamoDBDocument.from(new DynamoDB());
const TABLE = process.env.USER_PROFILES_TABLE || 'UserProfiles';

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

function getOrigin(event) {
  return event.headers?.origin || event.headers?.Origin || '';
}

function corsHeaders(origin) {
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '';
  const base = {
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,x-api-key',
    'Access-Control-Max-Age': '600',
    'Content-Type': 'application/json',
  };
  return allowOrigin ? { ...base, 'Access-Control-Allow-Origin': allowOrigin } : base;
}

export const handler = async (event) => {
  const origin = getOrigin(event);
  const headers = corsHeaders(origin);
  const method = event.requestContext?.http?.method || event.httpMethod;

  // --- CORS preflight ---
  if (method === 'OPTIONS') {
    // 204 even if origin isn’t allowed (no ACAO) to avoid leaking info
    return { statusCode: 204, headers, body: '' };
  }

  // Block non-allowed origins on actual requests
  if (!ALLOWED_ORIGINS.includes(origin)) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden origin' }) };
  }

  // Only POST allowed here
  if (method !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: `Method ${method} not allowed` }) };
  }

  try {
    const profile = JSON.parse(event.body || '{}');
    if (!profile.email) throw new Error('email is required');

    const email = String(profile.email).toLowerCase();
    const userId = profile.cognitoSub ? String(profile.cognitoSub) : `PENDING#${email}`;
    const ttl = profile.cognitoSub ? undefined : Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

    // (Optional, recommended): verify the Cognito user exists & is UNCONFIRMED
    // using AdminGetUser/ListUsers here before writing.

    const item = { ...profile, userId, pending: true };
    if (ttl) item.ttl = ttl;

    const updateParts = [];
    const names = {};
    const values = {};
    for (const [key, value] of Object.entries(item)) {
      if (key === 'userId') continue;
      updateParts.push(`#${key} = if_not_exists(#${key}, :${key})`);
      names[`#${key}`] = key;
      values[`:${key}`] = value;
    }

    await dynamo.update({
      TableName: TABLE,
      Key: { userId },
      UpdateExpression: 'SET ' + updateParts.join(', '),
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    });

    return { statusCode: 200, headers, body: JSON.stringify({ message: 'ok' }) };
  } catch (err) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: err.message || 'Bad Request' }) };
  }
};
