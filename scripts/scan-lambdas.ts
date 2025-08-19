import { readdirSync, writeFileSync } from "fs";
import { join } from "path";

const root = join(process.cwd(), "backend", "lambdas");
const rows = readdirSync(root, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => `| ${d.name} |  |  |  |  |  |`)
  .join("\n");

const md = `# Endpoint Catalog

| Lambda (folder) | Method | Path | Auth | Request | Response |
|---|---|---|---|---|---|
${rows}

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

- Update this file by running: \`npm run gen:endpoints\`
- Add detailed schemas in separate files for complex request/response types
- Consider generating OpenAPI specs from this catalog
`;

writeFileSync(join(process.cwd(), "backend", "ENDPOINTS.md"), md);
console.log("✅ Generated backend/ENDPOINTS.md with", rows.split('\n').length, "lambda functions");
