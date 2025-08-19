import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

const dynamo = DynamoDBDocument.from(new DynamoDB());

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-CSRF-Token,X-Requested-With,X-Amz-Date,X-Amz-Security-Token,X-Amz-User-Agent',
  'Access-Control-Allow-Methods': 'OPTIONS,GET,PUT,DELETE',
  'Access-Control-Expose-Headers': 'Authorization,x-amzn-RequestId,x-amz-apigw-id',
};

const send = (statusCode, result) => ({
  statusCode,
  headers: corsHeaders,
  body: result === undefined ? '' : JSON.stringify(result),
});

const safeParse = (s) => { try { return JSON.parse(s || '{}'); } catch { return {}; } };

export const handler = async (event) => {
  let statusCode = 200;
  let result;

  // Log the incoming event for debugging
  console.log('Incoming event:', JSON.stringify(event, null, 2));

  try {
    if (event.httpMethod === 'OPTIONS') {
      return send(204); // no body for preflight
    }

    switch (event.httpMethod) {
      case 'GET': {
        const table = process.env.USER_PROFILES_TABLE || 'UserProfiles';
        const qs = event.queryStringParameters || {};
        if (qs.userIds) {
          const ids = qs.userIds
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean);
          if (ids.length) {
            const { Responses } = await dynamo.batchGet({
              RequestItems: {
                [table]: {
                  Keys: ids.map((userId) => ({ userId })),
                },
              },
            });
            result = {
              Items: (Responses?.[table] || []).map((item) => ({
                ...item,
                firstName: item.firstName || item.cognitoAttributes?.given_name || '',
              })),
            };
          } else {
            result = { Items: [] };
          }
        } else if (qs.userId) {
          const { Item } = await dynamo.get({ TableName: table, Key: { userId: qs.userId } });
          result = {
            Item: Item ? { ...Item, firstName: Item.firstName || Item.cognitoAttributes?.given_name || '' } : null,
          };
        } else {
          const scanResult = await dynamo.scan({ TableName: table });
          result = {
            Items: scanResult.Items.map((item) => ({
              ...item,
              firstName: item.firstName || item.cognitoAttributes?.given_name || '',
            })),
          };
        }
        break;
      }

      case 'PUT': {
        const input = safeParse(event.body);
        const table = process.env.USER_PROFILES_TABLE || 'UserProfiles';
        let userId = input.userId || input.cognitoSub;
        if (!userId) throw new Error('userId or cognitoSub required');

        const email = input.email?.toLowerCase();
        let item = { ...input, userId, role: input.role || 'user' };

        if (typeof item.pending !== 'boolean') {
          const existing = await dynamo.get({ TableName: table, Key: { userId } });
          if (typeof existing.Item?.pending === 'boolean') item.pending = existing.Item.pending;
        }

        if (email) {
          const pendingKey = `PENDING#${email}`;
          const pending = await dynamo.get({ TableName: table, Key: { userId: pendingKey } });
          if (pending.Item) {
            item = { ...pending.Item, ...item, userId, pending: pending.Item.pending };
            delete item.ttl;
            await dynamo.delete({ TableName: table, Key: { userId: pendingKey } });
          }
        }

        result = await dynamo.put({ TableName: table, Item: item });
        break;
      }

      case 'DELETE': {
        const params = safeParse(event.body);
        result = await dynamo.delete({
          TableName: process.env.USER_PROFILES_TABLE || 'UserProfiles',
          ...params,
        });
        break;
      }

      default:
        statusCode = 405;
        result = { message: `Unsupported method "${event.httpMethod}"` };
    }
  } catch (err) {
    // Log the error to CloudWatch
    console.error('Lambda handler error:', err);
    statusCode = 400;
    result = { error: err.message };
  }

  return send(statusCode, result);
};
