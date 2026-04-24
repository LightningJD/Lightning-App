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
// COLOR PALETTE — matches the new design mockup
// ============================================

interface CardPalette {
  base: string;
  c1: string;
  c2: string;
  c3: string;
  glow: string;
  doorLabel: string;
}

const CARD_PALETTES: Record<BadgeColor, CardPalette> = {
  red: {
    base: '#FFE8EA', c1: '#FFCCD1', c2: '#FFB8C2', c3: '#FFDCE0', glow: '#FF7A85',
    doorLabel: 'He saved me in the brokenness',
  },
  orange: {
    base: '#FFE8D4', c1: '#FFD4B0', c2: '#FFC89A', c3: '#FFDDBE', glow: '#FF9A4F',
    doorLabel: 'He saved me in the suffering',
  },
  yellow: {
    base: '#FFF5D6', c1: '#FFEAA8', c2: '#FFE190', c3: '#FFF0BC', glow: '#F4C542',
    doorLabel: 'He saved me in the emptiness',
  },
  green: {
    base: '#DFF0E1', c1: '#C5E4C9', c2: '#B0DAB5', c3: '#D2E8D5', glow: '#5FBF6C',
    doorLabel: 'He saved me in the loss',
  },
  blue: {
    base: '#DDE7F5', c1: '#BED1EE', c2: '#A8C0E5', c3: '#CDD9EF', glow: '#4A7FD1',
    doorLabel: 'He saved me in the searching',
  },
  indigo: {
    base: '#E2DAF0', c1: '#CFC2E8', c2: '#BEAEE0', c3: '#D6CAED', glow: '#7859C4',
    doorLabel: 'He saved me in the surrender',
  },
  violet: {
    base: '#ECD4EE', c1: '#E0BEE2', c2: '#D6ACDA', c3: '#E6C8E9', glow: '#B05FC4',
    doorLabel: 'He saved me in the inheritance',
  },
};

// Noise texture SVG (inline, no external dependency)
const NOISE_SVG = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.25 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/></svg>")`;

const TEXT_COLOR = '#1A1A2E';
const TEXT_MUTED = 'rgba(26, 26, 46, 0.55)';

// ============================================
// COMPONENT
// ============================================

