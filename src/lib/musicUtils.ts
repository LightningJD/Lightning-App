/**
 * YouTube Music Utilities
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
 * Validate YouTube URL
 */
export const isValidMusicUrl = (url: string): boolean => {
  if (!url) return false;
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
  if (!isYouTube) return false;
  return getYouTubeVideoId(url) !== null;
};

/**
 * Detect music platform from URL (YouTube only)
 */
export const detectMusicPlatform = (url: string): 'youtube' | null => {
  if (!url) return null;
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  return null;
};

/**
 * Get embed URL for YouTube
 */
export const getYouTubeEmbedUrl = (videoId: string): string => {
  const paramsObj: Record<string, string> = {
    autoplay: '1',
    mute: '1',
    controls: '1',
    modestbranding: '1',
    rel: '0',
    enablejsapi: '1'
  };

  const params = new URLSearchParams(paramsObj);
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
};
