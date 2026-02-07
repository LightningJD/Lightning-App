/**
 * Scripture Reference Detection & Utility Tests
 */

import { describe, it, expect } from 'vitest';
import {
  detectScriptureReferences,
  parseReference,
  containsScriptureReference,
  getDiscussionQuestions,
  formatVerseCard,
  TRANSLATIONS,
} from '../lib/scripture';

describe('Scripture Utility', () => {
  // ===========================================
  // Reference Detection Tests
  // ===========================================
  describe('detectScriptureReferences', () => {
    it('should detect simple verse reference', () => {
      const refs = detectScriptureReferences('Check out John 3:16');
      expect(refs.length).toBe(1);
      expect(refs[0].book).toBe('John');
      expect(refs[0].chapter).toBe(3);
      expect(refs[0].verseStart).toBe(16);
    });

    it('should detect verse range', () => {
      const refs = detectScriptureReferences('Read 1 Corinthians 13:4-7');
      expect(refs.length).toBe(1);
      expect(refs[0].chapter).toBe(13);
      expect(refs[0].verseStart).toBe(4);
      expect(refs[0].verseEnd).toBe(7);
    });

    it('should detect multiple references', () => {
      const text = 'Compare John 3:16 with Romans 8:28 and Psalm 23:1';
      const refs = detectScriptureReferences(text);
      expect(refs.length).toBe(3);
    });

    it('should detect abbreviated book names', () => {
      const refs = detectScriptureReferences('Look at Gen 1:1');
      expect(refs.length).toBe(1);
      expect(refs[0].book).toBe('Genesis');
    });

    it('should detect chapter-only references', () => {
      const refs = detectScriptureReferences('Read Psalm 23');
      expect(refs.length).toBe(1);
      expect(refs[0].chapter).toBe(23);
    });

    it('should handle text with no references', () => {
      const refs = detectScriptureReferences('Hello everyone, how are you?');
      expect(refs.length).toBe(0);
    });

    it('should handle empty string', () => {
      const refs = detectScriptureReferences('');
      expect(refs.length).toBe(0);
    });

    it('should detect Old Testament books', () => {
      const refs = detectScriptureReferences('Read Genesis 1:1 and Exodus 20:1');
      expect(refs.length).toBe(2);
    });

    it('should detect New Testament books', () => {
      const refs = detectScriptureReferences('Read Matthew 5:3 and Revelation 21:4');
      expect(refs.length).toBe(2);
    });
  });

  // ===========================================
  // parseReference Tests
  // ===========================================
  describe('parseReference', () => {
    it('should parse full reference', () => {
      const ref = parseReference('John 3:16');
      expect(ref).not.toBeNull();
      expect(ref!.book).toBe('John');
      expect(ref!.chapter).toBe(3);
      expect(ref!.verseStart).toBe(16);
      expect(ref!.verseEnd).toBeUndefined();
    });

    it('should parse range reference', () => {
      const ref = parseReference('Romans 8:28-30');
      expect(ref).not.toBeNull();
      expect(ref!.verseStart).toBe(28);
      expect(ref!.verseEnd).toBe(30);
    });

    it('should parse chapter-only reference', () => {
      const ref = parseReference('Psalm 23');
      expect(ref).not.toBeNull();
      expect(ref!.chapter).toBe(23);
      expect(ref!.verseStart).toBe(1);
    });

    it('should return null for invalid input', () => {
      expect(parseReference('not a verse')).toBeNull();
      expect(parseReference('')).toBeNull();
      expect(parseReference('123')).toBeNull();
    });

    it('should generate correct fullReference', () => {
      const ref = parseReference('John 3:16');
      expect(ref!.fullReference).toBe('John 3:16');

      const rangeRef = parseReference('Romans 8:28-30');
      expect(rangeRef!.fullReference).toBe('Romans 8:28-30');
    });
  });

  // ===========================================
  // containsScriptureReference Tests
  // ===========================================
  describe('containsScriptureReference', () => {
    it('should return true for text with references', () => {
      expect(containsScriptureReference('Read John 3:16 today')).toBe(true);
    });

    it('should return false for text without references', () => {
      expect(containsScriptureReference('Hello world')).toBe(false);
    });

    it('should return false for empty text', () => {
      expect(containsScriptureReference('')).toBe(false);
    });
  });

  // ===========================================
  // Discussion Questions Tests
  // ===========================================
  describe('getDiscussionQuestions', () => {
    it('should return questions for a reference', () => {
      const ref = parseReference('John 3:16')!;
      const questions = getDiscussionQuestions(ref);
      expect(questions.length).toBeGreaterThan(0);
      expect(questions.length).toBeLessThanOrEqual(7);
    });

    it('should include the reference in at least one question', () => {
      const ref = parseReference('John 3:16')!;
      const questions = getDiscussionQuestions(ref);
      const hasReference = questions.some(q => q.includes(ref.fullReference));
      expect(hasReference).toBe(true);
    });

    it('should add gospel-specific question for gospel books', () => {
      const ref = parseReference('Matthew 5:1')!;
      const questions = getDiscussionQuestions(ref);
      const hasGospelQuestion = questions.some(q => q.includes('Jesus'));
      expect(hasGospelQuestion).toBe(true);
    });

    it('should add epistle-specific question for epistles', () => {
      const ref = parseReference('Romans 8:28')!;
      const questions = getDiscussionQuestions(ref);
      const hasEpistleQuestion = questions.some(q => q.includes('Paul'));
      expect(hasEpistleQuestion).toBe(true);
    });

    it('should add wisdom-specific question for wisdom books', () => {
      const ref = parseReference('Proverbs 3:5')!;
      const questions = getDiscussionQuestions(ref);
      const hasWisdomQuestion = questions.some(q => q.includes('wisdom'));
      expect(hasWisdomQuestion).toBe(true);
    });
  });

  // ===========================================
  // Formatted Verse Card Tests
  // ===========================================
  describe('formatVerseCard', () => {
    it('should format verse as shareable card', () => {
      const ref = parseReference('John 3:16')!;
      const card = formatVerseCard(ref, 'For God so loved the world...', 'NIV');
      expect(card).toContain('John 3:16');
      expect(card).toContain('NIV');
      expect(card).toContain('For God so loved the world...');
      expect(card).toContain('📖');
    });

    it('should include translation in card', () => {
      const ref = parseReference('Romans 8:28')!;
      const card = formatVerseCard(ref, 'Test verse', 'KJV');
      expect(card).toContain('KJV');
    });
  });

  // ===========================================
  // Translations Tests
  // ===========================================
  describe('Translations', () => {
    it('should have 5 translations available', () => {
      expect(TRANSLATIONS.length).toBe(5);
    });

    it('should include NIV, ESV, KJV, NLT, MSG', () => {
      const ids = TRANSLATIONS.map(t => t.id);
      expect(ids).toContain('NIV');
      expect(ids).toContain('ESV');
      expect(ids).toContain('KJV');
      expect(ids).toContain('NLT');
      expect(ids).toContain('MSG');
    });

    it('should have full names for all translations', () => {
      TRANSLATIONS.forEach(t => {
        expect(t.fullName).toBeTruthy();
        expect(t.name).toBeTruthy();
      });
    });
  });
});
