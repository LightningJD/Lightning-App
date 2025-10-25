import React, { useState } from 'react';
import { X, MapPin, Heart, MessageCircle, Flag } from 'lucide-react';
import ReportContent from './ReportContent';
import { useUserProfile } from './useUserProfile';

const OtherUserProfileDialog = ({ user, onClose, nightMode, onMessage }) => {
  const { profile: currentUserProfile } = useUserProfile();
  const [showReport, setShowReport] = useState(false);

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
        className={`fixed inset-x-4 top-20 bottom-20 max-w-2xl mx-auto z-50 rounded-2xl overflow-hidden animate-in zoom-in-95 duration-300 ${
          nightMode ? 'bg-[#0a0a0a]' : 'bg-gradient-to-b from-purple-50 via-blue-50 to-pink-50'
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
          className={`absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
            nightMode ? 'bg-white/5 hover:bg-white/10 text-slate-100' : 'bg-white/50 hover:bg-white/70 text-black'
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
                className={`w-28 h-28 rounded-full flex items-center justify-center text-6xl shadow-lg border-4 ${
                  nightMode ? 'border-[#0a0a0a] bg-gradient-to-br from-sky-300 via-blue-400 to-blue-500' : 'border-white bg-gradient-to-br from-purple-400 to-pink-400'
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
                <p className={`${nightMode ? 'text-slate-100' : 'text-black'} mt-4 text-sm leading-relaxed max-w-md`}>
                  {user.bio}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 max-w-md mx-auto pt-2">
              <button
                onClick={() => onMessage(user)}
                className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 text-slate-100 border ${
                  nightMode ? 'border-white/20' : 'border-white/30'
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

              <button
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 border ${
                  nightMode ? 'bg-white/5 hover:bg-white/10 text-slate-100 border-white/10' : 'bg-white/80 text-black border-white/30 shadow-md'
                }`}
                aria-label={`Like ${user.displayName}'s profile`}
              >
                <Heart className="w-5 h-5" />
                Like
              </button>

              <button
                onClick={() => setShowReport(true)}
                className={`px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-2 border ${
                  nightMode ? 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-red-400 border-white/10' : 'bg-white/80 hover:bg-red-50 text-slate-600 hover:text-red-600 border-white/30 shadow-md'
                }`}
                aria-label={`Report ${user.displayName}`}
              >
                <Flag className="w-5 h-5" />
              </button>
            </div>

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
                <h3 className={`text-xl font-bold ${nightMode ? 'text-slate-100' : 'text-black'} flex items-center gap-2 mb-3`}>
                  <span>✨</span> {user.story.title || 'My Testimony'}
                </h3>
                <p className={`text-sm ${nightMode ? 'text-slate-100' : 'text-black'} leading-relaxed whitespace-pre-wrap`}>
                  {user.story.content}
                </p>

                {user.story.lesson && (
                  <div className={`mt-4 p-4 rounded-lg ${nightMode ? 'bg-white/5' : 'bg-blue-50/50'}`}>
                    <p className={`text-xs font-semibold ${nightMode ? 'text-slate-100' : 'text-slate-700'} mb-2 uppercase tracking-wider`}>
                      A Lesson Learned
                    </p>
                    <p className={`text-sm ${nightMode ? 'text-slate-100' : 'text-black'} italic`}>{user.story.lesson}</p>
                  </div>
                )}
              </div>
            )}

            {/* Mutual Friends */}
            {user.mutualFriends > 0 && (
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
      <ReportContent
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        nightMode={nightMode}
        userProfile={currentUserProfile}
        reportType="user"
        reportedContent={{
          id: user.id,
          name: user.displayName || user.username
        }}
      />
    </>
  );
};

export default OtherUserProfileDialog;
