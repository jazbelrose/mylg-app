/**
 * Lambda: postProjectToUserId
 * Route: POST /users/{userId}/projects
 * Auth: Cognito JWT (role: ADMIN or self)
 * Input: { projectId: string, role?: string }
 * Output: { ok: true }
 * Side effects: updates UserProfiles.projects[] and Projects.team[]
 */

import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';


export const dynamo = DynamoDBDocument.from(new DynamoDB());

export async function updateMembership(userId, projectId, action) {
  const [userData, projectData] = await Promise.all([
    dynamo.get({ TableName: 'UserProfiles', Key: { userId } }),
    dynamo.get({ TableName: 'Projects', Key: { projectId } }),
  ]);

  const currentProjects = Array.isArray(userData.Item?.projects)
    ? [...userData.Item.projects]
    : [];
  const currentTeam = Array.isArray(projectData.Item?.team)
    ? [...projectData.Item.team]
    : [];

  if (action === 'add') {
    if (!currentProjects.includes(projectId)) currentProjects.push(projectId);
    if (!currentTeam.some(m => m.userId === userId)) currentTeam.push({ userId });
  } else {
    const projIdx = currentProjects.indexOf(projectId);
    if (projIdx !== -1) currentProjects.splice(projIdx, 1);
    for (let i = currentTeam.length - 1; i >= 0; i--) {
      if (currentTeam[i].userId === userId) currentTeam.splice(i, 1);
    }
  }

  await dynamo.transactWrite({
    TransactItems: [
      {
        Update: {
          TableName: 'UserProfiles',
          Key: { userId },
          UpdateExpression: 'SET projects = :projects',
          ExpressionAttributeValues: { ':projects': currentProjects },
        },
      },
      {
        Update: {
          TableName: 'Projects',
          Key: { projectId },
          UpdateExpression: 'SET team = :team',
          ExpressionAttributeValues: { ':team': currentTeam },
        },
      },
    ],
  });

  return { projects: currentProjects, team: currentTeam };
}

export const handler = async (event) => {
    let body;
    let statusCode = '200';
    
    try {
        switch (event.httpMethod) {
            case 'OPTIONS':
                body = 'CORS preflight';
                break;
    
            case 'GET':
                if (event.queryStringParameters && event.queryStringParameters.userId) {
                    const userId = event.queryStringParameters.userId;
                    const params = {
                        TableName: 'UserProfiles',
                        KeyConditionExpression: 'userId = :userId',
                        ExpressionAttributeValues: {
                            ':userId': userId
                        }
                    };
                    const result = await dynamo.query(params);
                    if (result.Count === 1) {
                        const projects = result.Items[0].projects || [];
                        body = JSON.stringify({ projects });
                    } else {
                        statusCode = '404';
                        body = 'User not found';
                    }
                } else {
                    statusCode = '400';
                    body = 'userId is missing';
                }
                break;
            
            case 'PUT':
                if (event.queryStringParameters && event.queryStringParameters.userId) {
                    const userId = event.queryStringParameters.userId;
                    const updateData = JSON.parse(event.body);
                    const newProjectId = updateData.newProjectId;

                    try {
                        const result = await updateMembership(userId, newProjectId, 'add');
                        body = JSON.stringify(result);
                    } catch (updateError) {
                        statusCode = '500';
                        body = `Error updating projects: ${updateError.message}`;
                    }
                } else {
                    statusCode = '400';
                    body = 'userId is missing in PUT request';
                }
                break;
            case 'DELETE':
                if (event.queryStringParameters && event.queryStringParameters.userId && event.queryStringParameters.projectId) {
                    const userId = event.queryStringParameters.userId;
                    const projectId = event.queryStringParameters.projectId;

                    try {
                        const result = await updateMembership(userId, projectId, 'remove');
                        body = JSON.stringify(result);
                    } catch (err) {
                        statusCode = '500';
                        body = `Error updating projects: ${err.message}`;
                    }
                } else {
                    statusCode = '400';
                    body = 'userId and/or projectId is missing';
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
                'Access-Control-Allow-Methods': 'OPTIONS, GET, PUT',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            body: body
        };
    }
};
