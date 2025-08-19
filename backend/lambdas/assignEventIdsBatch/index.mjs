import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const dynamo = DynamoDBDocument.from(new DynamoDB());
const TABLE_NAME = process.env.EVENTS_TABLE_NAME || 'Events';

export const handler = async (event) => {
  let statusCode = '200';
  let body = {};
  try {
    const { projectIds = [] } = JSON.parse(event.body || '{}');
    if (!Array.isArray(projectIds) || projectIds.length === 0) {
      throw new Error('projectIds must be a non-empty array');
    }
    const updated = [];
    for (const projectId of projectIds) {
      const res = await dynamo.query({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'projectId = :p',
        ExpressionAttributeValues: { ':p': projectId },
      });
      const events = res.Items || [];
      const withIds = events.map(ev => {
        const id = ev.eventId || ev.id || randomUUID();
        return { ...ev, projectId, eventId: id, id };
      });
      const writes = withIds.map(ev => ({ PutRequest: { Item: ev } }));
      for (let i = 0; i < writes.length; i += 25) {
        const chunk = writes.slice(i, i + 25);
        await dynamo.batchWrite({ RequestItems: { [TABLE_NAME]: chunk } });
      }
      updated.push({ projectId, count: withIds.length });
    }
    body = { updated };
  } catch (err) {
    statusCode = '400';
    body = { error: err.message };
  }
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'OPTIONS,POST',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
    body: JSON.stringify(body)
  };
};