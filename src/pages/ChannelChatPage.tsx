/*
 * ChannelChatPage — Route wrapper for ChannelChat
 *
 * Reads serverId and channelId from URL params, uses useServerState to
 * load server data, then passes props to ChannelChat exactly as
 * ServersTab does. ChannelChat itself is not modified.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useUserProfile } from '../components/useUserProfile';
import { useServerState } from '../hooks/useServerState';
import ChannelChat from '../components/servers/ChannelChat';
import { useAppContext } from '../contexts/AppContext';

const ChannelChatPage: React.FC = () => {
  const { serverId, channelId } = useParams<{ serverId: string; channelId: string }>();
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const { nightMode } = useAppContext();

  const sv = useServerState({
    supabaseId: profile?.supabaseId,
    initialServerId: serverId,
  });

  // Once channels load, select the one from the URL
  if (channelId && sv.activeChannelId !== channelId && sv.channels.length > 0) {
    const channelExists = sv.channels.some((c) => c.id === channelId);
    if (channelExists) {
      sv.handleSelectChannel(channelId);
    }
  }

  const activeChannel = sv.channels.find((c) => c.id === channelId);

  // Loading state — server data hasn't arrived yet
  if (sv.loading || (!activeChannel && sv.channels.length === 0)) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3"
            style={{
              borderColor: nightMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              borderTopColor: nightMode ? '#7b76e0' : '#4facfe',
            }}
          />
          <p className={`text-sm ${nightMode ? 'text-white/40' : 'text-black/40'}`}>
            Loading channel...
          </p>
        </div>
      </div>
    );
  }

  // Channel not found
  if (!activeChannel) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className={`text-sm ${nightMode ? 'text-white/40' : 'text-black/40'}`}>
            Channel not found
          </p>
          <button
            onClick={() => navigate('/')}
            className={`mt-3 px-4 py-2 rounded-lg text-sm ${nightMode ? 'bg-white/10 text-white/70 hover:bg-white/15' : 'bg-black/5 text-black/60 hover:bg-black/10'}`}
          >
            Go back home
          </button>
        </div>
      </div>
    );
  }

  return (
    <ChannelChat
      nightMode={nightMode}
      channelId={channelId!}
      channelName={activeChannel.name || 'general'}
      channelTopic={activeChannel.topic}
      userId={profile?.supabaseId || ''}
      userDisplayName={profile?.displayName || profile?.username || 'You'}
      serverId={serverId}
      members={sv.members}
      permissions={sv.permissions}
      slowmodeSeconds={(activeChannel as any)?.slowmode_seconds || 0}
      isTimedOut={sv.isTimedOut}
      onMobileBack={() => navigate(-1)}
    />
  );
};

export default ChannelChatPage;
