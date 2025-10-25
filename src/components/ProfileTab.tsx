import React, { useState, useRef } from 'react';
import { Heart, Share2, ExternalLink, Plus, Edit3, MapPin } from 'lucide-react';
import { useGuestModalContext } from '../contexts/GuestModalContext';
import { trackTestimonyView } from '../lib/guestSession';
import { unlockSecret, checkTestimonyAnalyticsSecrets } from '../lib/secrets';
import { trackTestimonyView as trackDbTestimonyView, toggleTestimonyLike, hasUserLikedTestimony, getTestimonyComments, addTestimonyComment, canViewTestimony } from '../lib/database';
import { useUser } from '@clerk/clerk-react';

interface ProfileTabProps {
  profile: any;
  nightMode: boolean;
  onAddTestimony?: () => void;
  onEditTestimony?: () => void;
  currentUserProfile?: any;
}

const ProfileTab: React.FC<ProfileTabProps> = ({ profile, nightMode, onAddTestimony, onEditTestimony, currentUserProfile }) => {
  const { user } = useUser();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(profile?.story?.likeCount || 0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showQR, setShowQR] = useState(false);
  const [showLesson, setShowLesson] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { isGuest, checkAndShowModal } = useGuestModalContext() as { isGuest: boolean; checkAndShowModal: () => void };
  const [avatarTaps, setAvatarTaps] = useState(0);
  const [avatarTapTimer, setAvatarTapTimer] = useState<NodeJS.Timeout | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [canView, setCanView] = useState(true); // Can view testimony based on privacy settings

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
      try {
        if (!isGuest && user && profile?.story?.id && profile?.supabaseId) {
          await trackDbTestimonyView(profile.story.id, profile.supabaseId);
          // Check if this testimony has unlocked any secrets
          await checkTestimonyAnalyticsSecrets(profile.story.id);
        }
      } catch (error) {
        console.error('Error tracking testimony view:', error);
        // Don't fail silently - log but continue gracefully
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
  }, [profile?.story?.id, profile?.supabaseId, user]);

  // Check testimony visibility based on privacy settings
  React.useEffect(() => {
    const checkVisibility = async () => {
      if (profile?.supabaseId && profile?.story?.content && currentUserProfile?.supabaseId) {
        const allowed = await canViewTestimony(profile.supabaseId, currentUserProfile.supabaseId);
        setCanView(allowed);
      } else {
        // If viewing own profile or no privacy settings, allow
        setCanView(true);
      }
    };
    checkVisibility();
  }, [profile?.supabaseId, profile?.story?.content, currentUserProfile?.supabaseId]);

  // Load comments
  React.useEffect(() => {
    const loadComments = async () => {
      if (profile?.story?.id && canView) {
        const { comments: testimonyComments } = await getTestimonyComments(profile.story.id);
        setComments(testimonyComments || []);
      }
    };
    loadComments();
  }, [profile?.story?.id, canView]);

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
    // Metadata loaded
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    if (audioRef.current) {
      audioRef.current.currentTime = percent * audioRef.current.duration;
    }
  };

  const formatTime = (seconds: number) => {
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
    const { success } = await toggleTestimonyLike(profile.story.id, profile.supabaseId);

    if (success) {
      // Check if testimony unlocked heart toucher secret
      await checkTestimonyAnalyticsSecrets(profile.story.id);
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

  const handleSubmitComment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !profile?.story?.id || !profile?.supabaseId) return;

    setIsSubmittingComment(true);

    const { success, comment } = await addTestimonyComment(
      profile.story.id,
      profile.supabaseId,
      newComment.trim()
    );

    if (success && comment) {
      // Verify profile exists and has required fields
      if (!profile || !profile.username) {
        console.error('Cannot add comment: profile data incomplete');
        setIsSubmittingComment(false);
        return;
      }

      // Add comment to local state
      setComments([...comments, {
        ...(comment as any),
        users: {
          username: profile.username,
          display_name: profile.displayName,
          avatar_emoji: profile.avatar,
          avatar_url: profile.avatarImage
        }
      }]);
      setNewComment('');

      // Check if this unlocked the first comment secret
      await checkTestimonyAnalyticsSecrets(profile.story.id);
    }

    setIsSubmittingComment(false);
  };

  return (
    <div className="py-4 space-y-4">
      <div className="flex flex-col items-center -mt-8 relative z-10 px-4 pt-6">
        <div
          className={`w-[237px] h-[237px] rounded-full flex items-center justify-center text-[12.14rem] shadow-md border-4 ${nightMode ? 'border-[#0a0a0a] bg-gradient-to-br from-sky-300 via-blue-400 to-blue-500' : 'border-white bg-gradient-to-br from-purple-400 to-pink-400'} flex-shrink-0 mb-4 overflow-hidden cursor-pointer select-none transition-transform hover:scale-105 active:scale-95`}
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
                    {formatTime(audioRef.current?.currentTime || 0)}
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
              <span>✨</span> {profile?.story?.title}
            </h2>
            {onEditTestimony && profile?.story?.content && (
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

          {/* Testimony Content - Privacy Protected */}
          {canView ? (
            <>
              <p className={`text-sm ${nightMode ? 'text-slate-100' : 'text-black'} leading-relaxed whitespace-pre-wrap`}>{profile?.story?.content}</p>

              {/* Lesson Learned - Inline with preview/expand */}
              {profile?.story?.lesson && (
            <div className={`mt-5 pt-5 border-t ${nightMode ? 'border-white/10' : 'border-white/20'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">📖</span>
                <h3 className={`text-sm font-semibold ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                  A Lesson Learned
                </h3>
              </div>

              {/* Preview (first 150 characters) */}
              <p className={`text-sm ${nightMode ? 'text-slate-300' : 'text-gray-700'} italic leading-relaxed`}>
                {showLesson
                  ? profile?.story?.lesson
                  : `${profile?.story?.lesson?.slice(0, 150)}${(profile?.story?.lesson?.length || 0) > 150 ? '...' : ''}`
                }
              </p>

              {/* Read More button if lesson is long */}
              {(profile?.story?.lesson?.length || 0) > 150 && (
                <button
                  onClick={() => setShowLesson(!showLesson)}
                  className={`mt-2 text-sm font-medium transition-colors ${
                    nightMode
                      ? 'text-blue-400 hover:text-blue-300'
                      : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  {showLesson ? 'Read less' : 'Read more'}
                </button>
              )}
            </div>
          )}
            </>
          ) : (
            <div className={`text-center py-8 ${nightMode ? 'bg-white/5' : 'bg-slate-50'} rounded-lg`}>
              <div className="flex flex-col items-center gap-3">
                <div className={`p-3 rounded-full ${nightMode ? 'bg-white/10' : 'bg-white/50'}`}>
                  <svg className={`w-6 h-6 ${nightMode ? 'text-slate-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <p className={`text-sm font-medium ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    This testimony is private
                  </p>
                  <p className={`text-xs mt-1 ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Only friends can view this testimony
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pb-20">

        {/* Comments Section - Always Visible */}
        <div
          className={`mt-4 p-5 rounded-xl border ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'}`}
          style={nightMode ? {} : {
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
          }}
        >
          {/* Comments Header */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">💬</span>
            <h3 className={`text-base font-semibold ${nightMode ? 'text-slate-100' : 'text-black'}`}>
              Comments
            </h3>
            <span className={`text-sm ${nightMode ? 'text-slate-400' : 'text-gray-500'}`}>
              ({comments.length})
            </span>
          </div>

          {/* Comment Input First (Instagram/LinkedIn style) */}
          {user ? (
            <form onSubmit={handleSubmitComment} className="mb-5">
              <div className="flex gap-3">
                {/* User Avatar */}
                <div className="flex-shrink-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-semibold ${nightMode ? 'bg-white/10' : 'bg-white/50'}`}
                    style={nightMode ? {} : {
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
                    }}
                  >
                    {profile?.avatar || '👤'}
                  </div>
                </div>

                {/* Input Area */}
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share your thoughts on this testimony..."
                    className={`w-full px-4 py-3 rounded-xl border resize-none transition-all ${
                      nightMode
                        ? 'bg-white/5 border-white/10 text-slate-100 placeholder-slate-400 focus:bg-white/10 focus:border-white/20'
                        : 'bg-white/40 border-white/30 text-black placeholder-gray-500 focus:bg-white/60 focus:border-white/40'
                    }`}
                    style={nightMode ? {
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)'
                    } : {
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                    }}
                    rows={2}
                    disabled={isSubmittingComment}
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim() || isSubmittingComment}
                    className={`mt-2 px-5 py-2 rounded-lg font-medium text-sm transition-all ${
                      nightMode
                        ? 'bg-blue-500/80 hover:bg-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:shadow-lg'
                    }`}
                    style={!nightMode && !isSubmittingComment && newComment.trim() ? {
                      boxShadow: '0 2px 10px rgba(59, 130, 246, 0.3)'
                    } : {}}
                  >
                    {isSubmittingComment ? '✓ Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div
              className={`mb-5 p-4 rounded-xl border-2 border-dashed text-center ${
                nightMode ? 'border-white/10 bg-white/5' : 'border-gray-300 bg-white/30'
              }`}
            >
              <p className={`text-sm ${nightMode ? 'text-slate-400' : 'text-gray-600'}`}>
                <span className="font-semibold">Sign in</span> to join the conversation
              </p>
            </div>
          )}

          {/* Divider */}
          {comments.length > 0 && (
            <div className={`border-t mb-5 ${nightMode ? 'border-white/10' : 'border-white/30'}`}></div>
          )}

          {/* Comments List */}
          {comments.length === 0 ? (
            <div className="text-center py-8">
              <p className={`text-base ${nightMode ? 'text-slate-400' : 'text-gray-600'} mb-1`}>
                No comments yet
              </p>
              <p className={`text-sm ${nightMode ? 'text-slate-500' : 'text-gray-500'}`}>
                Be the first to share your thoughts!
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  {/* Comment Avatar */}
                  <div className="flex-shrink-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm ${nightMode ? 'bg-white/10' : 'bg-white/50'}`}
                      style={nightMode ? {} : {
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
                      }}
                    >
                      {comment.users?.avatar_emoji || '👤'}
                    </div>
                  </div>

                  {/* Comment Content */}
                  <div className="flex-1 min-w-0">
                    <div
                      className={`px-4 py-3 rounded-2xl ${nightMode ? 'bg-white/5' : 'bg-white/50'}`}
                      style={nightMode ? {} : {
                        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)'
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-sm font-semibold ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                          {comment.users?.display_name || comment.users?.username || 'Anonymous'}
                        </span>
                        <span className={`text-xs ${nightMode ? 'text-slate-500' : 'text-gray-500'}`}>
                          •
                        </span>
                        <span className={`text-xs ${nightMode ? 'text-slate-500' : 'text-gray-500'}`}>
                          {new Date(comment.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: new Date(comment.created_at).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                          })}
                        </span>
                      </div>
                      <p className={`text-sm leading-relaxed ${nightMode ? 'text-slate-300' : 'text-gray-800'}`}>
                        {comment.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (nightMode) {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)';
            } else {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)';
            }
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
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

      {/* Floating Action Button (FAB) for Add Testimony - Only show if user doesn't have testimony */}
      {onAddTestimony && !profile?.hasTestimony && (
        <button
          onClick={onAddTestimony}
          className="fixed bottom-20 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 z-40 text-white"
          style={{
            background: 'linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)',
            boxShadow: nightMode
              ? '0 6px 20px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              : '0 6px 20px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.boxShadow = nightMode
              ? '0 8px 24px rgba(59, 130, 246, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
              : '0 8px 24px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
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
