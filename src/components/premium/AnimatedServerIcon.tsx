import React from 'react';
import type { IconAnimation } from '../../types/premium';

interface AnimatedServerIconProps {
  emoji: string;
  iconUrl?: string;
  name: string;
  animation: IconAnimation;
  glowColor?: string;
  size?: number;
  isActive?: boolean;
  nightMode: boolean;
}

const AnimatedServerIcon: React.FC<AnimatedServerIconProps> = ({
  emoji,
  iconUrl,
  name,
  animation,
  glowColor = '#F59E0B',
  size = 48,
  isActive = false,
  nightMode,
}) => {
  const getAnimationStyle = (): React.CSSProperties => {
    switch (animation) {
      case 'glow':
        return {
          boxShadow: `0 0 ${isActive ? 24 : 16}px ${glowColor}55, 0 0 ${isActive ? 40 : 28}px ${glowColor}22`,
          animation: 'iconGlow 3s ease-in-out infinite',
        };
      case 'pulse':
        return {
          animation: 'iconPulse 2s ease-in-out infinite',
        };
      case 'shimmer':
        return {
          position: 'relative' as const,
          overflow: 'hidden',
        };
      default:
        return {};
    }
  };

  return (
    <>
      <div
        className="rounded-full flex items-center justify-center transition-all duration-300"
        style={{
          width: size,
          height: size,
          fontSize: Math.round(size * 0.45),
          ...getAnimationStyle(),
        }}
      >
        {iconUrl ? (
          <img
            src={iconUrl}
            alt={name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          emoji
        )}

        {/* Shimmer overlay */}
        {animation === 'shimmer' && (
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: `linear-gradient(105deg, transparent 35%, ${glowColor}20 45%, transparent 55%)`,
              animation: 'iconShimmer 3s ease-in-out infinite',
            }}
          />
        )}
      </div>

      <style>{`
        @keyframes iconGlow {
          0%, 100% { box-shadow: 0 0 ${isActive ? 24 : 16}px ${glowColor}55, 0 0 ${isActive ? 40 : 28}px ${glowColor}22; }
          50% { box-shadow: 0 0 ${isActive ? 32 : 22}px ${glowColor}77, 0 0 ${isActive ? 48 : 36}px ${glowColor}33; }
        }
        @keyframes iconPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes iconShimmer {
          0% { transform: translateX(-100%) rotate(0deg); }
          100% { transform: translateX(200%) rotate(0deg); }
        }
      `}</style>
    </>
  );
};

export default AnimatedServerIcon;
