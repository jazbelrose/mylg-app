import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

const dynamo = DynamoDBDocument.from(new DynamoDB());

export const handler = async (event) => {
  let body;
  let statusCode = '200';

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
            Key: { projectId }, // <-- Using get, not query
          };
          const result = await dynamo.get(params);
          body = result.Item ? result.Item : { error: 'Project not found' };
        } else {
          statusCode = '400';
          body = 'projectId is missing';
        }
        break;

      case 'PUT':
        const projectId = event.queryStringParameters.projectId;
        const updateData = JSON.parse(event.body);
        console.log("Received PUT payload:", JSON.stringify(updateData));

        if (updateData.galleryUpdate && updateData.galleryUpdate.id) {
          const project = await dynamo.get({
            TableName: 'Projects',
            Key: { projectId },
          });
                    // Determine whether galleries are stored in `galleries` or legacy `gallery` field
          let fieldName = Array.isArray(project.Item?.galleries)
            ? 'galleries'
            : Array.isArray(project.Item?.gallery)
              ? 'gallery'
              : null;

          if (fieldName) {
            const projectGalleries = project.Item[fieldName] || [];
            const idx = projectGalleries.findIndex(
              (g) => g.id === updateData.galleryUpdate.id
            );
            if (idx >= 0) {
              const updateFields = { ...updateData.galleryUpdate };
              delete updateFields.id;
              projectGalleries[idx] = {
                ...projectGalleries[idx],
                ...updateFields,
              };
              updateData[fieldName] = projectGalleries;
            }
          }

          delete updateData.galleryUpdate;
        }
        const existingProject = await dynamo.get({
          TableName: 'Projects',
          Key: { projectId },
          ProjectionExpression: 'description',
        });

        const previousDescription = existingProject.Item?.description || '';
        console.log("Previous description retrieved:", previousDescription);

        await dynamo.put({
          TableName: 'ProjectRevisionHistory',
          Item: {
            projectId,
            revisionId: new Date().toISOString(),
            description: previousDescription,
            author: updateData.author || "Unknown",
            revisionDate: new Date().toISOString(),
          },
        });

        const fieldsToExclude = ["projectId"];
        const filteredUpdateData = Object.keys(updateData).reduce((acc, key) => {
          if (!fieldsToExclude.includes(key)) {
            acc[key] = updateData[key];
          }
          return acc;
        }, {});

        let updateExpression = 'set ';
        let expressionAttributeValues = {};
        let expressionAttributeNames = {};
        let firstValue = true;

        for (const key in filteredUpdateData) {
          if (filteredUpdateData.hasOwnProperty(key)) {
            const valueAlias = `:${key}`;
            updateExpression += firstValue ? `#${key} = ${valueAlias}` : `, #${key} = ${valueAlias}`;
            expressionAttributeValues[valueAlias] = filteredUpdateData[key];
            expressionAttributeNames[`#${key}`] = key;
            firstValue = false;
          }
        }

        const updatedItem = await dynamo.update({
          TableName: 'Projects',
          Key: { projectId },
          UpdateExpression: updateExpression,
          ExpressionAttributeValues: expressionAttributeValues,
          ExpressionAttributeNames: expressionAttributeNames,
          ReturnValues: 'UPDATED_NEW',
        });

        body = updatedItem;
        break;

      default:
        throw new Error(`Unsupported method "${event.httpMethod}"`);
    }
  } catch (err) {
    statusCode = err.statusCode || '400';
    body = err.message;
  }

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'OPTIONS, POST, GET, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
    body: JSON.stringify(body)
  };
};
