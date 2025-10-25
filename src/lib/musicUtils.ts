/**
 * Music Platform Utilities
 * Helper functions for Spotify and YouTube music integration
 */

/**
 * Extract YouTube video ID from various URL formats
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 */
export const getYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};

/**
 * Extract Spotify track ID from URL
 * Supports:
 * - https://open.spotify.com/track/TRACK_ID
 * - spotify:track:TRACK_ID
 */
export const getSpotifyTrackId = (url: string): string | null => {
  if (!url) return null;

  const patterns = [
    /spotify\.com\/track\/([a-zA-Z0-9]+)/,
    /spotify:track:([a-zA-Z0-9]+)/,
    /^([a-zA-Z0-9]{22})$/ // Direct track ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};

/**
 * Detect music platform from URL
 */
export const detectMusicPlatform = (url: string): 'spotify' | 'youtube' | null => {
  if (!url) return null;

  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  }

  if (url.includes('spotify.com') || url.includes('spotify:')) {
    return 'spotify';
  }

  return null;
};

/**
 * Validate music URL
 */
export const isValidMusicUrl = (url: string): boolean => {
  if (!url) return false;

  const platform = detectMusicPlatform(url);
  if (!platform) return false;

  if (platform === 'youtube') {
    return getYouTubeVideoId(url) !== null;
  }

  if (platform === 'spotify') {
    return getSpotifyTrackId(url) !== null;
  }

  return false;
};

/**
 * Get embed URL for YouTube
 */
export const getYouTubeEmbedUrl = (videoId: string): string => {
  return `https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1&modestbranding=1`;
};

/**
 * Get Spotify embed URL
 */
export const getSpotifyEmbedUrl = (trackId: string): string => {
  return `https://open.spotify.com/embed/track/${trackId}`;
};
