import React from 'react';
import { SignIn } from '@clerk/clerk-react';

const SignInPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4facfe] to-[#00f2fe] flex items-center justify-center p-4">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-white mb-2">⚡</h1>
          <h2 className="text-4xl font-bold text-white mb-2">Lightning</h2>
          <p className="text-white/90 text-lg">Connect. Share. Grow.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <SignIn
            appearance={{
              elements: {
                formButtonPrimary: 'bg-blue-500 hover:bg-blue-600 text-white',
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

        <p className="text-white/80 text-sm mt-6">
          A faith-based community to share your testimony and connect with others
        </p>
      </div>
    </div>
  );
};

export default SignInPage;
