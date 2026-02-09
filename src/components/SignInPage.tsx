import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';

const SignInPage = () => {
  const { signIn, resetPassword } = useSupabaseAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const lightGradient = `linear-gradient(135deg, rgba(219, 234, 254, 0.63) 0%, transparent 100%),
                        radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.175) 0%, transparent 60%),
                        linear-gradient(45deg, #E8F3FE 0%, #EAE5FE 50%, #D9CDFE 100%)`;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: authError } = await signIn(email, password);

    if (authError) {
      if (authError.message?.includes('Invalid login credentials')) {
        setError('Incorrect email or password. Please try again.');
      } else if (authError.message?.includes('Email not confirmed')) {
        setError('Please check your email and confirm your account first.');
      } else {
        setError(authError.message || 'Something went wrong. Please try again.');
      }
    }
    // If no error, onAuthStateChange in context will handle redirect
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address first.');
      return;
    }
    setError('');
    setLoading(true);

    const { error: resetError } = await resetPassword(email);

    if (resetError) {
      setError(resetError.message || 'Could not send reset email. Please try again.');
    } else {
      setForgotSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: lightGradient }}>
      <div className="text-center w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-6xl font-bold mb-2" style={{ color: '#6366f1' }}>⚡</h1>
          <h2 className="text-4xl font-bold mb-2" style={{ color: '#4f46e5' }}>Lightning</h2>
          <p className="text-lg" style={{ color: '#6b7280' }}>Connect. Share. Grow.</p>
        </div>

        <div className="rounded-2xl shadow-2xl p-8 border border-white/25" style={{
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
        }}>
          <h3 className="text-2xl font-bold text-slate-800 mb-1">Sign in</h3>
          <p className="text-slate-600 mb-6 text-sm">Welcome back to Lightning</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm text-left">
              {error}
            </div>
          )}

          {forgotSent ? (
            <div className="text-left">
              <div className="mb-4 p-4 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                ✅ Password reset email sent! Check your inbox for a link to reset your password.
              </div>
              <button
                onClick={() => { setShowForgot(false); setForgotSent(false); setError(''); }}
                className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
              >
                ← Back to sign in
              </button>
            </div>
          ) : showForgot ? (
            <form onSubmit={handleForgotPassword} className="text-left">
              <p className="text-slate-600 text-sm mb-4">
                Enter your email and we'll send you a link to reset your password.
              </p>
              <div className="mb-4">
                <label className="block text-slate-700 font-semibold text-sm mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForgot(false); setError(''); }}
                className="mt-3 text-blue-600 hover:text-blue-700 font-semibold text-sm"
              >
                ← Back to sign in
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignIn} className="text-left">
              <div className="mb-4">
                <label className="block text-slate-700 font-semibold text-sm mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
                  required
                  autoFocus
                />
              </div>

              <div className="mb-2">
                <label className="block text-slate-700 font-semibold text-sm mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
                  required
                />
              </div>

              <div className="mb-5 text-right">
                <button
                  type="button"
                  onClick={() => { setShowForgot(true); setError(''); }}
                  className="text-blue-600 hover:text-blue-700 font-semibold text-xs"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>

              <div className="mt-4 pt-4 border-t border-slate-200 text-center">
                <span className="text-slate-600 text-sm">Don't have an account? </span>
                <Link to="/sign-up" className="text-blue-600 hover:text-blue-700 font-semibold text-sm">
                  Sign up
                </Link>
              </div>
            </form>
          )}
        </div>

        <p className="text-sm mt-6" style={{ color: '#6b7280' }}>
          A faith-based community to share your testimony and connect with others
        </p>
      </div>
    </div>
  );
};

export default SignInPage;
