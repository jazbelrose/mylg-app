# MyLG App Backend Architecture

## Overview
This document outlines the serverless architecture for the MyLG collaborative design platform.

## Architecture Flow

```
Client (React) 
    ↓ HTTP/WebSocket
API Gateway (REST + WebSocket)
    ↓ Routes to Lambda functions
AWS Lambda Functions
    ↓ Data operations
DynamoDB Tables + S3 Storage
```

## Core Components

### Authentication
- **Amazon Cognito**: User authentication and JWT token management
- **PreTokenGeneration**: Custom claims injection during token generation
- **CognitoAuthorizer**: API Gateway authorizer for protected routes

### API Layer
- **REST API Gateway**: HTTP endpoints for CRUD operations
- **WebSocket API Gateway**: Real-time messaging and notifications
- **CORS**: Configured for localhost development and production domains

### Lambda Functions (Business Logic)

#### Project Management
- **Projects/**: CRUD operations for design projects
- **PostProjects/**: Create new projects
- **editProject/**: Update project details
- **getProjectMessages/**: Fetch project conversation history
- **postProjectToUserId/**: Add users to projects

#### User & Team Management  
- **userProfiles/**: User profile management
- **userProfilesPending/**: Handle pending user approvals
- **inviteUserToProject/**: Send project invitations
- **respondProjectInvitation/**: Accept/decline invitations
- **CollabInvites/**: Handle collaboration invitations

#### Messaging & Notifications
- **getDirectMessages/**: Private messaging between users
- **getDmInbox/**: User's direct message inbox
- **editMessage/**: Edit existing messages
- **deleteProjectMessage/**: Remove messages from projects
- **getNotifications/**: User notification feed
- **SendProjectNotification/**: Trigger project-related notifications
- **RegisteredUserTeamNotification/**: Team join notifications

#### Real-time WebSocket
- **onConnect/**: WebSocket connection handler
- **onDisconnect/**: WebSocket disconnection cleanup
- **WebSocketDefaultHandler/**: Default WebSocket message routing

#### File & Media Management
- **galleries-api/**: Image gallery operations
- **CreateGalleryFunction/**: Create new image galleries
- **DeleteGalleryFunction/**: Remove galleries
- **generatePresignedUrl/**: Secure S3 upload URLs
- **DeleteFilesFromS3/**: Clean up S3 objects
- **DownloadsFunction/**: Handle file downloads
- **zipFiles/**: Archive multiple files
- **floorplansFunction/**: Floor plan specific operations

#### Utilities & Background Tasks
- **Events/**: Event processing and coordination
- **Tasks/**: Task management system
- **threads/**: Discussion thread management
- **assignEventIdsBatch/**: Bulk event ID assignment
- **budgets/**: Project budget tracking
- **Newsletter-Subscribe-Function/**: Newsletter subscriptions
- **notifyNewSubscriber/**: New subscriber notifications
- **RefreshToken/**: JWT token refresh logic

### Data Storage

#### DynamoDB Tables
- **Projects**: Project metadata and settings
- **UserProfiles**: User account information and preferences
- **PROJECT_MESSAGES**: Project conversation history
- **DIRECT_MESSAGES**: Private user messaging
- **Notifications**: User notification queue
- **Events**: System and user events
- **Tasks**: Project task management
- **Galleries**: Image gallery metadata

#### S3 Storage
- **File Uploads**: Project files, images, documents
- **Generated Content**: Processed images, PDFs, exports
- **User Assets**: Profile pictures, custom resources

## Security Model

### Authorization Levels
- **Public**: Newsletter signup, basic info
- **Authenticated**: Logged-in users (Cognito JWT required)
- **Project Member**: Users with project access
- **Project Owner**: Full project control
- **Admin**: Platform administration

### Data Access Patterns
- Users can only access their own profiles and projects they're members of
- Project messages are restricted to team members
- Direct messages are private between sender/receiver
- S3 objects use presigned URLs for secure access

## Development Notes

### Local Development
- CORS configured for `http://localhost:3000` and LAN IP
- Lambda functions use environment variables for table names
- Mock data and test utilities available in `backend/tests/`

### Deployment
- Infrastructure as Code definitions in `backend/tables/` and `api-gateway-*.json`
- Lambda deployment packages exclude development dependencies
- Environment-specific configuration through AWS Parameter Store

### Monitoring & Logging
- CloudWatch logs for all Lambda functions
- Error tracking and performance monitoring
- API Gateway access logs and metrics

## API Patterns

### Request/Response Format
- JSON request/response bodies
- Consistent error format: `{ error: string, details?: any }`
- Success format: `{ ok: true, data?: any }` or direct data
- Pagination: `{ items: T[], nextCursor?: string }`

### Common Headers
- `Authorization: Bearer <jwt-token>` for protected routes
- `Content-Type: application/json` for JSON payloads
- CORS headers automatically added by Lambda responses
