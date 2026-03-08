/**
 * Skeleton Loaders - Instagram-style loading placeholders
 *
 * Reusable skeleton components that match the Lightning UI style.
 * Uses Tailwind dark: variants — nightMode is read from the <html> class.
 */

import React from 'react';

// Base skeleton pulse animation
const skeletonClass = 'animate-pulse bg-black/10 dark:bg-white/10 rounded-xl';

/**
 * Skeleton for a conversation/chat item in MessagesTab
 */
export const ConversationSkeleton: React.FC = () => {
  return (
    <div className="flex items-center gap-3 p-3 mb-1">
      {/* Avatar */}
      <div className={`w-12 h-12 rounded-full ${skeletonClass}`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Name */}
        <div className={`h-4 w-32 mb-2 ${skeletonClass}`} />
        {/* Last message */}
        <div className={`h-3 w-48 ${skeletonClass}`} />
      </div>

      {/* Time */}
      <div className={`h-3 w-12 ${skeletonClass}`} />
    </div>
  );
};

/**
 * Skeleton for a server item in ServersTab
 */
export const ServerSkeleton: React.FC = () => {
  return (
    <div className="flex items-center gap-3 p-3 mb-2">
      {/* Server icon */}
      <div className={`w-14 h-14 rounded-2xl ${skeletonClass}`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Server name */}
        <div className={`h-4 w-40 mb-2 ${skeletonClass}`} />
        {/* Member count */}
        <div className={`h-3 w-24 ${skeletonClass}`} />
      </div>
    </div>
  );
};

/**
 * Skeleton for a channel item in sidebar
 */
export const ChannelSkeleton: React.FC = () => {
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      {/* Hash icon */}
      <div className={`w-4 h-4 ${skeletonClass}`} />
      {/* Channel name */}
      <div className={`h-3 w-32 flex-1 ${skeletonClass}`} />
    </div>
  );
};

/**
 * Skeleton for a user card in NearbyTab
 */
export const UserCardSkeleton: React.FC = () => {
  return (
    <div className="rounded-2xl p-5 mb-3 bg-white/50 dark:bg-white/5 backdrop-blur-[20px]">
      {/* Avatar */}
      <div className={`w-16 h-16 rounded-full mx-auto mb-3 ${skeletonClass}`} />

      {/* Name */}
      <div className={`h-5 w-32 mx-auto mb-2 ${skeletonClass}`} />

      {/* Location */}
      <div className={`h-3 w-24 mx-auto mb-3 ${skeletonClass}`} />

      {/* Bio */}
      <div className={`h-3 w-full mb-1 ${skeletonClass}`} />
      <div className={`h-3 w-3/4 mx-auto ${skeletonClass}`} />
    </div>
  );
};

/**
 * Skeleton for a message in chat
 */
export const MessageSkeleton: React.FC<{ isOwnMessage?: boolean }> = ({
  isOwnMessage = false
}) => {
  return (
    <div className={`flex gap-2 mb-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
      {/* Avatar (only for received messages) */}
      {!isOwnMessage && (
        <div className={`w-8 h-8 rounded-full flex-shrink-0 ${skeletonClass}`} />
      )}

      {/* Message bubble */}
      <div className={`flex-1 max-w-[70%] ${isOwnMessage ? 'ml-auto' : ''}`}>
        <div className={`h-16 rounded-2xl ${skeletonClass}`} />
      </div>
    </div>
  );
};

/**
 * Skeleton for ProfileTab testimony/story
 */
export const TestimonySkeleton: React.FC = () => {
  return (
    <div className="p-5 rounded-2xl mb-4 bg-white/50 dark:bg-white/5">
      {/* Title */}
      <div className={`h-6 w-48 mb-3 ${skeletonClass}`} />

      {/* Content lines */}
      <div className={`h-4 w-full mb-2 ${skeletonClass}`} />
      <div className={`h-4 w-full mb-2 ${skeletonClass}`} />
      <div className={`h-4 w-3/4 mb-2 ${skeletonClass}`} />
      <div className={`h-4 w-5/6 ${skeletonClass}`} />
    </div>
  );
};

/**
 * Loading container with multiple skeletons
 */
export const SkeletonList: React.FC<{
  count: number;
  type: 'conversation' | 'server' | 'channel' | 'user' | 'message';
}> = ({ count, type }) => {
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
        <Component key={i} />
      ))}
    </>
  );
};
