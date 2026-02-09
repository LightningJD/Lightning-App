import React, { useState, useEffect } from 'react';
import { MessageCircle, Flag, UserPlus, UserX, UserCheck, Users, ArrowLeft } from 'lucide-react';
import ReportContent from './ReportContent';
import { useUserProfile } from './useUserProfile';
import { sendFriendRequest, checkFriendshipStatus, blockUser, isUserBlocked, followUser, unfollowUser, isFollowing as checkIsFollowing, getFollowerCount, acceptFriendRequest, declineFriendRequest, getPendingFriendRequests, getUserById, getTestimonyByUserId, getChurchById } from '../lib/database';
import { showSuccess, showError } from '../lib/toast';
import ProfileTab from './ProfileTab';

interface UserStory {
  id: string;
  title?: string;
  content: string;
  lesson?: string;
  likeCount?: number;
}

interface User {
  id: string;
  displayName?: string;
  display_name?: string;
  username?: string;
  avatar?: string;
  avatarImage?: string;
  avatar_url?: string;
  avatar_emoji?: string;
  location?: string;
  location_city?: string;
  distance?: string;
  online?: boolean;
  is_online?: boolean;
  bio?: string;
  story?: UserStory;
  mutualFriends?: number;
  music?: {
    platform?: 'spotify' | 'youtube';
    spotifyUrl?: string;
    trackName?: string;
    artist?: string;
  };
  churchName?: string;
  churchLocation?: string;
  denomination?: string;
  yearSaved?: number;
  isBaptized?: boolean;
  yearBaptized?: number;
  favoriteVerse?: string;
  favoriteVerseRef?: string;
  faithInterests?: string[];
  entryNumber?: number;
}

interface ReportData {
  type: 'user' | 'testimony';
  content: {
    id: string;
    ownerId?: string;
    name?: string;
  };
}

interface OtherUserProfileDialogProps {
  user: User | null;
  onClose: () => void;
  nightMode: boolean;
  onMessage: (user: User) => void;
}

