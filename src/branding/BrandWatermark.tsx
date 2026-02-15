import React from 'react';

interface BrandWatermarkProps {
  opacity?: number;
  size?: number;
  className?: string;
}

/**
 * Subtle watermark lightning bolt for empty states, backgrounds,
 * and branded content areas.
 */
export default function BrandWatermark({
  opacity = 0.06,
  size = 200,
  className = '',
}: BrandWatermarkProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ opacity }}
    >
      <defs>
        <linearGradient id="wmGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <g transform="translate(100, 100)">
        <path
          d="M-8 -85L-38 15h38L-14 100 44 -8H8L22 -85z"
          fill="url(#wmGrad)"
        />
      </g>
    </svg>
  );
}
