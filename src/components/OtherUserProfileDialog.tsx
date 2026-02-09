import React, { useState, useEffect } from 'react';
import { MapPin, MessageCircle, Flag, UserPlus, UserX, UserCheck, Users, ArrowLeft } from 'lucide-react';
import ReportContent from './ReportContent';
import { useUserProfile } from './useUserProfile';
import { sanitizeUserContent } from '../lib/sanitization';
import { sendFriendRequest, checkFriendshipStatus, blockUser, isUserBlocked, followUser, unfollowUser, isFollowing as checkIsFollowing, getFollowerCount, acceptFriendRequest, declineFriendRequest, getPendingFriendRequests, getUserById, getTestimonyByUserId, getChurchById } from '../lib/database';
import { showSuccess, showError } from '../lib/toast';
import ProfileCard from './ProfileCard';

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
  // Profile card fields
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

  // Fetch full profile data from DB so we can show the complete profile
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
          // Load church if user has one
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

        // Check if there's an incoming friend request from this user
        if (status === 'pending') {
          const pendingRequests = await getPendingFriendRequests(currentUserProfile.supabaseId);
          const incoming = pendingRequests.find((r: any) => r.user_id_1 === user.id);
          if (incoming) {
            setIncomingRequestId(incoming.id);
          }
        }

        // Check profile visibility
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
        style: {
          background: '#ef4444',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
        },
        iconTheme: {
          primary: '#fff',
          secondary: '#ef4444',
        }
      });
      // Close the dialog after blocking
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error blocking user:', error);
      showError('Failed to block user');
    } finally {
      setBlocking(false);
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Full-screen Profile View */}
      <div
        className={`fixed inset-0 z-50 overflow-hidden animate-in slide-in-from-right duration-300 ${nightMode ? 'bg-[#0a0a0a]' : 'bg-gradient-to-b from-purple-50 via-blue-50 to-pink-50'
          }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-title"
      >
        {/* Back Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 left-4 z-10 w-10 h-10 flex items-center justify-center rounded-full transition-colors ${nightMode ? 'bg-white/10 hover:bg-white/15 text-slate-100' : 'bg-black/5 hover:bg-black/10 text-black'
            }`}
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Scrollable Content */}
        <div className="h-full overflow-y-auto">
          <div className="p-6 space-y-4">
            {/* Profile Header */}
            <div className="flex flex-col items-center text-center pt-10">
              {(() => {
                const avatarImg = fullProfile?.avatar_url || user.avatarImage;
                const avatarEmoji = fullProfile?.avatar_emoji || user.avatar;
                const displayName = fullProfile?.display_name || user.displayName;
                const username = fullProfile?.username || user.username;
                const location = fullProfile?.location_city || user.location;
                return (
                  <>
                    <div
                      className={`w-28 h-28 rounded-full flex items-center justify-center text-6xl shadow-lg border-4 ${nightMode ? 'border-[#0a0a0a] bg-gradient-to-br from-sky-300 via-blue-400 to-blue-500' : 'border-white bg-gradient-to-br from-purple-400 to-pink-400'
                        } mb-4 overflow-hidden`}
                    >
                      {avatarImg ? (
                        <img src={avatarImg} alt={`${displayName}'s avatar`} className="w-full h-full object-cover" />
                      ) : (
                        avatarEmoji
                      )}
                    </div>

                    <h2 id="profile-title" className={`text-2xl font-bold ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                      {displayName}
                    </h2>
                    {username && (
                      <p className={`${nightMode ? 'text-slate-100' : 'text-black'} text-sm opacity-70 mt-1`}>@{username}</p>
                    )}

                    {/* Location */}
                    {location && (
                      <div className={`flex items-center justify-center gap-1.5 mt-2 ${nightMode ? 'text-slate-100' : 'text-black'} text-sm`}>
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{location}</span>
                      </div>
                    )}

                    {/* Distance (if available) */}
                    {user.distance && (
                      <div className={`flex items-center gap-1.5 mt-1 text-xs ${nightMode ? 'text-slate-100' : 'text-black'} opacity-60`}>
                        <MapPin className="w-3 h-3" />
                        <span>{user.distance} away</span>
                      </div>
                    )}

                    {/* Online Status */}
                    {user.online !== undefined && (
                      <div className={`flex items-center gap-2 mt-2 text-sm ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                        <div className={`w-2 h-2 rounded-full ${user.online ? 'bg-green-500' : 'bg-gray-400'}`} />
                        <span>{user.online ? 'Online' : 'Offline'}</span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Bio */}
            {(fullProfile?.bio || user.bio) && (
              <div className={`rounded-xl p-4 ${nightMode ? 'bg-white/5' : 'bg-white/40'}`}>
                <p className={`text-sm leading-relaxed whitespace-pre-wrap ${nightMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  {fullProfile?.bio || user.bio}
                </p>
              </div>
            )}

            {/* Profile Card (Faith Profile) */}
            {(() => {
              const bio = fullProfile?.bio || user.bio;
              const churchName = fullProfile?.church_name || user.churchName || church?.name;
              const churchLocation = fullProfile?.church_location || user.churchLocation || church?.location;
              const denomination = fullProfile?.denomination || user.denomination || church?.denomination;
              const yearSaved = fullProfile?.year_saved || user.yearSaved;
              const isBaptized = fullProfile?.is_baptized || user.isBaptized;
              const yearBaptized = fullProfile?.year_baptized || user.yearBaptized;
              const favoriteVerse = fullProfile?.favorite_verse || user.favoriteVerse;
              const favoriteVerseRef = fullProfile?.favorite_verse_ref || user.favoriteVerseRef;
              const faithInterests = fullProfile?.faith_interests || user.faithInterests;
              const spotifyUrl = fullProfile?.spotify_url || user.music?.spotifyUrl;
              const songName = (fullProfile as any)?.song_name || user.music?.trackName;
              const songArtist = (fullProfile as any)?.song_artist || user.music?.artist;

              const hasProfileCard = churchName || favoriteVerse || (faithInterests && faithInterests.length > 0) || yearSaved || spotifyUrl;
              if (!hasProfileCard) return null;

              return (
                <ProfileCard
                  nightMode={nightMode}
                  compact
                  hideStats
                  profile={{
                    churchName,
                    churchLocation,
                    denomination,
                    yearSaved,
                    isBaptized,
                    yearBaptized,
                    favoriteVerse,
                    favoriteVerseRef,
                    faithInterests,
                    music: spotifyUrl ? {
                      platform: 'youtube' as const,
                      trackName: songName || 'My Song',
                      artist: songArtist || '',
                      spotifyUrl,
                    } : user.music,
                    story: testimony ? {
                      id: testimony.id,
                      viewCount: testimony.view_count || 0,
                      likeCount: testimony.like_count || 0,
                    } : user.story ? {
                      id: user.story.id,
                      viewCount: 0,
                      likeCount: user.story.likeCount,
                    } : null,
                  }}
                />
              );
            })()}

            {/* Action Buttons */}
            <div className="flex gap-3 max-w-md mx-auto pt-2">
              {!isBlocked && (
                <button
                  onClick={() => onMessage(user)}
                  className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 text-slate-100 border ${nightMode ? 'border-white/20' : 'border-white/30'
                    }`}
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
                <div className={`flex-1 px-6 py-3 rounded-xl border text-center ${nightMode ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-white/50 border-white/30 text-slate-500'
                  }`}>
                  <UserX className="w-5 h-5 inline-block mr-2" />
                  <span className="text-sm font-medium">Blocked</span>
                </div>
              )}

              <button
                onClick={() => {
                  setReportData({ type: 'user', content: { id: user.id, name: user.displayName || user.username } });
                  setShowReport(true);
                }}
                className={`px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-2 border ${nightMode ? 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-red-400 border-white/10' : 'bg-white/80 hover:bg-red-50 text-slate-600 hover:text-red-600 border-white/30 shadow-md'
                  }`}
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

            {/* Follower count for public profiles */}
            {userProfileVisibility === 'public' && followerCount > 0 && (
              <div className={`flex items-center justify-center gap-1.5 py-1 text-xs ${nightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                <Users className="w-3 h-3" />
                {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
              </div>
            )}

            {/* Follow / Add Friend Buttons */}
            {!isBlocked && (
              <div className="flex gap-2">
                {/* Follow button for public profiles */}
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

                {/* Add Friend / Accept Request buttons */}
                {friendStatus === 'pending' && incomingRequestId ? (
                  // Incoming request — show Accept/Decline
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

            {/* Testimony Section — uses DB-fetched testimony, falls back to user.story */}
            {(() => {
              const storyContent = testimony?.content || user.story?.content;
              const storyTitle = testimony?.title || user.story?.title;
              const storyLesson = testimony?.lesson || user.story?.lesson;
              const storyId = testimony?.id || user.story?.id;
              if (!storyContent) return null;

              return (
                <>
                  {/* Dot connector */}
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

                  <div
                    className={`p-6 rounded-xl border ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/30 shadow-lg'}`}
                    style={
                      nightMode
                        ? {}
                        : {
                          background: 'rgba(255, 255, 255, 0.2)',
                          backdropFilter: 'blur(30px)',
                          WebkitBackdropFilter: 'blur(30px)',
                          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
                        }
                    }
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`text-xl font-bold ${nightMode ? 'text-slate-100' : 'text-black'} flex items-center gap-2`}>
                        <span>✨</span> {storyTitle || 'My Testimony'}
                      </h3>
                      {storyId && (
                        <button
                          onClick={() => {
                            setReportData({
                              type: 'testimony',
                              content: {
                                id: storyId,
                                ownerId: user.id,
                                name: storyTitle || 'Testimony'
                              }
                            });
                            setShowReport(true);
                          }}
                          className={`p-2 rounded-lg transition-colors ${nightMode
                            ? 'hover:bg-white/10 text-slate-400 hover:text-red-400'
                            : 'hover:bg-red-50 text-slate-500 hover:text-red-600'
                            }`}
                          aria-label="Report testimony"
                        >
                          <Flag className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p
                      className={`text-sm ${nightMode ? 'text-slate-100' : 'text-black'} leading-relaxed whitespace-pre-wrap`}
                      dangerouslySetInnerHTML={{ __html: sanitizeUserContent(storyContent) }}
                    />

                    {storyLesson && (
                      <div className={`mt-4 p-4 rounded-lg ${nightMode ? 'bg-white/5' : 'bg-blue-50/50'}`}>
                        <p className={`text-xs font-semibold ${nightMode ? 'text-slate-100' : 'text-slate-700'} mb-2 uppercase tracking-wider`}>
                          A Lesson Learned
                        </p>
                        <p
                          className={`text-sm ${nightMode ? 'text-slate-100' : 'text-black'} italic`}
                          dangerouslySetInnerHTML={{ __html: sanitizeUserContent(storyLesson) }}
                        />
                      </div>
                    )}
                  </div>
                </>
              );
            })()}

            {/* Mutual Friends */}
            {user.mutualFriends !== undefined && user.mutualFriends > 0 && (
              <div
                className={`p-4 rounded-xl border ${nightMode ? 'bg-white/5 border-white/10' : 'bg-white/50 border-white/30'}`}
                style={
                  nightMode
                    ? {}
                    : {
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)'
                    }
                }
              >
                <p className={`text-sm ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                  <span className="font-semibold">{user.mutualFriends}</span> mutual {user.mutualFriends === 1 ? 'friend' : 'friends'}
                </p>
              </div>
            )}
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
