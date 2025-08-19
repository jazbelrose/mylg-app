import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const dynamo = DynamoDBDocument.from(new DynamoDB());

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
      const project = await dynamo.get({ TableName: 'Projects', Key: { projectId } });
      const events = project.Item?.timelineEvents || [];
      const withIds = events.map(ev => ({ ...ev, id: ev.id || randomUUID() }));
      await dynamo.update({
        TableName: 'Projects',
        Key: { projectId },
        UpdateExpression: 'set timelineEvents = :events',
        ExpressionAttributeValues: { ':events': withIds }
      });
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