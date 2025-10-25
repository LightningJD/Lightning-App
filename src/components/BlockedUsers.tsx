import React, { useState, useEffect } from 'react';
import { X, UserX, AlertCircle, Loader } from 'lucide-react';
import { getBlockedUsers, unblockUser } from '../lib/database';
import { showSuccess, showError } from '../lib/toast';

const BlockedUsers = ({ isOpen, onClose, nightMode, userProfile }) => {
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState(null);

  useEffect(() => {
    if (isOpen && userProfile) {
      loadBlockedUsers();
    }
  }, [isOpen, userProfile]);

  const loadBlockedUsers = async () => {
    if (!userProfile?.supabaseId) return;

    setLoading(true);
    try {
      const blocked = await getBlockedUsers(userProfile.supabaseId);
      setBlockedUsers(blocked);
    } catch (error) {
      console.error('Error loading blocked users:', error);
      showError('Failed to load blocked users');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (blockedUser) => {
    if (!userProfile?.supabaseId || !blockedUser.user?.id) return;

    setUnblocking(blockedUser.user.id);
    try {
      await unblockUser(userProfile.supabaseId, blockedUser.user.id);

      // Remove from local state
      setBlockedUsers(prev => prev.filter(bu => bu.user.id !== blockedUser.user.id));

      showSuccess(`Unblocked ${blockedUser.user.username || blockedUser.user.full_name}`);
    } catch (error) {
      console.error('Error unblocking user:', error);
      showError('Failed to unblock user');
    } finally {
      setUnblocking(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`w-full max-w-lg max-h-[85vh] rounded-2xl shadow-2xl pointer-events-auto overflow-hidden ${
            nightMode
              ? 'bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10'
              : 'bg-white border border-slate-200'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`flex items-center justify-between px-6 py-4 border-b ${
            nightMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'
          }`}>
            <div className="flex items-center gap-3">
              <UserX className={`w-5 h-5 ${nightMode ? 'text-red-400' : 'text-red-500'}`} />
              <h2 className={`text-lg font-semibold ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>
                Blocked Users
              </h2>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                nightMode
                  ? 'hover:bg-white/10 text-slate-100'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(85vh-80px)]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader className={`w-8 h-8 animate-spin ${nightMode ? 'text-blue-400' : 'text-blue-500'}`} />
                <p className={`mt-3 text-sm ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Loading blocked users...
                </p>
              </div>
            ) : blockedUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6">
                <div className={`p-4 rounded-full ${nightMode ? 'bg-white/5' : 'bg-slate-100'} mb-4`}>
                  <UserX className={`w-8 h-8 ${nightMode ? 'text-slate-500' : 'text-slate-400'}`} />
                </div>
                <h3 className={`text-lg font-semibold ${nightMode ? 'text-slate-100' : 'text-slate-900'} mb-2`}>
                  No Blocked Users
                </h3>
                <p className={`text-sm text-center ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  You haven't blocked anyone yet. Blocked users won't be able to message you or see your profile.
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {/* Info Banner */}
                <div className={`flex items-start gap-3 p-3 rounded-lg ${
                  nightMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'
                }`}>
                  <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${nightMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  <div>
                    <p className={`text-sm font-medium ${nightMode ? 'text-blue-300' : 'text-blue-900'}`}>
                      About Blocking
                    </p>
                    <p className={`text-xs mt-1 ${nightMode ? 'text-blue-400' : 'text-blue-700'}`}>
                      Blocked users can't message you, see your profile, or find you in searches.
                    </p>
                  </div>
                </div>

                {/* Blocked Users List */}
                {blockedUsers.map((blockedUser) => {
                  const user = blockedUser.user;
                  if (!user) return null;

                  return (
                    <div
                      key={blockedUser.blockId}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                        nightMode
                          ? 'bg-white/5 border-white/10 hover:bg-white/10'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {/* User Info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.username || user.full_name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                              nightMode ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white' : 'bg-gradient-to-br from-blue-400 to-purple-500 text-white'
                            }`}>
                              {(user.username || user.full_name || 'U')[0].toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Name & Details */}
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold truncate ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>
                            {user.username || user.full_name || 'Unknown User'}
                          </p>
                          {user.username && user.full_name && (
                            <p className={`text-sm truncate ${nightMode ? 'text-slate-400' : 'text-slate-600'}`}>
                              {user.full_name}
                            </p>
                          )}
                          <p className={`text-xs ${nightMode ? 'text-slate-500' : 'text-slate-500'}`}>
                            Blocked {formatDate(blockedUser.blockedAt)}
                          </p>
                        </div>
                      </div>

                      {/* Unblock Button */}
                      <button
                        onClick={() => handleUnblock(blockedUser)}
                        disabled={unblocking === user.id}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex-shrink-0 ml-3 ${
                          unblocking === user.id
                            ? nightMode
                              ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : nightMode
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                      >
                        {unblocking === user.id ? (
                          <div className="flex items-center gap-2">
                            <Loader className="w-4 h-4 animate-spin" />
                            <span>Unblocking...</span>
                          </div>
                        ) : (
                          'Unblock'
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default BlockedUsers;
