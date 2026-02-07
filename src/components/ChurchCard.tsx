import React, { useState } from 'react';
import { Copy, Check, Users, LogOut, RefreshCw } from 'lucide-react';

interface ChurchCardProps {
  nightMode: boolean;
  church: {
    id: string;
    name: string;
    location?: string | null;
    denomination?: string | null;
    inviteCode: string;
    memberCount: number;
    createdBy: string;
  };
  isCreator?: boolean;
  onLeave?: () => void;
  onRegenerateCode?: () => void;
  compact?: boolean;
}

const ChurchCard: React.FC<ChurchCardProps> = ({
  nightMode,
  church,
  isCreator = false,
  onLeave,
  onRegenerateCode,
  compact = false,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(church.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = church.inviteCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-3 px-3 py-2 rounded-xl ${
        nightMode ? 'bg-white/[0.04]' : 'bg-blue-50/50'
      }`}>
        <span className="text-lg">⛪</span>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium truncate ${nightMode ? 'text-slate-200' : 'text-slate-800'}`}>
            {church.name}
          </div>
          {church.denomination && (
            <div className={`text-[10px] ${nightMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {church.denomination}
            </div>
          )}
        </div>
        <div className={`flex items-center gap-1 text-[10px] ${nightMode ? 'text-slate-500' : 'text-slate-400'}`}>
          <Users className="w-3 h-3" />
          {church.memberCount}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Glow border */}
      <div
        className="absolute inset-[-1px] rounded-[17px] pointer-events-none"
        style={{
          padding: '1px',
          background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude' as any,
          opacity: nightMode ? 0.4 : 0.3,
        }}
      />

      <div
        className="relative rounded-2xl overflow-hidden"
        style={nightMode ? {
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
        } : {
          background: 'rgba(255,255,255,0.2)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05), inset 0 1px 2px rgba(255,255,255,0.4)',
        }}
      >
        <div className="p-4 flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-center gap-2 pb-1">
            <span className={`text-xs font-bold uppercase tracking-widest ${
              nightMode ? 'text-cyan-400' : 'text-cyan-600'
            }`}>
              ⛪ Your Church
            </span>
            <div className={`flex-1 h-px ${nightMode ? 'bg-white/[0.08]' : 'bg-black/[0.06]'}`} />
          </div>

          {/* Church Name */}
          <div>
            <div className={`text-lg font-semibold ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>
              {church.name}
            </div>
            {church.denomination && (
              <div className={`text-xs mt-0.5 ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                ✝️ {church.denomination}
              </div>
            )}
            {church.location && (
              <div className={`text-xs mt-0.5 ${nightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                📍 {church.location}
              </div>
            )}
          </div>

          {/* Stats row */}
          <div className={`flex items-center gap-4 py-2 px-3 rounded-xl ${
            nightMode ? 'bg-white/[0.03]' : 'bg-white/20'
          }`}>
            <div className="flex items-center gap-1.5">
              <Users className={`w-3.5 h-3.5 ${nightMode ? 'text-slate-400' : 'text-slate-500'}`} />
              <span className={`text-sm font-bold ${nightMode ? 'text-slate-200' : 'text-slate-800'}`}>
                {church.memberCount}
              </span>
              <span className={`text-[10px] font-medium uppercase tracking-wide ${
                nightMode ? 'text-slate-500' : 'text-slate-400'
              }`}>
                Members
              </span>
            </div>
          </div>

          {/* Invite Code */}
          <div className={`flex items-center gap-2 p-3 rounded-xl ${
            nightMode ? 'bg-white/[0.04]' : 'bg-slate-50'
          }`}>
            <div className="flex-1">
              <div className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${
                nightMode ? 'text-slate-500' : 'text-slate-400'
              }`}>
                Invite Code
              </div>
              <div className={`font-mono text-base tracking-widest font-semibold ${
                nightMode ? 'text-slate-200' : 'text-slate-800'
              }`}>
                {church.inviteCode}
              </div>
            </div>
            <button
              onClick={handleCopyCode}
              className={`p-2 rounded-lg transition-colors ${
                copied
                  ? nightMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'
                  : nightMode ? 'bg-white/5 hover:bg-white/10 text-slate-400' : 'bg-white hover:bg-slate-100 text-slate-500'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
            {isCreator && onRegenerateCode && (
              <button
                onClick={onRegenerateCode}
                className={`p-2 rounded-lg transition-colors ${
                  nightMode ? 'bg-white/5 hover:bg-white/10 text-slate-400' : 'bg-white hover:bg-slate-100 text-slate-500'
                }`}
                title="Generate new invite code"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Leave button */}
          {onLeave && (
            <button
              onClick={onLeave}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-colors ${
                nightMode
                  ? 'text-red-400/70 hover:text-red-400 hover:bg-red-500/10'
                  : 'text-red-400 hover:text-red-500 hover:bg-red-50'
              }`}
            >
              <LogOut className="w-3.5 h-3.5" />
              Leave Church
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChurchCard;
