const response = require('cfn-response');
const { IAMClient, GetRoleCommand, UpdateAssumeRolePolicyCommand } = require('@aws-sdk/client-iam');
exports.handler = function(event, context) {
    // Don't return promise, response.send() marks context as done internally
    const ignoredPromise = handleEvent(event, context)
};
async function handleEvent(event, context) {
    try {
        let authRoleName = event.ResourceProperties.authRoleName;
        let unauthRoleName = event.ResourceProperties.unauthRoleName;
        let idpId = event.ResourceProperties.idpId;
        let authParamsJson = {
            'Version': '2012-10-17',
            'Statement': [{
                'Effect': 'Allow',
                'Principal': {'Federated': 'cognito-identity.amazonaws.com'},
                'Action': 'sts:AssumeRoleWithWebIdentity',
                'Condition': {
                    'StringEquals': {'cognito-identity.amazonaws.com:aud': idpId},
                    'ForAnyValue:StringLike': {'cognito-identity.amazonaws.com:amr': 'authenticated'}
                }
            }]
        };
        let unauthParamsJson = {
            'Version': '2012-10-17',
            'Statement': [{
                'Effect': 'Allow',
                'Principal': {'Federated': 'cognito-identity.amazonaws.com'},
                'Action': 'sts:AssumeRoleWithWebIdentity',
                'Condition': {
                    'StringEquals': {'cognito-identity.amazonaws.com:aud': idpId},
                    'ForAnyValue:StringLike': {'cognito-identity.amazonaws.com:amr': 'unauthenticated'}
                }
            }]
        };
        if (event.RequestType === 'Delete') {
            try {
                delete authParamsJson.Statement[0].Condition;
                delete unauthParamsJson.Statement[0].Condition;
                authParamsJson.Statement[0].Effect = 'Deny'
                unauthParamsJson.Statement[0].Effect = 'Deny'
                let authParams = {PolicyDocument: JSON.stringify(authParamsJson), RoleName: authRoleName};
                let unauthParams = {PolicyDocument: JSON.stringify(unauthParamsJson), RoleName: unauthRoleName};
                const iam = new IAMClient({region: event.ResourceProperties.region});
                let res = await Promise.all([
                    iam.send(new GetRoleCommand({RoleName: authParams.RoleName})),
                    iam.send(new GetRoleCommand({RoleName: unauthParams.RoleName}))
                ]);
                res = await Promise.all([
                    iam.send(new UpdateAssumeRolePolicyCommand(authParams)),
                    iam.send(new UpdateAssumeRolePolicyCommand(unauthParams))
                ]);
                response.send(event, context, response.SUCCESS, {});
            } catch (err) {
                console.log(err.stack);
                response.send(event, context, response.SUCCESS, {Error: err});
            }
        } else if (event.RequestType === 'Update' || event.RequestType === 'Create') {
            const iam = new IAMClient({region: event.ResourceProperties.region});
            let authParams = {PolicyDocument: JSON.stringify(authParamsJson), RoleName: authRoleName};
            let unauthParams = {PolicyDocument: JSON.stringify(unauthParamsJson), RoleName: unauthRoleName};
            const res = await Promise.all([
                iam.send(new UpdateAssumeRolePolicyCommand(authParams)),
                iam.send(new UpdateAssumeRolePolicyCommand(unauthParams))
            ]);
            response.send(event, context, response.SUCCESS, {});
        }
    } catch (err) {
        console.log(err.stack);
        response.send(event, context, response.FAILED, {Error: err});
    }
};