import React from 'react';
import { X, Lock, CheckCircle, Trophy, Sparkles } from 'lucide-react';
import { getAllSecretsWithStatus, getSecretProgress } from '../lib/secrets';

/**
 * Secret Museum
 *
 * Hidden page showing all secrets (found + locked)
 * Access: Settings menu → scroll to bottom → "Secret Museum"
 */

const SecretsMuseum = ({ isOpen, onClose, nightMode }) => {
  if (!isOpen) return null;

  const secrets = getAllSecretsWithStatus();
  const { found, total, percentage } = getSecretProgress();

  const rarityColors = {
    common: nightMode ? 'text-green-400' : 'text-green-600',
    rare: nightMode ? 'text-blue-400' : 'text-blue-600',
    epic: nightMode ? 'text-purple-400' : 'text-purple-600',
    legendary: nightMode ? 'text-yellow-400' : 'text-yellow-600'
  };

  const rarityBgColors = {
    common: nightMode ? 'bg-green-500/20' : 'bg-green-100',
    rare: nightMode ? 'bg-blue-500/20' : 'bg-blue-100',
    epic: nightMode ? 'bg-purple-500/20' : 'bg-purple-100',
    legendary: nightMode ? 'bg-yellow-500/20' : 'bg-yellow-100'
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Museum */}
      <div
        className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] max-w-[95vw] max-h-[90vh] rounded-2xl shadow-2xl z-50 overflow-hidden ${
          nightMode ? 'bg-[#0a0a0a]' : 'bg-white'
        }`}
        style={{
          animation: 'popOut 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
      >
        {/* Header */}
        <div
          className="p-6"
          style={{
            background: nightMode
              ? 'linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)'
              : 'linear-gradient(135deg, #E8F3FE 0%, #EAE5FE 50%, #D9CDFE 100%)'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className={`w-7 h-7 ${nightMode ? 'text-white' : 'text-blue-600'}`} />
              <div>
                <h2 className={`text-2xl font-bold ${nightMode ? 'text-white' : 'text-blue-900'}`}>
                  Secret Museum
                </h2>
                <p className={`text-sm ${nightMode ? 'text-white/80' : 'text-blue-700'}`}>
                  {found} of {total} discovered ({percentage}%)
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
                nightMode
                  ? 'bg-white/20 hover:bg-white/30 text-white'
                  : 'bg-black/10 hover:bg-black/20 text-blue-900'
              }`}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className={`mt-4 h-3 rounded-full overflow-hidden ${nightMode ? 'bg-white/20' : 'bg-blue-200'}`}>
            <div
              className={`h-full transition-all duration-500 ${nightMode ? 'bg-white' : 'bg-blue-600'}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Secrets Grid */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {found === 0 && (
            <div className="text-center py-12">
              <Sparkles className={`w-16 h-16 mx-auto mb-4 ${nightMode ? 'text-slate-100/50' : 'text-slate-400'}`} />
              <p className={`text-lg font-semibold ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>
                No secrets found yet!
              </p>
              <p className={`text-sm mt-2 ${nightMode ? 'text-slate-100/70' : 'text-slate-600'}`}>
                Explore the app to discover hidden surprises
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            { secrets.map((secret) => (
              <div
                key={secret.id}
                className={`p-4 rounded-xl border transition-all ${
                  secret.discovered
                    ? nightMode
                      ? 'bg-white/5 border-white/10'
                      : 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200'
                    : nightMode
                    ? 'bg-white/[0.02] border-white/5'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 ${
                      secret.discovered
                        ? rarityBgColors[secret.rarity]
                        : nightMode
                        ? 'bg-white/5'
                        : 'bg-gray-200'
                    }`}
                  >
                    {secret.discovered ? secret.icon : <Lock className="w-8 h-8 text-gray-400" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-bold ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>
                        {secret.discovered ? secret.name : '???'}
                      </h3>
                      {secret.discovered && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${rarityColors[secret.rarity]} ${rarityBgColors[secret.rarity]}`}
                      >
                        {secret.rarity.toUpperCase()}
                      </span>
                    </div>

                    <p className={`text-sm ${nightMode ? 'text-slate-100/70' : 'text-slate-600'} mb-2`}>
                      {secret.discovered ? secret.description : 'Locked - Keep exploring!'}
                    </p>

                    {secret.discovered && (
                      <div className={`text-xs ${nightMode ? 'text-slate-100/50' : 'text-slate-500'} italic`}>
                        💡 {secret.funFact}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Hints Section */}
          {found > 0 && found < total && (
            <div className={`mt-6 p-4 rounded-xl ${nightMode ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
              <p className={`text-sm font-semibold mb-2 ${nightMode ? 'text-blue-400' : 'text-blue-900'}`}>
                💡 Hints for finding more:
              </p>
              <ul className={`text-xs space-y-1 ${nightMode ? 'text-slate-100/70' : 'text-slate-600'}`}>
                <li>• Try clicking things multiple times</li>
                <li>• Check the app at special times (3:16?)</li>
                <li>• Complete milestones (messages, friends)</li>
                <li>• Add keywords to your profile</li>
                <li>• Try classic gaming codes...</li>
              </ul>
            </div>
          )}

          {/* Master Hunter Message */}
          {found === total && (
            <div className={`mt-6 p-6 rounded-xl text-center ${nightMode ? 'bg-yellow-500/10' : 'bg-yellow-50'}`}>
              <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
              <p className={`text-xl font-bold mb-2 ${nightMode ? 'text-yellow-400' : 'text-yellow-900'}`}>
                🏆 Master Hunter!
              </p>
              <p className={`text-sm ${nightMode ? 'text-slate-100/70' : 'text-slate-600'}`}>
                You've discovered all {total} secrets! You're in the top 1% of Lightning users.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Animation */}
      <style>{`
        @keyframes popOut {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 0;
          }
          60% {
            transform: translate(-50%, -50%) scale(1.05);
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
};

export default SecretsMuseum;
