import React, { useState } from 'react';
import { Heart, Share2, Plus, Edit3, MapPin, MoreHorizontal, Trash2 } from 'lucide-react';
import { useGuestModalContext } from '../contexts/GuestModalContext';
import { trackTestimonyView } from '../lib/guestSession';
import { checkBeforeSend } from '../lib/contentFilter';
import { unlockSecret, checkTestimonyAnalyticsSecrets } from '../lib/secrets';
import { trackTestimonyView as trackDbTestimonyView, toggleTestimonyLike, hasUserLikedTestimony, getTestimonyComments, addTestimonyComment, canViewTestimony, updateUserProfile, leaveChurch, regenerateChurchInviteCode } from '../lib/database';
import { useUser } from '@clerk/clerk-react';
import { sanitizeUserContent } from '../lib/sanitization';
import { showError } from '../lib/toast';
import { usePremium } from '../contexts/PremiumContext';
import ProBadge from './premium/ProBadge';
import TestimonyShareModal from './TestimonyShareModal';
import { deleteTestimony } from '../lib/database';
import ProfileCard from './ProfileCard';
import ChurchCard from './ChurchCard';


interface ProfileTabProps {
  profile: any;
  nightMode: boolean;
  onAddTestimony?: () => void;
  onEditTestimony?: () => void;
  currentUserProfile?: any;
}

