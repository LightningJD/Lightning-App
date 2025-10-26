import React, { useState, useRef } from 'react';
import { ExternalLink, Volume2, VolumeX } from 'lucide-react';
import { getYouTubeVideoId, getSpotifyTrackId, getYouTubeEmbedUrl, getSpotifyEmbedUrl } from '../lib/musicUtils';

interface MusicPlayerProps {
  platform: 'spotify' | 'youtube';
  url: string;
  trackName?: string;
  artist?: string;
  nightMode: boolean;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ platform, url, trackName, artist, nightMode }) => {
  const [isMuted, setIsMuted] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const toggleMute = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      // Use YouTube IFrame API to toggle mute
      const command = isMuted ? 'unMute' : 'mute';
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: command, args: [] }),
        '*'
      );
      setIsMuted(!isMuted);
    }
  };

  if (platform === 'youtube') {
    const videoId = getYouTubeVideoId(url);
    if (!videoId) return null;

    return (
      <div
        className={`relative p-2 rounded-lg border max-w-sm ${nightMode ? 'border-white/10' : 'border-white/30'}`}
        style={nightMode ? {
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)'
        } : {
          background: 'rgba(255, 255, 255, 0.25)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
        }}
      >
        {/* Track Info Header - Audio Player Style */}
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded flex items-center justify-center relative ${nightMode ? 'bg-slate-700/50' : 'bg-slate-100/70'}`}>
            <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </div>

          {/* Animated Equalizer Bars */}
          <div className="flex items-center gap-0.5 h-4">
            <div
              className={`w-0.5 rounded-full ${nightMode ? 'bg-blue-400' : 'bg-blue-500'}`}
              style={{
                height: '4px',
                animation: 'equalizerBar1 0.6s ease-in-out infinite'
              }}
            />
            <div
              className={`w-0.5 rounded-full ${nightMode ? 'bg-blue-400' : 'bg-blue-500'}`}
              style={{
                height: '8px',
                animation: 'equalizerBar2 0.6s ease-in-out infinite 0.1s'
              }}
            />
            <div
              className={`w-0.5 rounded-full ${nightMode ? 'bg-blue-400' : 'bg-blue-500'}`}
              style={{
                height: '12px',
                animation: 'equalizerBar3 0.6s ease-in-out infinite 0.2s'
              }}
            />
            <div
              className={`w-0.5 rounded-full ${nightMode ? 'bg-blue-400' : 'bg-blue-500'}`}
              style={{
                height: '6px',
                animation: 'equalizerBar4 0.6s ease-in-out infinite 0.3s'
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${nightMode ? 'text-slate-100' : 'text-slate-900'} truncate`}>
              {trackName || 'Music'}
            </p>
            {artist && (
              <p className={`text-xs ${nightMode ? 'text-slate-400' : 'text-slate-600'} truncate`}>
                {artist}
              </p>
            )}
          </div>
          <button
            onClick={toggleMute}
            className={`flex-shrink-0 p-2 rounded-md transition-colors ${
              nightMode ? 'hover:bg-slate-700/50 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100/70 text-slate-500 hover:text-slate-700'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
            aria-label={isMuted ? 'Unmute music' : 'Mute music'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex-shrink-0 p-2 rounded-md transition-colors ${
              nightMode ? 'hover:bg-slate-700/50 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100/70 text-slate-500 hover:text-slate-700'
            }`}
            title="Open in YouTube"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Hidden YouTube Player (plays in background, muted) */}
        <iframe
          ref={iframeRef}
          width="0"
          height="0"
          src={getYouTubeEmbedUrl(videoId)}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="hidden"
        />
      </div>
    );
  }

  // Spotify player
  const trackId = getSpotifyTrackId(url);
  if (!trackId) return null;

  return (
    <div
      className={`p-4 rounded-xl border ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/30 shadow-md'}`}
      style={nightMode ? {} : {
        background: 'rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${nightMode ? 'text-slate-100' : 'text-black'} truncate`}>
              {trackName || 'Spotify Track'}
            </p>
            {artist && (
              <p className={`text-xs ${nightMode ? 'text-slate-400' : 'text-slate-600'} truncate`}>
                {artist}
              </p>
            )}
          </div>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
            nightMode ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
          }`}
          title="Open in Spotify"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ height: '152px' }}>
        <iframe
          src={getSpotifyEmbedUrl(trackId)}
          width="100%"
          height="152"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="w-full"
        />
      </div>
    </div>
  );
};

export default MusicPlayer;
