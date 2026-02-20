import React from 'react';
import { Zap, X } from 'lucide-react';

interface ProUpgradePromptProps {
  nightMode: boolean;
  onUpgrade: () => void;
  onDismiss: () => void;
  reason?: string;
}

const ProUpgradePrompt: React.FC<ProUpgradePromptProps> = ({
  nightMode,
  onUpgrade,
  onDismiss,
  reason = 'Unlock unlimited Lightning testimony generation',
}) => {
  const nm = nightMode;

  return (
    <div
      className="relative p-4 rounded-2xl overflow-hidden"
      style={{
        background: nm
          ? 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(168,85,247,0.1) 100%)'
          : 'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(168,85,247,0.05) 100%)',
        border: `1px solid ${nm ? 'rgba(124,58,237,0.25)' : 'rgba(124,58,237,0.15)'}`,
      }}
    >
      {/* Dismiss */}
      <button
        onClick={onDismiss}
        className={`absolute top-2 right-2 p-1 rounded-lg transition-all hover:scale-110 ${
          nm ? 'hover:bg-white/10 text-white/30' : 'hover:bg-black/5 text-black/30'
        }`}
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
            boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
          }}
        >
          <Zap className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-bold ${nm ? 'text-white' : 'text-black'}`}>
            Upgrade to Lightning Pro
          </h4>
          <p className={`text-xs mt-0.5 ${nm ? 'text-white/50' : 'text-black/50'}`}>
            {reason}
          </p>

          <button
            onClick={onUpgrade}
            className="mt-2.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
              boxShadow: '0 2px 6px rgba(124,58,237,0.3)',
            }}
          >
            Start Free Trial
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProUpgradePrompt;
