import { describe, it, expect } from 'vitest';
import {
  secondsToTimeString,
  timeStringToSeconds,
  isValidTimeString,
  formatTimeString
} from '../lib/timeUtils';

/**
 * Tests for time utility functions
 * Used for music start time feature
 */

describe('Time Utils', () => {
  describe('secondsToTimeString', () => {
    it('should convert seconds to M:SS format for times under 10 minutes', () => {
      expect(secondsToTimeString(0)).toBe('0:00');
      expect(secondsToTimeString(5)).toBe('0:05');
      expect(secondsToTimeString(30)).toBe('0:30');
      expect(secondsToTimeString(90)).toBe('1:30');
      expect(secondsToTimeString(192)).toBe('3:12');
      expect(secondsToTimeString(599)).toBe('9:59');
    });

    it('should convert seconds to MM:SS format for times 10 minutes or more', () => {
      expect(secondsToTimeString(600)).toBe('10:00');
      expect(secondsToTimeString(605)).toBe('10:05');
      expect(secondsToTimeString(661)).toBe('11:01');
      expect(secondsToTimeString(3599)).toBe('59:59');
      expect(secondsToTimeString(3661)).toBe('61:01');
    });

    it('should handle negative seconds', () => {
      expect(secondsToTimeString(-1)).toBe('0:00');
      expect(secondsToTimeString(-100)).toBe('0:00');
    });

    it('should handle decimal seconds', () => {
      expect(secondsToTimeString(90.5)).toBe('1:30');
      expect(secondsToTimeString(192.9)).toBe('3:12');
    });

    it('should handle large numbers', () => {
      expect(secondsToTimeString(7200)).toBe('120:00'); // 2 hours
      expect(secondsToTimeString(10000)).toBe('166:40');
    });
  });

  describe('timeStringToSeconds', () => {
    it('should convert M:SS format to seconds', () => {
      expect(timeStringToSeconds('0:00')).toBe(0);
      expect(timeStringToSeconds('0:05')).toBe(5);
      expect(timeStringToSeconds('0:30')).toBe(30);
      expect(timeStringToSeconds('1:30')).toBe(90);
      expect(timeStringToSeconds('3:12')).toBe(192);
      expect(timeStringToSeconds('9:59')).toBe(599);
    });

    it('should convert MM:SS format to seconds', () => {
      expect(timeStringToSeconds('10:00')).toBe(600);
      expect(timeStringToSeconds('10:05')).toBe(605);
      expect(timeStringToSeconds('59:59')).toBe(3599);
    });

    it('should handle empty or whitespace strings', () => {
      expect(timeStringToSeconds('')).toBe(0);
      expect(timeStringToSeconds('   ')).toBe(0);
    });

    it('should return null for invalid formats', () => {
      expect(timeStringToSeconds('abc')).toBeNull();
      expect(timeStringToSeconds('5')).toBeNull();
      expect(timeStringToSeconds('5:5:5')).toBeNull();
      expect(timeStringToSeconds(':30')).toBeNull();
      expect(timeStringToSeconds('30:')).toBeNull();
    });

    it('should return null for invalid numbers', () => {
      expect(timeStringToSeconds('5:60')).toBeNull(); // Seconds >= 60
      expect(timeStringToSeconds('-5:30')).toBeNull(); // Negative minutes
      expect(timeStringToSeconds('5:-30')).toBeNull(); // Negative seconds
    });

    it('should handle strings with extra whitespace', () => {
      expect(timeStringToSeconds('  3:12  ')).toBe(192);
      expect(timeStringToSeconds(' 10:05 ')).toBe(605);
    });

    it('should handle leading zeros', () => {
      expect(timeStringToSeconds('03:12')).toBe(192);
      expect(timeStringToSeconds('0:05')).toBe(5);
    });
  });

  describe('isValidTimeString', () => {
    it('should validate correct time strings', () => {
      expect(isValidTimeString('0:00')).toBe(true);
      expect(isValidTimeString('0:30')).toBe(true);
      expect(isValidTimeString('3:12')).toBe(true);
      expect(isValidTimeString('10:05')).toBe(true);
      expect(isValidTimeString('59:59')).toBe(true);
      expect(isValidTimeString('99:59')).toBe(true);
    });

    it('should allow empty strings', () => {
      expect(isValidTimeString('')).toBe(true);
      expect(isValidTimeString('   ')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isValidTimeString('5')).toBe(false);
      expect(isValidTimeString('5:5')).toBe(false); // Seconds not padded
      expect(isValidTimeString('5:60')).toBe(false); // Seconds >= 60
      expect(isValidTimeString(':30')).toBe(false);
      expect(isValidTimeString('30:')).toBe(false);
      expect(isValidTimeString('abc')).toBe(false);
      expect(isValidTimeString('5:5:5')).toBe(false);
    });

    it('should handle strings with whitespace', () => {
      expect(isValidTimeString('  3:12  ')).toBe(true);
    });

    it('should reject invalid seconds range', () => {
      expect(isValidTimeString('5:60')).toBe(false);
      expect(isValidTimeString('5:99')).toBe(false);
    });
  });

  describe('formatTimeString', () => {
    it('should format time strings with proper padding', () => {
      expect(formatTimeString('3:5')).toBe('3:05');
      expect(formatTimeString('0:5')).toBe('0:05');
      expect(formatTimeString('10:5')).toBe('10:05');
    });

    it('should leave properly formatted strings unchanged', () => {
      expect(formatTimeString('3:12')).toBe('3:12');
      expect(formatTimeString('10:05')).toBe('10:05');
      expect(formatTimeString('0:00')).toBe('0:00');
    });

    it('should handle invalid strings by returning them unchanged', () => {
      expect(formatTimeString('abc')).toBe('abc');
      expect(formatTimeString('5')).toBe('5');
      expect(formatTimeString('invalid')).toBe('invalid');
    });

    it('should handle empty strings', () => {
      // Empty string converts to 0 seconds, then to '0:00'
      expect(formatTimeString('')).toBe('0:00');
    });

    it('should normalize leading zeros', () => {
      expect(formatTimeString('03:05')).toBe('3:05');
      expect(formatTimeString('00:30')).toBe('0:30');
    });
  });

  describe('Round-trip Conversion', () => {
    it('should convert seconds → string → seconds without loss', () => {
      const testSeconds = [0, 5, 30, 90, 192, 600, 3599];

      testSeconds.forEach(seconds => {
        const timeString = secondsToTimeString(seconds);
        const backToSeconds = timeStringToSeconds(timeString);
        expect(backToSeconds).toBe(seconds);
      });
    });

    it('should convert string → seconds → string consistently', () => {
      const testStrings = ['0:00', '0:05', '3:12', '10:05', '59:59'];

      testStrings.forEach(str => {
        const seconds = timeStringToSeconds(str);
        const backToString = secondsToTimeString(seconds!);
        expect(backToString).toBe(str);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero', () => {
      expect(secondsToTimeString(0)).toBe('0:00');
      expect(timeStringToSeconds('0:00')).toBe(0);
      expect(isValidTimeString('0:00')).toBe(true);
    });

    it('should handle maximum YouTube video length (12 hours)', () => {
      const twelveHours = 12 * 60 * 60; // 43200 seconds
      const timeString = secondsToTimeString(twelveHours);
      expect(timeString).toBe('720:00');
      expect(timeStringToSeconds(timeString)).toBe(twelveHours);
    });

    it('should handle common music start times', () => {
      // 30 seconds intro
      expect(timeStringToSeconds('0:30')).toBe(30);

      // 47 seconds intro (common)
      expect(timeStringToSeconds('0:47')).toBe(47);

      // 1 minute 30 seconds
      expect(timeStringToSeconds('1:30')).toBe(90);

      // 3 minutes 12 seconds
      expect(timeStringToSeconds('3:12')).toBe(192);
    });

    it('should handle null and undefined gracefully', () => {
      expect(timeStringToSeconds(null as any)).toBe(0);
      expect(timeStringToSeconds(undefined as any)).toBe(0);
    });
  });

  describe('User Input Scenarios', () => {
    it('should handle user typing incomplete time strings', () => {
      expect(isValidTimeString('3')).toBe(false);
      expect(isValidTimeString('3:')).toBe(false);
      expect(isValidTimeString('3:1')).toBe(false);
    });

    it('should validate complete user input', () => {
      expect(isValidTimeString('3:12')).toBe(true);
      expect(isValidTimeString('10:05')).toBe(true);
    });

    it('should format user input when they submit', () => {
      // User types "3:5" and we format it to "3:05"
      expect(formatTimeString('3:5')).toBe('3:05');

      // User types "0:5" and we format it to "0:05"
      expect(formatTimeString('0:5')).toBe('0:05');
    });
  });
});
