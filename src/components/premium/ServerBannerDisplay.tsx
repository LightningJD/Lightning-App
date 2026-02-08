import React from 'react';

interface ServerBannerDisplayProps {
  bannerUrl: string;
  serverName: string;
  nightMode: boolean;
  className?: string;
}

const ServerBannerDisplay: React.FC<ServerBannerDisplayProps> = ({
  bannerUrl,
  serverName,
  nightMode,
  className = '',
}) => {
  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      <img
        src={bannerUrl}
        alt={`${serverName} banner`}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      {/* Bottom gradient fade for readability */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{
          background: nightMode
            ? 'linear-gradient(transparent, rgba(0,0,0,0.6))'
            : 'linear-gradient(transparent, rgba(255,255,255,0.4))',
        }}
      />
      {/* Subtle shimmer overlay for premium feel */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.08) 45%, transparent 50%)',
          animation: 'bannerShimmer 6s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes bannerShimmer {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};

export default ServerBannerDisplay;
