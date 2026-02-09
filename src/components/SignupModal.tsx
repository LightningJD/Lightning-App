import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';

interface SignupModalProps {
  version?: 1 | 2;
  onDismiss?: () => void;
  nightMode: boolean;
}

const SignupModal: React.FC<SignupModalProps> = ({ version = 1, onDismiss, nightMode }) => {
  const { signIn, signUp } = useSupabaseAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  // Modal content based on version
  const modalContent = {
    1: {
      // Soft block - can dismiss
      emoji: '✨',
      title: 'Experience the Full Community',
      subtitle: "You've viewed your free testimonies.",
      benefits: [
        'Read unlimited testimonies',
        'Connect with believers nearby',
        'Share your own story',
        'Message friends and join groups'
      ],
      dismissText: 'Continue as Guest',
      canDismiss: true,
      blurIntensity: 'blur(5px)'
    },
    2: {
      // Hard block - cannot dismiss
      emoji: '⛔',
      title: 'Join Lightning to Continue',
      subtitle: 'Create your free account to keep exploring',
      benefits: [
        'Read all testimonies',
        'Share your story with the community',
        'Message nearby believers',
        'Join groups and build connections'
      ],
      dismissText: null,
      canDismiss: false,
      blurIntensity: 'blur(10px)'
    }
  };

  const content = modalContent[version] || modalContent[1];

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
        className="fixed inset-0 bg-black/60 z-50 animate-in fade-in duration-300"
        style={{
          backdropFilter: content.blurIntensity,
          WebkitBackdropFilter: content.blurIntensity
        }}
        onClick={content.canDismiss && onDismiss ? onDismiss : undefined}
      />

      {/* Modal */}
      <div
        className={`fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto z-50 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 ${
          nightMode ? 'bg-[#0a0a0a]' : 'bg-gradient-to-b from-purple-50 via-blue-50 to-pink-50'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button (only for version 1) */}
        {content.canDismiss && onDismiss && (
          <button
            onClick={onDismiss}
            className={`absolute top-4 right-4 p-2 rounded-lg transition-colors z-10 ${
              nightMode ? 'hover:bg-white/10 text-slate-100' : 'hover:bg-white/30 text-black'
            }`}
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="p-8 text-center">
          {/* Icon */}
          <div className="text-6xl mb-4">{content.emoji}</div>

          {/* Title */}
          <h2 className={`text-2xl font-bold mb-2 ${nightMode ? 'text-slate-100' : 'text-black'}`}>
            {content.title}
          </h2>

          {/* Subtitle */}
          <p className={`text-sm mb-6 ${nightMode ? 'text-slate-100/80' : 'text-black/70'}`}>
            {content.subtitle}
          </p>

          {/* Benefits */}
          <div
            className={`rounded-xl p-4 mb-6 text-left ${
              nightMode ? 'bg-white/5' : 'bg-white/40'
            }`}
          >
            <ul className="space-y-2">
              {content.benefits.map((benefit, i) => (
                <li key={i} className={`flex items-center gap-2 text-sm ${
                  nightMode ? 'text-slate-100' : 'text-black'
                }`}>
                  <span className="text-blue-500 font-bold">✓</span>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          {/* Auth Form */}
          <div className="space-y-3">
            {signupSuccess ? (
              <div className={`p-4 rounded-lg border text-sm text-left ${
                nightMode
                  ? 'bg-green-500/10 border-green-400/30 text-green-300'
                  : 'bg-green-50 border-green-200 text-green-700'
              }`}>
                <p className="font-semibold mb-1">Account created!</p>
                <p>Check your email for a confirmation link, then sign in.</p>
                <button
                  onClick={() => { setMode('signin'); setSignupSuccess(false); setError(''); }}
                  className={`mt-2 font-semibold text-sm ${nightMode ? 'text-blue-400' : 'text-blue-600'}`}
                >
                  Sign in now →
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="text-left">
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
                    : (mode === 'signup' ? 'Create Free Account' : 'Sign In')}
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

            {/* Secondary: Dismiss (only for version 1) */}
            {content.canDismiss && onDismiss && (
              <button
                onClick={onDismiss}
                className={`w-full text-sm py-2 rounded-lg transition-colors ${
                  nightMode
                    ? 'text-slate-100/60 hover:text-slate-100/80 hover:bg-white/5'
                    : 'text-black/60 hover:text-black/80 hover:bg-white/30'
                }`}
              >
                {content.dismissText}
              </button>
            )}

            {/* Version indicator (for hard block) */}
            {!content.canDismiss && (
              <p className={`text-xs mt-4 ${nightMode ? 'text-slate-100/50' : 'text-black/50'}`}>
                Sign up is free and takes less than 30 seconds
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SignupModal;
