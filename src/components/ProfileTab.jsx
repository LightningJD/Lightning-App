import React, { useState, useRef } from 'react';
import { Heart, Share2, ExternalLink } from 'lucide-react';

const ProfileTab = ({ profile }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(342);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showQR, setShowQR] = useState(false);
  const [showLesson, setShowLesson] = useState(false);
  const audioRef = useRef(null);

  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = true;
      audioRef.current.play().catch(() => {
        setIsPlaying(false);
      });
    }
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleProgressClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    if (audioRef.current) {
      audioRef.current.currentTime = percent * audioRef.current.duration;
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
  };

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-start gap-4 -mt-12 relative z-10 px-4 pt-6">
        <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-4xl shadow-md border-4 border-white flex-shrink-0">
          {profile.avatar}
        </div>
        <div className="flex-1 mt-2 min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 break-words">{profile.displayName}</h1>
          <p className="text-slate-400 text-sm">@{profile.username}</p>
          <p className="text-slate-700 mt-3 text-sm leading-relaxed break-words">{profile.bio}</p>
        </div>
      </div>

      <div className="px-4 flex gap-3">
        <button onClick={handleLike} className={`flex-1 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 text-sm transition-all ${isLiked ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-700'}`}>
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-white' : ''}`} />
          {isLiked ? 'Liked' : 'Like'} ({likeCount})
        </button>
        <button onClick={() => setShowQR(!showQR)} className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 text-sm">
          <Share2 className="w-4 h-4" />
          Share
        </button>
      </div>

      {showQR && (
        <div className="px-4">
          <div className="p-4 bg-white rounded-lg border border-slate-200 text-center">
            <div className="text-5xl">📱</div>
            <p className="mt-2 text-sm text-slate-600">Scan to connect</p>
          </div>
        </div>
      )}

      {profile.music && (
        <div className="px-4">
          <div className="p-3 bg-gradient-to-r from-slate-100/60 to-slate-50/60 rounded-lg border border-slate-200">
            <audio
              ref={audioRef}
              src={profile.music.audioUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
              autoPlay
            />

            <div className="mb-2 text-xs text-slate-700">
              <p className="font-semibold">{profile.music.trackName}</p>
              <p className="text-slate-500">{profile.music.artist}</p>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={togglePlay} className={`w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0 text-sm ${isPlaying ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-700'}`}>
                {isPlaying ? (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <rect x="5" y="3" width="3" height="14" />
                    <rect x="12" y="3" width="3" height="14" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                )}
              </button>

              <div className="flex-1 h-1.5 bg-slate-300 rounded-full cursor-pointer" onClick={handleProgressClick}>
                <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full" style={{ width: `${progress}%` }} />
              </div>

              <span className="text-xs text-slate-500 w-10 text-right flex-shrink-0">
                {formatTime(audioRef.current?.currentTime)}/{formatTime(duration)}
              </span>

              <button onClick={toggleMute} className={`flex-shrink-0 text-sm ${isMuted ? 'text-slate-400' : 'text-emerald-600'}`}>
                {isMuted ? (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.707 7.293a1 1 0 00-1.414 1.414l.707.707-3.5 3.5a1 1 0 101.414 1.414L8.414 11l.707.707a1 1 0 001.414-1.414L9.414 11l3.5-3.5a1 1 0 00-1.414-1.414L8.414 9l-.707-.707z"/>
                    <path fillRule="evenodd" d="M18.868 5.132a1 1 0 010 1.414l-11 11a1 1 0 01-1.414-1.414l11-11a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.172a1 1 0 011.414 0A6.972 6.972 0 0120 10a6.972 6.972 0 01-3.929 6.172 1 1 0 01-1.414-1.414A4.972 4.972 0 0018 10a4.972 4.972 0 00-2.343-4.172 1 1 0 010-1.414z"/>
                  </svg>
                )}
              </button>

              <a href={profile.music.spotifyUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 text-slate-400 hover:text-slate-700">
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="px-4">
        <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">{profile.story.title}</h2>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{profile.story.content}</p>
        </div>
      </div>

      <div className="px-4 pb-20">
        <button onClick={() => setShowLesson(!showLesson)} className="w-full p-4 bg-white rounded-lg border border-slate-200 text-left font-semibold text-slate-900 hover:bg-slate-50 transition-colors flex items-center justify-between">
          <span>📖 A Lesson Learned</span>
          <span className={`transform transition-transform ${showLesson ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {showLesson && (
          <div className="mt-2 p-4 bg-white rounded-lg border border-slate-200 max-h-48 overflow-y-auto">
            <p className="text-sm text-slate-700 italic">{profile.story.lesson}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileTab;
