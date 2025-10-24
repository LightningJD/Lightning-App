import React, { useState, useRef } from 'react';
import { Heart, Share2, ExternalLink, Plus, Edit3, MapPin } from 'lucide-react';
import { useGuestModalContext } from '../contexts/GuestModalContext';
import { trackTestimonyView } from '../lib/guestSession';
import { unlockSecret, checkTestimonyAnalyticsSecrets } from '../lib/secrets';
import { trackTestimonyView as trackDbTestimonyView, toggleTestimonyLike, hasUserLikedTestimony } from '../lib/database';
import { useUser } from '@clerk/clerk-react';

const ProfileTab = ({ profile, nightMode, onAddTestimony, onEditTestimony }) => {
  const { user } = useUser();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(profile?.story?.likeCount || 0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showQR, setShowQR] = useState(false);
  const [showLesson, setShowLesson] = useState(false);
  const audioRef = useRef(null);
  const { isGuest, checkAndShowModal } = useGuestModalContext();
  const [avatarTaps, setAvatarTaps] = useState(0);
  const [avatarTapTimer, setAvatarTapTimer] = useState(null);

  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = true;
      audioRef.current.play().catch(() => {
        setIsPlaying(false);
      });
    }
  }, []);

  // Track testimony views for guests (Freemium Browse & Block)
  React.useEffect(() => {
    if (isGuest && profile?.story?.content) {
      trackTestimonyView();
      checkAndShowModal();
    }
  }, [profile?.story?.content, isGuest]);

  // Track testimony views in database (for authenticated users)
  React.useEffect(() => {
    const trackView = async () => {
      if (!isGuest && user && profile?.story?.id && profile?.supabaseId) {
        await trackDbTestimonyView(profile.story.id, profile.supabaseId);
        // Check if this testimony has unlocked any secrets
        await checkTestimonyAnalyticsSecrets(profile.story.id, profile.supabaseId);
      }
    };
    trackView();
  }, [profile?.story?.id, user, isGuest]);

  // Load user's like status
  React.useEffect(() => {
    const loadLikeStatus = async () => {
      if (user && profile?.story?.id && profile?.supabaseId) {
        const { liked } = await hasUserLikedTestimony(profile.story.id, profile.supabaseId);
        setIsLiked(liked);
      }
    };
    loadLikeStatus();
  }, [profile?.story?.id, user]);

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

  const handleLike = async () => {
    if (!user || !profile?.story?.id || !profile?.supabaseId) return;

    // Optimistic update
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikeCount(newLiked ? likeCount + 1 : likeCount - 1);

    // Update database
    const { success, liked } = await toggleTestimonyLike(profile.story.id, profile.supabaseId);

    if (success) {
      // Check if testimony unlocked heart toucher secret
      await checkTestimonyAnalyticsSecrets(profile.story.id, profile.supabaseId);
    } else {
      // Revert on error
      setIsLiked(!newLiked);
      setLikeCount(newLiked ? likeCount - 1 : likeCount + 1);
    }
  };

  const handleAvatarTap = () => {
    const newCount = avatarTaps + 1;
    setAvatarTaps(newCount);

    // Clear existing timer
    if (avatarTapTimer) {
      clearTimeout(avatarTapTimer);
    }

    // Check if reached 3 taps
    if (newCount === 3) {
      unlockSecret('triple_tap_profile');
      setAvatarTaps(0);
    } else {
      // Reset counter after 1.5 seconds of no taps
      const timer = setTimeout(() => {
        setAvatarTaps(0);
      }, 1500);
      setAvatarTapTimer(timer);
    }
  };

  return (
    <div className="py-4 space-y-4">
      <div className="flex flex-col items-center -mt-8 relative z-10 px-4 pt-6">
        <div
          className={`w-[244px] h-[244px] rounded-full flex items-center justify-center text-[12.52rem] shadow-md border-4 ${nightMode ? 'border-[#0a0a0a] bg-gradient-to-br from-sky-300 via-blue-400 to-blue-500' : 'border-white bg-gradient-to-br from-purple-400 to-pink-400'} flex-shrink-0 mb-4 overflow-hidden cursor-pointer select-none transition-transform hover:scale-105 active:scale-95`}
          onClick={handleAvatarTap}
          title="Triple tap for a surprise..."
        >
          {profile.avatarImage ? (
            <img
              src={profile.avatarImage}
              alt={profile.displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            profile.avatar
          )}
        </div>
        <div className="text-center w-full">
          <div className="flex items-center justify-center gap-2">
            <h1 className={`text-xl font-bold ${nightMode ? 'text-slate-100' : 'text-black'} break-words`}>{profile.username}</h1>
            {/* Like Button - Beside Username */}
            <button
              onClick={handleLike}
              className={`p-2 rounded-lg border transition-all duration-200 flex items-center gap-1.5 ${isLiked ? 'border-red-500' : nightMode ? 'border-white/20' : 'border-white/30'}`}
              style={isLiked ? {
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              } : nightMode ? {
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
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-slate-100' : nightMode ? 'text-slate-100' : 'text-black'}`} />
              <span className={`text-xs font-medium ${isLiked ? 'text-slate-100' : nightMode ? 'text-slate-100' : 'text-black'}`}>{likeCount}</span>
            </button>
          </div>
          <p className={`${nightMode ? 'text-slate-100' : 'text-black'} text-sm ${!nightMode && 'opacity-70'} mt-1`}>{profile.displayName}</p>

          {/* Location */}
          {profile.location && (
            <div className={`flex items-center justify-center gap-1.5 mt-2 ${nightMode ? 'text-slate-100' : 'text-black'} text-sm`}>
              <MapPin className="w-3.5 h-3.5" />
              <span>{profile.location}</span>
            </div>
          )}

          <p className={`${nightMode ? 'text-slate-100' : 'text-black'} mt-3 text-sm leading-relaxed break-words`}>{profile.bio}</p>
        </div>
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
            <p className={`mt-2 text-sm ${nightMode ? 'text-slate-100' : 'text-black'}`}>Scan to connect</p>
          </div>
        </div>
      )}

      {profile.music && (
        <div className="px-4">
          <div
            className={`p-2 rounded-lg border ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25 shadow-[0_2px_10px_rgba(0,0,0,0.03)]'}`}
            style={nightMode ? {} : {
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03), inset 0 1px 1px rgba(255, 255, 255, 0.3)'
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

            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className={`w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0 text-slate-100 transition-all`}
                style={isPlaying ? {
                  background: 'linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)',
                  boxShadow: '0 1px 4px rgba(59, 130, 246, 0.2)'
                } : nightMode ? {
                  background: 'rgba(255, 255, 255, 0.1)'
                } : {
                  background: 'rgba(203, 213, 225, 0.6)'
                }}
              >
                {isPlaying ? (
                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                    <rect x="5" y="3" width="3" height="14" />
                    <rect x="12" y="3" width="3" height="14" />
                  </svg>
                ) : (
                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="inline-flex animate-scroll">
                      <p className={`text-xs font-medium whitespace-nowrap ${nightMode ? 'text-slate-100' : 'text-black'} pr-8`}>
                        {profile.music.trackName} <span className={`${nightMode ? 'text-slate-300' : 'text-black/60'}`}>• {profile.music.artist}</span>
                      </p>
                      <p className={`text-xs font-medium whitespace-nowrap ${nightMode ? 'text-slate-100' : 'text-black'} pr-8`}>
                        {profile.music.trackName} <span className={`${nightMode ? 'text-slate-300' : 'text-black/60'}`}>• {profile.music.artist}</span>
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] ${nightMode ? 'text-slate-400' : 'text-slate-500'} flex-shrink-0`}>
                    {formatTime(audioRef.current?.currentTime)}
                  </span>
                </div>

                <div className={`mt-1 h-1 ${nightMode ? 'bg-white/10' : 'bg-slate-200'} rounded-full cursor-pointer`} onClick={handleProgressClick}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${progress}%`,
                      background: nightMode ? '#3b82f6' : 'linear-gradient(90deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)'
                    }}
                  />
                </div>
              </div>

              <button onClick={toggleMute} className={`flex-shrink-0 p-1 ${isMuted ? nightMode ? 'text-slate-400' : 'text-slate-400' : nightMode ? 'text-blue-500' : 'text-blue-600'}`}>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  {isMuted ? (
                    <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM13.293 8.293a1 1 0 011.414 0L16 9.586l1.293-1.293a1 1 0 111.414 1.414L17.414 11l1.293 1.293a1 1 0 01-1.414 1.414L16 12.414l-1.293 1.293a1 1 0 01-1.414-1.414L14.586 11l-1.293-1.293a1 1 0 010-1.414z"/>
                  ) : (
                    <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"/>
                  )}
                </svg>
              </button>

              <a href={profile.music.spotifyUrl} target="_blank" rel="noopener noreferrer" className={`flex-shrink-0 p-1 ${nightMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}>
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
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-xl font-bold ${nightMode ? 'text-slate-100' : 'text-black'} flex items-center gap-2`}>
              <span>✨</span> {profile.story.title}
            </h2>
            {onEditTestimony && profile.story.content && (
              <button
                onClick={onEditTestimony}
                className={`p-2 rounded-lg border transition-all duration-200 flex items-center gap-1.5 ${
                  nightMode
                    ? 'border-white/20 hover:bg-white/10'
                    : 'border-white/30 hover:bg-white/20'
                }`}
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
                title="Edit Testimony"
              >
                <Edit3 className={`w-4 h-4 ${nightMode ? 'text-slate-100' : 'text-black'}`} />
                <span className={`text-xs font-medium ${nightMode ? 'text-slate-100' : 'text-black'}`}>Edit</span>
              </button>
            )}
          </div>
          <p className={`text-sm ${nightMode ? 'text-slate-100' : 'text-black'} leading-relaxed whitespace-pre-wrap`}>{profile.story.content}</p>
        </div>
      </div>

      <div className="px-4 pb-20">
        <button
          onClick={() => setShowLesson(!showLesson)}
          className={`w-full p-4 rounded-xl border text-left font-semibold transition-all flex items-center justify-between ${nightMode ? 'bg-white/5 border-white/10 text-slate-100 hover:bg-white/10' : 'border-white/25 text-black shadow-[0_4px_20px_rgba(0,0,0,0.05)]'}`}
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
            <p className={`text-sm ${nightMode ? 'text-slate-100' : 'text-black'} italic`}>{profile.story.lesson}</p>
          </div>
        )}

        {/* Share Button */}
        <button
          onClick={() => setShowQR(!showQR)}
          className={`w-full mt-3 px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 text-sm transition-all duration-200 border ${nightMode ? 'text-slate-100 border-white/20' : 'text-black border-white/30'}`}
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
          onMouseEnter={(e) => {
            if (nightMode) {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)';
            } else {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)';
            }
          }}
          onMouseLeave={(e) => {
            if (nightMode) {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)';
            } else {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
            }
          }}
        >
          <Share2 className="w-4 h-4" />
          Share Testimony
        </button>
      </div>

      {/* Floating Action Button (FAB) for Add Testimony */}
      {onAddTestimony && (
        <button
          onClick={onAddTestimony}
          className="fixed bottom-20 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 z-40 text-white"
          style={{
            background: 'linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)',
            boxShadow: nightMode
              ? '0 6px 20px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              : '0 6px 20px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = nightMode
              ? '0 8px 24px rgba(59, 130, 246, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
              : '0 8px 24px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = nightMode
              ? '0 6px 20px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              : '0 6px 20px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25)';
          }}
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
