import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const dynamo = DynamoDBDocument.from(new DynamoDB());
const userProfilesTable = process.env.USER_PROFILES_TABLE || 'UserProfiles';
const connectionsTable  = process.env.CONNECTIONS_TABLE   || 'Connections';
const websocketEndpoint = process.env.WEBSOCKET_ENDPOINT;
const apigw = websocketEndpoint ? new AWS.ApiGatewayManagementApi({ endpoint: websocketEndpoint }) : null;

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE',
  'Access-Control-Allow-Headers': 'Authorization,Content-Type',
  'Access-Control-Max-Age': '86400',
};


export const handler = async (event) => {
  // Core API Gateway request normalization
  const method = event.requestContext?.http?.method || event.httpMethod;
  const path = event.rawPath || event.path || '';
  const TABLE = process.env.COLLAB_INVITES_TABLE || 'CollabInvites';

  // Log the incoming event, method, path
  console.log('[INVITES] Raw Event:', JSON.stringify(event));
  console.log('[INVITES] Method:', method, 'Path:', path);

  // CORS preflight
  if (method === "OPTIONS") {
    console.log('[INVITES] CORS Preflight Hit');
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  let statusCode = 200;
  let result = null;

  try {
    // Extract userId from claims, fallback to DEFAULT_USER_ID (log it!)
    const claims = event.requestContext?.authorizer?.jwt?.claims || {};
    const userId = claims.sub || process.env.DEFAULT_USER_ID;
    console.log('[INVITES] Claims:', claims);
    console.log('[INVITES] Extracted userId:', userId);

    if (!userId) {
      console.warn('[INVITES] No userId found. Returning 401.');
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    // ---- SEND INVITE ----
    if (method === 'POST' && path.endsWith('/send')) {
      console.log('[INVITES] SEND: Body:', event.body);
      const { toUserId, message, projectId } = JSON.parse(event.body || '{}');
      if (!toUserId) throw new Error("Missing toUserId");
      const invite = {
        id: uuidv4(),
        fromUserId: userId,
        toUserId,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        message,
        projectId,
      };
      console.log('[INVITES] Writing Invite:', invite);
      await dynamo.put({ TableName: TABLE, Item: invite });

      // Notify both parties so their UIs refresh in real-time
      await Promise.allSettled([
        broadcastToUser(userId, { type: 'collaborators-updated' }),
        broadcastToUser(toUserId, { type: 'collaborators-updated' }),
      ]);

      result = invite;
    }

    // ---- OUTGOING INVITES ----
    else if (method === 'GET' && path.endsWith('/outgoing')) {
      console.log('[INVITES] OUTGOING: userId:', userId);
      result = await dynamo.query({
        TableName: TABLE,
        IndexName: 'fromUserId-status-index',
        KeyConditionExpression: 'fromUserId = :fromUserId AND #status = :pending',
        ExpressionAttributeValues: { ':fromUserId': userId, ':pending': 'pending' },
        ExpressionAttributeNames: { '#status': 'status' },
      });
      console.log('[INVITES] OUTGOING: Result:', result);
    }

    // ---- INCOMING INVITES ----
    else if (method === 'GET' && path.endsWith('/incoming')) {
      console.log('[INVITES] INCOMING: userId:', userId);
      result = await dynamo.query({
        TableName: TABLE,
        IndexName: 'toUserId-status-index',
        KeyConditionExpression: 'toUserId = :toUserId AND #status = :pending',
        ExpressionAttributeValues: { ':toUserId': userId, ':pending': 'pending' },
        ExpressionAttributeNames: { '#status': 'status' },
      });
      console.log('[INVITES] INCOMING: Result:', result);
    }

    // ---- ACCEPT/DECLINE/CANCEL ----
    else if (method === 'POST' && path.match(/\/(accept|decline|cancel)\/[\w-]+$/)) {
      const [, action, inviteId] = path.match(/\/(accept|decline|cancel)\/([\w-]+)$/);
      let newStatus = '';
      if (action === 'accept') newStatus = 'accepted';
      else if (action === 'decline') newStatus = 'declined';
      else if (action === 'cancel') newStatus = 'canceled';

      console.log(`[INVITES] ${action.toUpperCase()}: inviteId:`, inviteId, 'NewStatus:', newStatus);

      const { Item: invite } = await dynamo.get({ TableName: TABLE, Key: { id: inviteId } });
      if (!invite) throw new Error('Invite not found');

      await dynamo.update({
        TableName: TABLE,
        Key: { id: inviteId },
        UpdateExpression: 'set #status = :status, updatedAt = :now',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': newStatus, ':now': new Date().toISOString() },
      });

      const { fromUserId, toUserId } = invite;

      if (action === 'accept') {
        const [fromRes, toRes] = await Promise.all([
          dynamo.get({ TableName: userProfilesTable, Key: { userId: fromUserId } }),
          dynamo.get({ TableName: userProfilesTable, Key: { userId: toUserId } }),
        ]);

        const fromCollabs = Array.isArray(fromRes.Item?.collaborators) ? [...fromRes.Item.collaborators] : [];
        if (!fromCollabs.includes(toUserId)) fromCollabs.push(toUserId);

        const toCollabs = Array.isArray(toRes.Item?.collaborators) ? [...toRes.Item.collaborators] : [];
        if (!toCollabs.includes(fromUserId)) toCollabs.push(fromUserId);

        await dynamo.transactWrite({
          TransactItems: [
            {
              Update: {
                TableName: userProfilesTable,
                Key: { userId: fromUserId },
                UpdateExpression: 'SET collaborators = :c1',
                ExpressionAttributeValues: { ':c1': fromCollabs },
              },
            },
            {
              Update: {
                TableName: userProfilesTable,
                Key: { userId: toUserId },
                UpdateExpression: 'SET collaborators = :c2',
                ExpressionAttributeValues: { ':c2': toCollabs },
              },
            },
          ],
        });

        await Promise.all([
          broadcastToUser(fromUserId, { type: 'collaborators-updated' }),
          broadcastToUser(toUserId, { type: 'collaborators-updated' }),
        ]);
      } else {
        // For decline/cancel just notify both parties so invite lists update
        await Promise.allSettled([
          broadcastToUser(fromUserId, { type: 'collaborators-updated' }),
          broadcastToUser(toUserId, { type: 'collaborators-updated' }),
        ]);
      }

      result = { id: inviteId, status: newStatus };
    }

    // ---- NO ROUTE MATCHED ----
    else {
      statusCode = 405;
      result = { message: `Unsupported method or path: "${method} ${path}"` };
      console.warn('[INVITES] No handler matched for this method/path.');
    }
  } catch (err) {
    statusCode = 400;
    result = { error: err.message, stack: err.stack };
    console.error('[INVITES] ERROR:', err);
  }

  // Final response
  console.log('[INVITES] Response:', { statusCode, result });
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(result),
  };
};

async function broadcastToUser(userId, payload) {
  if (!apigw || !connectionsTable) return;
  try {
    const { Items = [] } = await dynamo.scan({ TableName: connectionsTable });
    const conns = Items.filter(c => c.userId === userId).map(c => c.connectionId);
    await Promise.allSettled(
      conns.map(id => apigw.postToConnection({ ConnectionId: id, Data: JSON.stringify(payload) }).promise())
    );
  } catch (err) {
    console.error('[INVITES] broadcastToUser error', err);
  }
}
