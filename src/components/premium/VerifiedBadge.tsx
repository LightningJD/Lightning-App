import React from 'react';

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  size = 'sm',
  className = '',
}) => {
  const sizeMap = {
    sm: { badge: 'w-4 h-4', check: 'w-2.5 h-2.5' },
    md: { badge: 'w-5 h-5', check: 'w-3 h-3' },
    lg: { badge: 'w-6 h-6', check: 'w-3.5 h-3.5' },
  };

  const s = sizeMap[size];

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full ${s.badge} ${className}`}
      style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
        boxShadow: '0 1px 4px rgba(37, 99, 235, 0.4)',
      }}
      title="Verified Church"
    >
      <svg
        className={s.check}
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
};

export default VerifiedBadge;
