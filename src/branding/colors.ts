/**
 * Lightning Brand Color Palette
 *
 * All colors are designed to harmonize with the day mode background (#E8F3FE)
 * and the periwinkle theme gradient system.
 */

// ─── Core Brand Colors ───────────────────────────────────────────────────────

export const BRAND_COLORS = {
  /** Primary blue - main interactive color, buttons, links */
  primary: '#3B82F6',
  /** Primary dark - hover states, emphasis */
  primaryDark: '#2563EB',
  /** Primary light - subtle backgrounds, badges */
  primaryLight: '#93C5FD',
  /** Primary ultra-light - tinted surfaces */
  primaryUltraLight: '#DBEAFE',

  /** Accent purple - gradients, highlights, premium features */
  accent: '#8B5CF6',
  /** Accent dark - hover, pressed states */
  accentDark: '#6D28D9',
  /** Accent light - subtle purple tints */
  accentLight: '#C4B5FD',
  /** Accent ultra-light - purple tinted surfaces */
  accentUltraLight: '#EDE9FE',

  /** Indigo - midpoint between blue and purple, used in gradients */
  indigo: '#6366F1',
  indigoLight: '#A5B4FC',
} as const;

// ─── Background Colors ──────────────────────────────────────────────────────

export const BACKGROUNDS = {
  /** Day mode page background */
  dayMode: '#E8F3FE',
  /** Night mode page background */
  nightMode: '#0a0a0a',
  /** Night mode slight variant for modals/overlays */
  nightModeElevated: '#0a0a19',

  /** Day mode card/surface */
  daySurface: '#FFFFFF',
  /** Day mode elevated surface (cards, modals) */
  daySurfaceElevated: '#F8FAFF',
  /** Night mode card/surface */
  nightSurface: '#1a1a2e',
  /** Night mode elevated surface */
  nightSurfaceElevated: '#222240',
} as const;

// ─── Text Colors ─────────────────────────────────────────────────────────────

export const TEXT_COLORS = {
  /** Day mode primary text */
  dayPrimary: '#1E293B',
  /** Day mode secondary text */
  daySecondary: '#64748B',
  /** Day mode muted/tertiary text */
  dayMuted: '#94A3B8',

  /** Night mode primary text */
  nightPrimary: '#F1F5F9',
  /** Night mode secondary text */
  nightSecondary: '#94A3B8',
  /** Night mode muted text */
  nightMuted: '#64748B',
} as const;

// ─── Semantic Colors ─────────────────────────────────────────────────────────

export const SEMANTIC = {
  /** Success - testimony shared, message sent */
  success: '#22C55E',
  successLight: '#BBF7D0',
  /** Warning - attention needed */
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  /** Error - failed action, destructive */
  error: '#EF4444',
  errorLight: '#FEE2E2',
  /** Info - tips, guidance */
  info: '#3B82F6',
  infoLight: '#DBEAFE',
  /** Online status indicator */
  online: '#22C55E',
} as const;

// ─── Gradient Definitions ────────────────────────────────────────────────────

export const GRADIENTS = {
  /** Primary brand gradient - used on logo, buttons, headers */
  brand: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 50%, #8B5CF6 100%)',
  /** Soft brand gradient - subtle backgrounds */
  brandSoft: 'linear-gradient(135deg, #DBEAFE 0%, #EDE9FE 100%)',
  /** Bold gradient - CTAs, featured content */
  bold: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',

  /** Day mode page background gradient (periwinkle theme) */
  dayBackground: `
    linear-gradient(135deg, rgba(219, 234, 254, 0.63) 0%, transparent 100%),
    radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.175) 0%, transparent 60%),
    linear-gradient(45deg, #E8F3FE 0%, #EAE5FE 50%, #D9CDFE 100%)
  `,
  /** Night mode page background gradient */
  nightBackground: `
    linear-gradient(135deg, rgba(17, 24, 39, 0.42) 0%, transparent 100%),
    radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.035) 0%, transparent 60%),
    linear-gradient(45deg, #0a0a0a 0%, #15121c 50%, #191e27 100%)
  `,

  /** Message bubble - sent by user */
  messageSent: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)',
  /** Message bubble - received */
  messageReceived: 'linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%)',
} as const;

// ─── Shadows ─────────────────────────────────────────────────────────────────

export const SHADOWS = {
  /** Small shadow - buttons, chips */
  sm: '0 1px 3px rgba(30, 58, 95, 0.1), 0 1px 2px rgba(30, 58, 95, 0.06)',
  /** Medium shadow - cards, dropdowns */
  md: '0 4px 12px rgba(30, 58, 95, 0.1), 0 2px 4px rgba(30, 58, 95, 0.06)',
  /** Large shadow - modals, popovers */
  lg: '0 12px 32px rgba(30, 58, 95, 0.12), 0 4px 8px rgba(30, 58, 95, 0.08)',
  /** Brand glow - featured elements */
  brandGlow: '0 0 20px rgba(59, 130, 246, 0.3), 0 0 40px rgba(99, 102, 241, 0.15)',
} as const;

// ─── Border Colors ───────────────────────────────────────────────────────────

export const BORDERS = {
  dayLight: '#E2E8F0',
  dayMedium: '#CBD5E1',
  nightLight: 'rgba(255, 255, 255, 0.08)',
  nightMedium: 'rgba(255, 255, 255, 0.15)',
  /** Brand-tinted border for focused/active states */
  brandFocus: 'rgba(59, 130, 246, 0.5)',
} as const;

// ─── Full Palette Export ─────────────────────────────────────────────────────

export const LIGHTNING_PALETTE = {
  brand: BRAND_COLORS,
  backgrounds: BACKGROUNDS,
  text: TEXT_COLORS,
  semantic: SEMANTIC,
  gradients: GRADIENTS,
  shadows: SHADOWS,
  borders: BORDERS,
} as const;

export default LIGHTNING_PALETTE;
