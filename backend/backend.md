# Backend Lambda Functions

This directory (`backend/`) now includes JSON exports for API Gateway and DynamoDB (`tables/`), plus a `lambdas/` subfolder containing all AWS Lambda function code. Each folder in `lambdas/` is named exactly as its AWS function.

## Function Folders

* **All**
* **amplify-website-dev-15484-UpdateRolesWithIDPFuncti-Cv636FNM5ZkV**
* **CognitoAuthorizer**
* **DeleteFilesFromS3**
* **deleteProjectMessage**
* **DownloadsFunction**
* **editProject**
* **floorplansFunction**
* **getDirectMessages**
* **getDmInbox**
* **getProjectMessages**
* **invoicesFunction**
* **Newsletter-Subscribe-Function**
* **notifyNewSubscriber**
* **onConnect**
* **onDisconnect**
* **PostProjects**
* **postProjectToUserId**
* **Projects**
* **RegisteredUserTeamNotification**
* **SendProjectNotification**
* **threads**
* **userProfiles**
* **WebSocketDefaultHandler**
* **zipFiles**

> 💡 Each folder contains the unzipped code for the corresponding Lambda: handlers, package.json, and any local assets or utilities.

## Usage

1. **Install Dependencies**
   Navigate into each function folder and run:

   ```bash
   cd backend/lambdas/<FunctionName>
   npm install
   ```

2. **Invoke Locally**
   If you use a framework (e.g., AWS SAM, Serverless Framework), refer to your `template.yaml` or `serverless.yml` for local invocation commands. Example with SAM:

   ```bash
   sam local invoke <FunctionName> --event events/<event-file>.json
   ```

3. **Deployment**
   To deploy updates, either:

   * Use the AWS CLI:

     ```bash
     aws lambda update-function-code --function-name <FunctionName> --zip-file fileb://function.zip
     ```
   * Use your IaC tool (SAM/CDK/Serverless) at the repo root.

## Maintenance

* **Adding** new Lambdas:

  1. Create a new folder under `backend/lambdas/` named exactly as the Lambda function.
  2. Place your handler code and `package.json` inside.
  3. Commit and push; Copilot/Code will index it.

* **Removing** deprecated functions:
  Delete the corresponding folder and remove any references in IaC templates or front-end code.
## Project Invitation Endpoints

* **POST /invite-user** - calls `inviteUserToProject`. Body: `{ "projectId": "...", "senderId": "...", "recipientId": "..." }`. Returns `{ "inviteId": "<id>" }`.
* **POST /respond-invite** - calls `respondProjectInvitation`. Body: `{ "inviteId": "...", "action": "accept" | "decline" }`. Returns `{ "success": true }`.


---

*Generated on 2025-06-25*
