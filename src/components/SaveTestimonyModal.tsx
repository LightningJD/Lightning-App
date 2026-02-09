import React, { useState } from 'react';
import { X, Check, Sparkles } from 'lucide-react';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';

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
  const { signIn, signUp } = useSupabaseAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (mode === 'signup') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        setLoading(false);
        return;
      }
      if (username.trim().length < 3) {
        setError('Username must be at least 3 characters.');
        setLoading(false);
        return;
      }
      const { error: authError } = await signUp(email, password, {
        username: username.trim().toLowerCase(),
        display_name: username.trim()
      });
      if (authError) {
        setError(authError.message?.includes('already registered')
          ? 'This email is already registered. Try signing in.'
          : authError.message || 'Something went wrong.');
      } else {
        setSignupSuccess(true);
      }
    } else {
      const { error: authError } = await signIn(email, password);
      if (authError) {
        setError(authError.message?.includes('Invalid login credentials')
          ? 'Incorrect email or password.'
          : authError.message || 'Something went wrong.');
      }
      // On success, auth state change handles the rest
    }
    setLoading(false);
  };

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

          {/* Auth Form */}
          <div className="mb-4">
            {signupSuccess ? (
              <div className={`p-4 rounded-lg border text-sm ${
                nightMode
                  ? 'bg-green-500/10 border-green-400/30 text-green-300'
                  : 'bg-green-50 border-green-200 text-green-700'
              }`}>
                <p className="font-semibold mb-1">Account created!</p>
                <p>Check your email for a confirmation link, then sign in to save your testimony.</p>
                <button
                  onClick={() => { setMode('signin'); setSignupSuccess(false); setError(''); }}
                  className={`mt-2 font-semibold text-sm ${nightMode ? 'text-blue-400' : 'text-blue-600'}`}
                >
                  Sign in now →
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {error && (
                  <div className={`mb-3 p-3 rounded-lg text-sm ${
                    nightMode
                      ? 'bg-red-500/10 border border-red-400/30 text-red-300'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}>
                    {error}
                  </div>
                )}

                {mode === 'signup' && (
                  <div className="mb-3">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username"
                      className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all text-sm ${
                        nightMode
                          ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-400 focus:border-blue-400'
                          : 'bg-white border-slate-300 focus:border-blue-500'
                      }`}
                      required
                    />
                  </div>
                )}

                <div className="mb-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all text-sm ${
                      nightMode
                        ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-400 focus:border-blue-400'
                        : 'bg-white border-slate-300 focus:border-blue-500'
                    }`}
                    required
                  />
                </div>

                <div className="mb-4">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all text-sm ${
                      nightMode
                        ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-400 focus:border-blue-400'
                        : 'bg-white border-slate-300 focus:border-blue-500'
                    }`}
                    required
                    minLength={6}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-colors disabled:opacity-50 text-sm"
                >
                  {loading
                    ? (mode === 'signup' ? 'Creating account...' : 'Signing in...')
                    : (mode === 'signup' ? 'Create Account & Save' : 'Sign In')}
                </button>

                <p className={`text-center text-xs mt-3 ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {mode === 'signup' ? (
                    <>Already have an account?{' '}
                      <button type="button" onClick={() => { setMode('signin'); setError(''); }} className={`font-semibold ${nightMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        Sign in
                      </button>
                    </>
                  ) : (
                    <>Need an account?{' '}
                      <button type="button" onClick={() => { setMode('signup'); setError(''); }} className={`font-semibold ${nightMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        Sign up
                      </button>
                    </>
                  )}
                </p>
              </form>
            )}
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
            Your testimony will be private until you choose to share it
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
