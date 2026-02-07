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
 * Fetch video title from YouTube oEmbed API (no API key needed)
 * Parses "Song Name - Artist" or "Artist - Song Name" patterns from title
 */
export const fetchYouTubeVideoInfo = async (videoId: string): Promise<{ title: string; songName: string; artist: string } | null> => {
  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (!response.ok) return null;
    const data = await response.json();
    const fullTitle: string = data.title || '';
    const channelName: string = data.author_name || '';

    // Try to parse "Song - Artist" or "Artist - Song" patterns
    // Common YouTube music title formats:
    // "Artist - Song Name"
    // "Artist - Song Name (Official Video)"
    // "Song Name | Artist"
    // "Song Name (feat. Other) - Artist"
    let songName = fullTitle;
    let artist = channelName;

    // Clean common suffixes
    const cleanTitle = fullTitle
      .replace(/\s*[\(\[](official\s*(music\s*)?video|lyric\s*video|audio|lyrics|visualizer|live|hd|hq|4k|official audio)[\)\]]\s*/gi, '')
      .replace(/\s*[\(\[]feat\.?\s*[^\)\]]+[\)\]]\s*/gi, '')
      .replace(/\s*\|\s*.*$/, '') // Remove everything after |
      .trim();

    // Try splitting by " - " (most common format)
    if (cleanTitle.includes(' - ')) {
      const parts = cleanTitle.split(' - ');
      if (parts.length === 2) {
        // Convention: "Artist - Song" is most common on YouTube
        artist = parts[0].trim();
        songName = parts[1].trim();
      } else {
        // Multiple dashes — first part is artist, rest is song
        artist = parts[0].trim();
        songName = parts.slice(1).join(' - ').trim();
      }
    } else {
      // No dash separator — use full title as song name, channel as artist
      songName = cleanTitle;
      artist = channelName;
    }

    // Clean up "VEVO" from channel names
    artist = artist.replace(/VEVO$/i, '').trim();
    // Remove "- Topic" from auto-generated YouTube Music channels
    artist = artist.replace(/\s*-\s*Topic$/i, '').trim();

    return { title: fullTitle, songName, artist };
  } catch {
    return null;
  }
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
