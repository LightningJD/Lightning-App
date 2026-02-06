import React from 'react';
import { MapPin, Heart, UserPlus, Clock } from 'lucide-react';

interface UserCardProps {
  user: any;
  showReason: boolean;
  isFriend: boolean;
  nightMode: boolean;
  onViewProfile?: (user: any) => void;
  onMessage?: (user: any) => void;
  onAddFriend?: (userId: string) => void;
  onUnfriend?: (userId: string) => void;
}

const UserCard: React.FC<UserCardProps> = ({ user, showReason, isFriend, nightMode, onViewProfile, onMessage, onAddFriend, onUnfriend }) => {
  return (
    <div
      className={`p-4 rounded-xl border transition-all duration-300 hover:-translate-y-1 ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)]'}`}
      style={nightMode ? {} : {
        background: 'rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
      }}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => onViewProfile && onViewProfile(user)}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl relative flex-shrink-0 overflow-hidden ${
            nightMode
              ? 'bg-gradient-to-br from-sky-300 via-blue-400 to-blue-500 text-white'
              : 'bg-gradient-to-br from-purple-400 to-pink-400 text-white'
          } transition-transform hover:scale-105 cursor-pointer`}
          aria-label={`View ${user.displayName}'s profile`}
        >
          {user.avatarImage ? (
            <img src={user.avatarImage} alt={user.displayName} className="w-full h-full object-cover" />
          ) : (
            user.avatar
          )}
          {user.online && (
            <div className={`absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 ${nightMode ? 'border-[#0a0a0a]' : 'border-white'}`}></div>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onViewProfile && onViewProfile(user)}
              className={`font-semibold ${nightMode ? 'text-slate-100 hover:text-blue-400' : 'text-black hover:text-blue-600'} transition-colors cursor-pointer text-left`}
              aria-label={`View ${user.displayName}'s profile`}
            >
              {user.displayName}
            </button>
          </div>
          <p className={`text-sm ${nightMode ? 'text-slate-100' : 'text-black'}`}>@{user.username}</p>
          <div className="flex items-center gap-1.5 mt-1.5 text-[11px]">
            {user.distance && !isNaN(parseFloat(user.distance)) && (
              <div className={`flex items-center gap-0.5 ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                <MapPin className="w-3 h-3" />
                <span>{Math.floor(parseFloat(user.distance))} mi</span>
              </div>
            )}
            {showReason && user.reason && !user.reason.toLowerCase().includes('similar interests') && (
              <span className={`${nightMode ? 'text-slate-100' : 'text-black'} text-[10px] font-medium`}>
                • {user.reason.replace(' friends', '').replace(' friend', '')}
              </span>
            )}
            {!showReason && user.mutualFriends > 0 && (
              <span className={`${nightMode ? 'text-slate-100' : 'text-black'} text-[10px] font-medium`}>• {user.mutualFriends} mutual</span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0">
          {!isFriend ? (
            user.friendshipStatus === 'pending' ? (
              <button
                disabled
                className={`px-4 py-2 text-xs rounded-lg font-semibold transition-all duration-200 border cursor-not-allowed opacity-60 flex items-center gap-1 ${nightMode ? 'bg-white/5 text-slate-100 border-white/10' : 'text-black shadow-md border-white/30'}`}
                style={nightMode ? {} : {
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)'
                }}
              >
                <Clock className="w-3 h-3" />
                Pending
              </button>
            ) : (
              <button
                onClick={() => onAddFriend && onAddFriend(user.id)}
                className={`px-4 py-2 text-xs rounded-lg font-semibold transition-all duration-200 border text-slate-100 flex items-center gap-1 ${nightMode ? 'border-white/20' : 'border-white/30'}`}
                style={{
                  background: 'rgba(79, 150, 255, 0.85)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(79, 150, 255, 1.0)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(79, 150, 255, 0.85)';
                }}
              >
                <UserPlus className="w-3 h-3" />
                Add
              </button>
            )
          ) : (
            <button
              onClick={() => onUnfriend && onUnfriend(user.id)}
              className={`px-4 py-2 text-xs rounded-lg font-semibold transition-all duration-200 flex items-center gap-1 border ${nightMode ? 'bg-white/5 hover:bg-white/10 text-slate-100 border-white/10' : 'text-black shadow-md border-white/30'}`}
              style={nightMode ? {} : {
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)'
              }}
              onMouseEnter={(e) => !nightMode && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)')}
              onMouseLeave={(e) => !nightMode && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
            >
              <Heart className="w-3 h-3" />
              Friends
            </button>
          )}
          <button
            onClick={() => onMessage && onMessage(user)}
            className={`px-4 py-2 text-xs rounded-lg font-semibold transition-all duration-200 border ${nightMode ? 'bg-white/5 hover:bg-white/10 text-slate-100 border-white/10' : 'text-black shadow-md border-white/30'}`}
            style={nightMode ? {} : {
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)'
            }}
            onMouseEnter={(e) => !nightMode && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)')}
            onMouseLeave={(e) => !nightMode && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
            aria-label={`Send message to ${user.displayName}`}
          >
            Message
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserCard;
