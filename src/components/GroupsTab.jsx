import React, { useState } from 'react';
import { Search, Plus, Pin, Crown, UserPlus, Settings, X, Camera, Image, Check } from 'lucide-react';

const GroupsTab = ({ groupSearchQuery, setGroupSearchQuery }) => {
  const [activeGroup, setActiveGroup] = useState(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showJoinRequests, setShowJoinRequests] = useState(false);

  const myGroups = [
    {
      id: 1,
      name: "Faith Warriors",
      avatar: "⚔️",
      members: 12,
      leaders: ["You", "Sarah Mitchell"],
      coLeaders: 2,
      lastMessage: "Anyone free for coffee?",
      timestamp: "5m ago",
      unread: 3,
      pinnedMessages: ["Prayer meeting this Friday at 7pm"],
      pendingRequests: 2,
      isMember: true
    },
    {
      id: 2,
      name: "Young Adults Ministry",
      avatar: "✨",
      members: 24,
      leaders: ["Mark Johnson"],
      coLeaders: 1,
      lastMessage: "Bible study notes attached",
      timestamp: "30m ago",
      unread: 0,
      pinnedMessages: [],
      pendingRequests: 0,
      isMember: true
    },
  ];

  const discoverGroups = [
    { id: 3, name: "Worship Team", avatar: "🎵", members: 45, description: "For worship leaders and musicians", isMember: false },
    { id: 4, name: "Prayer Warriors Network", avatar: "🙏", members: 128, description: "24/7 prayer support", isMember: false },
    { id: 5, name: "College Ministry", avatar: "🎓", members: 67, description: "Students serving students", isMember: false },
    { id: 6, name: "Marriage & Family", avatar: "❤️", members: 34, description: "Strengthening families", isMember: false },
  ];

  const joinRequests = [
    { id: 1, name: "Alex Chen", avatar: "👤", requestDate: "2 hours ago", mutualFriends: 3 },
    { id: 2, name: "Maria Rodriguez", avatar: "👩", requestDate: "5 hours ago", mutualFriends: 1 },
  ];

  const filteredDiscoverGroups = discoverGroups.filter(group =>
    group.name.toLowerCase().includes(groupSearchQuery.toLowerCase()) ||
    group.description.toLowerCase().includes(groupSearchQuery.toLowerCase())
  );

  if (activeGroup) {
    const group = myGroups.find(g => g.id === activeGroup);
    const isLeader = group.leaders.includes("You");

    return (
      <div className="py-4 flex flex-col h-[calc(100vh-180px)]">
        <div className="flex items-center justify-between mb-4 px-4">
          <button onClick={() => setActiveGroup(null)} className="text-blue-600 text-sm font-semibold">← Back</button>
          <div className="flex gap-2">
            {isLeader && group.pendingRequests > 0 && (
              <button
                onClick={() => setShowJoinRequests(true)}
                className="relative p-2 hover:bg-slate-100 rounded-lg"
              >
                <UserPlus className="w-5 h-5 text-slate-600" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {group.pendingRequests}
                </span>
              </button>
            )}
            {isLeader && (
              <button onClick={() => setShowGroupSettings(true)} className="p-2 hover:bg-slate-100 rounded-lg">
                <Settings className="w-5 h-5 text-slate-600" />
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4 mx-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-3xl">{group.avatar}</div>
            <div>
              <h3 className="font-semibold text-slate-900">{group.name}</h3>
              <p className="text-xs text-slate-500">{group.members} members</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Crown className="w-3 h-3" />
            <span>Leaders: {group.leaders.join(", ")}</span>
          </div>
        </div>

        {group.pinnedMessages.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 mx-4">
            <div className="flex items-start gap-2">
              <Pin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-blue-900 mb-1">Pinned Message</p>
                <p className="text-sm text-blue-800">{group.pinnedMessages[0]}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 bg-white rounded-lg border border-slate-200 p-4 mb-4 space-y-3 overflow-y-auto mx-4">
          <div className="flex justify-start">
            <div className="max-w-xs">
              <p className="text-xs text-slate-500 mb-1">Sarah Mitchell</p>
              <div className="bg-slate-100 text-slate-900 px-4 py-2 rounded-lg">
                <p className="text-sm">Anyone free for coffee this week?</p>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <div className="max-w-xs">
              <div className="bg-blue-500 text-white px-4 py-2 rounded-lg">
                <p className="text-sm">I'm free Thursday!</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 px-4">
          <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
            <Image className="w-5 h-5 text-slate-600" />
          </button>
          <input type="text" placeholder="Type a message..." className="flex-1 px-4 py-2 border border-slate-200 rounded-lg" />
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg">Send</button>
        </div>

        {showJoinRequests && (
          <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowJoinRequests(false)} />
            <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-white rounded-2xl shadow-2xl z-50 p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">Join Requests ({joinRequests.length})</h3>
                <button onClick={() => setShowJoinRequests(false)}>
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="space-y-3">
                {joinRequests.map((request) => (
                  <div key={request.id} className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{request.avatar}</div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900">{request.name}</h4>
                        <p className="text-xs text-slate-500">{request.requestDate}</p>
                        {request.mutualFriends > 0 && (
                          <p className="text-xs text-blue-600 mt-1">{request.mutualFriends} mutual friends</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 flex items-center justify-center gap-1">
                        <Check className="w-4 h-4" />
                        Approve
                      </button>
                      <button className="flex-1 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-300">
                        Deny
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {showGroupSettings && (
          <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowGroupSettings(false)} />
            <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-white rounded-2xl shadow-2xl z-50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">Group Settings</h3>
                <button onClick={() => setShowGroupSettings(false)}>
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Group Name</label>
                  <input type="text" defaultValue={group.name} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Group Picture</label>
                  <button className="w-full py-2 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2">
                    <Camera className="w-4 h-4" />
                    Change Picture
                  </button>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Co-Leaders ({group.coLeaders}/2)</label>
                  <button className="w-full py-2 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Add Co-Leader
                  </button>
                </div>

                <button className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600">
                  Save Changes
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="py-4 space-y-4">
      <div className="px-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search groups..."
            value={groupSearchQuery}
            onChange={(e) => setGroupSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="px-4">
        <button
          onClick={() => setShowCreateGroup(true)}
          className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create New Group
        </button>
      </div>

      <div className="px-4">
        <h3 className="text-sm font-semibold text-slate-600 mb-3">My Groups</h3>
        <div className="space-y-3">
          {myGroups.map((group) => (
            <button key={group.id} onClick={() => setActiveGroup(group.id)} className="w-full bg-white rounded-lg border border-slate-200 p-4 text-left hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{group.avatar}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900">{group.name}</h3>
                    {group.pinnedMessages.length > 0 && <Pin className="w-3 h-3 text-blue-600" />}
                    {group.leaders.includes("You") && <Crown className="w-3 h-3 text-yellow-600" />}
                  </div>
                  <p className="text-sm text-slate-600">{group.lastMessage}</p>
                  <p className="text-xs text-slate-500 mt-1">{group.members} members</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">{group.timestamp}</span>
                  {group.unread > 0 && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">{group.unread}</span>
                  )}
                  {group.leaders.includes("You") && group.pendingRequests > 0 && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{group.pendingRequests} requests</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-20">
        <h3 className="text-sm font-semibold text-slate-600 mb-3">Discover Groups</h3>
        <div className="space-y-3">
          {filteredDiscoverGroups.map((group) => (
            <div key={group.id} className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">{group.avatar}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{group.name}</h3>
                  <p className="text-xs text-slate-600 mt-1">{group.description}</p>
                  <p className="text-xs text-slate-500 mt-1">{group.members} members</p>
                </div>
                <button className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 flex-shrink-0">
                  Request to Join
                </button>
              </div>
            </div>
          ))}
          {filteredDiscoverGroups.length === 0 && (
            <p className="text-center text-slate-500 text-sm py-8">No groups found</p>
          )}
        </div>
      </div>

      {showCreateGroup && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowCreateGroup(false)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-white rounded-2xl shadow-2xl z-50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Create New Group</h3>
              <button onClick={() => setShowCreateGroup(false)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Group Name</label>
                <input type="text" placeholder="e.g., Bible Study Group" className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Group Picture</label>
                <button className="w-full py-2 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2">
                  <Camera className="w-4 h-4" />
                  Upload Picture
                </button>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Add Members</label>
                <button className="w-full py-2 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Select Members
                </button>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Add Co-Leader (Optional)</label>
                <button className="w-full py-2 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2">
                  <Crown className="w-4 h-4" />
                  Choose Co-Leader
                </button>
              </div>

              <button className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600">
                Create Group
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GroupsTab;
