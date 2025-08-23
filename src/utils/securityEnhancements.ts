// Enhanced Security Middleware for MYLG App
// This file provides additional security enhancements beyond the basic utilities

import { logSecurityEvent } from './securityUtils';

// Content Security Policy generator
export const generateCSP = (nonce: string): string => {
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' *.amazonaws.com *.amplify.aws`,
    "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
    "font-src 'self' fonts.gstatic.com",
    "img-src 'self' data: *.amazonaws.com",
    "connect-src 'self' *.amazonaws.com wss://*.amazonaws.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ];
  
  return csp.join('; ');
};

// Request validator for API calls
export class RequestValidator {
  private allowedDomains: string[];

  constructor() {
    this.allowedDomains = [
      'amazonaws.com',
      'amplify.aws',
      window.location.hostname,
    ];
  }

  validateUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      const isAllowed = this.allowedDomains.some((domain) =>
        parsedUrl.hostname.endsWith(domain),
      );

      if (!isAllowed) {
        logSecurityEvent('unauthorized_domain_access', { url });
        return false;
      }

      return true;
    } catch (error: any) {
      logSecurityEvent('invalid_url_format', { url, error: error.message });
      return false;
    }
  }

  validateHeaders(headers: Record<string, string>): boolean {
    const suspicious = ['x-forwarded-for', 'x-real-ip', 'x-original-url'];
    const found = Object.keys(headers).filter((key) =>
      suspicious.includes(key.toLowerCase()),
    );

    if (found.length > 0) {
      logSecurityEvent('suspicious_headers_detected', { headers: found });
      return false;
    }

    return true;
  }
}

// Secure localStorage wrapper with encryption
export class SecureStorage {
  private keyPrefix: string;

  constructor() {
    this.keyPrefix = 'mylg_secure_';
  }

  async encrypt<T>(data: T): Promise<string> {
    // Simple encryption for demo - in production use Web Crypto API
    const jsonString = JSON.stringify(data);
    const encoded = btoa(jsonString);
    return encoded;
  }

  async decrypt<T>(encryptedData: string): Promise<T | null> {
    try {
      const decoded = atob(encryptedData);
      return JSON.parse(decoded) as T;
    } catch (error: any) {
      logSecurityEvent('decryption_failed', { error: error.message });
      return null;
    }
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const encrypted = await this.encrypt(value);
      localStorage.setItem(this.keyPrefix + key, encrypted);
      logSecurityEvent('secure_storage_write', { key });
    } catch (error: any) {
      logSecurityEvent('secure_storage_write_failed', { key, error: error.message });
    }
  }

  async getItem<T>(key: string): Promise<T | null> {
    try {
      const encrypted = localStorage.getItem(this.keyPrefix + key);
      if (!encrypted) return null;

      const decrypted = await this.decrypt<T>(encrypted);
      logSecurityEvent('secure_storage_read', { key });
      return decrypted;
    } catch (error: any) {
      logSecurityEvent('secure_storage_read_failed', { key, error: error.message });
      return null;
    }
  }

  removeItem(key: string): void {
    localStorage.removeItem(this.keyPrefix + key);
    logSecurityEvent('secure_storage_delete', { key });
  }
}

// API Response validator
export const validateApiResponse = (response: unknown, expectedFields: string[] = []): boolean => {
  if (!response || typeof response !== 'object') {
    logSecurityEvent('invalid_api_response_format', { response });
    return false;
  }

  // Check for required fields
  const missingFields = expectedFields.filter((field) => !(field in (response as Record<string, unknown>)));
  if (missingFields.length > 0) {
    logSecurityEvent('missing_required_fields', { missingFields });
    return false;
  }

  // Check for potential XSS in string fields
  const stringFields = Object.entries(response as Record<string, unknown>)
    .filter(([_, value]) => typeof value === 'string')
    .map(([key, value]) => ({ key, value: value as string }));
    
  const suspiciousFields = stringFields.filter(({ value }) => 
    /<script|javascript:|on\w+=/i.test(value)
  );
  
  if (suspiciousFields.length > 0) {
    logSecurityEvent('potential_xss_in_response', { 
      fields: suspiciousFields.map(f => f.key) 
    });
    return false;
  }
  
  return true;
};

// Session management with security checks
export class SecureSessionManager {
  private sessionKey: string;
  private maxInactivity: number;
  private storage: SecureStorage;

  constructor() {
    this.sessionKey = 'mylg_session';
    this.maxInactivity = 30 * 60 * 1000; // 30 minutes
    this.storage = new SecureStorage();
  }

  async createSession(userInfo: { userId: string; role: string }): Promise<any> {
    const session = {
      userId: userInfo.userId,
      role: userInfo.role,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      sessionId: crypto.randomUUID(),
    };

    await this.storage.setItem(this.sessionKey, session);
    logSecurityEvent('session_created', {
      userId: userInfo.userId,
      sessionId: session.sessionId,
    });

    return session;
  }

  async getSession(): Promise<any | null> {
    const session = await this.storage.getItem<any>(this.sessionKey);
    if (!session) return null;

    // Check if session is expired
    if (Date.now() - session.lastActivity > this.maxInactivity) {
      await this.destroySession();
      logSecurityEvent('session_expired', { sessionId: session.sessionId });
      return null;
    }

    // Update last activity
    session.lastActivity = Date.now();
    await this.storage.setItem(this.sessionKey, session);

    return session;
  }

  async updateActivity(): Promise<void> {
    const session = await this.getSession();
    if (session) {
      session.lastActivity = Date.now();
      await this.storage.setItem(this.sessionKey, session);
    }
  }

  async destroySession(): Promise<void> {
    const session = await this.storage.getItem<any>(this.sessionKey);
    if (session) {
      logSecurityEvent('session_destroyed', { sessionId: session.sessionId });
    }
    this.storage.removeItem(this.sessionKey);
  }
}

// Export instances
export const requestValidator = new RequestValidator();
export const secureStorage = new SecureStorage();
export const sessionManager = new SecureSessionManager();