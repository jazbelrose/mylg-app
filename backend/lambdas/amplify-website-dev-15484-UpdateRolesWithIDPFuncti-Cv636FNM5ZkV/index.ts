import { IAMClient, GetRoleCommand, UpdateAssumeRolePolicyCommand } from '@aws-sdk/client-iam';
import * as response from './cfn-response';

export const handler = async (event: any, context: any): Promise<void> => {
  // Don't return promise, response.send() marks context as done internally
  await handleEvent(event, context);
};

async function handleEvent(event: any, context: any): Promise<void> {
  try {
    let authRoleName = event.ResourceProperties.authRoleName;
    let unauthRoleName = event.ResourceProperties.unauthRoleName;
    let idpId = event.ResourceProperties.idpId;

    let authParamsJson = {
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: { Federated: 'cognito-identity.amazonaws.com' },
        Action: 'sts:AssumeRoleWithWebIdentity',
        Condition: {
          'StringEquals': { 'cognito-identity.amazonaws.com:aud': idpId },
          'ForAnyValue:StringLike': { 'cognito-identity.amazonaws.com:amr': 'authenticated' }
        }
      }]
    };
    let unauthParamsJson = {
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: { Federated: 'cognito-identity.amazonaws.com' },
        Action: 'sts:AssumeRoleWithWebIdentity',
        Condition: {
          'StringEquals': { 'cognito-identity.amazonaws.com:aud': idpId },
          'ForAnyValue:StringLike': { 'cognito-identity.amazonaws.com:amr': 'unauthenticated' }
        }
      }]
    };

    if (event.RequestType === 'Delete') {
      try {
        delete authParamsJson.Statement[0].Condition;
        delete unauthParamsJson.Statement[0].Condition;
        authParamsJson.Statement[0].Effect = 'Deny';
        unauthParamsJson.Statement[0].Effect = 'Deny';
        const authParams = { PolicyDocument: JSON.stringify(authParamsJson), RoleName: authRoleName };
        const unauthParams = { PolicyDocument: JSON.stringify(unauthParamsJson), RoleName: unauthRoleName };
        const iam = new IAMClient({ region: event.ResourceProperties.region });
        let res = await Promise.all([
          iam.send(new GetRoleCommand({ RoleName: authParams.RoleName })),
          iam.send(new GetRoleCommand({ RoleName: unauthParams.RoleName }))
        ]);
        res = await Promise.all([
          iam.send(new UpdateAssumeRolePolicyCommand(authParams)),
          iam.send(new UpdateAssumeRolePolicyCommand(unauthParams))
        ]);
        await response.send(event, context, response.SUCCESS, {});
      } catch (err) {
        console.log((err as Error).stack);
        await response.send(event, context, response.SUCCESS, { Error: err });
      }
    } else if (event.RequestType === 'Update' || event.RequestType === 'Create') {
      const iam = new IAMClient({ region: event.ResourceProperties.region });
      const authParams = { PolicyDocument: JSON.stringify(authParamsJson), RoleName: authRoleName };
      const unauthParams = { PolicyDocument: JSON.stringify(unauthParamsJson), RoleName: unauthRoleName };
      await Promise.all([
        iam.send(new UpdateAssumeRolePolicyCommand(authParams)),
        iam.send(new UpdateAssumeRolePolicyCommand(unauthParams))
      ]);
      await response.send(event, context, response.SUCCESS, {});
    }
  } catch (err) {
    console.log((err as Error).stack);
    await response.send(event, context, response.FAILED, { Error: err });
  }
}
