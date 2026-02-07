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
      className="flex flex-col items-center py-4 gap-3 overflow-y-auto"
      style={{
        width: '68px',
        minWidth: '68px',
        background: nightMode ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        borderRight: `1px solid ${nightMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
      }}
    >
      {servers.map(server => {
        const isActive = server.id === activeServerId;
        return (
          <div key={server.id} className="relative group">
            {/* Tooltip */}
            <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 scale-95 group-hover:scale-100">
              <div
                className="px-3 py-1.5 rounded-xl text-sm font-semibold whitespace-nowrap text-white"
                style={{
                  background: 'rgba(0, 0, 0, 0.75)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                }}
              >
                {server.name}
              </div>
            </div>
            {/* Server icon — always round, glow when active */}
            <button
              onClick={() => onSelectServer(server.id)}
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all duration-300 hover:scale-110 hover:-translate-y-0.5 active:scale-95"
              style={{
                background: isActive
                  ? 'linear-gradient(135deg, #4F96FF 0%, #3b82f6 50%, #2563eb 100%)'
                  : nightMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                boxShadow: isActive
                  ? '0 0 20px rgba(79, 150, 255, 0.4), 0 4px 12px rgba(59, 130, 246, 0.3)'
                  : 'none',
                border: isActive
                  ? '2px solid rgba(79, 150, 255, 0.5)'
                  : `2px solid ${nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
              }}
            >
              {server.icon_url ? (
                <img src={server.icon_url} alt={server.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                server.icon_emoji
              )}
            </button>
          </div>
        );
      })}

      {/* Separator */}
      <div
        className="w-8 h-0.5 rounded-full my-1"
        style={{
          background: nightMode
            ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(0,0,0,0.1), transparent)',
        }}
      />

      {/* Create server button */}
      <button
        onClick={onCreateServer}
        className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 hover:-translate-y-0.5 active:scale-95"
        style={{
          background: nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          border: `2px dashed ${nightMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
        }}
      >
        <Plus className={`w-5 h-5 ${nightMode ? 'text-white/40' : 'text-black/40'}`} />
      </button>
    </div>
  );
};

export default ServerSidebar;
