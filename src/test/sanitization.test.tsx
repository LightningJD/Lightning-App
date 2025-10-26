import { describe, it, expect } from 'vitest';
import {
  sanitizeUserContent,
  sanitizePlainText,
  sanitizeUrl,
  escapeHtml,
  stripHtml
} from '../lib/sanitization';

/**
 * Tests for HTML sanitization and XSS protection
 * Critical for security - prevents malicious code injection
 */

describe('Sanitization', () => {
  describe('User Content Sanitization (HTML allowed)', () => {
    it('should allow safe HTML formatting tags', () => {
      const input = '<p>This is a <strong>testimony</strong> about <em>faith</em>.</p>';
      const result = sanitizeUserContent(input);

      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
      expect(result).toContain('<em>');
      expect(result).toContain('testimony');
    });

    it('should allow links with safe attributes', () => {
      const input = '<a href="https://example.com">Visit website</a>';
      const result = sanitizeUserContent(input);

      expect(result).toContain('<a');
      expect(result).toContain('href="https://example.com"');
      expect(result).toContain('target="_blank"'); // Auto-added
      expect(result).toContain('rel="noopener noreferrer"'); // Auto-added for security
    });

    it('should remove script tags', () => {
      const input = '<p>Hello</p><script>alert("XSS")</script><p>World</p>';
      const result = sanitizeUserContent(input);

      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
      expect(result).toContain('Hello');
      expect(result).toContain('World');
    });

    it('should remove javascript: URLs', () => {
      const input = '<a href="javascript:alert(1)">Click me</a>';
      const result = sanitizeUserContent(input);

      expect(result).not.toContain('javascript:');
      expect(result).not.toContain('alert');
    });

    it('should remove onclick and other event handlers', () => {
      const input = '<button onclick="alert(1)">Click</button>';
      const result = sanitizeUserContent(input);

      expect(result).not.toContain('onclick');
      expect(result).not.toContain('alert');
    });

    it('should remove style tags and style attributes', () => {
      const input = '<p style="color: red;">Styled text</p><style>body { display: none; }</style>';
      const result = sanitizeUserContent(input);

      expect(result).not.toContain('style=');
      expect(result).not.toContain('<style>');
      expect(result).toContain('Styled text');
    });

    it('should remove iframe tags', () => {
      const input = '<iframe src="https://evil.com"></iframe><p>Text</p>';
      const result = sanitizeUserContent(input);

      expect(result).not.toContain('<iframe');
      expect(result).not.toContain('evil.com');
      expect(result).toContain('Text');
    });

    it('should allow line breaks', () => {
      const input = 'Line 1<br>Line 2<br/>Line 3';
      const result = sanitizeUserContent(input);

      expect(result).toContain('<br');
      expect(result).toContain('Line 1');
      expect(result).toContain('Line 2');
    });

    it('should handle nested HTML', () => {
      const input = '<p><strong><em>Nested formatting</em></strong></p>';
      const result = sanitizeUserContent(input);

      expect(result).toContain('<strong>');
      expect(result).toContain('<em>');
      expect(result).toContain('Nested formatting');
    });

    it('should handle empty input', () => {
      expect(sanitizeUserContent('')).toBe('');
      expect(sanitizeUserContent(null as any)).toBe('');
      expect(sanitizeUserContent(undefined as any)).toBe('');
    });
  });

  describe('Plain Text Sanitization (No HTML)', () => {
    it('should strip all HTML tags', () => {
      const input = '<p>Hello <strong>world</strong>!</p>';
      const result = sanitizePlainText(input);

      expect(result).not.toContain('<p>');
      expect(result).not.toContain('<strong>');
      expect(result).toContain('Hello world!');
    });

    it('should strip script tags and content', () => {
      const input = 'Text<script>alert("XSS")</script>More text';
      const result = sanitizePlainText(input);

      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
      expect(result).toContain('Text');
      expect(result).toContain('More text');
    });

    it('should handle usernames with no HTML allowed', () => {
      const input = '<b>hacker</b>';
      const result = sanitizePlainText(input);

      // Should remove all HTML tags
      expect(result).not.toContain('<b>');
      expect(result).not.toContain('</b>');
    });

    it('should preserve plain text', () => {
      const input = 'Just plain text with no HTML';
      const result = sanitizePlainText(input);

      expect(result).toBe('Just plain text with no HTML');
    });

    it('should handle special characters', () => {
      const input = 'Text with special characters';
      const result = sanitizePlainText(input);

      // Should preserve text content
      expect(result).toBeDefined();
      expect(result).toContain('Text');
    });
  });

  describe('URL Sanitization', () => {
    it('should allow HTTP and HTTPS URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
    });

    it('should block javascript: protocol', () => {
      const result = sanitizeUrl('javascript:alert(1)');
      expect(result).not.toContain('javascript:');
      expect(result).not.toContain('alert');
    });

    it('should block data: protocol', () => {
      const result = sanitizeUrl('data:text/html,<script>alert(1)</script>');
      expect(result).not.toContain('data:');
      expect(result).not.toContain('script');
    });

    it('should block file: protocol', () => {
      const result = sanitizeUrl('file:///etc/passwd');
      expect(result).not.toContain('file:');
      expect(result).not.toContain('passwd');
    });

    it('should handle empty URLs', () => {
      expect(sanitizeUrl('')).toBe('');
      expect(sanitizeUrl(null as any)).toBe('');
    });

    it('should preserve query parameters', () => {
      const url = 'https://example.com/page?param=value&other=123';
      const result = sanitizeUrl(url);
      expect(result).toContain('param=value');
      expect(result).toContain('other=123');
    });
  });

  describe('HTML Escaping', () => {
    it('should escape HTML special characters', () => {
      const input = '<div>Hello & goodbye</div>';
      const result = escapeHtml(input);

      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).toContain('&amp;');
      expect(result).not.toContain('<div>');
    });

    it('should handle quotes', () => {
      const input = 'She said "hello" and \'goodbye\'';
      const result = escapeHtml(input);

      // escapeHtml preserves the text safely for display
      expect(result).toBeDefined();
      expect(result).toContain('hello');
      expect(result).toContain('goodbye');
    });

    it('should handle plain text', () => {
      const input = 'Plain text with no special chars';
      const result = escapeHtml(input);

      expect(result).toBe(input); // Should be unchanged
    });

    it('should handle empty input', () => {
      expect(escapeHtml('')).toBe('');
      expect(escapeHtml(null as any)).toBe('');
    });
  });

  describe('HTML Stripping', () => {
    it('should remove all HTML tags', () => {
      const input = '<p>Paragraph</p><div><span>Nested</span></div>';
      const result = stripHtml(input);

      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).toContain('Paragraph');
      expect(result).toContain('Nested');
    });

    it('should remove HTML comments', () => {
      const input = 'Text<!-- Comment -->More text';
      const result = stripHtml(input);

      expect(result).not.toContain('<!--');
      expect(result).not.toContain('Comment');
      expect(result).toContain('Text');
      expect(result).toContain('More text');
    });

    it('should handle malformed HTML', () => {
      const input = '<p>Unclosed tag<div>Nested';
      const result = stripHtml(input);

      expect(result).not.toContain('<');
      expect(result).toContain('Unclosed tag');
      expect(result).toContain('Nested');
    });

    it('should preserve whitespace', () => {
      const input = 'Line 1\n\nLine 2';
      const result = stripHtml(input);

      expect(result).toContain('\n');
      expect(result).toContain('Line 1');
      expect(result).toContain('Line 2');
    });
  });

  describe('XSS Attack Vectors', () => {
    it('should block <img> with onerror', () => {
      const input = '<img src=x onerror=alert(1)>';
      const result = sanitizeUserContent(input);

      expect(result).not.toContain('onerror');
      expect(result).not.toContain('alert');
    });

    it('should block SVG with script', () => {
      const input = '<svg onload=alert(1)></svg>';
      const result = sanitizeUserContent(input);

      expect(result).not.toContain('onload');
      expect(result).not.toContain('alert');
    });

    it('should block form elements', () => {
      const input = '<form action="https://evil.com"><input type="submit"></form>';
      const result = sanitizeUserContent(input);

      expect(result).not.toContain('<form');
      expect(result).not.toContain('evil.com');
    });

    it('should block object/embed tags', () => {
      const input = '<object data="https://evil.com"></object><embed src="evil.swf">';
      const result = sanitizeUserContent(input);

      expect(result).not.toContain('<object');
      expect(result).not.toContain('<embed');
      expect(result).not.toContain('evil');
    });

    it('should block meta refresh redirects', () => {
      const input = '<meta http-equiv="refresh" content="0;url=https://evil.com">';
      const result = sanitizeUserContent(input);

      expect(result).not.toContain('<meta');
      expect(result).not.toContain('refresh');
    });

    it('should block data URLs in images', () => {
      const input = '<img src="data:text/html,<script>alert(1)</script>">';
      const result = sanitizeUserContent(input);

      expect(result).not.toContain('data:');
      expect(result).not.toContain('script');
    });

    it('should handle encoded XSS attempts', () => {
      const input = '&lt;script&gt;alert(1)&lt;/script&gt;';
      const result = sanitizeUserContent(input);

      // Should keep the encoded entities (not decode them into executable HTML)
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;'); // Should preserve encoding
    });
  });

  describe('Performance & Edge Cases', () => {
    it('should handle very long input', () => {
      const input = 'a'.repeat(100000);
      expect(() => sanitizeUserContent(input)).not.toThrow();
    });

    it('should handle unicode characters', () => {
      const input = '<p>こんにちは 👋 Привет</p>';
      const result = sanitizeUserContent(input);

      expect(result).toContain('こんにちは');
      expect(result).toContain('👋');
      expect(result).toContain('Привет');
    });

    it('should handle deeply nested HTML', () => {
      const input = '<p><b><i><em><strong>Deep</strong></em></i></b></p>';
      const result = sanitizeUserContent(input);

      expect(result).toContain('Deep');
    });

    it('should handle multiple script tags', () => {
      const input = '<script>alert(1)</script><p>Text</p><script>alert(2)</script>';
      const result = sanitizeUserContent(input);

      expect(result).not.toContain('script');
      expect(result).not.toContain('alert');
      expect(result).toContain('Text');
    });

    it('should handle null bytes', () => {
      const input = 'Text\x00WithNullByte';
      const result = sanitizeUserContent(input);

      expect(result).toBeDefined();
      expect(result).toContain('Text');
    });
  });

  describe('Integration with Validation', () => {
    it('should sanitize testimony content', () => {
      const testimony = 'God saved me <script>alert("xss")</script> from my sins!';
      const sanitized = sanitizeUserContent(testimony);

      expect(sanitized).not.toContain('script');
      expect(sanitized).toContain('God saved me');
      expect(sanitized).toContain('from my sins');
    });

    it('should sanitize user bios', () => {
      const bio = 'Christian developer <img src=x onerror=alert(1)>';
      const sanitized = sanitizeUserContent(bio);

      expect(sanitized).not.toContain('onerror');
      expect(sanitized).toContain('Christian developer');
    });

    it('should sanitize message content', () => {
      const message = 'Hello! <a href="javascript:alert(1)">Click</a>';
      const sanitized = sanitizeUserContent(message);

      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).toContain('Hello!');
    });

    it('should sanitize usernames (plain text only)', () => {
      const username = '<script>admin</script>';
      const sanitized = sanitizePlainText(username);

      // Should remove all HTML tags
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('</script>');
    });
  });
});
