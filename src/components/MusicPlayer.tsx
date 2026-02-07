import React, { useState, useRef, useEffect } from 'react';
import { ExternalLink, Play, Pause, Loader2 } from 'lucide-react';
import { getYouTubeVideoId } from '../lib/musicUtils';

interface MusicPlayerProps {
  url: string;
  trackName?: string;
  artist?: string;
  nightMode: boolean;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ url, trackName, artist, nightMode }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerReadyRef = useRef(false);

  const videoId = getYouTubeVideoId(url);

  // Listen for YouTube player state changes
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.youtube.com') return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data.event === 'onReady' || data.info?.playerState !== undefined) {
          playerReadyRef.current = true;
          setIsLoading(false);
        }
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
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    if (!isPlaying && !iframeRef.current) {
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
    setTimeout(() => {
      sendCommand('unMute');
      playerReadyRef.current = true;
      setIsLoading(false);
    }, 1500);
  };

  if (!videoId) return null;

  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&controls=0&modestbranding=1&rel=0`;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
        nightMode
          ? 'bg-white/[0.03] border-white/[0.06]'
          : 'bg-white/30 border-white/40'
      }`}
      style={!nightMode ? { boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4)' } : {}}
    >
      {/* Play/Pause */}
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
          {artist || 'YouTube'}
        </p>
      </div>

      {/* YouTube icon + external link */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`p-1.5 rounded-lg transition-colors ${
            nightMode ? 'text-slate-600 hover:text-slate-400 hover:bg-white/5' : 'text-slate-300 hover:text-slate-500 hover:bg-black/5'
          }`}
          onClick={(e) => e.stopPropagation()}
          title="Open in YouTube"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Hidden YouTube iframe — only mounted when playing */}
      {isPlaying && (
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
