/**
 * Generate a random invite code string.
 * Used by both server and church invite systems.
 * Characters exclude ambiguous ones (0, O, I, l, 1) for readability.
 */
export function generateInviteCode(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
