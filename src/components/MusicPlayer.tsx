import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Loader2 } from "lucide-react";
import { getYouTubeVideoId } from "../lib/musicUtils";

interface MusicPlayerProps {
  url: string;
  trackName?: string;
  artist?: string;
  nightMode: boolean;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({
  url,
  trackName,
  artist,
  nightMode,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerReadyRef = useRef(false);

  const videoId = getYouTubeVideoId(url);

  const YOUTUBE_ORIGIN = "https://www.youtube.com";

  // Listen for YouTube player state changes
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== "https://www.youtube.com") return;
      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data.event === "onReady" || data.info?.playerState !== undefined) {
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
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const sendCommand = (func: string) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func, args: [] }),
        YOUTUBE_ORIGIN,
      );
    }
  };

  const handlePlayPause = () => {
    if (!videoId) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    if (!isPlaying && !iframeRef.current) {
      setIsLoading(true);
      setIsPlaying(true);
      return;
    }

    if (isPlaying) {
      sendCommand("pauseVideo");
      setIsPlaying(false);
    } else {
      sendCommand("playVideo");
      sendCommand("unMute");
      setIsPlaying(true);
    }
  };

  const handleIframeLoad = () => {
    setTimeout(() => {
      sendCommand("unMute");
      playerReadyRef.current = true;
      setIsLoading(false);
    }, 1500);
  };

  if (!videoId) return null;

  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&controls=0&modestbranding=1&rel=0`;

  const accentColor = nightMode ? '#7b76e0' : '#4facfe';

  return (
    <div
      className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl"
      style={{
        background: nightMode ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.45)',
        border: nightMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(150,165,225,0.12)',
      }}
    >
      {/* Play/Pause circle */}
      <button
        onClick={handlePlayPause}
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
        style={{
          background: nightMode ? 'rgba(123,118,224,0.12)' : 'rgba(79,172,254,0.12)',
          color: accentColor,
        }}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-3.5 h-3.5" />
        ) : (
          <Play className="w-3.5 h-3.5 ml-0.5" />
        )}
      </button>

      {/* Song info + progress bar */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[12px] font-semibold truncate"
          style={{ color: nightMode ? '#e8e5f2' : '#1e2b4a' }}
        >
          {trackName || "My Song"}
        </p>
        <p
          className="text-[10px] truncate"
          style={{ color: nightMode ? '#5d5877' : '#8e9ec0' }}
        >
          {artist || "YouTube"}
        </p>
        {/* Progress bar */}
        <div
          className="h-[2px] rounded-full mt-1.5 overflow-hidden"
          style={{ background: nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(150,165,225,0.15)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: isPlaying ? '35%' : '0%',
              background: accentColor,
            }}
          />
        </div>
      </div>

      {/* Wave animation */}
      <div className="flex items-end gap-[2px] h-4 flex-shrink-0">
        {[7, 12, 5, 14, 8].map((height, i) => (
          <span
            key={i}
            className="block w-[2.5px] rounded-sm"
            style={{
              height: `${height}px`,
              background: accentColor,
              opacity: isPlaying ? 1 : 0.3,
              animation: isPlaying ? `musicWave 0.8s ease-in-out ${i * 0.08 + 0.05}s infinite` : 'none',
            }}
          />
        ))}
      </div>

      {/* CSS animation keyframes */}
      <style>{`
        @keyframes musicWave {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.4); }
        }
      `}</style>

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
          style={{ position: "absolute", left: "-9999px" }}
        />
      )}
    </div>
  );
};

export default MusicPlayer;
