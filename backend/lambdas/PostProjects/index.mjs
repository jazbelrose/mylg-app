 import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const dynamo = DynamoDBDocument.from(new DynamoDB());

const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*', // Allow all origins
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};


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

    
            case 'DELETE':
                body = await dynamo.delete(JSON.parse(event.body));
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
                    statusCode = '400';
                    body = 'projectId is missing';
                }
                break;
           case 'POST':
    const postData = JSON.parse(event.body);

    // Validate postData for required fields
    if (!postData.TableName || !postData.Item) {
        statusCode = '400';
        body = 'Both TableName and Item are required fields.';
        break;
    }
    
     const projectId = uuidv4();
     const itemWithId = {
        ...postData.Item,
        projectId
    };

      try {
        await dynamo.put({
            TableName: postData.TableName,
            Item: itemWithId
        });

        // Create initial budget header entry
        const budgetId = uuidv4();
        const headerItem = {
            projectId,
            budgetItemId: `HEADER-${budgetId}`,
            budgetId,
            itemType: 'header',
            createdAt: new Date().toISOString(),
            revision: 1,
            headerBallPark: parseFloat(postData.Item?.budget?.total || '0'),
            headerBudgetedTotalCost: 0,
            title: postData.Item.title || '',
            startDate: postData.Item.date || '',
            endDate: postData.Item.finishline || '',
            client: postData.Item.client || '',
            headerActualTotalCost: 0,
            headerEffectiveMarkup: 1,
            headerFinalTotalCost: 0,
        };

        await dynamo.put({
            TableName: 'Budgets',
            Item: headerItem
        });

        body = { projectId, ...itemWithId, budgetId }; // Include the projectId in the response
    } catch (dbError) {
        statusCode = '400';
        body = dbError.message;
    }
    break;
    case 'PUT':
    if (event.queryStringParameters && event.queryStringParameters.projectId) {
        const projectId = event.queryStringParameters.projectId;
        const updateData = JSON.parse(event.body);

        const updateParams = {
            TableName: 'Projects',
            Key: { projectId: projectId },
            UpdateExpression: 'set uploads = :uploads',
            ExpressionAttributeValues: {
                ':uploads': updateData.uploads
            },
            ReturnValues: 'UPDATED_NEW'
        };

        try {
            const updateResult = await dynamo.update(updateParams);
            body = updateResult;
        } catch (updateError) {
            statusCode = '500';
            body = `Error updating item: ${updateError.message}`;
        }
    } else {
        statusCode = '400';
        body = 'projectId is missing in PUT request';
    }
    break;
            default:
                throw new Error(`Unsupported method "${event.httpMethod}"`);
        }
    } catch (err) {
        statusCode = '400';
        body = err.message;
    } finally {
        return {
            statusCode: statusCode,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*', 
                'Access-Control-Allow-Methods': 'OPTIONS, POST, GET, PUT, DELETE',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            body: JSON.stringify(body)
        };
    }
};