const ProfileTab: React.FC<ProfileTabProps> = ({ profile, nightMode, onAddTestimony, onEditTestimony, currentUserProfile }) => {
  const { user } = useUser();
  const { isUserPro } = usePremium();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(profile?.story?.likeCount || 0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showTestimonyMenu, setShowTestimonyMenu] = useState(false);
  const [showLesson, setShowLesson] = useState(false);
  const { isGuest, checkAndShowModal } = useGuestModalContext() as { isGuest: boolean; checkAndShowModal: () => void };
  const [avatarTaps, setAvatarTaps] = useState(0);
  const [avatarTapTimer, setAvatarTapTimer] = useState<NodeJS.Timeout | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [canView, setCanView] = useState(true); // Can view testimony based on privacy settings

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
        // Use currentUserProfile (the viewer), not profile (the testimony owner)
        if (!isGuest && user && profile?.story?.id && currentUserProfile?.supabaseId) {
          await trackDbTestimonyView(profile.story.id, currentUserProfile.supabaseId);
          // Check if this testimony has unlocked any secrets
          await checkTestimonyAnalyticsSecrets(profile.story.id);
        }
      } catch (error) {
        console.error('Error tracking testimony view:', error);
        // Don't fail silently - log but continue gracefully
      }
    };
    trackView();
  }, [profile?.story?.id, user, isGuest, currentUserProfile?.supabaseId]);

  // Load user's like status (check if CURRENT user has liked this testimony)
  React.useEffect(() => {
    const loadLikeStatus = async () => {
      if (user && profile?.story?.id && currentUserProfile?.supabaseId) {
        const { liked } = await hasUserLikedTestimony(profile.story.id, currentUserProfile.supabaseId);
        setIsLiked(liked);
      }
    };
    loadLikeStatus();
  }, [profile?.story?.id, currentUserProfile?.supabaseId, user]);

  // Sync like count from database to avoid negative counts when already liked
  React.useEffect(() => {
    const loadLikeCount = async () => {
      try {
        if (profile?.story?.id) {
          const { getTestimonyLikeCount } = await import('../lib/database');
          const { count } = await getTestimonyLikeCount(profile.story.id);
          setLikeCount(count || 0);
        }
      } catch (err) {
        // keep existing count on failure
      }
    };
    loadLikeCount();
  }, [profile?.story?.id]);

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

  const handleLike = async () => {
    if (!user || !profile?.story?.id || !currentUserProfile?.supabaseId) return;

    // Optimistic update
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikeCount((prev: number) => {
      if (newLiked) return prev + 1;
      return Math.max(0, prev - 1);
    });

    // Update database — use CURRENT user's ID (the person liking), not testimony owner
    const { success } = await toggleTestimonyLike(profile.story.id, currentUserProfile.supabaseId);

    if (success) {
      // Check if testimony unlocked heart toucher secret
      await checkTestimonyAnalyticsSecrets(profile.story.id);
    } else {
      // Revert on error
      setIsLiked(!newLiked);
      setLikeCount((prev: number) => {
        // revert the optimistic change
        if (newLiked) return Math.max(0, prev - 1);
        return prev + 1;
      });
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
    if (!newComment.trim() || !user || !profile?.story?.id || !currentUserProfile?.supabaseId) return;

    // Profanity check on comment
    const profanityResult = checkBeforeSend(newComment);
    if (!profanityResult.allowed && profanityResult.flag) {
      if (profanityResult.severity === 'high') {
        alert('This comment contains content that violates community guidelines.');
        return;
      }
      if (profanityResult.severity === 'medium') {
        if (!window.confirm('This comment may contain inappropriate content. Post anyway?')) {
          return;
        }
      }
    }

    setIsSubmittingComment(true);

    // Use the CURRENT user's ID (commenter), not the profile owner's ID
    const { success, comment } = await addTestimonyComment(
      profile.story.id,
      currentUserProfile.supabaseId,
      newComment.trim()
    );

    if (success && comment) {
      // Add comment to local state with the COMMENTER's profile data (not testimony owner's)
      // Use fallbacks for username/displayName so UI always updates even if profile data is sparse
      setComments((prev: any[]) => [...prev, {
        ...(comment as any),
        users: {
          username: currentUserProfile?.username || currentUserProfile?.displayName || 'User',
          display_name: currentUserProfile?.displayName || currentUserProfile?.username || 'User',
          avatar_emoji: currentUserProfile?.avatar || '👤',
          avatar_url: currentUserProfile?.avatarImage
        }
      }]);
      setNewComment('');

      // Check if this unlocked the first comment secret
      await checkTestimonyAnalyticsSecrets(profile.story.id);
    } else if (!success) {
      showError('Failed to post comment. Please try again.');
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
          <h1 className={`text-xl font-bold ${nightMode ? 'text-slate-100' : 'text-black'} break-words text-center flex items-center justify-center gap-1.5`}>
            {profile.username}
            {isUserPro && <ProBadge size="sm" />}
          </h1>
          <p className={`${nightMode ? 'text-slate-100' : 'text-black'} text-sm ${!nightMode && 'opacity-70'} mt-1`}>{profile.displayName}</p>

          {/* Location */}
          {profile.location && (
            <div className={`flex items-center justify-center gap-1.5 mt-2 ${nightMode ? 'text-slate-100' : 'text-black'} text-sm`}>
              <MapPin className="w-3.5 h-3.5" />
              <span>{profile.location}</span>
            </div>
          )}

        </div>
      </div>

      {/* Profile Card (Pokédex-style V15+V11) */}
      {(profile.bio || profile.churchName || profile.favoriteVerse || (profile.faithInterests && profile.faithInterests.length > 0) || profile.yearSaved || (profile.music && profile.music.spotifyUrl)) && (
        <div className="px-4">
          <ProfileCard
            nightMode={nightMode}
            profile={{
              bio: profile.bio,
              churchName: profile.churchName,
              churchLocation: profile.churchLocation,
              denomination: profile.denomination,
              yearSaved: profile.yearSaved,
              isBaptized: profile.isBaptized,
              yearBaptized: profile.yearBaptized,
              favoriteVerse: profile.favoriteVerse,
              favoriteVerseRef: profile.favoriteVerseRef,
              faithInterests: profile.faithInterests,
              music: profile.music,
              story: profile.story ? {
                id: profile.story.id,
                viewCount: profile.story.viewCount,
                likeCount: profile.story.likeCount,
              } : null,
            }}
          />
        </div>
      )}

      {/* Church Card — only on own profile */}
      {profile?.church && profile?.supabaseId === currentUserProfile?.supabaseId && (
        <div className="px-4 mt-3">
          <ChurchCard
            nightMode={nightMode}
            church={profile.church}
            isCreator={profile.church.createdBy === profile.supabaseId}
            onLeave={async () => {
              if (confirm('Are you sure you want to leave this church?')) {
                await leaveChurch(profile.supabaseId);
                window.dispatchEvent(new CustomEvent('profileUpdated'));
              }
            }}
            onRegenerateCode={profile.church.createdBy === profile.supabaseId ? async () => {
              const newCode = await regenerateChurchInviteCode(profile.church.id, profile.supabaseId);
              if (newCode) {
                window.dispatchEvent(new CustomEvent('profileUpdated'));
              }
            } : undefined}
          />
        </div>
      )}

      {/* Ambassador section moved to Find tab */}

      {/* Dot connector between Faith Profile and Testimony */}
      {(profile.bio || profile.churchName || profile.favoriteVerse || (profile.faithInterests && profile.faithInterests.length > 0) || profile.yearSaved || (profile.music && profile.music.spotifyUrl)) && profile?.story?.id && (
        <div className="flex flex-col items-center py-1">
          <div className={`w-px h-2.5 ${nightMode ? 'bg-blue-400/25' : 'bg-blue-500/20'}`} />
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: nightMode ? 'rgba(96,165,250,0.5)' : 'rgba(59,130,246,0.45)',
              boxShadow: nightMode
                ? '0 0 8px rgba(96,165,250,0.4)'
                : '0 0 6px rgba(59,130,246,0.3)',
            }}
          />
          <div className={`w-px h-2.5 ${nightMode ? 'bg-blue-400/25' : 'bg-blue-500/20'}`} />
        </div>
      )}

      {/* Testimony Share Modal */}
      <TestimonyShareModal
        nightMode={nightMode}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        testimonyId={profile?.story?.id || ''}
        testimonyText={profile?.story?.content || profile?.story?.text || ''}
        profileName={profile?.name || profile?.displayName || 'Someone'}
      />

      {/* Testimony Section - Only show when testimony exists */}
      {profile?.story?.id && (
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
                <span>✨</span> {profile?.story?.title || 'My Testimony'}
              </h2>
              <div className="flex items-center gap-2">
                {/* Like Button - Top Right - Only show when testimony exists */}
                {profile?.story?.id && (
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
                    title={isLiked ? 'Unlike testimony' : 'Like testimony'}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-slate-100' : nightMode ? 'text-slate-100' : 'text-black'}`} />
                    <span className={`text-xs font-medium ${isLiked ? 'text-slate-100' : nightMode ? 'text-slate-100' : 'text-black'}`}>{likeCount}</span>
                  </button>
                )}

                {/* Edit / Delete Buttons (owner only) */}
                {onEditTestimony && profile?.story?.content && currentUserProfile?.supabaseId === profile?.supabaseId && (
                  <button
                    onClick={onEditTestimony}
                    className={`p-2 rounded-lg border transition-all duration-200 flex items-center gap-1.5 ${nightMode
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

                {/* More menu (owner only) */}
                {profile?.story?.id && currentUserProfile?.supabaseId === profile?.supabaseId && (
                  <div className="relative">
                    <button
                      onClick={() => setShowTestimonyMenu(!showTestimonyMenu)}
                      className={`p-2 rounded-lg border transition-all duration-200 ${nightMode
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
                      title="More options"
                    >
                      <MoreHorizontal className={`w-4 h-4 ${nightMode ? 'text-slate-100' : 'text-black'}`} />
                    </button>

                    {showTestimonyMenu && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowTestimonyMenu(false)} />
                        <div
                          className={`absolute right-0 top-full mt-1 z-50 rounded-xl overflow-hidden shadow-xl border ${nightMode ? 'border-white/10' : 'border-white/30'}`}
                          style={nightMode ? {
                            background: 'rgba(20, 20, 20, 0.95)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)'
                          } : {
                            background: 'rgba(255, 255, 255, 0.9)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)'
                          }}
                        >
                          <button
                            onClick={async () => {
                              setShowTestimonyMenu(false);
                              if (!profile?.story?.id || !profile?.supabaseId) return;
                              if (!window.confirm('Delete your testimony? This cannot be undone.')) return;
                              const { success } = await deleteTestimony(profile.story.id, profile.supabaseId);
                              if (success) {
                                window.location.reload();
                              } else {
                                alert('Failed to delete testimony. Please try again.');
                              }
                            }}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium w-full text-left whitespace-nowrap transition-colors ${nightMode ? 'text-red-400 hover:bg-white/5' : 'text-red-600 hover:bg-red-50'}`}
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete Testimony
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Testimony Content - Privacy Protected */}
            {profile?.story?.id && canView ? (
              <>
                <p
                  className={`text-sm ${nightMode ? 'text-slate-100' : 'text-black'} leading-relaxed whitespace-pre-wrap`}
                  dangerouslySetInnerHTML={{ __html: sanitizeUserContent(profile?.story?.content || '') }}
                />

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
                    <p
                      className={`text-sm ${nightMode ? 'text-slate-300' : 'text-gray-700'} italic leading-relaxed`}
                      dangerouslySetInnerHTML={{
                        __html: sanitizeUserContent(
                          showLesson
                            ? (profile?.story?.lesson || '')
                            : `${(profile?.story?.lesson || '').slice(0, 150)}${(profile?.story?.lesson?.length || 0) > 150 ? '...' : ''}`
                        )
                      }}
                    />

                    {/* Read More button if lesson is long */}
                    {(profile?.story?.lesson?.length || 0) > 150 && (
                      <button
                        onClick={() => setShowLesson(!showLesson)}
                        className={`mt-2 text-sm font-medium transition-colors ${nightMode
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
            ) : profile?.story?.id && !canView ? (
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
            ) : (
              <div className={`text-center py-8 ${nightMode ? 'bg-white/5' : 'bg-slate-50'} rounded-lg`}>
                <p className={`text-sm ${nightMode ? 'text-slate-400' : 'text-gray-600'}`}>
                  No testimony yet. Click the + button to add your testimony.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="px-4 pb-20">

        {/* Comments Section - Only show when testimony exists */}
        {profile?.story?.id && (
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
                      placeholder={profile?.story?.id ? 'Share your thoughts on this testimony...' : 'You can comment after adding a testimony.'}
                      className={`w-full px-4 py-3 rounded-xl border resize-none transition-all ${nightMode
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
                      disabled={isSubmittingComment || !profile?.story?.id}
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingComment || !profile?.story?.id || !newComment.trim()}
                      className={`mt-2 px-5 py-2 rounded-lg font-medium text-sm transition-all ${nightMode
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
                className={`mb-5 p-4 rounded-xl border-2 border-dashed text-center ${nightMode ? 'border-white/10 bg-white/5' : 'border-gray-300 bg-white/30'
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
        )}

        {/* Share Button - Only show when testimony exists */}
        {profile?.story?.id && (
          <button
            onClick={async () => {
              try {
                const testimonyUrl = `https://lightningsocial.io/testimony/${profile?.story?.id}`;
                const shareData = {
                  title: `${profile?.name || 'Someone'}'s Testimony on Lightning`,
                  text: 'Be encouraged by this testimony on Lightning ✨',
                  url: testimonyUrl
                };
                // Prefer Web Share API if available
                // @ts-ignore - navigator.share types vary across environments
                if (navigator?.share && typeof navigator.share === 'function') {
                  // @ts-ignore
                  await navigator.share(shareData);
                } else {
                  // Fallback to share modal
                  setShowShareModal(true);
                }
              } catch {
                // If user cancels or share fails, show share modal
                setShowShareModal(true);
              }
            }}
            className={`w-full mt-3 px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 text-sm transition-all duration-200 border cursor-pointer ${nightMode ? 'text-slate-100 border-white/20' : 'text-black border-white/30'}`}
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
                e.currentTarget.style.transform = 'translateY(-1px)';
              } else {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              if (nightMode) {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)';
                e.currentTarget.style.transform = 'translateY(0)';
              } else {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
            onMouseDown={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.transform = 'translateY(1px) scale(0.98)';
            }}
            onMouseUp={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.transform = 'translateY(-1px) scale(1)';
            }}
            aria-label="Share your testimony"
          >
            <Share2 className="w-4 h-4" />
            Share Testimony
          </button>
        )}
      </div>

      {/* Floating Action Button (FAB) for Add Testimony - Only show if user doesn't have testimony */}
      {onAddTestimony && !profile?.story?.id && (
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