const TestimonyCard: React.FC<TestimonyCardProps> = ({
  badgeColor,
  pullQuote,
  authorName,
  testimonyId,
}) => {
  const config = BADGE_COLORS[badgeColor];
  const palette = CARD_PALETTES[badgeColor];
  const colorName = badgeColor.charAt(0).toUpperCase() + badgeColor.slice(1);
  const doorType = config.label; // e.g. "Freedom", "Deep", etc.

  // QR code destination
  const shareUrl = `https://lightningsocial.io/testimony/${testimonyId}`;

  // Truncate pull quote if too long for the card
  const maxQuoteLength = 200;
  const displayQuote = pullQuote.length > maxQuoteLength
    ? pullQuote.substring(0, maxQuoteLength).trim() + '\u2026'
    : pullQuote;

  return (
    <div
      style={{
        width: 320,
        aspectRatio: '4 / 5',
        borderRadius: 20,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: '22px 20px',
        color: TEXT_COLOR,
        boxShadow: `0 24px 48px -16px rgba(0,0,0,0.4), 0 0 60px -24px ${palette.glow}`,
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      {/* Animated gradient background */}
      <div
        style={{
          position: 'absolute',
          inset: '-20%',
          background: [
            `radial-gradient(circle at 20% 20%, ${palette.c1} 0%, transparent 55%)`,
            `radial-gradient(circle at 80% 30%, ${palette.c2} 0%, transparent 60%)`,
            `radial-gradient(circle at 50% 85%, ${palette.c3} 0%, transparent 65%)`,
            palette.base,
          ].join(', '),
          zIndex: 0,
        }}
      />

      {/* Noise texture overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: NOISE_SVG,
          opacity: 0.3,
          mixBlendMode: 'overlay' as const,
          pointerEvents: 'none' as const,
          zIndex: 1,
        }}
      />

      {/* === Card content (z-index: 2) === */}

      {/* Brand mark */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <span
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 500,
            fontSize: 12,
            letterSpacing: '0.22em',
            color: TEXT_COLOR,
            textTransform: 'uppercase' as const,
            lineHeight: 1,
          }}
        >
          Lightning
        </span>
      </div>

      {/* Subhead */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 8,
          letterSpacing: '0.25em',
          textTransform: 'uppercase' as const,
          color: TEXT_MUTED,
          marginTop: 20,
          textAlign: 'center' as const,
        }}
      >
        There&apos;s power in every testimony.
      </div>

      {/* Pull quote */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          marginTop: 14,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '4px 0',
        }}
      >
        <p
          style={{
            fontFamily: "'Instrument Serif', serif",
            fontStyle: 'italic',
            color: TEXT_COLOR,
            letterSpacing: '-0.01em',
            fontSize: 14,
            lineHeight: 1.3,
            textAlign: 'center' as const,
            margin: 0,
          }}
        >
          &ldquo;{displayQuote}&rdquo;
        </p>
      </div>

      {/* Hero color name */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          marginTop: 14,
          textAlign: 'center' as const,
          padding: '2px 0 6px',
        }}
      >
        <div
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 700,
            fontSize: 42,
            lineHeight: 0.95,
            letterSpacing: '-0.035em',
            color: TEXT_COLOR,
            textTransform: 'uppercase' as const,
          }}
        >
          {colorName}
        </div>
        <div
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 400,
            fontStyle: 'italic',
            fontSize: 11,
            marginTop: 3,
            color: 'rgba(26, 26, 46, 0.85)',
          }}
        >
          {palette.doorLabel}
        </div>
      </div>

      {/* Spec row */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          marginTop: 14,
          padding: '10px 0',
          borderTop: '1px solid rgba(26, 26, 46, 0.18)',
          borderBottom: '1px solid rgba(26, 26, 46, 0.18)',
          display: 'grid',
          gridTemplateColumns: '1.3fr 1fr 1fr',
          gap: 8,
          alignItems: 'center',
        }}
      >
        {/* Index */}
        <div style={{ textAlign: 'center' as const, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 42 }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 6.5,
              letterSpacing: '0.18em',
              textTransform: 'uppercase' as const,
              color: TEXT_COLOR,
              lineHeight: 1.7,
              fontWeight: 500,
            }}
          >
            <span style={{ display: 'block' }}>14 Doors</span>
            <span style={{ display: 'block' }}>7 Colors</span>
            <span style={{ display: 'block' }}>1 Salvation Story</span>
          </div>
        </div>

        {/* Color */}
        <div style={{ textAlign: 'center' as const, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 42, borderLeft: '1px solid rgba(26, 26, 46, 0.15)' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7, letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: TEXT_MUTED }}>Color</div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 12, color: TEXT_COLOR, marginTop: 3, letterSpacing: '-0.005em' }}>{colorName}</div>
        </div>

        {/* Door */}
        <div style={{ textAlign: 'center' as const, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 42, borderLeft: '1px solid rgba(26, 26, 46, 0.15)' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7, letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: TEXT_MUTED }}>Door</div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 12, color: TEXT_COLOR, marginTop: 3, letterSpacing: '-0.005em' }}>{doorType}</div>
        </div>
      </div>

      {/* Footer row */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          marginTop: 'auto',
          paddingTop: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
        }}
      >
        {/* QR block */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 44,
              height: 44,
              background: '#fff',
              borderRadius: 5,
              padding: 3,
              flexShrink: 0,
              boxShadow: '0 3px 10px rgba(0,0,0,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <QRCodeSVG
              value={shareUrl}
              size={38}
              level="H"
              bgColor="transparent"
              fgColor={TEXT_COLOR}
            />
          </div>
          <div
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 9,
              color: 'rgba(26, 26, 46, 0.7)',
              lineHeight: 1.3,
            }}
          >
            <strong style={{ color: TEXT_COLOR, fontWeight: 600, fontStyle: 'italic' }}>
              {authorName}
            </strong>
          </div>
        </div>

        {/* CTA */}
        <div
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 600,
            fontSize: 11.5,
            color: TEXT_COLOR,
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap' as const,
          }}
        >
          Try it for yourself
        </div>
      </div>
    </div>
  );
};

export default TestimonyCard;
