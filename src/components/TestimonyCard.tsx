import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { type BadgeColor, BADGE_COLORS } from '../config/badgeConfig';

// ============================================
// TYPES
// ============================================

export interface TestimonyCardProps {
  /** The badge color assigned to this testimony */
  badgeColor: BadgeColor;
  /** The pull quote — the most powerful sentence from the testimony */
  pullQuote: string;
  /** Author's display name */
  authorName: string;
  /** Author's church name */
  churchName?: string;
  /** Testimony ID used to build the QR code URL */
  testimonyId: string;
  /** Night mode (currently unused — card has its own color scheme) */
  nightMode?: boolean;
}

// ============================================
// COLOR HELPERS
// ============================================

/**
 * Lighten a hex color by a factor (0 = no change, 1 = white).
 * Used to create the pastel gradient backgrounds.
 */
function lightenHex(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.min(255, Math.round(r + (255 - r) * factor));
  const lg = Math.min(255, Math.round(g + (255 - g) * factor));
  const lb = Math.min(255, Math.round(b + (255 - b) * factor));
  return `rgb(${lr}, ${lg}, ${lb})`;
}

/**
 * Darken a hex color by a factor (0 = black, 1 = no change).
 * Used for text colors that match the badge ramp.
 */
function darkenHex(hex: string, factor: number): string {
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * factor);
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * factor);
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * factor);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Mid-tone color for the pill label — darker than the pastel hex
 * but lighter than the dark text color.
 */
function midToneHex(hex: string): string {
  return darkenHex(hex, 0.65);
}

/**
 * Dark text color derived from the badge hex.
 */
function darkTextHex(hex: string): string {
  return darkenHex(hex, 0.3);
}

// ============================================
// COMPONENT
// ============================================

const TestimonyCard: React.FC<TestimonyCardProps> = ({
  badgeColor,
  pullQuote,
  authorName,
  churchName,
  testimonyId,
}) => {
  const config = BADGE_COLORS[badgeColor];
  const hex = config.hex;
  const colorName = badgeColor.charAt(0).toUpperCase() + badgeColor.slice(1);

  // Derived colors
  const bgGradientStart = lightenHex(hex, 0.35);
  const bgGradientEnd = lightenHex(hex, 0.55);
  const textColor = darkTextHex(hex);
  const midColor = midToneHex(hex);
  const patternColor = hex;

  // QR code destination
  const shareUrl = `https://lightningsocial.io/testimony/${testimonyId}`;

  // Truncate pull quote if too long for the card
  const maxQuoteLength = 200;
  const displayQuote = pullQuote.length > maxQuoteLength
    ? pullQuote.substring(0, maxQuoteLength).trim() + '…'
    : pullQuote;

  return (
    <div
      style={{
        width: 360,
        minHeight: 480,
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
        background: `linear-gradient(160deg, ${bgGradientStart}, ${bgGradientEnd})`,
        fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* Dot pattern overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.12,
          backgroundImage: `radial-gradient(circle at 2px 2px, ${patternColor} 0.8px, transparent 0.8px)`,
          backgroundSize: '14px 14px',
        }}
      />

      {/* Card content */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '100%',
          minHeight: 480,
          padding: '32px 28px',
          color: textColor,
        }}
      >
        {/* Top row: LIGHTNING wordmark + color pill */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: 4,
              textTransform: 'uppercase' as const,
              color: '#ffffff',
            }}
          >
            Lightning
          </span>

          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 1.5,
              textTransform: 'uppercase' as const,
              padding: '4px 14px',
              borderRadius: 20,
              color: midColor,
              border: `1.5px solid ${midColor}`,
              background: 'transparent',
            }}
          >
            {colorName}
          </span>
        </div>

        {/* Center: pull quote + author */}
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 22,
              lineHeight: 1.5,
              marginBottom: 20,
              margin: '0 0 20px 0',
            }}
          >
            &ldquo;{displayQuote}&rdquo;
          </p>

          <p
            style={{
              fontWeight: 700,
              fontSize: 16,
              margin: 0,
            }}
          >
            {authorName}
          </p>

          {churchName && (
            <p
              style={{
                fontSize: 11,
                opacity: 0.5,
                marginTop: 4,
              }}
            >
              {churchName}
            </p>
          )}
        </div>

        {/* Bottom row: scan CTA + QR code */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <span
            style={{
              fontSize: 10,
              letterSpacing: 1.5,
              textTransform: 'uppercase' as const,
              opacity: 0.55,
              fontWeight: 500,
              textAlign: 'right' as const,
              lineHeight: 1.4,
            }}
          >
            Scan
            <br />
            to read
          </span>

          <div
            style={{
              width: 72,
              height: 72,
              background: 'rgba(255, 255, 255, 0.85)',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(0, 0, 0, 0.06)',
            }}
          >
            <QRCodeSVG
              value={shareUrl}
              size={60}
              level="M"
              bgColor="transparent"
              fgColor={textColor}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestimonyCard;
