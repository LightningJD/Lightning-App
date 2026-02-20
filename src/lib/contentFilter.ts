/**
 * Content Filtering Module
 *
 * Smart profanity and content moderation filter designed for a Christian app.
 * - Low false positives: "hell", "damn", "damnation" are allowed in Christian context
 * - Safe word protection: "assassin", "Dickens", "Scunthorpe" etc. won't trigger
 * - Pre-send checking: blocks HIGH severity, warns on MEDIUM, allows LOW
 *
 * Uses pattern-based detection for profanity, hate speech, harassment,
 * and spam. For production, pair with a server-side moderation API.
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

export interface ProfanityCheckResult {
  allowed: boolean;
  flag: ContentFlag | null;
  severity: 'low' | 'medium' | 'high' | null;
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
// SAFE WORDS & CHRISTIAN CONTEXT
// ============================================

// Words that contain profanity substrings but are innocent
const SAFE_WORDS = new Set([
  'dickens', 'dickenson', 'dickinson',
  'assassin', 'assassinate', 'assassination',
  'scunthorpe', 'penistone', 'lightwater',
  'class', 'classic', 'classics', 'classical', 'classify',
  'bass', 'bassist', 'bassoon',
  'pass', 'passage', 'passing', 'passenger', 'passion', 'passionate',
  'mass', 'massive', 'massage', 'massachusetts',
  'grass', 'grasshopper', 'grassland',
  'brass', 'brassiere',
  'assume', 'assumption', 'assure', 'assured', 'assurance',
  'assist', 'assistant', 'assistance',
  'associate', 'association', 'associated',
  'asset', 'assess', 'assessment', 'assembly', 'assemble',
  'assert', 'assertion', 'assertive',
  'cockatoo', 'cocktail', 'peacock',
  'knickers', 'skit', 'shitake',
  'therapist', 'therapists',
  'grape', 'drape',
  'pitch', 'witch', 'switch', 'kitchen', 'stitch', 'ditch', 'hitch',
  'bitchin',
  'hellenic', 'hello', 'shell', 'shelter',
  'dam', 'damp', 'damage', 'damsel',
  'title', 'subtle', 'bottle', 'little', 'brittle',
  'analyst', 'analysis',
  'canal',
  'count', 'counter', 'country', 'countryside',
  'crapper', 'scrapper',
  'piston',
  'shingle', 'mishit',
]);

// Christian context — these phrases use words that might match profanity
// but are legitimate in a faith context
const CHRISTIAN_CONTEXT_PATTERNS: RegExp[] = [
  /\bhell\b/i,               // "hell" as a biblical place
  /\bdamn(ed|ation)?\b/i,    // "damnation", "damned" in theological context
  /\bhellfire\b/i,
  /\bhell[\s-]?bound\b/i,
  /\bhells?\s+(gate|mouth)\b/i,
  /\bwhat\s+the\s+hell\b/i,  // Mild — allow but could flag as LOW
];

// ============================================
// PATTERN LISTS
// ============================================

// Obfuscation-resistant patterns (handles common l33tspeak, spacing tricks)
// Removed "hell" and "damn" — too many false positives in Christian speech

const PROFANITY_PATTERNS: RegExp[] = [
  /\bf+[u\*@]+c+k+/i,
  /\bs+h+[i1!]+t+\b/i,
  /\ba+s+s+h+o+l+e/i,
  /\bb+[i1!]+t+c+h\b/i,
  /\bcr[a@]+p\b/i,
  /\bd+[i1!]+c+k+\b/i,
  /\bp+[i1!]+s+s+\b/i,
  /\bw+t+f+\b/i,
  /\bstfu\b/i,
  /\blmf+ao\b/i,
  /\bcunt\b/i,
];

const HATE_SPEECH_PATTERNS: RegExp[] = [
  /\b(kill|murder|exterminate)\s+(all|every|those)\b/i,
  /\b(hate|despise)\s+(all|every)\s+(christians?|muslims?|jews?|blacks?|whites?|gays?|lesbians?)/i,
  /\b(go\s+back\s+to|get\s+out\s+of)\s+(your|their)\s+(country|homeland)/i,
  /\bn+[i1!]+g+g/i,
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
// HELPER: Check if matched word is a safe word
// ============================================

/**
 * Extract the word containing the regex match and check against safe words
 */
