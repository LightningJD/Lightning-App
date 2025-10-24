import React from 'react';

/**
 * Base Skeleton component with shimmer animation
 */
export const Skeleton = ({ className = "", nightMode = false }) => {
  return (
    <div
      className={`animate-pulse ${nightMode ? 'bg-white/10' : 'bg-slate-200'} ${className}`}
      style={{
        backgroundImage: nightMode
          ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)'
          : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite'
      }}
    />
  );
};

/**
 * User Card Skeleton for Connect tab
 */
export const UserCardSkeleton = ({ nightMode = false }) => {
  return (
    <div
      className={`rounded-xl border p-4 ${nightMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}
      style={nightMode ? {} : {
        background: 'rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)'
      }}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" nightMode={nightMode} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <Skeleton className="h-4 w-32 rounded mb-2" nightMode={nightMode} />
          <Skeleton className="h-3 w-24 rounded" nightMode={nightMode} />
        </div>

        {/* Button */}
        <Skeleton className="w-20 h-8 rounded-lg" nightMode={nightMode} />
      </div>
    </div>
  );
};

/**
 * Conversation Skeleton for Messages tab
 */
export const ConversationSkeleton = ({ nightMode = false }) => {
  return (
    <div
      className={`rounded-xl border p-4 ${nightMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}
      style={nightMode ? {} : {
        background: 'rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)'
      }}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" nightMode={nightMode} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <Skeleton className="h-4 w-28 rounded" nightMode={nightMode} />
            <Skeleton className="h-3 w-12 rounded" nightMode={nightMode} />
          </div>
          <Skeleton className="h-3 w-40 rounded" nightMode={nightMode} />
        </div>
      </div>
    </div>
  );
};

/**
 * Group Card Skeleton for Groups tab
 */
export const GroupCardSkeleton = ({ nightMode = false }) => {
  return (
    <div
      className={`rounded-xl border p-4 ${nightMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}
      style={nightMode ? {} : {
        background: 'rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)'
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        {/* Icon */}
        <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" nightMode={nightMode} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <Skeleton className="h-4 w-32 rounded mb-2" nightMode={nightMode} />
          <Skeleton className="h-3 w-20 rounded" nightMode={nightMode} />
        </div>
      </div>

      {/* Description */}
      <Skeleton className="h-3 w-full rounded mb-1" nightMode={nightMode} />
      <Skeleton className="h-3 w-3/4 rounded" nightMode={nightMode} />
    </div>
  );
};

/**
 * Message Bubble Skeleton for chat view
 */
export const MessageSkeleton = ({ isMe = false, nightMode = false }) => {
  return (
    <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
      {!isMe && <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" nightMode={nightMode} />}

      <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <Skeleton
          className={`h-12 rounded-2xl ${isMe ? 'w-48' : 'w-56'}`}
          nightMode={nightMode}
        />
      </div>
    </div>
  );
};

/**
 * Profile Header Skeleton
 */
export const ProfileHeaderSkeleton = ({ nightMode = false }) => {
  return (
    <div className="text-center py-6">
      {/* Avatar */}
      <Skeleton className="w-24 h-24 rounded-full mx-auto mb-4" nightMode={nightMode} />

      {/* Name */}
      <Skeleton className="h-6 w-32 rounded mx-auto mb-2" nightMode={nightMode} />

      {/* Username */}
      <Skeleton className="h-4 w-24 rounded mx-auto mb-4" nightMode={nightMode} />

      {/* Stats */}
      <div className="flex gap-6 justify-center">
        <div>
          <Skeleton className="h-6 w-12 rounded mx-auto mb-1" nightMode={nightMode} />
          <Skeleton className="h-3 w-16 rounded" nightMode={nightMode} />
        </div>
        <div>
          <Skeleton className="h-6 w-12 rounded mx-auto mb-1" nightMode={nightMode} />
          <Skeleton className="h-3 w-16 rounded" nightMode={nightMode} />
        </div>
      </div>
    </div>
  );
};

// Shimmer animation keyframes
const shimmerStyles = `
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
`;

// Inject shimmer styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = shimmerStyles;
  document.head.appendChild(style);
}

export default Skeleton;
