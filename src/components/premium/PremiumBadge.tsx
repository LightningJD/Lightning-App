import React from 'react';

interface PremiumBadgeProps {
  nightMode: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'church' | 'pro';
  className?: string;
}

const PremiumBadge: React.FC<PremiumBadgeProps> = ({
  nightMode,
  size = 'sm',
  variant = 'church',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-2.5 py-1',
  };

  const isPro = variant === 'pro';

  return (
    <span
      className={`inline-flex items-center gap-0.5 font-semibold rounded-full ${sizeClasses[size]} ${className}`}
      style={{
        background: isPro
          ? 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)'
          : 'linear-gradient(135deg, #F59E0B 0%, #EAB308 100%)',
        color: '#FFFFFF',
        boxShadow: isPro
          ? '0 1px 4px rgba(124, 58, 237, 0.3)'
          : '0 1px 4px rgba(245, 158, 11, 0.3)',
      }}
    >
      {isPro ? (
        <>
          <svg className={`${size === 'sm' ? 'w-2.5 h-2.5' : size === 'md' ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          PRO
        </>
      ) : (
        <>
          <svg className={`${size === 'sm' ? 'w-2.5 h-2.5' : size === 'md' ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
          PREMIUM
        </>
      )}
    </span>
  );
};

export default PremiumBadge;
