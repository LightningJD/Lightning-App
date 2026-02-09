import { X, Check, Sparkles } from 'lucide-react';
import { SignIn } from '@clerk/clerk-react';

/**
 * Save Testimony Modal
 *
 * Appears after guest generates testimony
 * Part of Testimony-First Conversion Strategy (65-80% conversion)
 *
 * Psychology:
 * - Sunk cost fallacy (they invested 5-10 minutes)
 * - Loss aversion (don't want to lose their testimony)
 * - Emotional connection (personal story)
 */

interface SaveTestimonyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueAsGuest: () => void;
  nightMode: boolean;
  testimonyPreview: string;
}

const SaveTestimonyModal: React.FC<SaveTestimonyModalProps> = ({ isOpen, onClose, onContinueAsGuest, nightMode, testimonyPreview }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] max-w-[90vw] max-h-[85vh] rounded-2xl shadow-2xl z-50 overflow-hidden ${
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
            <div className="flex items-center gap-2">
              <Sparkles className={`w-6 h-6 ${nightMode ? 'text-white' : 'text-blue-600'}`} />
              <h2 className={`text-xl font-bold ${nightMode ? 'text-white' : 'text-blue-900'}`}>
                Save Your Testimony
              </h2>
            </div>
            <button
              onClick={onClose}
              className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                nightMode
                  ? 'bg-white/20 hover:bg-white/30 text-white'
                  : 'bg-black/10 hover:bg-black/20 text-blue-900'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-180px)]">
          {/* Testimony Preview */}
          <div
            className={`mb-6 p-4 rounded-lg border ${
              nightMode
                ? 'bg-white/5 border-white/10'
                : 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200'
            }`}
          >
            <p className={`text-sm leading-relaxed line-clamp-4 ${nightMode ? 'text-slate-100' : 'text-slate-700'}`}>
              {testimonyPreview}
            </p>
            {testimonyPreview && testimonyPreview.length > 200 && (
              <p className={`text-xs mt-2 italic ${nightMode ? 'text-slate-100/70' : 'text-slate-500'}`}>
                ...and more
              </p>
            )}
          </div>

          {/* Message */}
          <p className={`mb-4 ${nightMode ? 'text-slate-100' : 'text-slate-900'}`}>
            Your story is ready! Create a free account to:
          </p>

          {/* Benefits List */}
          <div className="space-y-3 mb-6">
            {[
              'Publish your testimony to the community',
              'Share your story and inspire others',
              'Connect with believers who relate',
              'Keep your testimony forever',
              'Edit and update anytime',
              'Get encouragement from others'
            ].map((benefit, index) => (
              <div key={index} className="flex items-start gap-3">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    nightMode ? 'bg-blue-500/20' : 'bg-blue-100'
                  }`}
                >
                  <Check className={`w-3 h-3 ${nightMode ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <p className={`text-sm ${nightMode ? 'text-slate-100' : 'text-slate-700'}`}>{benefit}</p>
              </div>
            ))}
          </div>

          {/* Clerk Sign In Component */}
          <div className="mb-4">
            <SignIn
              routing="hash"
              signUpUrl="#/sign-up"
              appearance={{
                elements: {
                  rootBox: 'w-full',
                  card: nightMode
                    ? 'bg-white/5 border border-white/10 shadow-none'
                    : 'bg-white border border-slate-200 shadow-none'
                }
              }}
            />
          </div>

          {/* Continue as Guest (Small, Less Prominent) */}
          <button
            onClick={onContinueAsGuest}
            className={`w-full text-center text-xs underline transition-colors ${
              nightMode
                ? 'text-slate-100/60 hover:text-slate-100/80'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Continue without saving (not recommended)
          </button>

          {/* Security Note */}
          <p
            className={`text-xs text-center mt-4 ${
              nightMode ? 'text-slate-100/50' : 'text-slate-400'
            }`}
          >
            🔒 Your testimony will be private until you choose to share it
          </p>
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

export default SaveTestimonyModal;
