/**
 * Database Module Index
 * Re-exports all database functions from modular files
 * This maintains backward compatibility while organizing code
 */

// User Management
export {
  syncUserToSupabase,
  getUserByClerkId,
  updateUserProfile,
  updateUserLocation,
  findNearbyUsers,
  updateOnlineStatus
} from './users.js';

// Testimony Management
export {
  createTestimony,
  getTestimonyByUserId,
  updateTestimony,
  trackTestimonyView,
  getTestimonyViewCount,
  toggleTestimonyLike,
  hasUserLikedTestimony,
  getTestimonyLikeCount,
  addTestimonyComment,
  getTestimonyComments,
  deleteTestimonyComment
} from './testimonies.js';

// Messaging
export {
  sendMessage,
  getConversation,
  getUserConversations,
  markMessageAsRead,
  addReaction,
  removeReaction,
  getMessageReactions
} from './messages.js';

// Groups
export {
  createGroup,
  getUserGroups,
  sendGroupMessage,
  getGroupMessages,
  updateGroup,
  deleteGroup,
  leaveGroup,
  getGroupMembers,
  inviteToGroup,
  removeMemberFromGroup,
  promoteMemberToLeader,
  searchPublicGroups,
  requestToJoinGroup,
  getGroupJoinRequests,
  approveJoinRequest,
  denyJoinRequest,
  pinMessage,
  unpinMessage,
  getPinnedMessages
} from './groups.js';

// Friend Requests / Connections
export {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  getFriends,
  getPendingFriendRequests,
  getSentFriendRequests,
  unfriend,
  checkFriendshipStatus,
  getMutualFriends
} from './friends.js';

// Real-time Subscriptions
export {
  subscribeToMessages,
  subscribeToGroupMessages,
  unsubscribe
} from './subscriptions.js';

// Re-export Supabase client for backward compatibility
export { supabase } from '../supabase.js';