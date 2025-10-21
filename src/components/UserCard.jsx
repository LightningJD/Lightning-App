import React from 'react';
import { MapPin, Heart } from 'lucide-react';

const UserCard = ({ user, showReason, isFriend, nightMode }) => {
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
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl relative flex-shrink-0 ${nightMode ? 'bg-gradient-to-br from-purple-500 to-indigo-600' : 'bg-gradient-to-br from-purple-400 to-pink-400'}`}>
          {user.avatar}
          {user.online && (
            <div className={`absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 ${nightMode ? 'border-[#0a0a0a]' : 'border-white'}`}></div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold ${nightMode ? 'text-white' : 'text-black'}`}>{user.displayName}</h3>
          </div>
          <p className={`text-sm ${nightMode ? 'text-gray-400' : 'text-black'}`}>@{user.username}</p>
          <div className="flex items-center gap-1.5 mt-1.5 text-[11px]">
            <div className={`flex items-center gap-0.5 ${nightMode ? 'text-gray-400' : 'text-black'}`}>
              <MapPin className="w-3 h-3" />
              <span>{Math.floor(parseFloat(user.distance))} mi</span>
            </div>
            {showReason && user.reason && !user.reason.toLowerCase().includes('similar interests') && (
              <span className={`${nightMode ? 'text-gray-400' : 'text-black'} text-[10px] font-medium`}>
                • {user.reason.replace(' friends', '').replace(' friend', '')}
              </span>
            )}
            {!showReason && user.mutualFriends > 0 && (
              <span className={`${nightMode ? 'text-gray-400' : 'text-black'} text-[10px] font-medium`}>• {user.mutualFriends} mutual</span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0">
          {!isFriend ? (
            <button
              className={`px-4 py-2 text-xs rounded-lg font-semibold transition-all duration-200 border text-white ${nightMode ? 'border-white/20' : 'border-white/30'}`}
              style={nightMode ? {
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              } : {
                background: 'rgba(59, 130, 246, 0.7)',
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)'
              }}
              onMouseEnter={(e) => {
                if (nightMode) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.25)';
                } else {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.85)';
                }
              }}
              onMouseLeave={(e) => {
                if (nightMode) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                } else {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.7)';
                }
              }}
            >
              Add
            </button>
          ) : (
            <button
              className={`px-4 py-2 text-xs rounded-lg font-semibold transition-all duration-200 flex items-center gap-1 border ${nightMode ? 'bg-white/5 hover:bg-white/10 text-white border-white/10' : 'text-black shadow-md border-white/30'}`}
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
            className={`px-4 py-2 text-xs rounded-lg font-semibold transition-all duration-200 border ${nightMode ? 'bg-white/5 hover:bg-white/10 text-white border-white/10' : 'text-black shadow-md border-white/30'}`}
            style={nightMode ? {} : {
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)'
            }}
            onMouseEnter={(e) => !nightMode && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)')}
            onMouseLeave={(e) => !nightMode && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
          >
            Message
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserCard;
