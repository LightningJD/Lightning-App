import DOMPurify from 'dompurify';

/**
 * Sanitization utilities to prevent XSS attacks
 * All user-generated content should be sanitized before rendering
 */

/**
 * Sanitize user-generated content (testimonies, bios, messages)
 * Allows basic formatting but strips all dangerous HTML/JavaScript
 */
export const sanitizeUserContent = (content: string): string => {
  if (!content) return '';

  const sanitized = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false
  });

  // Post-process to ensure links open in new tab
  const div = document.createElement('div');
  div.innerHTML = sanitized;
  const links = div.querySelectorAll('a');
  links.forEach(link => {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
  });

  return div.innerHTML;
};

/**
 * Sanitize plain text (no HTML allowed at all)
 * Use for: usernames, display names, short text fields
 */
export const sanitizePlainText = (text: string): string => {
  if (!text) return '';

  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
};

/**
 * Sanitize URL to prevent javascript: and data: protocol attacks
 */
export const sanitizeUrl = (url: string): string => {
  if (!url) return '';

  // Only allow http, https, mailto protocols
  const urlPattern = /^(https?:\/\/|mailto:)/i;

  if (!urlPattern.test(url)) {
    return '';
  }

  return DOMPurify.sanitize(url);
};

/**
 * Escape HTML entities for use in attributes or text content
 * Use when you need raw text without any HTML processing
 */
export const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

/**
 * Strip all HTML tags from content
 * Use for: search indexing, meta descriptions, previews
 */
export const stripHtml = (html: string): string => {
  const div = document.createElement('div');
  div.innerHTML = DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
  return div.textContent || '';
};