const OtherUserProfileDialog: React.FC<OtherUserProfileDialogProps> = ({
  user: rawUser,
  onClose,
  nightMode,
  onMessage
}) => {
  // Normalize user fields — database uses snake_case, components use camelCase
  const user = React.useMemo(() => {
    if (!rawUser) return null;
    return {
      ...rawUser,
      displayName: rawUser.displayName || rawUser.display_name || rawUser.username || 'User',
      avatarImage: rawUser.avatarImage || rawUser.avatar_url,
      avatar: rawUser.avatar || rawUser.avatar_emoji || '👤',
      online: rawUser.online ?? rawUser.is_online ?? false,
      location: rawUser.location || rawUser.location_city,
    };
  }, [rawUser]);

  const { profile: currentUserProfile } = useUserProfile();
  const [showReport, setShowReport] = useState<boolean>(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'accepted' | 'rejected'>('none');
  const [incomingRequestId, setIncomingRequestId] = useState<string | null>(null);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [blocking, setBlocking] = useState<boolean>(false);
  const [following, setFollowing] = useState<boolean>(false);
  const [followerCount, setFollowerCount] = useState<number>(0);
  const [isTogglingFollow, setIsTogglingFollow] = useState<boolean>(false);
  const [userProfileVisibility, setUserProfileVisibility] = useState<string>('private');
  const [fullProfile, setFullProfile] = useState<any>(null);
  const [testimony, setTestimony] = useState<any>(null);
  const [church, setChurch] = useState<any>(null);

  // Fetch full profile data from DB
  useEffect(() => {
    const loadFullProfile = async () => {
      if (!user?.id) return;
      try {
        const [dbUser, userTestimony] = await Promise.all([
          getUserById(user.id),
          getTestimonyByUserId(user.id),
        ]);
        if (dbUser) {
          setFullProfile(dbUser);
          if ((dbUser as any).church_id) {
            const churchData = await getChurchById((dbUser as any).church_id);
            if (churchData) setChurch(churchData);
          }
        }
        if (userTestimony) setTestimony(userTestimony);
      } catch (err) {
        console.error('Error loading full profile:', err);
      }
    };
    loadFullProfile();
  }, [user?.id]);

  // Check friendship status, block status, and follow status
  React.useEffect(() => {
    const checkStatus = async () => {
      if (currentUserProfile?.supabaseId && user?.id) {
        const [status, blocked, isFollowingUser, followers] = await Promise.all([
          checkFriendshipStatus(currentUserProfile.supabaseId, user.id),
          isUserBlocked(currentUserProfile.supabaseId, user.id),
          checkIsFollowing(currentUserProfile.supabaseId, user.id),
          getFollowerCount(user.id)
        ]);
        setFriendStatus(status || 'none');
        setIsBlocked(blocked);
        setFollowing(isFollowingUser);
        setFollowerCount(followers);

        if (status === 'pending') {
          const pendingRequests = await getPendingFriendRequests(currentUserProfile.supabaseId);
          const incoming = pendingRequests.find((r: any) => r.user_id_1 === user.id);
          if (incoming) {
            setIncomingRequestId(incoming.id);
          }
        }

        const { supabase } = await import('../lib/supabase');
        if (supabase) {
          const { data } = await supabase.from('users').select('profile_visibility').eq('id', user.id).single();
          if (data) setUserProfileVisibility((data as any).profile_visibility || 'private');
        }
      }
    };
    checkStatus();
  }, [currentUserProfile?.supabaseId, user?.id]);

  const handleToggleFollow = async () => {
    if (!currentUserProfile?.supabaseId || !user?.id) return;
    setIsTogglingFollow(true);
    try {
      if (following) {
        await unfollowUser(currentUserProfile.supabaseId, user.id);
        setFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
        showSuccess(`Unfollowed ${user.displayName}`);
      } else {
        await followUser(currentUserProfile.supabaseId, user.id);
        setFollowing(true);
        setFollowerCount(prev => prev + 1);
        showSuccess(`Following ${user.displayName}!`);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      showError('Failed to update follow status');
    } finally {
      setIsTogglingFollow(false);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!currentUserProfile?.supabaseId || !user?.id) return;
    setSendingRequest(true);
    try {
      await sendFriendRequest(currentUserProfile.supabaseId, user.id);
      setFriendStatus('pending');
      showSuccess(`Friend request sent to ${user.displayName}!`);
    } catch (error) {
      console.error('Error sending friend request:', error);
      showError('Failed to send friend request');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleBlockUser = async () => {
    if (!currentUserProfile?.supabaseId || !user?.id) return;
    const confirmMessage = `Block ${user.displayName || user.username}? They won't be able to message you, see your profile, or find you in searches.`;
    if (!window.confirm(confirmMessage)) return;
    setBlocking(true);
    try {
      await blockUser(currentUserProfile.supabaseId, user.id);
      setIsBlocked(true);
      showSuccess(`${user.displayName || user.username} has been blocked`, {
        style: { background: '#ef4444', color: '#fff', padding: '12px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' },
        iconTheme: { primary: '#fff', secondary: '#ef4444' }
      });
      setTimeout(() => onClose(), 1500);
    } catch (error) {
      console.error('Error blocking user:', error);
      showError('Failed to block user');
    } finally {
      setBlocking(false);
    }
  };

  if (!user) return null;

  // Build a profile object that matches what ProfileTab expects
  // This is the key — we reuse the exact same component as the You page
  const profileForTab = React.useMemo(() => {
    const fp = fullProfile || {};
    return {
      // Identity
      supabaseId: user.id,
      username: fp.username || user.username || user.displayName,
      displayName: fp.display_name || user.displayName,
      avatar: fp.avatar_emoji || user.avatar,
      avatarImage: fp.avatar_url || user.avatarImage,
      location: fp.location_city || user.location,
      // Bio — hide default placeholder
      bio: (() => {
        const bio = fp.bio || user.bio;
        const defaultBio = 'Welcome to Lightning! Share your testimony to inspire others.';
        return bio && bio !== defaultBio ? bio : undefined;
      })(),
      // Faith profile
      churchName: fp.church_name || user.churchName || church?.name,
      churchLocation: fp.church_location || user.churchLocation || church?.location,
      denomination: fp.denomination || user.denomination || church?.denomination,
      yearSaved: fp.year_saved || user.yearSaved,
      isBaptized: fp.is_baptized || user.isBaptized,
      yearBaptized: fp.year_baptized || user.yearBaptized,
      favoriteVerse: fp.favorite_verse || user.favoriteVerse,
      favoriteVerseRef: fp.favorite_verse_ref || user.favoriteVerseRef,
      faithInterests: fp.faith_interests || user.faithInterests,
      // Music
      music: fp.spotify_url ? {
        platform: 'youtube' as const,
        spotifyUrl: fp.spotify_url,
        trackName: fp.song_name || 'My Song',
        artist: fp.song_artist || '',
      } : user.music,
      // Testimony
      story: testimony ? {
        id: testimony.id,
        title: testimony.title,
        content: testimony.content,
        lesson: testimony.lesson,
        viewCount: testimony.view_count || 0,
        likeCount: testimony.like_count || 0,
      } : user.story ? {
        id: user.story.id,
        title: user.story.title,
        content: user.story.content,
        lesson: user.story.lesson,
        viewCount: 0,
        likeCount: user.story.likeCount || 0,
      } : undefined,
      // Church object (only for display, not for leave/manage features)
      church: church || undefined,
    };
  }, [user, fullProfile, testimony, church]);

  // App theme gradients (match AppLayout)
  const darkGradient = `linear-gradient(135deg, rgba(17, 24, 39, 0.42) 0%, transparent 100%),
                        radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.035) 0%, transparent 60%),
                        linear-gradient(45deg, #0a0a0a 0%, #15121c 50%, #191e27 100%)`;
  const lightGradient = `linear-gradient(135deg, rgba(219, 234, 254, 0.63) 0%, transparent 100%),
                         radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.175) 0%, transparent 60%),
                         linear-gradient(45deg, #E8F3FE 0%, #EAE5FE 50%, #D9CDFE 100%)`;

  return (
    <>
      {/* Full-screen profile — matches app layout exactly */}
      <div
        className="fixed inset-0 z-[35] flex flex-col animate-in slide-in-from-right duration-300"
        style={{ background: nightMode ? darkGradient : lightGradient }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-title"
      >
        {/* Header — matches app header style */}
        <div className={`flex-shrink-0 backdrop-blur-xl border-b ${nightMode ? 'bg-black/10 border-white/10' : 'bg-white/10 border-white/20'}`}>
          <div className="px-5 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <button
                onClick={onClose}
                className={`flex items-center gap-1.5 -ml-1 py-1 rounded-lg transition-colors ${nightMode ? 'text-slate-100 hover:text-white' : 'text-black hover:text-black/80'}`}
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-semibold text-xl">Back</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable content — reuses the actual ProfileTab component */}
        <div className="flex-1 overflow-y-auto pb-16">
          {/* The exact same ProfileTab used on the You page */}
          <ProfileTab
            profile={profileForTab}
            nightMode={nightMode}
            currentUserProfile={currentUserProfile}
            // No onAddTestimony or onEditTestimony — those are owner-only
          />

          {/* Action buttons — unique to viewing someone else's profile */}
          <div className="px-4 -mt-16 space-y-3">
            {/* Message + Report + Block row */}
            <div className="flex gap-3 max-w-md mx-auto">
              {!isBlocked && (
                <button
                  onClick={() => onMessage(user)}
                  className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 text-slate-100 border ${nightMode ? 'border-white/20' : 'border-white/30'}`}
                  style={{
                    background: 'linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)',
                    boxShadow: nightMode
                      ? '0 4px 12px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                      : '0 4px 12px rgba(59, 130, 246, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                  }}
                  aria-label={`Send message to ${user.displayName}`}
                >
                  <MessageCircle className="w-5 h-5" />
                  Message
                </button>
              )}

              {isBlocked && (
                <div className={`flex-1 px-6 py-3 rounded-xl border text-center ${nightMode ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-white/50 border-white/30 text-slate-500'}`}>
                  <UserX className="w-5 h-5 inline-block mr-2" />
                  <span className="text-sm font-medium">Blocked</span>
                </div>
              )}

              <button
                onClick={() => {
                  setReportData({ type: 'user', content: { id: user.id, name: user.displayName || user.username } });
                  setShowReport(true);
                }}
                className={`px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-2 border ${nightMode ? 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-red-400 border-white/10' : 'bg-white/80 hover:bg-red-50 text-slate-600 hover:text-red-600 border-white/30 shadow-md'}`}
                aria-label={`Report ${user.displayName}`}
                title={`Report ${user.displayName}`}
              >
                <Flag className="w-5 h-5" />
              </button>

              {!isBlocked && (
                <button
                  onClick={handleBlockUser}
                  disabled={blocking}
                  className={`px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-2 border ${nightMode
                    ? 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-red-400 border-white/10'
                    : 'bg-white/80 hover:bg-red-50 text-slate-600 hover:text-red-600 border-white/30 shadow-md'
                    } ${blocking ? 'opacity-50 cursor-not-allowed' : ''}`}
                  aria-label={`Block ${user.displayName}`}
                  title={`Block ${user.displayName}`}
                >
                  <UserX className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Follower count */}
            {userProfileVisibility === 'public' && followerCount > 0 && (
              <div className={`flex items-center justify-center gap-1.5 py-1 text-xs ${nightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                <Users className="w-3 h-3" />
                {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
              </div>
            )}

            {/* Follow / Add Friend row */}
            {!isBlocked && (
              <div className="flex gap-2">
                {userProfileVisibility === 'public' && (
                  <button
                    onClick={handleToggleFollow}
                    disabled={isTogglingFollow}
                    className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 border ${
                      following
                        ? nightMode ? 'border-blue-500/30 bg-blue-500/10' : 'border-blue-300 bg-blue-50'
                        : nightMode ? 'border-white/20' : 'border-white/30'
                    } ${isTogglingFollow ? 'opacity-50' : ''}`}
                    style={!following ? (nightMode ? {
                      background: 'linear-gradient(135deg, rgba(79, 150, 255, 0.15) 0%, rgba(79, 150, 255, 0.05) 100%)',
                      boxShadow: '0 1px 4px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    } : {
                      background: 'rgba(59, 130, 246, 0.08)',
                      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
                    }) : {}}
                  >
                    {following ? (
                      <UserCheck className={`w-4 h-4 ${nightMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    ) : (
                      <UserPlus className={`w-4 h-4 ${nightMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    )}
                    <span className={nightMode ? 'text-blue-400' : 'text-blue-600'}>
                      {following ? 'Following' : 'Follow'}
                    </span>
                  </button>
                )}

                {friendStatus === 'pending' && incomingRequestId ? (
                  <div className={`${userProfileVisibility === 'public' ? 'flex-1' : 'w-full'} flex gap-2`}>
                    <button
                      onClick={async () => {
                        setSendingRequest(true);
                        const result = await acceptFriendRequest(incomingRequestId);
                        if (result) {
                          setFriendStatus('accepted');
                          setIncomingRequestId(null);
                          showSuccess(`You and ${user.displayName} are now friends!`);
                        } else {
                          showError('Failed to accept request');
                        }
                        setSendingRequest(false);
                      }}
                      disabled={sendingRequest}
                      className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 ${
                        nightMode
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                    >
                      <UserCheck className="w-5 h-5" />
                      Accept
                    </button>
                    <button
                      onClick={async () => {
                        setSendingRequest(true);
                        await declineFriendRequest(incomingRequestId);
                        setFriendStatus('none');
                        setIncomingRequestId(null);
                        setSendingRequest(false);
                      }}
                      disabled={sendingRequest}
                      className={`px-4 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 border ${
                        nightMode
                          ? 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      <UserX className="w-5 h-5" />
                      Decline
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleSendFriendRequest}
                    disabled={friendStatus !== 'none' || sendingRequest}
                    className={`${userProfileVisibility === 'public' ? 'flex-1' : 'w-full'} px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 border ${nightMode ? 'border-white/20' : 'border-white/30'
                      } ${friendStatus !== 'none' || sendingRequest ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                    aria-label={`Add ${user.displayName} as friend`}
                  >
                    <UserPlus className={`w-5 h-5 ${nightMode ? 'text-slate-100' : 'text-slate-900'}`} />
                    <span className={nightMode ? 'text-slate-100' : 'text-slate-900'}>
                      {friendStatus === 'accepted' ? 'Friends' : friendStatus === 'pending' ? 'Pending' : sendingRequest ? 'Sending...' : 'Add Friend'}
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* Bottom spacing for nav bar */}
            <div className="h-4" />
          </div>
        </div>
      </div>

      {/* Report Content Dialog */}
      {reportData && (
        <ReportContent
          isOpen={showReport}
          onClose={() => {
            setShowReport(false);
            setReportData(null);
          }}
          nightMode={nightMode}
          userProfile={currentUserProfile}
          reportType={reportData.type}
          reportedContent={reportData.content}
        />
      )}
    </>
  );
};

export default OtherUserProfileDialog;
