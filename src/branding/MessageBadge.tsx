import React from 'react';

interface MessageBadgeProps {
  count?: number;
  variant?: 'default' | 'urgent' | 'muted';
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Branded notification/message badge with Lightning gradient styling.
 * Use for unread counts, notification indicators, and status badges.
 */
export default function MessageBadge({
  count,
  variant = 'default',
  size = 'sm',
  className = '',
}: MessageBadgeProps) {
  const isSm = size === 'sm';
  const isDot = count === undefined;

  const backgrounds: Record<string, string> = {
    default: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)',
    urgent: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
    muted: 'linear-gradient(135deg, #94A3B8 0%, #64748B 100%)',
  };

  const shadows: Record<string, string> = {
    default: '0 2px 8px rgba(59, 130, 246, 0.4)',
    urgent: '0 2px 8px rgba(239, 68, 68, 0.4)',
    muted: '0 1px 4px rgba(100, 116, 139, 0.3)',
  };

  if (isDot) {
    const dotSize = isSm ? 8 : 12;
    return (
      <span
        className={className}
        style={{
          display: 'inline-block',
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          background: backgrounds[variant],
          boxShadow: shadows[variant],
          border: '2px solid white',
        }}
      />
    );
  }

  const displayCount = count > 99 ? '99+' : String(count);

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: isSm ? 18 : 24,
        height: isSm ? 18 : 24,
        padding: '0 5px',
        borderRadius: 999,
        background: backgrounds[variant],
        boxShadow: shadows[variant],
        color: '#FFFFFF',
        fontSize: isSm ? 11 : 13,
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: '0.02em',
      }}
    >
      {displayCount}
    </span>
  );
}
