import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

const dynamo = DynamoDBDocument.from(new DynamoDB());

export const handler = async (event) => {
    //console.log('Received event:', JSON.stringify(event, null, 2));

    let body;
    let statusCode = '200';
    const headers = {
        'Content-Type': 'application/json',
    };

    try {
        switch (event.httpMethod) {
            case 'OPTIONS':
                body = 'CORS preflight';
                break;
          
            case 'GET':
                if (event.queryStringParameters && event.queryStringParameters.projectId) {
                    const projectId = event.queryStringParameters.projectId;
                    const params = {
                        TableName: 'Projects',
                        KeyConditionExpression: 'projectId = :projectId',
                        ExpressionAttributeValues: {
                            ':projectId': projectId
                        }
                    };
                    body = await dynamo.query(params);
                } else {
                    const params = {
                        TableName: 'Projects',
                    };
                    body = await dynamo.scan(params);
                }
               
        }
    } catch (err) {
        console.error("Error:", err);
        statusCode = err.statusCode ? err.statusCode : '500';
        body = {
            error: err.message,
            stack: err.stack,
        };
    }
    return {
        statusCode: statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*', 
            'Access-Control-Allow-Methods': 'OPTIONS, GET, PUT',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        },
        body: JSON.stringify(body)
    };
};
