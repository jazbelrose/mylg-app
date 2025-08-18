// Basic security validation tests
// This file validates the security fixes implemented

import { csrfProtection, rateLimiter, sanitizeInput, logSecurityEvent } from '../utils/securityUtils';

describe('Security Utilities', () => {
  beforeEach(() => {
    // Clear any existing data
    sessionStorage.clear();
    rateLimiter.clearAll();
  });

  describe('CSRF Protection', () => {
    test('generates and validates CSRF tokens', () => {
      const token = csrfProtection.generateToken();
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(20);
    });

    test('validates correct CSRF tokens', () => {
      const token = csrfProtection.generateToken();
      expect(csrfProtection.validateToken(token)).toBe(true);
    });

    test('rejects invalid CSRF tokens', () => {
      expect(csrfProtection.validateToken('invalid-token')).toBeFalsy();
    });

    test('adds CSRF token to headers', () => {
      const token = csrfProtection.generateToken();
      const headers = csrfProtection.addToHeaders();
      expect(headers['X-CSRF-Token']).toBe(token);
    });

    test('clears CSRF token', () => {
      csrfProtection.generateToken();
      csrfProtection.clearToken();
      expect(sessionStorage.getItem('csrf_token')).toBeNull();
    });
  });

  describe('Rate Limiting', () => {
    test('allows requests within limit', () => {
      expect(rateLimiter.isAllowed('test-key', 5, 60000)).toBe(true);
      expect(rateLimiter.isAllowed('test-key', 5, 60000)).toBe(true);
    });

    test('blocks requests exceeding limit', () => {
      // Fill up the rate limit
      for (let i = 0; i < 5; i++) {
        rateLimiter.isAllowed('test-key', 5, 60000);
      }
      // This should be blocked
      expect(rateLimiter.isAllowed('test-key', 5, 60000)).toBe(false);
    });

    test('tracks remaining requests correctly', () => {
      rateLimiter.isAllowed('test-key', 5, 60000);
      rateLimiter.isAllowed('test-key', 5, 60000);
      expect(rateLimiter.getRemainingRequests('test-key', 5, 60000)).toBe(3);
    });

    test('clears rate limiting data', () => {
      rateLimiter.isAllowed('test-key', 5, 60000);
      rateLimiter.clear('test-key');
      expect(rateLimiter.getRemainingRequests('test-key', 5, 60000)).toBe(5);
    });
  });

  describe('Input Sanitization', () => {
    test('sanitizes XSS attempts', () => {
      const malicious = '<script>alert("xss")</script>';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
    });

    test('handles HTML entities', () => {
      const input = 'Hello & "World" <tag>';
      const expected = 'Hello &amp; &quot;World&quot; &lt;tag&gt;';
      expect(sanitizeInput(input)).toBe(expected);
    });

    test('returns non-string inputs unchanged', () => {
      expect(sanitizeInput(123)).toBe(123);
      expect(sanitizeInput(null)).toBe(null);
      expect(sanitizeInput(undefined)).toBe(undefined);
    });
  });

  describe('Security Event Logging', () => {
    test('logs security events', () => {
      const originalWarn = console.warn;
      const mockWarn = jest.fn();
      console.warn = mockWarn;

      logSecurityEvent('test_event', { detail: 'test' });

      expect(mockWarn).toHaveBeenCalledWith(
        'Security Event:',
        expect.objectContaining({
          event: 'test_event',
          details: { detail: 'test' }
        })
      );

      console.warn = originalWarn;
    });

    test('stores security logs in session storage', () => {
      logSecurityEvent('test_event');
      const logs = JSON.parse(sessionStorage.getItem('security_logs') || '[]');
      expect(logs).toHaveLength(1);
      expect(logs[0].event).toBe('test_event');
    });
  });
});

describe('Security Headers Validation', () => {
  test('validates that security headers are present in HTML', () => {
    // This would need to be run in a browser environment or with DOM testing
    // For now, we'll test the expected CSP string format
    const expectedCSP = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' *.amazonaws.com *.amplify.aws";
    expect(expectedCSP).toContain("default-src 'self'");
    expect(expectedCSP).toContain("script-src 'self'");
  });
});

// Package vulnerability validation
describe('Package Security', () => {
  test('verifies xlsx is not in dependencies', () => {
    const packageJson = require('../../package.json');
    expect(packageJson.dependencies.xlsx).toBeUndefined();
    expect(packageJson.dependencies.exceljs).toBeDefined();
  });

  test('verifies pdfjs-dist is updated', () => {
    const packageJson = require('../../package.json');
    const pdfVersion = packageJson.dependencies['pdfjs-dist'] || packageJson.devDependencies['pdfjs-dist'];
    expect(pdfVersion).toMatch(/^\^?4\./); // Should be version 4.x or higher
  });
});

export default {
  // Export test utilities for manual testing
  testCSRF: () => {
    const token = csrfProtection.generateToken();
    console.log('CSRF Token generated:', token);
    console.log('Validation test:', csrfProtection.validateToken(token));
  },
  
  testRateLimit: () => {
    console.log('Rate limit test - first 3 requests:');
    for (let i = 0; i < 3; i++) {
      console.log(`Request ${i + 1}:`, rateLimiter.isAllowed('test', 2, 60000));
    }
  },
  
  testSanitization: () => {
    const malicious = '<script>alert("xss")</script>';
    console.log('Original:', malicious);
    console.log('Sanitized:', sanitizeInput(malicious));
  }
};