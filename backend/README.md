# MyLG Backend Documentation

This directory contains serverless backend infrastructure and documentation for the MyLG collaborative design platform.

## 🏗️ Architecture

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Complete system overview, data flow, and component descriptions
- **[ENDPOINTS.md](./ENDPOINTS.md)** - Catalog of all Lambda functions and their API routes
- **[openapi.yaml](./openapi.yaml)** - OpenAPI specification for key endpoints

## 📁 Directory Structure

```
backend/
├── ARCHITECTURE.md          # System architecture documentation
├── ENDPOINTS.md             # Auto-generated endpoint catalog
├── openapi.yaml            # OpenAPI specification
├── types/                  # TypeScript type definitions
│   └── api-types.ts        # Common request/response interfaces
├── lambdas/               # Lambda function implementations
│   ├── getProjectMessages/ # Project messaging
│   ├── postProjectToUserId/ # User-project management
│   ├── WebSocketDefaultHandler/ # Real-time messaging
│   ├── generatePresignedUrl/ # S3 file uploads
│   └── ... (40+ functions)
├── tables/                # DynamoDB table definitions
│   └── dynamodb-tables.json
└── tests/                 # Integration tests
    ├── editMessage/
    └── ...
```

## 🔧 Development Notes

### Documentation-Only Backend
This backend is configured as "documentation-only" in the main app:
- ✅ **Committed**: Lambda source code, table schemas, API Gateway configs
- ❌ **Excluded**: From TypeScript compilation, ESLint, builds
- 🤖 **AI-Optimized**: Structured for GitHub Copilot pattern matching

### Auto-Generated Documentation
Update the endpoint catalog by running:
```bash
npm run gen:endpoints
```

### Lambda Function Headers
Each Lambda includes a documentation header for AI context:
```javascript
/**
 * Lambda: functionName
 * Route: HTTP_METHOD /api/path
 * Auth: Authentication requirements
 * Input: Request schema
 * Output: Response schema
 * Side effects: Database/external operations
 */
```

## 🔐 Security & Auth

- **Amazon Cognito**: User authentication and JWT management
- **API Gateway**: Request routing and authorization
- **IAM Roles**: Function-level permissions
- **CORS**: Configured for dev and production domains

## 📊 Data Storage

### DynamoDB Tables
- **Projects**: Project metadata and team management
- **UserProfiles**: User accounts and preferences
- **PROJECT_MESSAGES**: Conversation history
- **DIRECT_MESSAGES**: Private messaging
- **Notifications**: User notification queue

### S3 Storage
- Project files, images, and generated content
- Presigned URLs for secure upload/download

## 🔌 API Patterns

### REST Endpoints
- Standard CRUD operations
- Consistent JSON request/response format
- Pagination with cursor-based navigation

### WebSocket API
- Real-time messaging and notifications
- Connection state management
- Action-based message routing

## 🚀 Getting Started

1. **Explore the architecture**: Read [ARCHITECTURE.md](./ARCHITECTURE.md)
2. **Browse endpoints**: Check [ENDPOINTS.md](./ENDPOINTS.md)
3. **Review types**: See `types/api-types.ts` for request/response interfaces
4. **OpenAPI spec**: Import `openapi.yaml` into tools like Postman or Insomnia

## 🤝 Contributing

When adding new Lambda functions:
1. Add documentation header to the function
2. Update type definitions in `types/`
3. Run `npm run gen:endpoints` to refresh the catalog
4. Add OpenAPI paths for public endpoints

## 📝 Notes

- This backend tree is marked as `linguist-documentation` for GitHub
- Lambda functions use both JavaScript (`.mjs`) and Python (`.py`)
- Environment variables configure table names and external services
- Tests are available in the `tests/` directory for key functions
