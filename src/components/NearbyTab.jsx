import React from 'react';
import UserCard from './UserCard';

const NearbyTab = ({ sortBy, setSortBy, activeConnectTab, setActiveConnectTab }) => {
  const recommendedUsers = [
    { id: 1, displayName: "Sarah Mitchell", username: "grace_walker", distance: "0.3 mi", avatar: "👤", online: true, mutualFriends: 3, reason: "3 mutual friends" },
    { id: 2, displayName: "John Rivers", username: "john_rivers", distance: "0.8 mi", avatar: "🧑", online: true, mutualFriends: 1, reason: "1 mutual friend" },
    { id: 3, displayName: "Maya Chen", username: "maya_heart", distance: "1.2 mi", avatar: "👩", online: false, mutualFriends: 2, reason: "2 mutual friends" },
    { id: 4, displayName: "Marcus Johnson", username: "faith_seeker", distance: "2.1 mi", avatar: "👨", online: true, mutualFriends: 0, reason: "Nearby" },
    { id: 5, displayName: "Emily Grace", username: "em_grace", distance: "3.5 mi", avatar: "👧", online: false, mutualFriends: 1, reason: "Similar interests" },
  ];

  const friends = [
    { id: 6, displayName: "Rachel Adams", username: "rachel_a", distance: "1.5 mi", avatar: "👩", online: true, mutualFriends: 0 },
    { id: 7, displayName: "Joshua Lee", username: "josh_lee", distance: "4.2 mi", avatar: "🧑", online: false, mutualFriends: 0 },
    { id: 8, displayName: "Daniel Kim", username: "dan_kim", distance: "0.9 mi", avatar: "👨", online: true, mutualFriends: 0 },
  ];

  const getSortedUsers = (usersList) => {
    return [...usersList].sort((a, b) => {
      if (sortBy === 'online') {
        return b.online - a.online;
      } else if (sortBy === 'mutual') {
        return b.mutualFriends - a.mutualFriends;
      } else if (sortBy === 'nearby') {
        return parseFloat(a.distance) - parseFloat(b.distance);
      }
      return 0;
    });
  };

  const sortWithOnlineFirst = (usersList) => {
    const sorted = getSortedUsers(usersList);
    const online = sorted.filter(u => u.online);
    const offline = sorted.filter(u => !u.online);
    return [...online, ...offline];
  };

  const sortedRecommended = sortWithOnlineFirst(recommendedUsers);
  const sortedFriends = sortWithOnlineFirst(friends);

  return (
    <div className="py-4 space-y-6">
      <div className="px-4">
        <div className="bg-white rounded-lg border border-slate-200 p-2 flex gap-2">
          <button
            onClick={() => setActiveConnectTab('recommended')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${activeConnectTab === 'recommended' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Recommended
          </button>
          <button
            onClick={() => setActiveConnectTab('friends')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${activeConnectTab === 'friends' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Friends
          </button>
        </div>
      </div>

      {activeConnectTab === 'recommended' && (
        <div className="px-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-600">Sort by:</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy('recommended')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${sortBy === 'recommended' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                Recommended
              </button>
              <button
                onClick={() => setSortBy('nearby')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${sortBy === 'nearby' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                Nearby
              </button>
              <button
                onClick={() => setSortBy('mutual')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${sortBy === 'mutual' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                Mutual
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 pb-20">
        {activeConnectTab === 'recommended' ? (
          <div className="space-y-3">
            {sortedRecommended.map((user) => (
              <UserCard key={user.id} user={user} showReason />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedFriends.map((user) => (
              <UserCard key={user.id} user={user} isFriend />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NearbyTab;
