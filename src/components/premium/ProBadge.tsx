import React from 'react';

interface ProBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ProBadge: React.FC<ProBadgeProps> = ({
  size = 'sm',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-2.5 py-1',
  };

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-0.5 font-semibold rounded-full ${sizeClasses[size]} ${className}`}
      style={{
        background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
        color: '#FFFFFF',
        boxShadow: '0 1px 4px rgba(124, 58, 237, 0.3)',
      }}
    >
      <svg className={iconSizes[size]} viewBox="0 0 24 24" fill="currentColor">
        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      PRO
    </span>
  );
};

export default ProBadge;
