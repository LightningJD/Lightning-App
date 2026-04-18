/**
 * BUG-02: Block actions must use the custom ModalOverlay modal,
 * not the native window.confirm() dialog.
 *
 * These tests fail on current code and drive the fix.
 * Fail modes on CURRENT code:
 *   - window.confirm IS called when Block is clicked (should NOT be)
 *   - No dialog opens (findByRole('alertdialog') rejects)
 * After the fix lands, these tests pin the expected behavior:
 *   - window.confirm NEVER called
 *   - clicking Block opens a dialog (role="dialog")
 *   - confirming inside the dialog calls blockUser(viewer, target)
 *   - cancelling inside the dialog does NOT call blockUser
 *   - Profile path: onBlocked fires ~1500ms after confirm
 *   - MessagesTab path: conversation menu and active chat are cleared on confirm
 */

import React from "react";
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";
import {
  render,
  screen,
  waitFor,
  within,
  act,
  fireEvent,
} from "@testing-library/react";

// ──────────────────────────────────────────────────────────────────────────────
// Shared module mocks — hoisted before any component imports
// ──────────────────────────────────────────────────────────────────────────────

// Spies for assertions
const blockUserSpy = vi.fn();

vi.mock("../lib/database", () => ({
  // Block flow
  blockUser: (...args: any[]) => blockUserSpy(...args),
  isUserBlocked: vi.fn().mockResolvedValue(false),
  isBlockedBy: vi.fn().mockResolvedValue(false),
  getBlockedUserIds: vi.fn().mockResolvedValue(new Set<string>()),

  // Conversations / messages (used by MessagesTab + useMessages)
  getUserConversations: vi.fn().mockResolvedValue([]),
  getConversation: vi.fn().mockResolvedValue([]),
  sendMessage: vi.fn(),
  canSendMessage: vi.fn().mockResolvedValue(true),
  subscribeToMessages: vi.fn().mockReturnValue({}),
  subscribeToMessageReactions: vi.fn().mockReturnValue({}),
  unsubscribe: vi.fn(),
  addReaction: vi.fn(),
  removeReaction: vi.fn(),
  getMessageReactions: vi.fn().mockResolvedValue([]),
  getReactionsForMessages: vi.fn().mockResolvedValue({}),
  deleteMessage: vi.fn(),
  markConversationAsRead: vi.fn(),

  // Group / servers (unused but imported)
  createGroup: vi.fn(),
  sendGroupMessage: vi.fn(),

  // Friend flow (used by ProfileTab)
  checkFriendshipStatus: vi.fn().mockResolvedValue("none"),
  sendFriendRequest: vi.fn(),
  acceptFriendRequest: vi.fn(),
  declineFriendRequest: vi.fn(),
  getPendingFriendRequests: vi.fn().mockResolvedValue([]),

  // Follow flow
  isFollowing: vi.fn().mockResolvedValue(false),
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
  getFollowerCount: vi.fn().mockResolvedValue(0),

  // Testimony flow
  toggleTestimonyLike: vi.fn(),
  hasUserLikedTestimony: vi.fn().mockResolvedValue(false),
  getTestimonyComments: vi.fn().mockResolvedValue([]),
  addTestimonyComment: vi.fn(),
  canViewTestimony: vi.fn().mockResolvedValue(true),
  trackTestimonyView: vi.fn(),
  deleteTestimony: vi.fn(),

  // Church
  leaveChurch: vi.fn(),
  regenerateChurchInviteCode: vi.fn(),

  // Reporting (used inside ReportContent sub-component)
  REPORT_REASONS: { user: [], testimony: [], message: [], group: [] },
  reportUser: vi.fn(),
  reportTestimony: vi.fn(),
  reportMessage: vi.fn(),
  reportGroup: vi.fn(),
}));

vi.mock("../lib/toast", () => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
}));

vi.mock("../lib/guestSession", () => ({
  trackTestimonyView: vi.fn(),
}));

vi.mock("../lib/contentFilter", () => ({
  checkBeforeSend: () => ({ allowed: true, severity: "low", flag: null }),
}));

vi.mock("../lib/secrets", () => ({
  unlockSecret: vi.fn(),
  checkTestimonyAnalyticsSecrets: vi.fn(),
  checkMessageSecrets: vi.fn(),
}));

vi.mock("../lib/sanitization", () => ({
  sanitizeUserContent: (s: string) => s,
}));

vi.mock("../lib/supabase", () => ({
  supabase: null,
  isSupabaseConfigured: () => false,
}));

vi.mock("../lib/reactionEmojis", () => ({
  REACTION_EMOJIS: [],
}));

vi.mock("../lib/activityTracker", () => ({
  trackMessageByHour: vi.fn(),
  getEarlyBirdMessages: vi.fn(),
  getNightOwlMessages: vi.fn(),
  trackMessageStreak: vi.fn(),
}));

vi.mock("../lib/rateLimiter", () => ({
  checkAndNotify: vi.fn(),
  recordAttempt: vi.fn(),
}));

vi.mock("../lib/inputValidation", () => ({
  sanitizeInput: (s: string) => s,
  validateMessage: () => ({ valid: true, errors: [] }),
}));

