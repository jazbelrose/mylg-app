# Endpoint Catalog

| Lambda (folder) | Method | Path | Auth | Request | Response |
|---|---|---|---|---|---|
| All |  |  |  |  |  |
| amplify-website-dev-15484-UpdateRolesWithIDPFuncti-Cv636FNM5ZkV |  |  |  |  |  |
| assignEventIdsBatch |  |  |  |  |  |
| budgets |  |  |  |  |  |
| CognitoAuthorizer |  |  |  |  |  |
| CollabInvites |  |  |  |  |  |
| CreateGalleryFunction |  |  |  |  |  |
| DeleteFilesFromS3 |  |  |  |  |  |
| DeleteGalleryFunction |  |  |  |  |  |
| deleteProjectMessage |  |  |  |  |  |
| DownloadsFunction |  |  |  |  |  |
| editMessage |  |  |  |  |  |
| editProject |  |  |  |  |  |
| Events |  |  |  |  |  |
| floorplansFunction |  |  |  |  |  |
| galleries-api |  |  |  |  |  |
| generatePresignedUrl |  |  |  |  |  |
| getDirectMessages |  |  |  |  |  |
| getDmInbox |  |  |  |  |  |
| getNotifications |  |  |  |  |  |
| getProjectMessages |  |  |  |  |  |
| inviteUserToProject |  |  |  |  |  |
| Newsletter-Subscribe-Function |  |  |  |  |  |
| notifyNewSubscriber |  |  |  |  |  |
| onConnect |  |  |  |  |  |
| onDisconnect |  |  |  |  |  |
| PostProjects |  |  |  |  |  |
| postProjectToUserId |  |  |  |  |  |
| PreTokenGeneration |  |  |  |  |  |
| Projects |  |  |  |  |  |
| RefreshToken |  |  |  |  |  |
| RegisteredUserTeamNotification |  |  |  |  |  |
| respondProjectInvitation |  |  |  |  |  |
| SendProjectNotification |  |  |  |  |  |
| Tasks |  |  |  |  |  |
| threads |  |  |  |  |  |
| userProfiles |  |  |  |  |  |
| userProfilesPending |  |  |  |  |  |
| WebSocketDefaultHandler |  |  |  |  |  |
| zipFiles |  |  |  |  |  |

## Usage Instructions

1. Fill in the Method column with HTTP verbs (GET, POST, PUT, DELETE) or WS for WebSocket
2. Add the API Gateway path in the Path column  
3. Specify auth requirements (None, Cognito JWT, API Key, etc.)
4. Document request format (query params, body schema)
5. Document response format (success/error schemas)

## Example Completed Rows

| Lambda (folder) | Method | Path | Auth | Request | Response |
|---|---|---|---|---|---|
| getProjectMessages | GET | /projects/{projectId}/messages | Cognito JWT | query: {cursor?, limit?} | {items: Message[], nextCursor?} |
| postProjectToUserId | POST | /users/{userId}/projects | Cognito JWT | {projectId, role} | {ok: true} |
| WebSocketDefaultHandler | WS | $default | API GW WS | {action, ...payload} | {ack: true} |

## Notes

- Update this file by running: `npm run gen:endpoints`
- Add detailed schemas in separate files for complex request/response types
- Consider generating OpenAPI specs from this catalog
