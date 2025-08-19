import AWS from 'aws-sdk';

// Configure DynamoDB client with retry settings
const dynamo = new AWS.DynamoDB.DocumentClient({
  maxRetries: 5,
  retryDelayOptions: { base: 200 }
});

const DM_TABLE = process.env.DM_TABLE_NAME || process.env.DM_MESSAGES_TABLE;
const PROJECT_TABLE = process.env.PROJECT_MESSAGES_TABLE;

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'OPTIONS,PATCH'
};

// Exponential backoff helper
async function withBackoff(operation, retries = 5, delay = 100) {
  try {
    return await operation();
  } catch (err) {
    if (err.code === 'ProvisionedThroughputExceededException' && retries > 0) {
      await new Promise((res) => setTimeout(res, delay));
      return withBackoff(operation, retries - 1, delay * 2);
    }
    throw err;
  }
}

// Helper to update message in DynamoDB
async function updateMessage(table, key, content, editedBy, timestamp = new Date().toISOString()) {
  const params = {
    TableName: table,
    Key: key,
    UpdateExpression: 'SET #t = :c, edited = :e, editedAt = :ts, editedBy = :eb',
    ExpressionAttributeNames: { '#t': 'text' },
    ExpressionAttributeValues: {
      ':c': content,
      ':e': true,
      ':ts': timestamp,
      ':eb': editedBy
    },
    ReturnValues: 'ALL_NEW'
  };
  return withBackoff(() => dynamo.update(params).promise());
}

export const handler = async (event) => {
  try {
    console.log('EVENT:', JSON.stringify(event, null, 2));

    const method = event.httpMethod || event.requestContext?.http?.method;
    if (method === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };
    if (method !== 'PATCH') return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method Not Allowed' }) };

    const { type, messageId } = event.pathParameters || {};
    if (!['direct','project'].includes(type) || !messageId) {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Invalid path parameters' }) };
    }

    let body;
    try { body = JSON.parse(event.body || '{}'); } catch {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }
    const { content, editedBy } = body;
    if (!content || !editedBy) {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'content and editedBy required' }) };
    }

    // Require partition key from request body
    let partitionKeyName, partitionKeyValue;
    if (type === 'direct') {
      partitionKeyName = 'conversationId';
      partitionKeyValue = body.conversationId;
    } else {
      partitionKeyName = 'projectId';
      partitionKeyValue = body.projectId;
    }

    if (!partitionKeyValue) {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({ error: `${partitionKeyName} required in body` }),
      };
    }

    const auth = event.requestContext?.authorizer || {};
    const claims = auth.jwt?.claims || auth.claims || {};
    const requester = auth.userId || claims.userId || claims.sub;
    const role = auth.role || claims.role || '';
    const isAdmin = (role || '').toLowerCase() === 'admin';

    if (!requester) {
      return {
        statusCode: 401,
        headers: HEADERS,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    const table = type === 'direct' ? DM_TABLE : PROJECT_TABLE;

    // Get message by partition key and sort key
    const getParams = {
      TableName: table,
      Key: {
        [partitionKeyName]: partitionKeyValue,
        messageId: messageId
      }
    };

    let item;
    try {
      const res = await withBackoff(() => dynamo.get(getParams).promise());
      item = res.Item;
      console.log('Found item:', item);
      if (!item) return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ error: 'Message not found' }) };
    } catch (err) {
      console.error('Error fetching message:', err);
      return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'Error fetching message', details: err.message }) };
    }

    if (item.senderId !== requester && !isAdmin) {
      return { statusCode: 403, headers: HEADERS, body: JSON.stringify({ error: 'Forbidden' }) };
    }

    try {
      const result = await updateMessage(table, getParams.Key, content, editedBy);
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify(result.Attributes) };
    } catch (err) {
      console.error('Error updating message:', err);
      return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'Error updating message', details: err.message }) };
    }
  } catch (err) {
    console.error('Unhandled error in handler:', err);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'Internal Server Error', details: err.message }) };
  }
};

// Export for testing
export { updateMessage, dynamo };
