import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { updateMembership } from '../postProjectToUserId/index.mjs';

export const dynamo = DynamoDBDocument.from(new DynamoDB());

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'OPTIONS,POST',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  const method = event.httpMethod || event.requestContext?.http?.method;
  if (method === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (method !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  let body;
  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { inviteId, action } = body || {};
  if (!inviteId || !['accept','decline'].includes(action)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'inviteId and valid action required' }) };
  }

  const { Item } = await dynamo.get({ TableName: 'ProjectInvitations', Key: { inviteId } });
  if (!Item) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Invite not found' }) };

  if (action === 'accept') {
    await updateMembership(Item.recipientId, Item.projectId, 'add');
  }

  await dynamo.delete({ TableName: 'ProjectInvitations', Key: { inviteId } });
  return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
};