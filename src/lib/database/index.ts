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
  updateOnlineStatus,
  searchUsers,
  getAllUsers
} from './users.js';

// Testimony Management
export {
  createTestimony,
  getTestimonyByUserId,
  updateTestimony,
  deleteTestimony,
  trackTestimonyView,
  getTestimonyViewCount,
  toggleTestimonyLike,
  hasUserLikedTestimony,
  getTestimonyLikeCount,
  addTestimonyComment,
  getTestimonyComments,
  deleteTestimonyComment,
  getPublicTestimonies,
  getDiscoverTestimonies,
  getChurchTestimonies,
  getFeedTestimonies,
  getTrendingTestimony
} from './testimonies.js';

// Messaging
export {
  sendMessage,
  getConversation,
  getUserConversations,
  markMessageAsRead,
  markConversationAsRead,
  addReaction,
  removeReaction,
  getMessageReactions,
  deleteMessage
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
  setMemberRole,
  getMemberRole,
  createCustomRole,
  getGroupCustomRoles,
  updateCustomRole,
  deleteCustomRole,
  assignCustomRole,
  searchPublicGroups,
  requestToJoinGroup,
  getGroupJoinRequests,
  getUserJoinRequests,
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
  getMutualFriends,
  getFriendsOfFriends
} from './friends.js';

// Servers (Discord-style)
export {
  createServer,
  getServer,
  getUserServers,
  updateServer,
  deleteServer,
  leaveServer,
  searchPublicServers,
  generateInviteCode,
  joinByInviteCode,
  createChannel,
  getChannelsByServer,
  updateChannel,
  deleteChannel,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  reorderChannels,
  createRole,
  getServerRoles,
  updateRole,
  deleteRole,
  updateRolePermissions,
  assignRole,
  getServerMembers,
  removeMember,
  getMemberPermissions,
  sendChannelMessage,
  getChannelMessages,
  pinChannelMessage,
  unpinChannelMessage,
  getPinnedChannelMessages,
  addChannelReaction,
  removeChannelReaction,
  getChannelMessageReactions,
  requestToJoinServer,
  getServerJoinRequests,
  approveServerJoinRequest,
  denyServerJoinRequest,
  editChannelMessage,
  deleteChannelMessage,
  sendChannelReply,
  banMember,
  unbanMember,
  getServerBans,
  updateTypingIndicator,
  clearTypingIndicator,
  getTypingIndicators,
  searchChannelMessages,
  markChannelRead,
  getUnreadCounts,
  getPendingInviteRequests,
  approveInviteRequest,
  rejectInviteRequest
} from './servers.js';

// Real-time Subscriptions
export {
  subscribeToMessages,
  subscribeToGroupMessages,
  subscribeToChannelMessages,
  subscribeToMessageReactions,
  unsubscribe
} from './subscriptions.js';

// Blocking / Privacy
export {
  blockUser,
  unblockUser,
  getBlockedUsers,
  isUserBlocked,
  isBlockedBy
} from './blocking.js';

// Reporting / Content Moderation
export {
  reportUser,
  reportTestimony,
  reportMessage,
  reportGroup,
  getReportsByUser,
  hasUserReported,
  REPORT_REASONS
} from './reporting.js';

// Privacy & Permissions
export {
  canViewTestimony,
  canSendMessage,
  isUserVisible
} from './privacy.js';

// Testimony Generation Rate Limiting
export {
  checkUserGenerationLimit,
  checkGuestGenerationLimit,
  logTestimonyGeneration,
  getUserGenerationStats
} from './testimonyRateLimit.js';

// Announcements
export {
  createAnnouncement,
  getGroupAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
  markAnnouncementRead,
  acknowledgeAnnouncement,
  getAnnouncementReceipts,
  getScheduledAnnouncements,
  publishAnnouncement,
  getUnreadAnnouncementCount,
  ANNOUNCEMENT_CATEGORIES
} from './announcements.js';

// Events
export {
  createEvent,
  getGroupEvents,
  getEventById,
  updateEvent,
  cancelEvent,
  deleteEvent,
  rsvpToEvent,
  removeRSVP,
  getEventRSVPs,
  getUserRSVP,
  sendEventMessage,
  getEventMessages,
  getUserCalendarEvents,
  getUpcomingEvents,
  getEventsNeedingReminders
} from './events.js';

// Churches
export {
  createChurch,
  joinChurchByCode,
  getChurchById,
  getChurchMembers,
  leaveChurch,
  regenerateInviteCode as regenerateChurchInviteCode,
  getUserChurch,
  updateChurch
} from './churches.js';

// Followers
export {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  isFollowing,
  getFollowerCount,
  getFollowingCount
} from './followers.js';

// Referrals & Points (Ambassador Program)
export {
  generateReferralCode,
  ensureReferralCode,
  resolveReferralCode,
  createPendingReferral,
  checkAndConfirmReferral,
  getReferralStats,
  awardPoints,
  getUserPoints,
  rebuildLeaderboardCache,
  getLeaderboard,
  getCurrentCycle,
  executeBpReset,
  checkAndRunBpReset,
  getLastCycleWinners,
  hasDismissedBpReset,
  dismissBpResetAnnouncement,
  recordDeviceFingerprint,
  acceptAmbassadorTerms,
  hasAcceptedAmbassadorTerms,
  getCycleEndTime
} from './referrals.js';

// Billing & Premium
export {
  getServerSubscription,
  getUserSubscription,
  getServerSubscriptionsForUser,
  getServerCosmetics,
  upsertServerCosmetics,
  getUserProCosmetics,
  upsertUserProCosmetics,
  getPricingTiers,
  getTierForMemberCount,
  getMemberCountSnapshots,
  getSubscriptionEvents,
  createCheckoutSession,
  openBillingPortal,
} from './billing.js';

// Re-export Supabase client for backward compatibility
export { supabase } from '../supabase.js';