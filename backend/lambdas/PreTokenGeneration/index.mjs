import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

const dynamo = DynamoDBDocument.from(new DynamoDB());
const tableName = process.env.USER_PROFILES_TABLE || 'UserProfiles';

export const handler = async (event) => {
  console.log('PreTokenGeneration event:', JSON.stringify(event, null, 2));
  const userId = event.request.userAttributes?.sub;
  let role = 'user';

  if (userId) {
    try {
      const res = await dynamo.get({ TableName: tableName, Key: { userId } });
      if (res.Item && res.Item.role) {
        role = res.Item.role;
      }
    } catch (err) {
      console.error('Error fetching user role:', err);
    }
  } else {
    console.warn('No user sub in event.request.userAttributes');
  }

  event.response = event.response || {};
  event.response.claimsOverrideDetails = event.response.claimsOverrideDetails || {};
  const CLAIM_KEY = 'role';
  event.response.claimsOverrideDetails.claimsToAddOrOverride = {
    ...(event.response.claimsOverrideDetails.claimsToAddOrOverride || {}),
    [CLAIM_KEY]: role,
  };

  console.log('Modified event:', JSON.stringify(event, null, 2));
  return event;
};