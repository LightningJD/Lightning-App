import React, { useState } from 'react';
import { X, MapPin, MessageCircle, Flag, UserPlus, Heart, UserX } from 'lucide-react';
import ReportContent from './ReportContent';
import { useUserProfile } from './useUserProfile';
import { sanitizeUserContent } from '../lib/sanitization';
import { sendFriendRequest, checkFriendshipStatus, blockUser, isUserBlocked } from '../lib/database';
import { showSuccess, showError } from '../lib/toast';
import MusicPlayer from './MusicPlayer';
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
  username?: string;
  avatar?: string;
  avatarImage?: string;
  location?: string;
  distance?: string;
  online?: boolean;
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
  user,
  onClose,
  nightMode,
  onMessage
}) => {
  const { profile: currentUserProfile } = useUserProfile();
  const [showReport, setShowReport] = useState<boolean>(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'accepted' | 'rejected'>('none');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [blocking, setBlocking] = useState<boolean>(false);

  // Check friendship status and block status
  React.useEffect(() => {
    const checkStatus = async () => {
      if (currentUserProfile?.supabaseId && user?.id) {
        const [status, blocked] = await Promise.all([
          checkFriendshipStatus(currentUserProfile.supabaseId, user.id),
          isUserBlocked(currentUserProfile.supabaseId, user.id)
        ]);
        setFriendStatus(status || 'none');
        setIsBlocked(blocked);
      }
    };
    checkStatus();
  }, [currentUserProfile?.supabaseId, user?.id]);

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
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
        onClick={onClose}
        aria-label="Close dialog"
      />

      {/* Dialog */}
      <div
        className={`fixed inset-x-4 top-20 bottom-20 max-w-2xl mx-auto z-50 rounded-2xl overflow-hidden animate-in zoom-in-95 duration-300 ${nightMode ? 'bg-[#0a0a0a]' : 'bg-gradient-to-b from-purple-50 via-blue-50 to-pink-50'
          }`}
        style={{
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)'
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-title"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full transition-colors ${nightMode ? 'bg-white/5 hover:bg-white/10 text-slate-100' : 'bg-white/50 hover:bg-white/70 text-black'
            }`}
          aria-label="Close profile"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Content */}
        <div className="h-full overflow-y-auto">
          <div className="p-6 space-y-4">
            {/* Profile Header */}
            <div className="flex flex-col items-center text-center pt-4">
              <div
                className={`w-28 h-28 rounded-full flex items-center justify-center text-6xl shadow-lg border-4 ${nightMode ? 'border-[#0a0a0a] bg-gradient-to-br from-sky-300 via-blue-400 to-blue-500' : 'border-white bg-gradient-to-br from-purple-400 to-pink-400'
                  } mb-4 overflow-hidden`}
              >
                {user.avatarImage ? (
                  <img src={user.avatarImage} alt={`${user.displayName}'s avatar`} className="w-full h-full object-cover" />
                ) : (
                  user.avatar
                )}
              </div>

              <h2 id="profile-title" className={`text-2xl font-bold ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                {user.displayName}
              </h2>
              <p className={`${nightMode ? 'text-slate-100' : 'text-black'} text-sm opacity-70 mt-1`}>@{user.username}</p>

              {/* Location */}
              {user.location && (
                <div className={`flex items-center justify-center gap-1.5 mt-2 ${nightMode ? 'text-slate-100' : 'text-black'} text-sm`}>
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{user.location}</span>
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

              {/* Bio */}
              {user.bio && (
                <p
                  className={`${nightMode ? 'text-slate-100' : 'text-black'} mt-4 text-sm leading-relaxed max-w-md`}
                  dangerouslySetInnerHTML={{ __html: sanitizeUserContent(user.bio) }}
                />
              )}
            </div>

            {/* Profile Card (Pokédex V15+V11) */}
            {(user.churchName || user.favoriteVerse || (user.faithInterests && user.faithInterests.length > 0) || user.yearSaved) && (
              <ProfileCard
                nightMode={nightMode}
                compact
                hideStats
                profile={{
                  churchName: user.churchName,
                  churchLocation: user.churchLocation,
                  denomination: user.denomination,
                  yearSaved: user.yearSaved,
                  isBaptized: user.isBaptized,
                  yearBaptized: user.yearBaptized,
                  favoriteVerse: user.favoriteVerse,
                  favoriteVerseRef: user.favoriteVerseRef,
                  faithInterests: user.faithInterests,
                  story: user.story ? {
                    id: user.story.id,
                    viewCount: 0,
                    likeCount: user.story.likeCount,
                  } : null,
                }}
              />
            )}

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

            {/* Music Player + Stats Row */}
            {user.music && user.music.spotifyUrl && (
              <div className="flex gap-3 mt-6">
                {/* Music Player - Left Half */}
                <div className="flex-1">
                  <MusicPlayer
                    platform={user.music.platform || 'youtube'}
                    url={user.music.spotifyUrl}
                    trackName={user.music.trackName}
                    artist={user.music.artist}
                    nightMode={nightMode}
                  />
                </div>

                {/* Stats & Actions - Right Half */}
                <div className="flex-1 flex flex-col gap-3">
                  {/* Add Friend Button */}
                  <button
                    onClick={handleSendFriendRequest}
                    disabled={friendStatus !== 'none' || sendingRequest}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 border ${nightMode ? 'border-white/20' : 'border-white/30'
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

                  {/* Testimony Likes */}
                  {user.story && (
                    <div
                      className={`px-6 py-3 rounded-xl border ${nightMode ? 'border-white/20' : 'border-white/30'} flex items-center justify-center gap-2`}
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
                      <Heart className={`w-5 h-5 ${nightMode ? 'text-red-400' : 'text-red-500'}`} fill="currentColor" />
                      <span className={`text-lg font-semibold ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>
                        {user.story.likeCount || 0}
                      </span>
                      <span className={`text-sm ${nightMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {(user.story.likeCount || 0) === 1 ? 'Like' : 'Likes'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Testimony Section */}
            {user.story && user.story.content && (
              <div
                className={`p-6 rounded-xl border mt-6 ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/30 shadow-lg'}`}
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
                    <span>✨</span> {user.story.title || 'My Testimony'}
                  </h3>
                  <button
                    onClick={() => {
                      if (user.story) {
                        setReportData({
                          type: 'testimony',
                          content: {
                            id: user.story.id,
                            ownerId: user.id,
                            name: user.story.title || 'Testimony'
                          }
                        });
                        setShowReport(true);
                      }
                    }}
                    className={`p-2 rounded-lg transition-colors ${nightMode
                      ? 'hover:bg-white/10 text-slate-400 hover:text-red-400'
                      : 'hover:bg-red-50 text-slate-500 hover:text-red-600'
                      }`}
                    aria-label="Report testimony"
                  >
                    <Flag className="w-4 h-4" />
                  </button>
                </div>
                <p
                  className={`text-sm ${nightMode ? 'text-slate-100' : 'text-black'} leading-relaxed whitespace-pre-wrap`}
                  dangerouslySetInnerHTML={{ __html: sanitizeUserContent(user.story.content) }}
                />

                {user.story.lesson && (
                  <div className={`mt-4 p-4 rounded-lg ${nightMode ? 'bg-white/5' : 'bg-blue-50/50'}`}>
                    <p className={`text-xs font-semibold ${nightMode ? 'text-slate-100' : 'text-slate-700'} mb-2 uppercase tracking-wider`}>
                      A Lesson Learned
                    </p>
                    <p
                      className={`text-sm ${nightMode ? 'text-slate-100' : 'text-black'} italic`}
                      dangerouslySetInnerHTML={{ __html: sanitizeUserContent(user.story.lesson) }}
                    />
                  </div>
                )}
              </div>
            )}

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
