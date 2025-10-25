/**
 * Time Utilities for Music Start Time
 * Converts between "M:SS" or "MM:SS" format and seconds
 */

/**
 * Convert seconds to time string (M:SS or MM:SS)
 * @param seconds - Total seconds
 * @returns Time string like "3:12" or "10:05"
 */
export const secondsToTimeString = (seconds: number): string => {
  if (seconds < 0) return '0:00';

  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Convert time string to seconds
 * @param timeString - Time in format "M:SS" or "MM:SS" (e.g., "3:12" or "10:05")
 * @returns Total seconds, or null if invalid format
 */
export const timeStringToSeconds = (timeString: string): number | null => {
  if (!timeString || !timeString.trim()) return 0;

  const trimmed = timeString.trim();
  const parts = trimmed.split(':');

  // Must have exactly 2 parts (minutes:seconds)
  if (parts.length !== 2) return null;

  const minutes = parseInt(parts[0], 10);
  const seconds = parseInt(parts[1], 10);

  // Validate numbers
  if (isNaN(minutes) || isNaN(seconds)) return null;
  if (minutes < 0 || seconds < 0 || seconds >= 60) return null;

  return minutes * 60 + seconds;
};

/**
 * Validate time string format
 * @param timeString - Time string to validate
 * @returns True if valid format (M:SS or MM:SS)
 */
export const isValidTimeString = (timeString: string): boolean => {
  if (!timeString || !timeString.trim()) return true; // Empty is valid (means 0:00)

  const pattern = /^\d{1,2}:[0-5]\d$/;
  return pattern.test(timeString.trim());
};

/**
 * Format time string (ensure proper padding)
 * @param timeString - Raw time string
 * @returns Formatted time string or original if invalid
 */
export const formatTimeString = (timeString: string): string => {
  const seconds = timeStringToSeconds(timeString);
  if (seconds === null) return timeString;
  return secondsToTimeString(seconds);
};