const isMatchSafe = (text: string, pattern: RegExp): boolean => {
  const match = text.match(pattern);
  if (!match || match.index === undefined) return false;

  // Extract the full word surrounding the match
  const start = match.index;
  const end = start + match[0].length;

  // Expand to full word boundaries
  let wordStart = start;
  let wordEnd = end;
  while (wordStart > 0 && /\w/.test(text[wordStart - 1])) wordStart--;
  while (wordEnd < text.length && /\w/.test(text[wordEnd])) wordEnd++;

  const fullWord = text.slice(wordStart, wordEnd).toLowerCase();
  return SAFE_WORDS.has(fullWord);
};

// ============================================
// CONTENT ANALYSIS
// ============================================

/**
 * Analyze message content for inappropriate material
 * Returns a ContentFlag with results
 *
 * Smart filtering:
 * - Skips profanity check if the text is in Christian context
 * - Checks against safe words to avoid false positives (Scunthorpe problem)
 * - Hate speech, harassment, violence always checked strictly
 */
export const analyzeContent = (text: string): ContentFlag => {
  const reasons: FlagReason[] = [];
  const details: string[] = [];

  if (!text || !text.trim()) {
    return { flagged: false, reasons: [], severity: 'low', details: [] };
  }

  // Check profanity — with safe word AND Christian context protection
  // Important: Christian context only exempts the Christian words themselves,
  // NOT other profanity in the same message. "fuck you, go to hell" should
  // still flag "fuck" even though "hell" is a Christian term.
  const profanityHits = PROFANITY_PATTERNS.filter(p => {
    if (!p.test(text)) return false;
    // Check if the matched word is actually a safe word
    if (isMatchSafe(text, p)) return false;
    // Check if the matched word is covered by Christian context
    // (e.g., "hell" matches profanity pattern? No, it was removed.
    //  "damn" matches? No, also removed. So this shouldn't trigger,
    //  but just in case a pattern overlaps with Christian terms.)
    const match = text.match(p);
    if (match) {
      const matchedText = match[0].toLowerCase();
      // If the matched profanity word itself is a Christian term, skip it
      if (CHRISTIAN_CONTEXT_PATTERNS.some(cp => cp.test(matchedText))) return false;
    }
    return true;
  });
  if (profanityHits.length > 0) {
    reasons.push('profanity');
    details.push('Contains profanity');
  }

  // Check hate speech — always strict, no Christian context exception
  const hateHits = HATE_SPEECH_PATTERNS.filter(p => p.test(text));
  if (hateHits.length > 0) {
    reasons.push('hate_speech');
    details.push('Potential hate speech detected');
  }

  // Check harassment — always strict
  const harassHits = HARASSMENT_PATTERNS.filter(p => p.test(text));
  if (harassHits.length > 0) {
    reasons.push('harassment');
    details.push('Potential harassment detected');
  }

  // Check violence — always strict
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

// ============================================
// PRE-SEND CHECK UTILITY
// ============================================

/**
 * Check content before sending — returns whether to allow, warn, or block
 *
 * Usage in components:
 *   const result = checkBeforeSend(messageText);
 *   if (!result.allowed) {
 *     if (result.severity === 'high') { showError(...); return; }
 *     if (result.severity === 'medium') { if (!confirm(...)) return; }
 *   }
 */
export const checkBeforeSend = (text: string): ProfanityCheckResult => {
  if (!text?.trim()) return { allowed: true, flag: null, severity: null };

  const flag = analyzeContent(text);
  if (!flag.flagged) return { allowed: true, flag: null, severity: null };

  return {
    allowed: flag.severity === 'low', // Low severity auto-allows (just profanity)
    flag,
    severity: flag.severity,
  };
};

// ============================================
// UI HELPERS
// ============================================

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
