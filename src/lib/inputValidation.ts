/**
 * Input Validation Utilities
 * Provides comprehensive validation for all user inputs
 * Prevents XSS, SQL injection, and invalid data
 */

// Validation patterns
const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\d\s\-\(\)\+]+$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  username: /^[a-zA-Z0-9_-]{3,20}$/,
  alphanumeric: /^[a-zA-Z0-9\s]+$/,
  noSpecialChars: /^[a-zA-Z0-9\s.,!?'-]+$/,
  zipCode: /^\d{5}(-\d{4})?$/,
  // Dangerous patterns to block - using word boundaries to avoid false positives
  // Only match complete SQL keywords, not substrings in normal words
  sqlInjection: /\b(DELETE|DROP|EXEC|INSERT|SELECT|UNION|UPDATE|CREATE|ALTER)\b.*?(FROM|WHERE|INTO|TABLE|DATABASE|SET|VALUES|JOIN|ON)\b|;\s*(DELETE|DROP|EXEC|INSERT|SELECT|UNION|UPDATE|CREATE|ALTER)\b|--\s|(\/\*|\*\/)/gi,
  scriptTag: /<script[^>]*>.*?<\/script>/gi,
  htmlTag: /<[^>]+>/g,
  dangerousChars: /[<>\"'`;]/g
};

// Length limits
const limits = {
  username: { min: 3, max: 20 },
  password: { min: 8, max: 128 },
  bio: { min: 0, max: 500 },
  testimony: { min: 10, max: 5000 },
  message: { min: 1, max: 1000 },
  groupName: { min: 3, max: 50 },
  groupDescription: { min: 0, max: 200 },
  comment: { min: 1, max: 500 },
  displayName: { min: 2, max: 50 },
  location: { min: 2, max: 100 },
  church: { min: 2, max: 100 },
  bugReport: { min: 10, max: 2000 },
  songTitle: { min: 1, max: 100 }
};

/**
 * Sanitize input by removing dangerous characters
 */
export const sanitizeInput = (input: any, allowHtml: boolean = false): string => {
  if (typeof input !== 'string') return '';

  // Trim whitespace
  let clean = input.trim();

  // Remove null bytes
  clean = clean.replace(/\0/g, '');

  // Remove HTML tags unless explicitly allowed
  if (!allowHtml) {
    clean = clean.replace(patterns.htmlTag, '');
  }

  // Remove script tags always (even if HTML allowed)
  clean = clean.replace(patterns.scriptTag, '');

  // Remove angle brackets to prevent HTML injection (stored as plain text,
  // rendered safely via DOMPurify's sanitizeUserContent on output)
  clean = clean.replace(/</g, '').replace(/>/g, '');

  return clean;
};

/**
 * Validate email address
 */
export const validateEmail = (email: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!email) {
    errors.push('Email is required');
    return { valid: false, errors };
  }

  if (!patterns.email.test(email)) {
    errors.push('Please enter a valid email address');
  }

  if (email.length > 255) {
    errors.push('Email is too long');
  }

  // Check for SQL injection attempts
  if (patterns.sqlInjection.test(email)) {
    errors.push('Invalid characters in email');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate username
 */
export const validateUsername = (username: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!username) {
    errors.push('Username is required');
    return { valid: false, errors };
  }

  if (username.length < limits.username.min) {
    errors.push(`Username must be at least ${limits.username.min} characters`);
  }

  if (username.length > limits.username.max) {
    errors.push(`Username must be less than ${limits.username.max} characters`);
  }

  if (!patterns.username.test(username)) {
    errors.push('Username can only contain letters, numbers, underscores, and hyphens');
  }

  // Check for inappropriate content (basic filter)
  const inappropriate = ['admin', 'root', 'system', 'lightning', 'support'];
  if (inappropriate.some((word: string) => username.toLowerCase().includes(word))) {
    errors.push('This username is not allowed');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate password
 */
export const validatePassword = (password: any): {
  valid: boolean;
  errors: string[];
  strength: {
    hasUpperCase: boolean;
    hasLowerCase: boolean;
    hasNumbers: boolean;
    hasSpecialChar: boolean;
    score: number;
  }
} => {
  const errors: string[] = [];

  if (!password) {
    errors.push('Password is required');
    return {
      valid: false,
      errors,
      strength: {
        hasUpperCase: false,
        hasLowerCase: false,
        hasNumbers: false,
        hasSpecialChar: false,
        score: 0
      }
    };
  }

  if (password.length < limits.password.min) {
    errors.push(`Password must be at least ${limits.password.min} characters`);
  }

  if (password.length > limits.password.max) {
    errors.push(`Password is too long`);
  }

  // Check password strength
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
    errors.push('Password must contain uppercase, lowercase, and numbers');
  }

  // Common passwords check (basic)
  const commonPasswords = ['password', '12345678', 'qwerty', 'admin123'];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('This password is too common');
  }

  return {
    valid: errors.length === 0,
    errors,
    strength: {
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar,
      score: [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length
    }
  };
};

/**
 * Validate message/comment text
 */
export const validateMessage = (message: any, type: string = 'message'): {
  valid: boolean;
  errors: string[];
  sanitized: string;
} => {
  const errors: string[] = [];
  // @ts-ignore
  const limit = limits[type] || limits.message;

  if (!message || !message.trim()) {
    const friendlyNames = {
      'bugReport': 'Message',
      'message': 'Message',
      'comment': 'Comment',
      'testimony': 'Testimony'
    };
    const displayName = friendlyNames[type as keyof typeof friendlyNames] || type.charAt(0).toUpperCase() + type.slice(1);
    errors.push(`${displayName} field cannot be empty`);
    return { valid: false, errors, sanitized: '' };
  }

  if (message.length < limit.min) {
    errors.push(`${type.charAt(0).toUpperCase() + type.slice(1)} is too short`);
  }

  if (message.length > limit.max) {
    errors.push(`${type.charAt(0).toUpperCase() + type.slice(1)} must be less than ${limit.max} characters`);
  }

  // Check for script tags (XSS protection)
  // Note: SQL injection check removed for messages since Supabase uses parameterized queries
  // and users should be able to type normal text containing words like "select", "create", etc.
  if (patterns.scriptTag.test(message)) {
    errors.push('HTML scripts are not allowed');
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: sanitizeInput(message)
  };
};

/**
 * Validate testimony
 */
export const validateTestimony = (testimony: any): {
  valid: boolean;
  errors: string[];
  sanitized: string;
} => {
  const errors: string[] = [];

  if (!testimony || !testimony.trim()) {
    errors.push('Testimony cannot be empty');
    return { valid: false, errors, sanitized: '' };
  }

  if (testimony.length < limits.testimony.min) {
    errors.push(`Testimony must be at least ${limits.testimony.min} characters`);
  }

  if (testimony.length > limits.testimony.max) {
    errors.push(`Testimony must be less than ${limits.testimony.max} characters`);
  }

  // Check for spam patterns
  const spamPatterns = [
    /(.)\1{10,}/g,  // Repeated characters
    /(https?:\/\/[^\s]+){5,}/g,  // Too many links
    /\b(buy|sale|discount|offer|click here|free)\b/gi  // Spam words
  ];

  for (const pattern of spamPatterns) {
    if (pattern.test(testimony)) {
      errors.push('Testimony appears to contain spam');
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: sanitizeInput(testimony)
  };
};

/**
 * Validate profile fields
 */
export const validateProfile = (profile: any): {
  valid: boolean;
  errors: Record<string, string>;
} => {
  const errors: Record<string, string> = {};

  // Display name
  if (profile.displayName) {
    if (profile.displayName.length < limits.displayName.min) {
      errors.displayName = `Name must be at least ${limits.displayName.min} characters`;
    }
    if (profile.displayName.length > limits.displayName.max) {
      errors.displayName = `Name must be less than ${limits.displayName.max} characters`;
    }
    if (patterns.dangerousChars.test(profile.displayName)) {
      errors.displayName = 'Name contains invalid characters';
    }
  }

  // Bio
  if (profile.bio) {
    if (profile.bio.length > limits.bio.max) {
      errors.bio = `Bio must be less than ${limits.bio.max} characters`;
    }
  }

  // Location
  if (profile.location) {
    if (profile.location.length > limits.location.max) {
      errors.location = `Location is too long`;
    }
    if (patterns.sqlInjection.test(profile.location)) {
      errors.location = 'Location contains invalid characters';
    }
  }

  // Church
  if (profile.church) {
    if (profile.church.length > limits.church.max) {
      errors.church = `Church name is too long`;
    }
  }

  // Worship songs
  if (profile.songs && Array.isArray(profile.songs)) {
    for (let i = 0; i < profile.songs.length; i++) {
      if (profile.songs[i].length > limits.songTitle.max) {
        errors[`song${i}`] = 'Song title is too long';
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate URL
 */
export const validateUrl = (url: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!url) {
    return { valid: true, errors }; // URL might be optional
  }

  if (!patterns.url.test(url)) {
    errors.push('Please enter a valid URL starting with http:// or https://');
  }

  // Check for malicious URLs
  const maliciousPatterns = ['javascript:', 'data:', 'vbscript:', 'file:'];
  if (maliciousPatterns.some((pattern: string) => url.toLowerCase().includes(pattern))) {
    errors.push('This type of URL is not allowed');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate phone number
 */
export const validatePhone = (phone: any): {
  valid: boolean;
  errors: string[];
  formatted: string;
} => {
  const errors: string[] = [];

  if (!phone) {
    return { valid: true, errors, formatted: '' }; // Phone might be optional
  }

  // Remove formatting for validation
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

  if (cleanPhone.length < 10) {
    errors.push('Phone number is too short');
  }

  if (cleanPhone.length > 15) {
    errors.push('Phone number is too long');
  }

  if (!patterns.phone.test(phone)) {
    errors.push('Please enter a valid phone number');
  }

  return {
    valid: errors.length === 0,
    errors,
    formatted: formatPhone(cleanPhone)
  };
};

/**
 * Format phone number for display
 */
const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return '(' + match[1] + ') ' + match[2] + '-' + match[3];
  }
  return phone;
};

/**
 * Validate file upload
 */
export const validateFileUpload = (file: any, options: {
  maxSize?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
} = {}): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  } = options;

  if (!file) {
    errors.push('No file selected');
    return { valid: false, errors };
  }

  // Check file size
  if (file.size > maxSize) {
    const sizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    errors.push(`File must be less than ${sizeMB}MB`);
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    errors.push('Invalid file type. Please upload an image file.');
  }

  // Check file extension
  const fileName = file.name.toLowerCase();
  const hasValidExtension = allowedExtensions.some((ext: string) => fileName.endsWith(ext));
  if (!hasValidExtension) {
    errors.push('Invalid file extension');
  }

  // Check for malicious file names
  if (patterns.dangerousChars.test(file.name)) {
    errors.push('File name contains invalid characters');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate group creation
 */
export const validateGroup = (group: any): {
  valid: boolean;
  errors: Record<string, string>;
} => {
  const errors: Record<string, string> = {};

  // Group name
  if (!group.name || !group.name.trim()) {
    errors.name = 'Group name is required';
  } else if (group.name.trim().length < limits.groupName.min) {
    errors.name = `Group name must be at least ${limits.groupName.min} characters`;
  } else if (group.name.trim().length > limits.groupName.max) {
    errors.name = `Group name must be less than ${limits.groupName.max} characters`;
  } else if (!patterns.noSpecialChars.test(group.name.trim())) {
    errors.name = 'Group name can only contain letters, numbers, spaces, and basic punctuation (. , ! ? \' -)';
  }

  // Group description
  if (group.description && group.description.length > limits.groupDescription.max) {
    errors.description = `Description must be less than ${limits.groupDescription.max} characters`;
  }

  // Check for inappropriate content
  const inappropriate = ['xxx', 'porn', 'sex', 'nude'];
  if (group.name && inappropriate.some((word: string) => group.name.toLowerCase().includes(word))) {
    errors.name = 'This group name is not allowed';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Main validation function for any form
 */
export const validateForm = (formData: any, formType: string): any => {
  switch (formType) {
    case 'login':
      return {
        email: validateEmail(formData.email),
        password: { valid: !!formData.password, errors: formData.password ? [] : ['Password is required'] }
      };

    case 'signup':
      return {
        email: validateEmail(formData.email),
        username: validateUsername(formData.username),
        password: validatePassword(formData.password)
      };

    case 'profile':
      return validateProfile(formData);

    case 'testimony':
      return validateTestimony(formData.testimony);

    case 'message':
      return validateMessage(formData.message);

    case 'group':
      return validateGroup(formData);

    case 'bugReport':
      return validateMessage(formData.description, 'bugReport');

    default:
      return { valid: true, errors: {} };
  }
};

// Export all validators
export default {
  sanitizeInput,
  validateEmail,
  validateUsername,
  validatePassword,
  validateMessage,
  validateTestimony,
  validateProfile,
  validateUrl,
  validatePhone,
  validateFileUpload,
  validateGroup,
  validateForm,
  patterns,
  limits
};