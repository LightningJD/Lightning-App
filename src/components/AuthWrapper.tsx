import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SupabaseAuthProvider, useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import SignInPage from './SignInPage';
import SignUpPage from './SignUpPage';

interface AuthWrapperProps {
  children: React.ReactNode;
}

/**
 * Inner component that uses the auth context for route guarding.
 * Must be inside SupabaseAuthProvider to access useSupabaseAuth().
 */
const AuthRoutes: React.FC<AuthWrapperProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useSupabaseAuth();

  // Show loading spinner while Supabase checks session
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, rgba(219, 234, 254, 0.63) 0%, transparent 100%), radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.175) 0%, transparent 60%), linear-gradient(45deg, #E8F3FE 0%, #EAE5FE 50%, #D9CDFE 100%)'
        }}
      >
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">⚡</div>
          <p className="text-slate-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/sign-in/*"
        element={isAuthenticated ? <Navigate to="/" replace /> : <SignInPage />}
      />
      <Route
        path="/sign-up/*"
        element={isAuthenticated ? <Navigate to="/" replace /> : <SignUpPage />}
      />
      <Route
        path="/*"
        element={isAuthenticated ? <>{children}</> : <Navigate to="/sign-in" replace />}
      />
    </Routes>
  );
};

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  return (
    <SupabaseAuthProvider>
      <BrowserRouter>
        <AuthRoutes>{children}</AuthRoutes>
      </BrowserRouter>
    </SupabaseAuthProvider>
  );
};

export default AuthWrapper;
