import { SignIn } from '@clerk/clerk-react';

const SignInPage = () => {
  const lightGradient = `linear-gradient(135deg, rgba(219, 234, 254, 0.63) 0%, transparent 100%),
                        radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.175) 0%, transparent 60%),
                        linear-gradient(45deg, #E8F3FE 0%, #EAE5FE 50%, #D9CDFE 100%)`;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: lightGradient }}>
      <div className="text-center">
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
          <SignIn
            appearance={{
              elements: {
                formButtonPrimary: 'bg-blue-500 hover:bg-blue-600 text-slate-100',
                card: 'shadow-none',
                headerTitle: 'text-2xl font-bold text-slate-800',
                headerSubtitle: 'text-slate-600',
                socialButtonsBlockButton: 'border-slate-300 hover:bg-slate-50',
                formFieldLabel: 'text-slate-700 font-semibold',
                formFieldInput: 'border-slate-300 focus:border-blue-500',
                footerActionLink: 'text-blue-500 hover:text-blue-600'
              }
            }}
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
          />
        </div>

        <p className="text-sm mt-6" style={{ color: '#6b7280' }}>
          A faith-based community to share your testimony and connect with others
        </p>
      </div>
    </div>
  );
};

export default SignInPage;
