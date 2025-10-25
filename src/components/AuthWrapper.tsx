import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-react';
import SignInPage from './SignInPage';
import SignUpPage from './SignUpPage';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const AuthWrapper = ({ children }) => {
  if (!CLERK_PUBLISHABLE_KEY) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Configuration Error</h2>
          <p className="text-slate-700 mb-4">
            Missing Clerk Publishable Key. Please follow these steps:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
            <li>Go to <a href="https://clerk.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">clerk.com</a></li>
            <li>Sign up for a free account</li>
            <li>Create a new application named "Lightning"</li>
            <li>Copy your Publishable Key from the dashboard</li>
            <li>Add it to your <code className="bg-slate-100 px-1 rounded">.env.local</code> file</li>
            <li>Restart the development server</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/sign-in/*"
            element={
              <>
                <SignedIn>
                  <Navigate to="/" replace />
                </SignedIn>
                <SignedOut>
                  <SignInPage />
                </SignedOut>
              </>
            }
          />
          <Route
            path="/sign-up/*"
            element={
              <>
                <SignedIn>
                  <Navigate to="/" replace />
                </SignedIn>
                <SignedOut>
                  <SignUpPage />
                </SignedOut>
              </>
            }
          />
          <Route
            path="/*"
            element={
              <>
                <SignedIn>
                  {children}
                </SignedIn>
                <SignedOut>
                  <Navigate to="/sign-in" replace />
                </SignedOut>
              </>
            }
          />
        </Routes>
      </BrowserRouter>
    </ClerkProvider>
  );
};

export default AuthWrapper;
