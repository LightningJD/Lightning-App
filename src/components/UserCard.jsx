import React from 'react';
import { MapPin, Heart } from 'lucide-react';

const UserCard = ({ user, showReason, isFriend }) => {
  return (
    <div className="p-4 bg-white rounded-lg border border-slate-200 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-2xl relative flex-shrink-0">
          {user.avatar}
          {user.online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900">{user.displayName}</h3>
            {user.online && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Online</span>}
          </div>
          <p className="text-sm text-slate-500">@{user.username}</p>
          <div className="flex items-center gap-3 mt-2 text-xs">
            <div className="text-slate-600 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {user.distance}
            </div>
            {showReason && user.reason && (
              <div className="bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium">{user.reason}</div>
            )}
            {!showReason && user.mutualFriends > 0 && (
              <div className="bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium">{user.mutualFriends} mutual</div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0">
          {!isFriend ? (
            <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-lg font-semibold transition-colors">
              Add
            </button>
          ) : (
            <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-lg font-semibold transition-colors flex items-center gap-1">
              <Heart className="w-3 h-3" />
              Friends
            </button>
          )}
          <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-lg font-semibold transition-colors">
            Message
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserCard;
