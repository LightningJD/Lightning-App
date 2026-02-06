import React from 'react';
import { Plus } from 'lucide-react';

interface ServerSidebarProps {
  nightMode: boolean;
  servers: Array<{
    id: string;
    name: string;
    icon_emoji: string;
    icon_url?: string;
  }>;
  activeServerId: string | null;
  onSelectServer: (serverId: string) => void;
  onCreateServer: () => void;
}

const ServerSidebar: React.FC<ServerSidebarProps> = ({
  nightMode, servers, activeServerId, onSelectServer, onCreateServer
}) => {
  return (
    <div
      className="flex flex-col items-center py-3 gap-2 overflow-y-auto"
      style={{
        width: '56px',
        minWidth: '56px',
        background: nightMode ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.06)',
        borderRight: `1px solid ${nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`
      }}
    >
      {servers.map(server => {
        const isActive = server.id === activeServerId;
        return (
          <div key={server.id} className="relative group">
            {/* Active indicator pill */}
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[2px] rounded-r-full transition-all duration-200"
              style={{
                width: '4px',
                height: isActive ? '32px' : '0px',
                background: 'white',
                opacity: isActive ? 1 : 0
              }}
            />
            {/* Tooltip */}
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <div className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap shadow-lg ${
                nightMode ? 'bg-gray-900 text-white' : 'bg-gray-900 text-white'
              }`}>
                {server.name}
              </div>
            </div>
            {/* Server icon */}
            <button
              onClick={() => onSelectServer(server.id)}
              className={`w-10 h-10 flex items-center justify-center text-lg transition-all duration-200 ${
                isActive ? 'rounded-xl' : 'rounded-full hover:rounded-xl'
              }`}
              style={{
                background: isActive
                  ? 'rgba(79, 150, 255, 0.85)'
                  : nightMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                boxShadow: isActive ? '0 2px 8px rgba(79, 150, 255, 0.3)' : 'none'
              }}
            >
              {server.icon_url ? (
                <img src={server.icon_url} alt={server.name} className="w-full h-full rounded-inherit object-cover" />
              ) : (
                server.icon_emoji
              )}
            </button>
          </div>
        );
      })}

      {/* Separator */}
      <div className={`w-6 h-0.5 rounded-full my-1 ${nightMode ? 'bg-white/10' : 'bg-black/10'}`} />

      {/* Create server button */}
      <button
        onClick={onCreateServer}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:rounded-xl ${
          nightMode ? 'text-green-400 hover:bg-green-400/20' : 'text-green-600 hover:bg-green-100'
        }`}
        style={{
          background: nightMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
        }}
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ServerSidebar;
