/**
 * BUG-04 — DM trailing-character drop race
 *
 * Regression test for the stale-closure race in
 * src/hooks/useMessages.ts `handleSendMessage`.
 *
 * Bug mechanism:
 *   `handleSendMessage` reads `newMessage` from its render-time closure
 *   (useMessages.ts:378, 381, 400). When a form submit / Enter-key press
 *   fires against a handler reference captured BEFORE the last
 *   `setNewMessage(...)` has committed, the handler's closure still holds
 *   the pre-last-keystroke value, and the trailing character is silently
 *   dropped from the payload handed to `sendMessage`.
 *
 * This test drives the hook through that exact sequence:
 *   1. setNewMessage(base)             // commits
 *   2. const staleSubmit = current handleSendMessage   // captures closure
 *   3. setNewMessage(base + trailing)  // commits
 *   4. staleSubmit(...)                // reads `base` from closure, sends
 *
 * On current code this fails on every iteration with
 *   delivered === base, expected === base + trailing.
 *
 * After the fix it must pass on every iteration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── Mock every module useMessages imports ──────────────────────────
const sendMessageSpy = vi.fn();

vi.mock('../lib/database', () => ({
  sendMessage: (...args: any[]) => sendMessageSpy(...args),
  getConversation: vi.fn().mockResolvedValue([]),
  getUserConversations: vi.fn().mockResolvedValue([]),
  subscribeToMessages: vi.fn().mockReturnValue({}),
  subscribeToMessageReactions: vi.fn().mockReturnValue({}),
  unsubscribe: vi.fn(),
  canSendMessage: vi.fn().mockResolvedValue({ allowed: true }),
  isUserBlocked: vi.fn().mockResolvedValue(false),
  isBlockedBy: vi.fn().mockResolvedValue(false),
  getBlockedUserIds: vi.fn().mockResolvedValue(new Set<string>()),
  addReaction: vi.fn(),
  removeReaction: vi.fn(),
  getMessageReactions: vi.fn().mockResolvedValue([]),
  getReactionsForMessages: vi.fn().mockResolvedValue({}),
  deleteMessage: vi.fn(),
  markConversationAsRead: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lib/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock('../lib/secrets', () => ({
  checkMessageSecrets: vi.fn(),
  unlockSecret: vi.fn(),
}));

vi.mock('../lib/activityTracker', () => ({
  trackMessageByHour: vi.fn(),
  getEarlyBirdMessages: () => 0,
  getNightOwlMessages: () => 0,
  trackMessageStreak: () => 0,
}));

vi.mock('../lib/rateLimiter', () => ({
  checkAndNotify: () => true,
  recordAttempt: vi.fn(),
}));

vi.mock('../lib/inputValidation', () => ({
  sanitizeInput: (s: string) => s,
}));

vi.mock('../lib/cloudinary', () => ({
  uploadMessageImage: vi.fn(),
}));

vi.mock('../lib/messageValidation', () => ({
  validateAndCheckMessage: () => true,
}));

vi.mock('../lib/imageUploadHandler', () => ({
  handleImageFileSelect: vi.fn(),
}));

// Import AFTER mocks.
import { useMessages } from '../hooks/useMessages';

// Character classes the brief calls out: punctuation, closing delimiters,
// emoji, and whitespace. Letters/digits included as a sanity baseline.
const TRAILING_CHARS: string[] = [
  // ASCII punctuation
  '.', '!', '?', ',', ';', ':',
  // Closing delimiters
  ')', ']', '}', '"', "'",
  // Emoji + symbols (include surrogate-pair codepoints)
  '\u{1F604}', // 😄
  '\u{1F44D}', // 👍
  '\u2728',    // ✨
  '\u2764',    // ❤
  '\u{1F680}', // 🚀
  // Whitespace
  ' ',
  // Letter + digit baseline (should never drop on any version)
  'z',
  '1',
];
const ITERATIONS = 60; // covers "50+" success criterion

describe('BUG-04 — DM trailing-character drop race', () => {
  beforeEach(() => {
    sendMessageSpy.mockReset().mockResolvedValue({
      data: {
        id: 'srv-stub',
        sender_id: 'me',
        recipient_id: 'them',
        content: 'ignored-by-spy',
        created_at: new Date().toISOString(),
      },
      error: null,
    });
  });

  it(`delivers the exact typed content across ${ITERATIONS} iterations with varied trailing characters`, async () => {
    const { result } = renderHook(() =>
      useMessages({
        userId: 'me',
        profile: {
          supabaseId: 'me',
          username: 'me',
          displayName: 'Me',
          avatar: '👤',
        },
        initialConversationId: 'them',
      }),
    );

    // Seed the chat — open a conversation so handleSendMessage has a target.
    act(() => {
      result.current.setConversations([
        { id: 'them', userId: 'them' } as any,
      ]);
      result.current.setActiveChat('them');
    });

    const drops: Array<{ i: number; typed: string; delivered: string }> = [];

    for (let i = 0; i < ITERATIONS; i++) {
      sendMessageSpy.mockClear();

      const last = TRAILING_CHARS[i % TRAILING_CHARS.length];
      const base = `DIAG-MSG #${i + 1} ends in X`;
      const full = base + last;

      // 1. Type up through the penultimate character. Commits.
      act(() => {
        result.current.setNewMessage(base);
      });

      // 2. Capture the handler REFERENCE from THIS render. This is exactly
      //    the function the form's onSubmit prop and the textarea's Enter
      //    onKeyDown handler would invoke if Send fired right now.
      const staleSubmit = result.current.handleSendMessage;

      // 3. User's final keystroke arrives — setNewMessage(full) commits.
      //    In the real app this is another discrete setState scheduled by
      //    the native `input` event.
      act(() => {
        result.current.setNewMessage(full);
      });

      // 4. User presses Send in the same burst — before the handler ref
      //    has been re-bound by React on the next render. The dispatch
      //    runs against staleSubmit, whose closure still sees `base`.
      await act(async () => {
        await staleSubmit({ preventDefault: () => {} } as any);
      });

      expect(
        sendMessageSpy,
        `iteration #${i + 1}: sendMessage should be invoked exactly once`,
      ).toHaveBeenCalledTimes(1);

      // sendMessage(senderId, recipientId, content, replyToId?, imageUrl?)
      const deliveredContent = sendMessageSpy.mock.calls[0][2] as string;

      if (deliveredContent !== full) {
        drops.push({ i: i + 1, typed: full, delivered: deliveredContent });
      }
    }

    // Single bulk assertion with a diff-style failure log. On current code
    // every iteration drops the trailing char, so this prints all 60
    expect(
      drops,
      `expected every iteration to deliver the full typed content.\n` +
        `got ${drops.length}/${ITERATIONS} drops:\n` +
        drops
          .map(
            d =>
              `  #${d.i}: typed ${JSON.stringify(d.typed)}, delivered ${JSON.stringify(d.delivered)}`,
          )
          .join('\n'),
    ).toEqual([]);
  });
});
