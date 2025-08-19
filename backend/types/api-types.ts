// Common request/response types for MyLG API

export interface ApiResponse<T = any> {
  ok: true;
  data?: T;
}

export interface ApiError {
  error: string;
  details?: any;
  statusCode?: number;
}

// Pagination
export interface PaginatedRequest {
  cursor?: string;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  totalCount?: number;
}

// Common entities
export interface User {
  userId: string;
  email: string;
  name: string;
  avatar?: string;
  role?: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  projectId: string;
  name: string;
  description?: string;
  ownerId: string;
  team: ProjectMember[];
  status: 'active' | 'archived' | 'deleted';
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: string;
}

export interface Message {
  messageId: string;
  projectId?: string; // for project messages
  threadId?: string;  // for DMs
  senderId: string;
  content: string;
  attachments?: string[];
  createdAt: string;
  updatedAt?: string;
  editedAt?: string;
}

export interface Notification {
  notificationId: string;
  userId: string;
  type: 'project_invite' | 'message' | 'mention' | 'system';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: string;
}

// WebSocket message types
export interface WebSocketMessage {
  action: string;
  data?: any;
  timestamp?: string;
}

export interface WebSocketResponse {
  ack: boolean;
  error?: string;
  data?: any;
}

// S3 upload types
export interface PresignedUrlRequest {
  fileName: string;
  fileType: string;
  projectId?: string;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  downloadUrl: string;
  key: string;
}

// Auth types
export interface CognitoJwtPayload {
  sub: string; // userId
  email: string;
  'cognito:username': string;
  'custom:role'?: string;
  exp: number;
  iat: number;
}
