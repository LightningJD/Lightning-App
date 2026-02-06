import { describe, it, expect } from 'vitest';
import {
  validateUsername,
  validateEmail,
  validateTestimony,
  validateProfile,
  validateUrl,
  validateMessage,
  validatePassword,
  validateFileUpload,
  validateGroup
} from '../lib/inputValidation';

/**
 * Tests for input validation across the app
 * Critical for security and data integrity
 */

describe('Input Validation', () => {
  describe('Username Validation', () => {
    it('should accept valid usernames', () => {
      expect(validateUsername('john_doe')).toEqual({ valid: true, errors: [] });
      expect(validateUsername('user123')).toEqual({ valid: true, errors: [] });
      expect(validateUsername('abc')).toEqual({ valid: true, errors: [] }); // Min 3 chars
      expect(validateUsername('a'.repeat(20))).toEqual({ valid: true, errors: [] }); // Max 20 chars
    });

    it('should reject invalid usernames', () => {
      const emptyResult = validateUsername('');
      expect(emptyResult.valid).toBe(false);
      expect(emptyResult.errors).toContain('Username is required');

      const shortResult = validateUsername('ab');
      expect(shortResult.valid).toBe(false);
      expect(shortResult.errors.length).toBeGreaterThan(0);

      const longResult = validateUsername('a'.repeat(21));
      expect(longResult.valid).toBe(false);
      expect(longResult.errors.length).toBeGreaterThan(0);
    });

    it('should reject usernames with special characters', () => {
      const result = validateUsername('user@name');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('letters') || e.includes('numbers'))).toBe(true);
    });

    it('should reject reserved usernames', () => {
      const result = validateUsername('admin');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('not allowed'))).toBe(true);
    });

    it('should handle null/undefined inputs', () => {
      const result = validateUsername(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Username is required');
    });
  });

  describe('Email Validation', () => {
    it('should accept valid email addresses', () => {
      expect(validateEmail('user@example.com')).toEqual({ valid: true, errors: [] });
      expect(validateEmail('john.doe@company.co.uk')).toEqual({ valid: true, errors: [] });
      expect(validateEmail('test+tag@gmail.com')).toEqual({ valid: true, errors: [] });
    });

    it('should reject invalid email addresses', () => {
      const invalidResult = validateEmail('not-an-email');
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);

      const noAtResult = validateEmail('userexample.com');
      expect(noAtResult.valid).toBe(false);

      const emptyResult = validateEmail('');
      expect(emptyResult.valid).toBe(false);
      expect(emptyResult.errors).toContain('Email is required');
    });

    it('should reject emails with SQL injection attempts', () => {
      const result = validateEmail("admin' OR '1'='1");
      expect(result.valid).toBe(false);
      // Should fail either due to invalid format or SQL pattern detection
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject very long emails', () => {
      const longEmail = 'a'.repeat(300) + '@example.com';
      const result = validateEmail(longEmail);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('too long'))).toBe(true);
    });
  });

  describe('Testimony Validation', () => {
    it('should accept valid testimony content', () => {
      const validTestimony = 'God saved me from my sins and gave me new life in Christ through His grace and mercy.';
      const result = validateTestimony(validTestimony);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject empty testimonies', () => {
      const emptyResult = validateTestimony('');
      expect(emptyResult.valid).toBe(false);
      expect(emptyResult.errors).toContain('Testimony cannot be empty');

      const whitespaceResult = validateTestimony('   ');
      expect(whitespaceResult.valid).toBe(false);
    });

    it('should reject testimonies that are too short', () => {
      const result = validateTestimony('Hi');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('at least'))).toBe(true);
    });

    it('should reject testimonies that are too long', () => {
      const longTestimony = 'a'.repeat(5001); // Max 5000 chars
      const result = validateTestimony(longTestimony);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('less than'))).toBe(true);
    });

    it('should reject testimonies with spam patterns', () => {
      const spamTestimony = 'Click here! Buy now! Free offer! Discount sale! Limited time!';
      const result = validateTestimony(spamTestimony);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('spam'))).toBe(true);
    });

    it('should sanitize testimony content', () => {
      const testimonyWithHTML = '<p>God is good</p>';
      const result = validateTestimony(testimonyWithHTML);
      expect(result.sanitized).toBeDefined();
      // Sanitized output should not contain raw HTML tags
      expect(result.sanitized).not.toContain('<p>');
    });
  });

  describe('Profile Validation', () => {
    it('should accept valid profile data', () => {
      const validProfile = {
        displayName: 'John Doe',
        bio: 'Christian. Developer. Follower of Christ.',
        location: 'New York, NY',
        church: 'Grace Community Church'
      };
      const result = validateProfile(validProfile);
      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should reject display names that are too short', () => {
      const profile = { displayName: 'A' };
      const result = validateProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors.displayName).toContain('at least');
    });

    it('should reject display names that are too long', () => {
      const profile = { displayName: 'a'.repeat(51) };
      const result = validateProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors.displayName).toContain('less than');
    });

    it('should reject bios that are too long', () => {
      const profile = { bio: 'a'.repeat(501) };
      const result = validateProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors.bio).toContain('less than');
    });

    it('should reject profiles with dangerous characters', () => {
      const profile = { displayName: '<script>alert(1)</script>' };
      const result = validateProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors.displayName).toContain('invalid characters');
    });

    it('should reject locations with SQL injection', () => {
      const profile = { location: "'; DROP TABLE users; --" };
      const result = validateProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors.location).toContain('invalid characters');
    });
  });

  describe('URL Validation', () => {
    it('should accept valid URLs', () => {
      expect(validateUrl('https://example.com')).toEqual({ valid: true, errors: [] });
      expect(validateUrl('http://example.com')).toEqual({ valid: true, errors: [] });
      expect(validateUrl('https://www.youtube.com/watch?v=abc123')).toEqual({ valid: true, errors: [] });
    });

    it('should allow empty URLs (optional field)', () => {
      expect(validateUrl('')).toEqual({ valid: true, errors: [] });
      expect(validateUrl(null)).toEqual({ valid: true, errors: [] });
    });

    it('should reject invalid URLs', () => {
      const result = validateUrl('not a url');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject javascript: protocol URLs (XSS)', () => {
      const result = validateUrl('javascript:alert(1)');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('not allowed'))).toBe(true);
    });

    it('should reject data: protocol URLs', () => {
      const result = validateUrl('data:text/html,<script>alert(1)</script>');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('not allowed'))).toBe(true);
    });

    it('should reject file: protocol URLs', () => {
      const result = validateUrl('file:///etc/passwd');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('not allowed'))).toBe(true);
    });
  });

  describe('Password Validation', () => {
    it('should accept strong passwords', () => {
      const result = validatePassword('Passw0rd!123');
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.strength.hasUpperCase).toBe(true);
      expect(result.strength.hasLowerCase).toBe(true);
      expect(result.strength.hasNumbers).toBe(true);
    });

    it('should reject passwords that are too short', () => {
      const result = validatePassword('Pass1');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('at least'))).toBe(true);
    });

    it('should reject passwords without uppercase', () => {
      const result = validatePassword('password123');
      expect(result.valid).toBe(false);
      expect(result.strength.hasUpperCase).toBe(false);
    });

    it('should reject passwords without lowercase', () => {
      const result = validatePassword('PASSWORD123');
      expect(result.valid).toBe(false);
      expect(result.strength.hasLowerCase).toBe(false);
    });

    it('should reject passwords without numbers', () => {
      const result = validatePassword('Password');
      expect(result.valid).toBe(false);
      expect(result.strength.hasNumbers).toBe(false);
    });

    it('should reject common passwords', () => {
      const result = validatePassword('password');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('common'))).toBe(true);
    });

    it('should calculate password strength score', () => {
      const weakResult = validatePassword('password123');
      expect(weakResult.strength.score).toBeLessThan(4);

      const strongResult = validatePassword('Passw0rd!123');
      expect(strongResult.strength.score).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Message Validation', () => {
    it('should accept valid messages', () => {
      const result = validateMessage('Hello, how are you?');
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject empty messages', () => {
      const result = validateMessage('');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('cannot be empty'))).toBe(true);
    });

    it('should reject messages that are too long', () => {
      const longMessage = 'a'.repeat(1001);
      const result = validateMessage(longMessage);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('less than'))).toBe(true);
    });

    it('should sanitize messages', () => {
      const result = validateMessage('<script>alert("xss")</script>');
      expect(result.sanitized).toBeDefined();
      expect(result.sanitized).not.toContain('<script>');
    });

    it('should reject messages with script tags', () => {
      const result = validateMessage('<script>alert("xss")</script>');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('HTML scripts are not allowed'))).toBe(true);
    });

    it('should allow messages with SQL-like text (Supabase uses parameterized queries)', () => {
      // Messages with words like "select", "create", "update" should be allowed
      // since Supabase uses parameterized queries and these are just normal words
      const result1 = validateMessage('I created a new group');
      expect(result1.valid).toBe(true);
      
      const result2 = validateMessage('Please update your profile');
      expect(result2.valid).toBe(true);
      
      const result3 = validateMessage("'; DROP TABLE messages; --");
      // This should be allowed since it's just text, not actual SQL execution
      expect(result3.valid).toBe(true);
    });

    it('should allow messages with emojis and special characters', () => {
      const result1 = validateMessage('Hello! 😊 How are you?');
      expect(result1.valid).toBe(true);
      
      const result2 = validateMessage('Testing: @#$%^&*()_+-=[]{}|;:\'",.<>?/');
      expect(result2.valid).toBe(true);
    });
  });

  describe('File Upload Validation', () => {
    it('should accept valid image files', () => {
      const validFile = {
        name: 'photo.jpg',
        size: 2 * 1024 * 1024, // 2MB
        type: 'image/jpeg'
      };
      const result = validateFileUpload(validFile);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject files that are too large', () => {
      const largeFile = {
        name: 'large.jpg',
        size: 10 * 1024 * 1024, // 10MB
        type: 'image/jpeg'
      };
      const result = validateFileUpload(largeFile);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('less than'))).toBe(true);
    });

    it('should reject invalid file types', () => {
      const invalidFile = {
        name: 'document.pdf',
        size: 1024,
        type: 'application/pdf'
      };
      const result = validateFileUpload(invalidFile);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid file type'))).toBe(true);
    });

    it('should reject files with dangerous names', () => {
      const dangerousFile = {
        name: '<script>.jpg',
        size: 1024,
        type: 'image/jpeg'
      };
      const result = validateFileUpload(dangerousFile);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('invalid characters'))).toBe(true);
    });

    it('should reject files with no file selected', () => {
      const result = validateFileUpload(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No file selected');
    });
  });

  describe('Group Validation', () => {
    it('should accept valid group data', () => {
      const validGroup = {
        name: 'Bible Study Group',
        description: 'Weekly Bible study and prayer'
      };
      const result = validateGroup(validGroup);
      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should reject groups without names', () => {
      const result = validateGroup({ name: '' });
      expect(result.valid).toBe(false);
      expect(result.errors.name).toContain('required');
    });

    it('should reject group names that are too short', () => {
      const result = validateGroup({ name: 'ab' });
      expect(result.valid).toBe(false);
      expect(result.errors.name).toContain('at least');
    });

    it('should reject group names that are too long', () => {
      const result = validateGroup({ name: 'a'.repeat(51) });
      expect(result.valid).toBe(false);
      expect(result.errors.name).toContain('less than');
    });

    it('should reject inappropriate group names', () => {
      const result = validateGroup({ name: 'xxx content' });
      expect(result.valid).toBe(false);
      expect(result.errors.name).toContain('not allowed');
    });

    it('should reject group descriptions that are too long', () => {
      const result = validateGroup({
        name: 'Valid Group',
        description: 'a'.repeat(201)
      });
      expect(result.valid).toBe(false);
      expect(result.errors.description).toContain('less than');
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle null inputs without crashing', () => {
      expect(() => validateUsername(null)).not.toThrow();
      expect(() => validateEmail(null)).not.toThrow();
      expect(() => validateTestimony(null)).not.toThrow();
    });

    it('should handle undefined inputs without crashing', () => {
      expect(() => validateUsername(undefined)).not.toThrow();
      expect(() => validateEmail(undefined)).not.toThrow();
      expect(() => validateTestimony(undefined)).not.toThrow();
    });

    it('should handle very long inputs without crashing', () => {
      const veryLongString = 'a'.repeat(100000);
      expect(() => validateTestimony(veryLongString)).not.toThrow();
      expect(() => validateMessage(veryLongString)).not.toThrow();
    });

    it('should handle unicode characters', () => {
      const unicodeProfile = { displayName: 'José 👋' };
      expect(() => validateProfile(unicodeProfile)).not.toThrow();
    });

    it('should handle newlines in text', () => {
      const textWithNewlines = 'Line 1\nLine 2\r\nLine 3';
      const result = validateTestimony(textWithNewlines);
      expect(result).toBeDefined();
    });
  });
});
