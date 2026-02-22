/**
 * Skeleton Loaders - Instagram-style loading placeholders
 *
 * Reusable skeleton components that match the Lightning UI style
 */

import React from 'react';

interface SkeletonProps {
  nightMode: boolean;
}

// Base skeleton pulse animation
const skeletonClass = (nightMode: boolean) =>
  `animate-pulse ${nightMode ? 'bg-white/10' : 'bg-black/10'} rounded-xl`;

/**
 * Skeleton for a conversation/chat item in MessagesTab
 */
export const ConversationSkeleton: React.FC<SkeletonProps> = ({ nightMode }) => {
  return (
    <div className="flex items-center gap-3 p-3 mb-1">
      {/* Avatar */}
      <div className={`w-12 h-12 rounded-full ${skeletonClass(nightMode)}`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Name */}
        <div className={`h-4 w-32 mb-2 ${skeletonClass(nightMode)}`} />
        {/* Last message */}
        <div className={`h-3 w-48 ${skeletonClass(nightMode)}`} />
      </div>

      {/* Time */}
      <div className={`h-3 w-12 ${skeletonClass(nightMode)}`} />
    </div>
  );
};

/**
 * Skeleton for a server item in ServersTab
 */
export const ServerSkeleton: React.FC<SkeletonProps> = ({ nightMode }) => {
  return (
    <div className="flex items-center gap-3 p-3 mb-2">
      {/* Server icon */}
      <div className={`w-14 h-14 rounded-2xl ${skeletonClass(nightMode)}`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Server name */}
        <div className={`h-4 w-40 mb-2 ${skeletonClass(nightMode)}`} />
        {/* Member count */}
        <div className={`h-3 w-24 ${skeletonClass(nightMode)}`} />
      </div>
    </div>
  );
};

/**
 * Skeleton for a channel item in sidebar
 */
export const ChannelSkeleton: React.FC<SkeletonProps> = ({ nightMode }) => {
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      {/* Hash icon */}
      <div className={`w-4 h-4 ${skeletonClass(nightMode)}`} />
      {/* Channel name */}
      <div className={`h-3 w-32 flex-1 ${skeletonClass(nightMode)}`} />
    </div>
  );
};

/**
 * Skeleton for a user card in NearbyTab
 */
export const UserCardSkeleton: React.FC<SkeletonProps> = ({ nightMode }) => {
  return (
    <div
      className="rounded-2xl p-5 mb-3"
      style={{
        background: nightMode
          ? 'rgba(255,255,255,0.05)'
          : 'rgba(255,255,255,0.5)',
        backdropFilter: 'blur(20px)'
      }}
    >
      {/* Avatar */}
      <div className={`w-16 h-16 rounded-full mx-auto mb-3 ${skeletonClass(nightMode)}`} />

      {/* Name */}
      <div className={`h-5 w-32 mx-auto mb-2 ${skeletonClass(nightMode)}`} />

      {/* Location */}
      <div className={`h-3 w-24 mx-auto mb-3 ${skeletonClass(nightMode)}`} />

      {/* Bio */}
      <div className={`h-3 w-full mb-1 ${skeletonClass(nightMode)}`} />
      <div className={`h-3 w-3/4 mx-auto ${skeletonClass(nightMode)}`} />
    </div>
  );
};

/**
 * Skeleton for a message in chat
 */
export const MessageSkeleton: React.FC<SkeletonProps & { isOwnMessage?: boolean }> = ({
  nightMode,
  isOwnMessage = false
}) => {
  return (
    <div className={`flex gap-2 mb-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
      {/* Avatar (only for received messages) */}
      {!isOwnMessage && (
        <div className={`w-8 h-8 rounded-full flex-shrink-0 ${skeletonClass(nightMode)}`} />
      )}

      {/* Message bubble */}
      <div className={`flex-1 max-w-[70%] ${isOwnMessage ? 'ml-auto' : ''}`}>
        <div className={`h-16 rounded-2xl ${skeletonClass(nightMode)}`} />
      </div>
    </div>
  );
};

/**
 * Skeleton for ProfileTab testimony/story
 */
export const TestimonySkeleton: React.FC<SkeletonProps> = ({ nightMode }) => {
  return (
    <div className="p-5 rounded-2xl mb-4"
      style={{
        background: nightMode
          ? 'rgba(255,255,255,0.05)'
          : 'rgba(255,255,255,0.5)',
      }}
    >
      {/* Title */}
      <div className={`h-6 w-48 mb-3 ${skeletonClass(nightMode)}`} />

      {/* Content lines */}
      <div className={`h-4 w-full mb-2 ${skeletonClass(nightMode)}`} />
      <div className={`h-4 w-full mb-2 ${skeletonClass(nightMode)}`} />
      <div className={`h-4 w-3/4 mb-2 ${skeletonClass(nightMode)}`} />
      <div className={`h-4 w-5/6 ${skeletonClass(nightMode)}`} />
    </div>
  );
};

/**
 * Loading container with multiple skeletons
 */
export const SkeletonList: React.FC<{
  count: number;
  type: 'conversation' | 'server' | 'channel' | 'user' | 'message';
  nightMode: boolean;
}> = ({ count, type, nightMode }) => {
  const Component = {
    conversation: ConversationSkeleton,
    server: ServerSkeleton,
    channel: ChannelSkeleton,
    user: UserCardSkeleton,
    message: MessageSkeleton,
  }[type];

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Component key={i} nightMode={nightMode} />
      ))}
    </>
  );
};
