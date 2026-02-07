/**
 * Content Filtering Module
 *
 * Auto-flags potentially inappropriate messages for leader review.
 * Uses pattern-based detection for profanity, hate speech, harassment,
 * and spam. Flagged messages are still delivered but marked for review.
 *
 * This is a client-side pre-filter. For production use, pair with
 * a server-side AI moderation API for higher accuracy.
 */

// ============================================
// TYPES
// ============================================

export type FlagReason = 'profanity' | 'hate_speech' | 'harassment' | 'spam' | 'inappropriate' | 'violence';

export interface ContentFlag {
  flagged: boolean;
  reasons: FlagReason[];
  severity: 'low' | 'medium' | 'high';
  details: string[];
}

export interface FlaggedMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  flag: ContentFlag;
  created_at: string;
  reviewed: boolean;
  reviewer_id?: string;
  action_taken?: 'approved' | 'removed' | 'warned';
}

// ============================================
// PATTERN LISTS
// ============================================

// Obfuscation-resistant patterns (handles common l33tspeak, spacing tricks)
// These patterns are intentionally broad to catch variations

const PROFANITY_PATTERNS: RegExp[] = [
  /\bf+[u\*@]+c+k+/i,
  /\bs+h+[i1!]+t+/i,
  /\ba+s+s+h+o+l+e/i,
  /\bb+[i1!]+t+c+h/i,
  /\bd+[a@]+m+n/i,
  /\bh+e+l+l+\b/i,
  /\bcr[a@]+p\b/i,
  /\bd+[i1!]+c+k+\b/i,
  /\bp+[i1!]+s+s+/i,
  /\bw+t+f+\b/i,
  /\bstfu\b/i,
  /\blmf+ao\b/i,
];

const HATE_SPEECH_PATTERNS: RegExp[] = [
  /\b(kill|murder|exterminate)\s+(all|every|those)\b/i,
  /\b(hate|despise)\s+(all|every)\s+(christians?|muslims?|jews?|blacks?|whites?|gays?|lesbians?)/i,
  /\b(go\s+back\s+to|get\s+out\s+of)\s+(your|their)\s+(country|homeland)/i,
  /\bn+[i1!]+g+/i,
  /\bf+[a@]+g+[o0]+t/i,
  /\br+e+t+[a@]+r+d/i,
  /\bk+[i1!]+k+e+\b/i,
  /\bsp+[i1!]+c+\b/i,
];

const HARASSMENT_PATTERNS: RegExp[] = [
  /\b(kill|hurt|harm)\s+(your|u|ur)self\b/i,
  /\b(nobody|no\s*one)\s+(likes?|cares?\s+about|wants?)\s+(you|u)\b/i,
  /\byou('re|\s+are)\s+(worthless|pathetic|disgusting|trash|garbage)\b/i,
  /\b(go\s+)?(die|kys|kms)\b/i,
  /\bi('ll|'m\s+going\s+to)\s+(find|hunt|track)\s+(you|u)\b/i,
  /\b(shut\s+up|stfu)\s+(you|u)\s+/i,
];

const VIOLENCE_PATTERNS: RegExp[] = [
  /\b(i('ll|'m\s+going\s+to)|gonna)\s+(kill|murder|shoot|stab|beat)\b/i,
  /\bbring\s+(a\s+)?gun/i,
  /\b(bomb|explosive|weapon)\s+(threat|attack)/i,
  /\bshoot\s+(up|everyone|you)/i,
];

const SPAM_PATTERNS: RegExp[] = [
  /\b(click\s+here|visit\s+now|buy\s+now|free\s+money)\b/i,
  /\b(bitcoin|crypto)\s+(investment|opportunity|giveaway)\b/i,
  /(https?:\/\/[^\s]+){3,}/i, // 3+ URLs in one message
  /(.)\1{10,}/, // Same character repeated 10+ times
  /\b(earn|make)\s+\$?\d+\s*(k|thousand|million|per\s+(day|hour|week))/i,
  /\b(DM|message)\s+me\s+for\s+(details|more|info)\b/i,
];

// ============================================
// CONTENT ANALYSIS
// ============================================

/**
 * Analyze message content for inappropriate material
 * Returns a ContentFlag with results
 */
export const analyzeContent = (text: string): ContentFlag => {
  const reasons: FlagReason[] = [];
  const details: string[] = [];

  // Check profanity
  const profanityHits = PROFANITY_PATTERNS.filter(p => p.test(text));
  if (profanityHits.length > 0) {
    reasons.push('profanity');
    details.push('Contains profanity');
  }

  // Check hate speech
  const hateHits = HATE_SPEECH_PATTERNS.filter(p => p.test(text));
  if (hateHits.length > 0) {
    reasons.push('hate_speech');
    details.push('Potential hate speech detected');
  }

  // Check harassment
  const harassHits = HARASSMENT_PATTERNS.filter(p => p.test(text));
  if (harassHits.length > 0) {
    reasons.push('harassment');
    details.push('Potential harassment detected');
  }

  // Check violence
  const violenceHits = VIOLENCE_PATTERNS.filter(p => p.test(text));
  if (violenceHits.length > 0) {
    reasons.push('violence');
    details.push('Violent content detected');
  }

  // Check spam
  const spamHits = SPAM_PATTERNS.filter(p => p.test(text));
  if (spamHits.length > 0) {
    reasons.push('spam');
    details.push('Potential spam detected');
  }

  // Determine severity
  let severity: 'low' | 'medium' | 'high' = 'low';
  if (reasons.includes('hate_speech') || reasons.includes('violence')) {
    severity = 'high';
  } else if (reasons.includes('harassment') || reasons.length >= 2) {
    severity = 'medium';
  }

  return {
    flagged: reasons.length > 0,
    reasons,
    severity,
    details,
  };
};

/**
 * Quick check if content needs flagging (lightweight)
 */
export const isContentFlagged = (text: string): boolean => {
  return analyzeContent(text).flagged;
};

/**
 * Get severity color for UI display
 */
export const getSeverityColor = (severity: ContentFlag['severity']): string => {
  switch (severity) {
    case 'high': return '#ef4444';
    case 'medium': return '#f59e0b';
    case 'low': return '#3b82f6';
  }
};

/**
 * Get severity label
 */
export const getSeverityLabel = (severity: ContentFlag['severity']): string => {
  switch (severity) {
    case 'high': return 'High Risk';
    case 'medium': return 'Medium Risk';
    case 'low': return 'Low Risk';
  }
};

/**
 * Get human-readable reason label
 */
export const getFlagReasonLabel = (reason: FlagReason): string => {
  switch (reason) {
    case 'profanity': return 'Profanity';
    case 'hate_speech': return 'Hate Speech';
    case 'harassment': return 'Harassment';
    case 'spam': return 'Spam';
    case 'inappropriate': return 'Inappropriate Content';
    case 'violence': return 'Violence/Threats';
  }
};