vi.mock("../lib/cloudinary", () => ({
  uploadMessageImage: vi.fn(),
}));

vi.mock("../lib/messageValidation", () => ({
  validateAndCheckMessage: () => ({ valid: true }),
}));

vi.mock("../lib/imageUploadHandler", () => ({
  handleImageFileSelect: vi.fn(),
}));

vi.mock("@clerk/clerk-react", () => ({
  useUser: () => ({
    user: { id: "clerk-viewer", primaryEmailAddress: null },
    isSignedIn: true,
  }),
}));

vi.mock("../contexts/GuestModalContext", () => ({
  useGuestModalContext: () => ({
    isGuest: false,
    checkAndShowModal: vi.fn(),
  }),
  GuestModalProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../contexts/PremiumContext", () => ({
  usePremium: () => ({ isUserPro: false, isProServer: false }),
  PremiumProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// useUserProfile is imported by MessagesTab from ../components/useUserProfile
// but from the test file perspective that's "../components/useUserProfile".
vi.mock("../components/useUserProfile", () => ({
  useUserProfile: () => ({
    profile: {
      supabaseId: "viewer-user-1",
      displayName: "Viewer",
      username: "viewer",
      avatar: "👤",
    },
    loading: false,
    refetch: vi.fn(),
  }),
}));

const mockedUseMessages = vi.fn();
vi.mock("../hooks/useMessages", () => ({
  useMessages: (opts: any) => mockedUseMessages(opts),
}));

vi.mock("../hooks/useNewChat", () => ({
  useNewChat: () => ({
    showNewChatDialog: false,
    setShowNewChatDialog: vi.fn(),
    searchQuery: "",
    setSearchQuery: vi.fn(),
    newChatMessage: "",
    setNewChatMessage: vi.fn(),
    showSuggestions: false,
    setShowSuggestions: vi.fn(),
    selectedConnections: [],
    setSelectedConnections: vi.fn(),
    connections: [],
    loadingConnections: false,
    recipientInputRef: { current: null },
  }),
}));

// ──────────────────────────────────────────────────────────────────────────────
// Now import the components under test
// ──────────────────────────────────────────────────────────────────────────────
import ProfileTab from "../components/ProfileTab";
import MessagesTab from "../components/MessagesTab";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function setupConfirmSpy() {
  const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
  return confirmSpy;
}

describe("BUG-02: Block uses custom modal, not window.confirm()", () => {
  beforeEach(() => {
    blockUserSpy.mockReset().mockResolvedValue({
      id: "block-1",
      blocker_id: "viewer-user-1",
      blocked_id: "target-user-1",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // ProfileTab: Block button in the action row
  // ────────────────────────────────────────────────────────────────────────────
  describe("ProfileTab — Block icon in profile action row", () => {
    const viewer = {
      supabaseId: "viewer-user-1",
      displayName: "Viewer",
      username: "viewer",
    };
    const target = {
      supabaseId: "target-user-1",
      displayName: "Alice",
      username: "alice",
    };

    async function renderProfile() {
      const onBlocked = vi.fn();
      const onMessage = vi.fn();
      const utils = render(
        <ProfileTab
          profile={target}
          nightMode={true}
          currentUserProfile={viewer}
          onMessage={onMessage}
          onBlocked={onBlocked}
        />,
      );

      // Wait for the social action row (depends on an async status effect) to render.
      const blockBtn = await screen.findByRole("button", {
        name: /^Block Alice$/i,
      });
      return { ...utils, onBlocked, onMessage, blockBtn };
    }

    it("does NOT call window.confirm when Block is clicked", async () => {
      const confirmSpy = setupConfirmSpy();
      const { blockBtn } = await renderProfile();

      fireEvent.click(blockBtn);

      expect(confirmSpy).not.toHaveBeenCalled();
    });

    it("opens a dialog (role=alertdialog) when Block is clicked", async () => {
      const { blockBtn } = await renderProfile();

      fireEvent.click(blockBtn);

      const dialog = await screen.findByRole("alertdialog");
      expect(dialog).toBeInTheDocument();
    });

    it("calls blockUser(viewer, target) when the dialog's Confirm button is clicked", async () => {
      const { blockBtn } = await renderProfile();

      fireEvent.click(blockBtn);
      const dialog = await screen.findByRole("alertdialog");
      // Scope to the dialog to avoid matching the trigger button in the header.
      const confirmBtn = within(dialog).getByRole("button", {
        name: /^confirm block/i,
      });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(blockUserSpy).toHaveBeenCalledTimes(1);
      });
      expect(blockUserSpy).toHaveBeenCalledWith(
        "viewer-user-1",
        "target-user-1",
      );
    });

    it("does NOT call blockUser when the dialog's Cancel button is clicked", async () => {
      const { blockBtn } = await renderProfile();

      fireEvent.click(blockBtn);
      const dialog = await screen.findByRole("alertdialog");
      const cancelBtn = within(dialog).getByRole("button", {
        name: /^cancel action$/i,
      });
      fireEvent.click(cancelBtn);

      // Give any accidental async path a chance to fire.
      await new Promise((r) => setTimeout(r, 50));
      expect(blockUserSpy).not.toHaveBeenCalled();
    });

    it("calls onBlocked ~1500ms after confirming", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { blockBtn, onBlocked } = await renderProfile();

      fireEvent.click(blockBtn);
      const dialog = await screen.findByRole("alertdialog");
      const confirmBtn = within(dialog).getByRole("button", {
        name: /^confirm block/i,
      });
      fireEvent.click(confirmBtn);

      // blockUser resolves (microtask flush)
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      // Before the 1500ms delay: not yet closed
      expect(onBlocked).not.toHaveBeenCalled();

      // Advance past the delay
      await act(async () => {
        vi.advanceTimersByTime(1600);
      });

      expect(onBlocked).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // MessagesTab: Block menu item in the conversation three-dot menu
  // ────────────────────────────────────────────────────────────────────────────
  describe("MessagesTab — Block item in conversation three-dot menu", () => {
    const setActiveChatSpy = vi.fn();
    const setConversationsSpy = vi.fn();

    beforeEach(() => {
      setActiveChatSpy.mockReset();
      setConversationsSpy.mockReset();

      // Return a conversation state where chat "c1" is active, so the
      // conversation header renders with the MoreVertical menu button.
      mockedUseMessages.mockReturnValue({
        activeChat: "c1",
        setActiveChat: setActiveChatSpy,
        messages: [],
        conversations: [
          {
            id: "c1",
            userId: "target-user-1",
            name: "Alice",
            avatar: "👤",
            avatarImage: null,
            lastMessage: "",
            timestamp: new Date().toISOString(),
            online: false,
            unreadCount: 0,
          },
        ],
        setConversations: setConversationsSpy,
        loading: false,
        isInitialLoad: false,
        messageReactions: {},
        showReactionPicker: null,
        setShowReactionPicker: vi.fn(),
        showAllEmojis: {},
        setShowAllEmojis: vi.fn(),
        expandedReactions: {},
        setExpandedReactions: vi.fn(),
        newMessage: "",
        setNewMessage: vi.fn(),
        replyingTo: null,
        setReplyingTo: vi.fn(),
        pendingImage: null,
        pendingImagePreview: null,
        uploadingImage: false,
        imageInputRef: { current: null },
        messagesEndRef: { current: null },
        messagesContainerRef: { current: null },
        messageRefs: { current: {} },
        handleReaction: vi.fn(),
        handleSendMessage: vi.fn(),
        handleDeleteMessage: vi.fn(),
        handleImageSelect: vi.fn(),
        clearPendingImage: vi.fn(),
        isMessageInBottomHalf: () => false,
      });
    });

    async function renderMessages() {
      const utils = render(<MessagesTab nightMode={true} />);
      // Open the three-dot menu on the conversation header
      const menuToggle = await screen.findByRole("button", {
        name: /conversation options/i,
      });
      fireEvent.click(menuToggle);
      const blockItem = await screen.findByRole("button", {
        name: /block user/i,
      });
      return { ...utils, blockItem };
    }

    it("does NOT call window.confirm when Block User is clicked", async () => {
      const confirmSpy = setupConfirmSpy();
      const { blockItem } = await renderMessages();

      fireEvent.click(blockItem);

      expect(confirmSpy).not.toHaveBeenCalled();
    });

    it("opens a dialog (role=alertdialog) when Block User is clicked", async () => {
      const { blockItem } = await renderMessages();

      fireEvent.click(blockItem);

      const dialog = await screen.findByRole("alertdialog");
      expect(dialog).toBeInTheDocument();
    });

    it("calls blockUser(viewer, target) when the dialog's Confirm button is clicked", async () => {
      const { blockItem } = await renderMessages();

      fireEvent.click(blockItem);
      const dialog = await screen.findByRole("alertdialog");
      const confirmBtn = within(dialog).getByRole("button", {
        name: /^confirm block/i,
      });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(blockUserSpy).toHaveBeenCalledTimes(1);
      });
      expect(blockUserSpy).toHaveBeenCalledWith(
        "viewer-user-1",
        "target-user-1",
      );
    });

    it("does NOT call blockUser when the dialog's Cancel button is clicked", async () => {
      const { blockItem } = await renderMessages();

      fireEvent.click(blockItem);
      const dialog = await screen.findByRole("alertdialog");
      const cancelBtn = within(dialog).getByRole("button", {
        name: /^cancel action$/i,
      });
      fireEvent.click(cancelBtn);

      await new Promise((r) => setTimeout(r, 50));
      expect(blockUserSpy).not.toHaveBeenCalled();
    });

    it("clears the conversation menu and active chat on confirm", async () => {
      const { blockItem } = await renderMessages();

      fireEvent.click(blockItem);
      const dialog = await screen.findByRole("alertdialog");
      const confirmBtn = within(dialog).getByRole("button", {
        name: /^confirm block/i,
      });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(blockUserSpy).toHaveBeenCalled();
      });

      // After a successful block: the active chat is cleared.
      await waitFor(() => {
        expect(setActiveChatSpy).toHaveBeenCalledWith(null);
      });
    });
  });
});
