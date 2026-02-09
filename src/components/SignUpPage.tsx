import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';

const SignUpPage = () => {
  const { signUp } = useSupabaseAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const lightGradient = `linear-gradient(135deg, rgba(219, 234, 254, 0.63) 0%, transparent 100%),
                        radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.175) 0%, transparent 60%),
                        linear-gradient(45deg, #E8F3FE 0%, #EAE5FE 50%, #D9CDFE 100%)`;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters long.');
      return;
    }
    if (/[^a-zA-Z0-9_]/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores.');
      return;
    }

    setLoading(true);

    const { error: authError } = await signUp(email, password, {
      username: username.trim().toLowerCase(),
      display_name: displayName.trim() || username.trim()
    });

    if (authError) {
      if (authError.message?.includes('already registered')) {
        setError('This email is already registered. Try signing in instead.');
      } else {
        setError(authError.message || 'Something went wrong. Please try again.');
      }
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: lightGradient }}>
      <div className="text-center w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-6xl font-bold mb-2" style={{ color: '#6366f1' }}>⚡</h1>
          <h2 className="text-4xl font-bold mb-2" style={{ color: '#4f46e5' }}>Join Lightning</h2>
          <p className="text-lg" style={{ color: '#6b7280' }}>Start sharing your testimony today</p>
        </div>

        <div className="rounded-2xl shadow-2xl p-8 border border-white/25" style={{
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
        }}>
          {success ? (
            <div className="text-left">
              <div className="mb-4 p-4 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                <p className="font-semibold mb-1">✅ Account created!</p>
                <p>Check your email for a confirmation link, then sign in.</p>
              </div>
              <Link
                to="/sign-in"
                className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
              >
                ← Go to sign in
              </Link>
            </div>
          ) : (
            <>
              <h3 className="text-2xl font-bold text-slate-800 mb-1">Create Account</h3>
              <p className="text-slate-600 mb-6 text-sm">It's free — join the community</p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm text-left">
                  {error}
                </div>
              )}

              <form onSubmit={handleSignUp} className="text-left">
                <div className="mb-4">
                  <label className="block text-slate-700 font-semibold text-sm mb-1">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a username (e.g., johndoe)"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
                    required
                    autoFocus
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-slate-700 font-semibold text-sm mb-1">
                    Display Name <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name as shown to others"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-slate-700 font-semibold text-sm mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
                    required
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-slate-700 font-semibold text-sm mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
                    required
                    minLength={6}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>

                <div className="mt-4 pt-4 border-t border-slate-200 text-center">
                  <span className="text-slate-600 text-sm">Already have an account? </span>
                  <Link to="/sign-in" className="text-blue-600 hover:text-blue-700 font-semibold text-sm">
                    Sign in
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>

        <p className="text-sm mt-6" style={{ color: '#6b7280' }}>
          Free account • Share your story • Connect with believers worldwide
        </p>
      </div>
    </div>
  );
};

export default SignUpPage;
