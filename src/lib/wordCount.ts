/**
 * Word Count Utility
 * Proper word counting that handles edge cases
 */

/**
 * Count words in a string, handling multiple whitespace types
 * @param text - The text to count words in
 * @returns Number of words
 */
export const countWords = (text: string): number => {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  // Trim and replace all whitespace characters (spaces, newlines, tabs, etc.) with single spaces
  const normalized = text
    .trim()
    .replace(/\s+/g, ' ');

  // If empty after trimming, return 0
  if (!normalized) {
    return 0;
  }

  // Split by spaces and count non-empty strings
  const words = normalized.split(' ').filter(word => word.length > 0);

  return words.length;
};

/**
 * Get character count (excluding whitespace)
 * @param text - The text to count characters in
 * @returns Number of characters (excluding whitespace)
 */
export const countCharacters = (text: string): number => {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  // Remove all whitespace and count remaining characters
  return text.replace(/\s/g, '').length;
};

/**
 * Get reading time estimate in minutes
 * Average adult reads 200-250 words per minute
 * @param wordCount - Number of words
 * @returns Estimated reading time in minutes (rounded up)
 */
export const getReadingTime = (wordCount: number): number => {
  const wordsPerMinute = 225; // Average reading speed
  return Math.ceil(wordCount / wordsPerMinute);
};
