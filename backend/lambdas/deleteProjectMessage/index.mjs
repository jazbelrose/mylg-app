// index.mjs

import AWS from 'aws-sdk';

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.PROJECT_MESSAGES_TABLE;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'OPTIONS,GET,DELETE',
};

export const handler = async (event) => {
  console.log('📡 Received Request:', JSON.stringify(event, null, 2));

  const method = event.httpMethod || event.requestContext?.http?.method;

  // --- 1. PRE-FLIGHT CORS ---
  if (method === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }

  // --- 2. GET: fetch all messages for a project ---
  if (method === 'GET') {
    const projectId = event.queryStringParameters?.projectId;
    if (!projectId) {
      return {
        statusCode: 400,
        headers: CORS,
        body: JSON.stringify({ error: 'Missing projectId' }),
      };
    }

    const params = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'projectId = :projectId',
      ExpressionAttributeValues: { ':projectId': projectId },
      ScanIndexForward: true, // oldest first
    };

    try {
      const result = await dynamoDb.query(params).promise();
      const items = result.Items || [];
      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify(items),
      };
    } catch (err) {
      console.error('❌ DynamoDB query error:', err);
      return {
        statusCode: 500,
        headers: CORS,
        body: JSON.stringify({ error: 'Error fetching messages', details: err.message }),
      };
    }
  }

  // --- 3. DELETE: remove a single message by projectId + messageId ---
  if (method === 'DELETE') {
    const { projectId, messageId } = event.queryStringParameters || {};
    if (!projectId || !messageId) {
      return {
        statusCode: 400,
        headers: CORS,
        body: JSON.stringify({ error: 'Missing projectId or messageId' }),
      };
    }

    const params = {
      TableName: TABLE_NAME,
      Key: { projectId, messageId },
    };

    try {
      await dynamoDb.delete(params).promise();
      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ success: true }),
      };
    } catch (err) {
      console.error('❌ DynamoDB delete error:', err);
      return {
        statusCode: 500,
        headers: CORS,
        body: JSON.stringify({ error: 'Error deleting message', details: err.message }),
      };
    }
  }

  // --- 4. METHOD NOT ALLOWED ---
  return {
    statusCode: 405,
    headers: CORS,
    body: JSON.stringify({ error: 'Method Not Allowed' }),
  };
};
