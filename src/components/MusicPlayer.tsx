import React, { useState, useRef, useEffect } from 'react';
import { ExternalLink, Play, Pause, Loader2 } from 'lucide-react';
import { getYouTubeVideoId } from '../lib/musicUtils';

interface MusicPlayerProps {
  platform: 'spotify' | 'youtube';
  url: string;
  trackName?: string;
  artist?: string;
  nightMode: boolean;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ platform, url, trackName, artist, nightMode }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerReadyRef = useRef(false);

  const videoId = platform === 'youtube' ? getYouTubeVideoId(url) : null;

  // Listen for YouTube player state changes via postMessage
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.youtube.com') return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        // Player ready event
        if (data.event === 'onReady' || data.info?.playerState !== undefined) {
          playerReadyRef.current = true;
          setIsLoading(false);
        }
        // State changes: 1 = playing, 2 = paused, 0 = ended
        if (data.info?.playerState === 0) {
          setIsPlaying(false);
        }
      } catch {
        // Not a YouTube message
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const sendCommand = (func: string) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func, args: [] }),
        '*'
      );
    }
  };

  const handlePlayPause = () => {
    if (!videoId) {
      // Spotify or unknown — just open the link
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    if (!isPlaying && !iframeRef.current) {
      // First play — load the iframe
      setIsLoading(true);
      setIsPlaying(true);
      return;
    }

    if (isPlaying) {
      sendCommand('pauseVideo');
      setIsPlaying(false);
    } else {
      sendCommand('playVideo');
      sendCommand('unMute');
      setIsPlaying(true);
    }
  };

  const handleIframeLoad = () => {
    // Give YouTube a moment to init the JS API, then unmute
    setTimeout(() => {
      sendCommand('unMute');
      playerReadyRef.current = true;
      setIsLoading(false);
    }, 1500);
  };

  const platformIcon = platform === 'youtube' ? (
    <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  ) : (
    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  );

  // Build embed URL — start muted (required for autoplay), we unmute after load
  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&controls=0&modestbranding=1&rel=0`
    : null;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
        nightMode
          ? 'bg-white/[0.03] border-white/[0.06]'
          : 'bg-white/30 border-white/40'
      }`}
      style={!nightMode ? { boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4)' } : {}}
    >
      {/* Play/Pause button */}
      <button
        onClick={handlePlayPause}
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
          isPlaying
            ? nightMode
              ? 'bg-blue-500/20 text-blue-400'
              : 'bg-blue-500/15 text-blue-600'
            : nightMode
              ? 'bg-white/10 text-slate-300 hover:bg-white/15'
              : 'bg-black/5 text-slate-600 hover:bg-black/10'
        }`}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </button>

      {/* Song info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${nightMode ? 'text-slate-200' : 'text-slate-800'}`}>
          {trackName || 'My Song'}
        </p>
        <p className={`text-xs truncate ${nightMode ? 'text-slate-500' : 'text-slate-400'}`}>
          {artist || (platform === 'youtube' ? 'YouTube' : 'Spotify')}
        </p>
      </div>

      {/* Platform icon + external link */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        {platformIcon}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`p-1.5 rounded-lg transition-colors ${
            nightMode ? 'text-slate-600 hover:text-slate-400 hover:bg-white/5' : 'text-slate-300 hover:text-slate-500 hover:bg-black/5'
          }`}
          onClick={(e) => e.stopPropagation()}
          title={`Open in ${platform === 'youtube' ? 'YouTube' : 'Spotify'}`}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Hidden YouTube iframe — only mounted when playing */}
      {isPlaying && embedUrl && (
        <iframe
          ref={iframeRef}
          width="0"
          height="0"
          src={embedUrl}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          onLoad={handleIframeLoad}
          className="absolute w-0 h-0 opacity-0 pointer-events-none"
          style={{ position: 'absolute', left: '-9999px' }}
        />
      )}
    </div>
  );
};

export default MusicPlayer;
