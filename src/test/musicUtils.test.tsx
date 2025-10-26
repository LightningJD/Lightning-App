import { describe, it, expect } from 'vitest';
import {
  getYouTubeVideoId,
  getSpotifyTrackId,
  detectMusicPlatform,
  isValidMusicUrl,
  getYouTubeEmbedUrl,
  getSpotifyEmbedUrl
} from '../lib/musicUtils';

/**
 * Tests for music utility functions
 * Verifies YouTube and Spotify URL parsing and embed generation
 */

describe('Music Utils', () => {
  describe('YouTube Video ID Extraction', () => {
    it('should extract video ID from standard youtube.com/watch URLs', () => {
      expect(getYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(getYouTubeVideoId('https://youtube.com/watch?v=abc123def')).toBe('abc123def');
      expect(getYouTubeVideoId('http://www.youtube.com/watch?v=test123')).toBe('test123');
    });

    it('should extract video ID from youtu.be short URLs', () => {
      expect(getYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(getYouTubeVideoId('http://youtu.be/abc123')).toBe('abc123');
    });

    it('should extract video ID from youtube.com/embed URLs', () => {
      expect(getYouTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(getYouTubeVideoId('https://youtube.com/embed/test123')).toBe('test123');
    });

    it('should handle URLs with additional query parameters', () => {
      const urlWithParams = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s&list=PLxyz';
      expect(getYouTubeVideoId(urlWithParams)).toBe('dQw4w9WgXcQ');
    });

    it('should handle URLs with timestamps', () => {
      expect(getYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ?t=42')).toBe('dQw4w9WgXcQ');
    });

    it('should return null for invalid YouTube URLs', () => {
      expect(getYouTubeVideoId('https://example.com')).toBeNull();
      expect(getYouTubeVideoId('not a url')).toBeNull();
      expect(getYouTubeVideoId('')).toBeNull();
      expect(getYouTubeVideoId(null as any)).toBeNull();
    });

    it('should accept direct video IDs', () => {
      expect(getYouTubeVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });
  });

  describe('Spotify Track ID Extraction', () => {
    it('should extract track ID from open.spotify.com URLs', () => {
      expect(getSpotifyTrackId('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT')).toBe('4cOdK2wGLETKBW3PvgPWqT');
      expect(getSpotifyTrackId('https://open.spotify.com/track/abc123def456')).toBe('abc123def456');
    });

    it('should extract track ID from spotify: URIs', () => {
      expect(getSpotifyTrackId('spotify:track:4cOdK2wGLETKBW3PvgPWqT')).toBe('4cOdK2wGLETKBW3PvgPWqT');
      expect(getSpotifyTrackId('spotify:track:test123')).toBe('test123');
    });

    it('should handle URLs with query parameters', () => {
      const urlWithParams = 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=abc123';
      expect(getSpotifyTrackId(urlWithParams)).toBe('4cOdK2wGLETKBW3PvgPWqT');
    });

    it('should return null for invalid Spotify URLs', () => {
      expect(getSpotifyTrackId('https://example.com')).toBeNull();
      expect(getSpotifyTrackId('not a url')).toBeNull();
      expect(getSpotifyTrackId('')).toBeNull();
      expect(getSpotifyTrackId(null as any)).toBeNull();
    });

    it('should accept direct track IDs', () => {
      expect(getSpotifyTrackId('4cOdK2wGLETKBW3PvgPWqT')).toBe('4cOdK2wGLETKBW3PvgPWqT');
    });
  });

  describe('Music Platform Detection', () => {
    it('should detect YouTube platform', () => {
      expect(detectMusicPlatform('https://www.youtube.com/watch?v=abc123')).toBe('youtube');
      expect(detectMusicPlatform('https://youtu.be/abc123')).toBe('youtube');
      expect(detectMusicPlatform('https://youtube.com/embed/abc123')).toBe('youtube');
    });

    it('should detect Spotify platform', () => {
      expect(detectMusicPlatform('https://open.spotify.com/track/abc123')).toBe('spotify');
      expect(detectMusicPlatform('spotify:track:abc123')).toBe('spotify');
    });

    it('should return null for unknown platforms', () => {
      expect(detectMusicPlatform('https://soundcloud.com/artist/track')).toBeNull();
      expect(detectMusicPlatform('https://example.com')).toBeNull();
      expect(detectMusicPlatform('')).toBeNull();
    });
  });

  describe('Music URL Validation', () => {
    it('should validate YouTube URLs', () => {
      expect(isValidMusicUrl('https://www.youtube.com/watch?v=abc123')).toBe(true);
      expect(isValidMusicUrl('https://youtu.be/abc123')).toBe(true);
    });

    it('should validate Spotify URLs', () => {
      expect(isValidMusicUrl('https://open.spotify.com/track/abc123')).toBe(true);
      expect(isValidMusicUrl('spotify:track:abc123')).toBe(true);
    });

    it('should reject invalid music URLs', () => {
      expect(isValidMusicUrl('https://example.com')).toBe(false);
      expect(isValidMusicUrl('not a url')).toBe(false);
      expect(isValidMusicUrl('')).toBe(false);
      expect(isValidMusicUrl(null as any)).toBe(false);
    });

    it('should reject malicious URLs', () => {
      expect(isValidMusicUrl('javascript:alert(1)')).toBe(false);
      expect(isValidMusicUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    });
  });

  describe('YouTube Embed URL Generation', () => {
    it('should generate YouTube embed URL with autoplay', () => {
      const embedUrl = getYouTubeEmbedUrl('dQw4w9WgXcQ');
      expect(embedUrl).toContain('youtube.com/embed/dQw4w9WgXcQ');
      expect(embedUrl).toContain('autoplay=1');
      expect(embedUrl).toContain('mute=1');
    });

    it('should include required YouTube parameters', () => {
      const embedUrl = getYouTubeEmbedUrl('abc123');
      expect(embedUrl).toContain('enablejsapi=1');
      expect(embedUrl).toContain('rel=0');
    });

    it('should handle null video ID', () => {
      const embedUrl = getYouTubeEmbedUrl(null as any);
      expect(embedUrl).toBeDefined();
    });
  });

  describe('Spotify Embed URL Generation', () => {
    it('should generate Spotify embed URL', () => {
      const embedUrl = getSpotifyEmbedUrl('4cOdK2wGLETKBW3PvgPWqT');
      expect(embedUrl).toContain('open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT');
    });

    it('should handle null track ID', () => {
      const embedUrl = getSpotifyEmbedUrl(null as any);
      expect(embedUrl).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed YouTube URLs gracefully', () => {
      expect(getYouTubeVideoId('https://youtube.com/watch')).toBeNull();
      expect(getYouTubeVideoId('https://youtube.com/watch?v=')).toBeNull();
    });

    it('should handle malformed Spotify URLs gracefully', () => {
      expect(getSpotifyTrackId('https://open.spotify.com/track/')).toBeNull();
      expect(getSpotifyTrackId('spotify:track:')).toBeNull();
    });

    it('should handle very long video IDs', () => {
      const longId = 'a'.repeat(100);
      expect(getYouTubeVideoId(longId)).toBeDefined();
    });

    it('should handle special characters in URLs', () => {
      const urlWithSpecialChars = 'https://www.youtube.com/watch?v=abc123&feature=share';
      expect(getYouTubeVideoId(urlWithSpecialChars)).toBe('abc123');
    });

    it('should handle mixed case in video IDs', () => {
      // URLs are case-sensitive, but video IDs can have mixed case
      expect(getYouTubeVideoId('https://www.youtube.com/watch?v=AbC123')).toBe('AbC123');
      expect(getSpotifyTrackId('https://open.spotify.com/track/AbC123DeF')).toBe('AbC123DeF');
    });
  });

  describe('Integration Tests', () => {
    it('should handle full workflow: detect → extract → generate embed', () => {
      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      // Detect platform
      const platform = detectMusicPlatform(youtubeUrl);
      expect(platform).toBe('youtube');

      // Extract ID
      const videoId = getYouTubeVideoId(youtubeUrl);
      expect(videoId).toBe('dQw4w9WgXcQ');

      // Generate embed
      const embedUrl = getYouTubeEmbedUrl(videoId!);
      expect(embedUrl).toContain('youtube.com/embed/dQw4w9WgXcQ');
    });

    it('should validate before processing', () => {
      const invalidUrl = 'https://example.com/music';

      expect(isValidMusicUrl(invalidUrl)).toBe(false);
      expect(detectMusicPlatform(invalidUrl)).toBeNull();
      expect(getYouTubeVideoId(invalidUrl)).toBeNull();
      expect(getSpotifyTrackId(invalidUrl)).toBeNull();
    });
  });
});
