/**
 * Content Filtering Tests
 * Tests the content analysis, flagging, and severity determination logic
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeContent,
  isContentFlagged,
  getSeverityColor,
  getSeverityLabel,
  getFlagReasonLabel,
} from '../lib/contentFilter';
import type { FlagReason, ContentFlag } from '../lib/contentFilter';

describe('Content Filtering', () => {
  // ===========================================
  // Clean Content Tests
  // ===========================================
  describe('Clean Content', () => {
    it('should not flag normal messages', () => {
      const result = analyzeContent('Hello everyone! How are you doing today?');
      expect(result.flagged).toBe(false);
      expect(result.reasons).toHaveLength(0);
    });

    it('should not flag scripture references', () => {
      const result = analyzeContent('Check out John 3:16, it changed my life!');
      expect(result.flagged).toBe(false);
    });

    it('should not flag prayer requests', () => {
      const result = analyzeContent('Please pray for my family this week. Going through a tough time.');
      expect(result.flagged).toBe(false);
    });

    it('should not flag worship messages', () => {
      const result = analyzeContent('Praise God! What an amazing service today!');
      expect(result.flagged).toBe(false);
    });

    it('should not flag normal discussion', () => {
      const result = analyzeContent('I think we should meet on Tuesday instead of Wednesday.');
      expect(result.flagged).toBe(false);
    });

    it('should not flag emojis', () => {
      const result = analyzeContent('🙏❤️✝️ God bless!');
      expect(result.flagged).toBe(false);
    });
  });

  // ===========================================
  // Profanity Detection Tests
  // ===========================================
  describe('Profanity Detection', () => {
    it('should flag obvious profanity', () => {
      const result = analyzeContent('What the f*ck is going on');
      expect(result.flagged).toBe(true);
      expect(result.reasons).toContain('profanity');
    });

    it('should flag the wtf abbreviation', () => {
      const result = analyzeContent('wtf dude');
      expect(result.flagged).toBe(true);
      expect(result.reasons).toContain('profanity');
    });

    it('should flag stfu', () => {
      const result = analyzeContent('stfu nobody asked');
      expect(result.flagged).toBe(true);
      expect(result.reasons).toContain('profanity');
    });

    it('should set severity to low for just profanity', () => {
      const result = analyzeContent('damn this is crazy');
      expect(result.severity).toBe('low');
    });
  });

  // ===========================================
  // Hate Speech Detection Tests
  // ===========================================
  describe('Hate Speech Detection', () => {
    it('should flag calls to kill groups', () => {
      const result = analyzeContent('kill all those people');
      expect(result.flagged).toBe(true);
      expect(result.reasons).toContain('hate_speech');
    });

    it('should set severity to high for hate speech', () => {
      const result = analyzeContent('kill all those people');
      expect(result.severity).toBe('high');
    });
  });

  // ===========================================
  // Harassment Detection Tests
  // ===========================================
  describe('Harassment Detection', () => {
    it('should flag telling someone to harm themselves', () => {
      const result = analyzeContent('go kys nobody likes you');
      expect(result.flagged).toBe(true);
      expect(result.reasons).toContain('harassment');
    });

    it('should flag demeaning messages', () => {
      const result = analyzeContent("you're worthless and pathetic");
      expect(result.flagged).toBe(true);
      expect(result.reasons).toContain('harassment');
    });

    it('should flag nobody likes you', () => {
      const result = analyzeContent('nobody likes you');
      expect(result.flagged).toBe(true);
      expect(result.reasons).toContain('harassment');
    });

    it('should set severity to medium for harassment', () => {
      const result = analyzeContent("you're worthless");
      expect(result.severity).toBe('medium');
    });
  });

  // ===========================================
  // Violence Detection Tests
  // ===========================================
  describe('Violence Detection', () => {
    it('should flag death threats', () => {
      const result = analyzeContent("I'm going to kill you");
      expect(result.flagged).toBe(true);
      expect(result.reasons).toContain('violence');
    });

    it('should flag shooting threats', () => {
      const result = analyzeContent('gonna shoot everyone');
      expect(result.flagged).toBe(true);
      expect(result.reasons).toContain('violence');
    });

    it('should set severity to high for violence', () => {
      const result = analyzeContent("I'll kill everyone");
      expect(result.severity).toBe('high');
    });
  });

  // ===========================================
  // Spam Detection Tests
  // ===========================================
  describe('Spam Detection', () => {
    it('should flag buy now spam', () => {
      const result = analyzeContent('Buy now! Limited time offer! Click here to save!');
      expect(result.flagged).toBe(true);
      expect(result.reasons).toContain('spam');
    });

    it('should flag crypto spam', () => {
      const result = analyzeContent('Amazing bitcoin investment opportunity!');
      expect(result.flagged).toBe(true);
      expect(result.reasons).toContain('spam');
    });

    it('should flag excessive repetition', () => {
      const result = analyzeContent('aaaaaaaaaaaaa');
      expect(result.flagged).toBe(true);
      expect(result.reasons).toContain('spam');
    });

    it('should flag earn money schemes', () => {
      const result = analyzeContent('earn $5000 per day from home');
      expect(result.flagged).toBe(true);
      expect(result.reasons).toContain('spam');
    });

    it('should flag DM for details pattern', () => {
      const result = analyzeContent('DM me for details about this opportunity');
      expect(result.flagged).toBe(true);
      expect(result.reasons).toContain('spam');
    });
  });

  // ===========================================
  // Multiple Flags Tests
  // ===========================================
  describe('Multiple Flags', () => {
    it('should detect multiple flag types at once', () => {
      const result = analyzeContent("f*ck you, you're worthless");
      expect(result.flagged).toBe(true);
      expect(result.reasons.length).toBeGreaterThanOrEqual(2);
    });

    it('should set medium severity when 2+ reasons detected', () => {
      const result = analyzeContent("wtf, nobody likes you");
      expect(result.flagged).toBe(true);
      // profanity + harassment
      expect(result.reasons.length).toBeGreaterThanOrEqual(2);
      expect(result.severity).toBe('medium');
    });
  });

  // ===========================================
  // isContentFlagged Tests
  // ===========================================
  describe('isContentFlagged', () => {
    it('should return true for flagged content', () => {
      expect(isContentFlagged('wtf is this')).toBe(true);
    });

    it('should return false for clean content', () => {
      expect(isContentFlagged('God is good!')).toBe(false);
    });
  });

  // ===========================================
  // Severity Helpers Tests
  // ===========================================
  describe('Severity Helpers', () => {
    it('should return red for high severity', () => {
      expect(getSeverityColor('high')).toBe('#ef4444');
    });

    it('should return amber for medium severity', () => {
      expect(getSeverityColor('medium')).toBe('#f59e0b');
    });

    it('should return blue for low severity', () => {
      expect(getSeverityColor('low')).toBe('#3b82f6');
    });

    it('should return correct labels', () => {
      expect(getSeverityLabel('high')).toBe('High Risk');
      expect(getSeverityLabel('medium')).toBe('Medium Risk');
      expect(getSeverityLabel('low')).toBe('Low Risk');
    });
  });

  // ===========================================
  // Flag Reason Labels Tests
  // ===========================================
  describe('Flag Reason Labels', () => {
    it('should return labels for all reason types', () => {
      const reasons: FlagReason[] = ['profanity', 'hate_speech', 'harassment', 'spam', 'inappropriate', 'violence'];
      reasons.forEach((reason) => {
        const label = getFlagReasonLabel(reason);
        expect(label).toBeTruthy();
        expect(typeof label).toBe('string');
      });
    });

    it('should return specific label strings', () => {
      expect(getFlagReasonLabel('profanity')).toBe('Profanity');
      expect(getFlagReasonLabel('hate_speech')).toBe('Hate Speech');
      expect(getFlagReasonLabel('harassment')).toBe('Harassment');
      expect(getFlagReasonLabel('spam')).toBe('Spam');
      expect(getFlagReasonLabel('inappropriate')).toBe('Inappropriate Content');
      expect(getFlagReasonLabel('violence')).toBe('Violence/Threats');
    });
  });

  // ===========================================
  // ContentFlag Structure Tests
  // ===========================================
  describe('ContentFlag Structure', () => {
    it('clean content should have empty arrays', () => {
      const result = analyzeContent('Hello friends!');
      expect(result.flagged).toBe(false);
      expect(result.reasons).toEqual([]);
      expect(result.details).toEqual([]);
      expect(result.severity).toBe('low');
    });

    it('flagged content should have non-empty arrays', () => {
      const result = analyzeContent('wtf man');
      expect(result.flagged).toBe(true);
      expect(result.reasons.length).toBeGreaterThan(0);
      expect(result.details.length).toBeGreaterThan(0);
    });
  });

  // ===========================================
  // Edge Cases
  // ===========================================
  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const result = analyzeContent('');
      expect(result.flagged).toBe(false);
    });

    it('should handle very long messages', () => {
      const longMessage = 'This is a normal message. '.repeat(100);
      const result = analyzeContent(longMessage);
      expect(result.flagged).toBe(false);
    });

    it('should handle unicode content', () => {
      const result = analyzeContent('🙏 Praying for peace and healing 🕊️');
      expect(result.flagged).toBe(false);
    });

    it('should not flag the word "hell" in context like "what the heck"', () => {
      const result = analyzeContent('what the heck happened');
      expect(result.reasons).not.toContain('profanity');
    });

    it('should not flag word "assassin" in normal context', () => {
      const result = analyzeContent('The movie about the assassin was good');
      expect(result.flagged).toBe(false);
    });
  });
});
