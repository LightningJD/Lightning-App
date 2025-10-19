import React from 'react';
import { SignUp } from '@clerk/clerk-react';

const SignUpPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4facfe] to-[#00f2fe] flex items-center justify-center p-4">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-white mb-2">⚡</h1>
          <h2 className="text-4xl font-bold text-white mb-2">Join Lightning</h2>
          <p className="text-white/90 text-lg">Start sharing your testimony today</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <SignUp
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
            path="/sign-up"
            signInUrl="/sign-in"
          />
        </div>

        <p className="text-white/80 text-sm mt-6">
          Free account • Share your story • Connect with believers worldwide
        </p>
      </div>
    </div>
  );
};

export default SignUpPage;
