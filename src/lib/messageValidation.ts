/**
 * Shared message validation logic.
 * Used by useMessages, useGroupChat, and useChannelMessages hooks.
 */
import { showError } from './toast';
import { validateMessage } from './inputValidation';
import { checkBeforeSend } from './contentFilter';

/**
 * Validates and checks a message for profanity before sending.
 * Returns true if the message is OK to send, false if it should be blocked.
 */
export function validateAndCheckMessage(message: string): boolean {
  const validation = validateMessage(message, 'message');
  if (!validation.valid) {
    showError(validation.errors[0] || 'Invalid message');
    return false;
  }

  const profanityResult = checkBeforeSend(message);
  if (!profanityResult.allowed && profanityResult.flag) {
    if (profanityResult.severity === 'high') {
      showError('This message contains content that violates community guidelines');
      return false;
    }
    if (profanityResult.severity === 'medium') {
      if (!window.confirm('This message may contain inappropriate content. Send anyway?')) {
        return false;
      }
    }
  }

  return true;
}
