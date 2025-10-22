import React from 'react';
import UserCard from './UserCard';

const NearbyTab = ({ sortBy, setSortBy, activeConnectTab, setActiveConnectTab, nightMode }) => {
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
        <div
          className={`rounded-xl border p-2 flex gap-2 ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'}`}
          style={nightMode ? {} : {
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
          }}
        >
          <button
            onClick={() => setActiveConnectTab('recommended')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeConnectTab === 'recommended' ? nightMode ? 'text-slate-100 border-b-2 border-white' : 'text-black border-b-2 border-black' : nightMode ? 'text-white/50 hover:text-slate-50/70 border-b-2 border-transparent' : 'text-black/50 hover:text-black/70 border-b-2 border-transparent'}`}
            style={{
              background: 'transparent'
            }}
          >
            Recommended
          </button>
          <button
            onClick={() => setActiveConnectTab('friends')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeConnectTab === 'friends' ? nightMode ? 'text-slate-100 border-b-2 border-white' : 'text-black border-b-2 border-black' : nightMode ? 'text-white/50 hover:text-slate-50/70 border-b-2 border-transparent' : 'text-black/50 hover:text-black/70 border-b-2 border-transparent'}`}
            style={{
              background: 'transparent'
            }}
          >
            Friends
          </button>
        </div>
      </div>

      {activeConnectTab === 'recommended' && (
        <div className="px-4">
          <div className="mb-3">
            <h3 className={`text-sm font-semibold mb-2 ${nightMode ? 'text-slate-100' : 'text-black'}`}>Sort by:</h3>
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setSortBy('recommended')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${sortBy === 'recommended' ? nightMode ? 'text-slate-100 border-white/20' : 'text-blue-700 shadow-md border-white/30' : nightMode ? 'bg-white/5 text-slate-100 hover:bg-white/10 border-white/10' : 'text-black shadow-sm border-white/30'}`}
                style={sortBy === 'recommended' ? nightMode ? {
                  background: 'rgba(79, 150, 255, 0.85)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)'
                } : {
                  background: 'rgba(219, 234, 254, 0.7)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)'
                } : !nightMode ? {
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)'
                } : {}}
              >
                Recommended
              </button>
              <button
                onClick={() => setSortBy('nearby')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${sortBy === 'nearby' ? nightMode ? 'text-slate-100 border-white/20' : 'text-blue-700 shadow-md border-white/30' : nightMode ? 'bg-white/5 text-slate-100 hover:bg-white/10 border-white/10' : 'text-black shadow-sm border-white/30'}`}
                style={sortBy === 'nearby' ? nightMode ? {
                  background: 'rgba(79, 150, 255, 0.85)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)'
                } : {
                  background: 'rgba(219, 234, 254, 0.7)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)'
                } : !nightMode ? {
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)'
                } : {}}
              >
                Nearby
              </button>
              <button
                onClick={() => setSortBy('mutual')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${sortBy === 'mutual' ? nightMode ? 'text-slate-100 border-white/20' : 'text-blue-700 shadow-md border-white/30' : nightMode ? 'bg-white/5 text-slate-100 hover:bg-white/10 border-white/10' : 'text-black shadow-sm border-white/30'}`}
                style={sortBy === 'mutual' ? nightMode ? {
                  background: 'rgba(79, 150, 255, 0.85)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)'
                } : {
                  background: 'rgba(219, 234, 254, 0.7)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)'
                } : !nightMode ? {
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)'
                } : {}}
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
              <UserCard key={user.id} user={user} showReason nightMode={nightMode} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedFriends.map((user) => (
              <UserCard key={user.id} user={user} isFriend nightMode={nightMode} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NearbyTab;
