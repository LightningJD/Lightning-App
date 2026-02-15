import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'text';
  darkMode?: boolean;
  className?: string;
}

const SIZES = {
  sm: { icon: 24, text: 14, gap: 6 },
  md: { icon: 36, text: 20, gap: 8 },
  lg: { icon: 48, text: 28, gap: 10 },
  xl: { icon: 64, text: 36, gap: 12 },
};

/**
 * Lightning brand logo component with 3D lightning bolt.
 * Renders inline SVG for crisp rendering at any size.
 */
export default function BrandLogo({
  size = 'md',
  variant = 'full',
  darkMode = false,
  className = '',
}: BrandLogoProps) {
  const s = SIZES[size];

  const bolt = (
    <svg
      width={s.icon}
      height={s.icon}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`circleBg-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="50%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id={`circleHl-${size}`} x1="30%" y1="0%" x2="70%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`boltG-${size}`} x1="40%" y1="0%" x2="60%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#DBEAFE" />
        </linearGradient>
        <linearGradient id={`boltD-${size}`} x1="40%" y1="0%" x2="60%" y2="100%">
          <stop offset="0%" stopColor="#93C5FD" />
          <stop offset="100%" stopColor="#818CF8" />
        </linearGradient>
      </defs>
      <circle cx="256" cy="256" r="240" fill={`url(#circleBg-${size})`} />
      <circle cx="256" cy="256" r="240" fill={`url(#circleHl-${size})`} />
      <g transform="translate(256, 250)">
        <path
          d="M-12 -120L-52 20h50L-20 140 60 -10H12L30 -120z"
          fill={`url(#boltD-${size})`}
          transform="translate(3, 4)"
          opacity="0.5"
        />
        <path
          d="M-12 -120L-52 20h50L-20 140 60 -10H12L30 -120z"
          fill={`url(#boltG-${size})`}
        />
      </g>
    </svg>
  );

  if (variant === 'icon') {
    return <span className={className}>{bolt}</span>;
  }

  const textColor = darkMode ? '#F1F5F9' : '#1E293B';

  const textEl = (
    <span
      style={{
        fontSize: s.text,
        fontWeight: 700,
        letterSpacing: '-0.02em',
        background: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 50%, #8B5CF6 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        lineHeight: 1,
      }}
    >
      Lightning
    </span>
  );

  if (variant === 'text') {
    return <span className={className}>{textEl}</span>;
  }

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.gap,
      }}
    >
      {bolt}
      {textEl}
    </span>
  );
}
