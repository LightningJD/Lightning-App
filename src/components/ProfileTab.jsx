import React, { useState, useRef } from 'react';
import { Heart, Share2, ExternalLink, Plus } from 'lucide-react';

const ProfileTab = ({ profile, nightMode, onAddTestimony }) => {
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
        <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-md border-4 ${nightMode ? 'border-[#0a0a0a] bg-gradient-to-br from-purple-500 to-indigo-600' : 'border-white bg-gradient-to-br from-purple-400 to-pink-400'} flex-shrink-0`}>
          {profile.avatar}
        </div>
        <div className="flex-1 mt-2 min-w-0">
          <h1 className={`text-2xl font-bold ${nightMode ? 'text-white' : 'text-black'} break-words`}>{profile.displayName}</h1>
          <p className={`${nightMode ? 'text-gray-400' : 'text-black'} text-sm ${!nightMode && 'opacity-70'}`}>@{profile.username}</p>
          <p className={`${nightMode ? 'text-gray-400' : 'text-black'} mt-3 text-sm leading-relaxed break-words`}>{profile.bio}</p>
        </div>
      </div>

      <div className="px-4 flex gap-3">
        <button
          onClick={handleLike}
          className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm transition-all duration-200 border ${isLiked ? 'bg-red-500 text-white border-red-500' : nightMode ? 'bg-white/5 text-white border-white/10 hover:bg-white/10' : 'text-black shadow-md border-white/30'}`}
          style={isLiked || nightMode ? {} : {
            background: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
          }}
          onMouseEnter={(e) => !isLiked && !nightMode && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)')}
          onMouseLeave={(e) => !isLiked && !nightMode && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)')}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-white' : ''}`} style={!isLiked && !nightMode ? { filter: 'brightness(0)' } : {}} />
          {isLiked ? 'Liked' : 'Like'} ({likeCount})
        </button>
        <button
          onClick={() => setShowQR(!showQR)}
          className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 text-sm transition-all duration-200 border ${nightMode ? 'bg-white/5 text-white border-white/10 hover:bg-white/10' : 'text-black shadow-md border-white/30'}`}
          style={nightMode ? {} : {
            background: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
          }}
          onMouseEnter={(e) => !nightMode && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)')}
          onMouseLeave={(e) => !nightMode && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)')}
        >
          <Share2 className="w-4 h-4" style={!nightMode ? { filter: 'brightness(0)' } : {}} />
          Share
        </button>
      </div>

      {showQR && (
        <div className="px-4">
          <div
            className={`p-4 rounded-xl border text-center ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'}`}
            style={nightMode ? {} : {
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
            }}
          >
            <div className="text-5xl">📱</div>
            <p className={`mt-2 text-sm ${nightMode ? 'text-white' : 'text-black'}`}>Scan to connect</p>
          </div>
        </div>
      )}

      {profile.music && (
        <div className="px-4">
          <div
            className={`p-4 rounded-xl border ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'}`}
            style={nightMode ? {} : {
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
            }}
          >
            <audio
              ref={audioRef}
              src={profile.music.audioUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
              autoPlay
            />

            <div className={`mb-3 text-sm ${nightMode ? 'text-white' : 'text-black'}`}>
              <p className="font-semibold">{profile.music.trackName}</p>
              <p className={nightMode ? 'text-gray-400' : 'text-black opacity-70'}>{profile.music.artist}</p>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={togglePlay} className={`w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0 ${isPlaying ? 'bg-blue-600 text-white' : nightMode ? 'bg-white/10 text-white' : 'bg-slate-300 text-slate-700'}`}>
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

              <div className={`flex-1 h-1.5 ${nightMode ? 'bg-white/10' : 'bg-slate-300'} rounded-full cursor-pointer`} onClick={handleProgressClick}>
                <div className={`h-full rounded-full ${nightMode ? 'bg-blue-600' : 'bg-gradient-to-r from-emerald-400 to-emerald-500'}`} style={{ width: `${progress}%` }} />
              </div>

              <span className={`text-xs ${nightMode ? 'text-gray-400' : 'text-slate-500'} w-10 text-right flex-shrink-0`}>
                {formatTime(audioRef.current?.currentTime)}/{formatTime(duration)}
              </span>

              <button onClick={toggleMute} className={`flex-shrink-0 text-sm ${isMuted ? nightMode ? 'text-gray-400' : 'text-slate-400' : nightMode ? 'text-purple-600' : 'text-emerald-600'}`}>
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

              <a href={profile.music.spotifyUrl} target="_blank" rel="noopener noreferrer" className={`flex-shrink-0 ${nightMode ? 'text-gray-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="px-4">
        <div
          className={`p-6 rounded-xl border ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/30 shadow-[0_4px_12px_rgba(0,0,0,0.08)]'}`}
          style={nightMode ? {} : {
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
          }}
        >
          <h2 className={`text-xl font-bold ${nightMode ? 'text-white' : 'text-black'} mb-4 flex items-center gap-2`}>
            <span>✨</span> {profile.story.title}
          </h2>
          <p className={`text-sm ${nightMode ? 'text-gray-400' : 'text-black'} leading-relaxed whitespace-pre-wrap`}>{profile.story.content}</p>
        </div>
      </div>

      <div className="px-4 pb-20">
        <button
          onClick={() => setShowLesson(!showLesson)}
          className={`w-full p-4 rounded-xl border text-left font-semibold transition-all flex items-center justify-between ${nightMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'border-white/25 text-black shadow-[0_4px_20px_rgba(0,0,0,0.05)]'}`}
          style={nightMode ? {} : {
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
          }}
        >
          <span>📖 A Lesson Learned</span>
          <span className={`transform transition-transform ${showLesson ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {showLesson && (
          <div
            className={`mt-2 p-4 rounded-xl border max-h-48 overflow-y-auto ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'}`}
            style={nightMode ? {} : {
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
            }}
          >
            <p className={`text-sm ${nightMode ? 'text-gray-400' : 'text-black'} italic`}>{profile.story.lesson}</p>
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) for Add Testimony */}
      {onAddTestimony && (
        <button
          onClick={onAddTestimony}
          className={`fixed bottom-20 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 z-40 ${
            nightMode
              ? 'bg-gradient-to-br from-purple-500 to-pink-500 hover:shadow-[0_8px_24px_rgba(168,85,247,0.4)]'
              : 'bg-gradient-to-br from-blue-500 to-purple-500 hover:shadow-[0_8px_24px_rgba(59,130,246,0.4)]'
          }`}
          title="Add Testimony"
          aria-label="Add Testimony"
        >
          <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
};

export default ProfileTab;
