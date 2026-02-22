/*
 * AuthGuard — Route protection using Clerk
 *
 * Renders <Outlet /> for authenticated users.
 * Redirects to /sign-in for unauthenticated users.
 * Shows nothing while auth state is loading.
 */

import { useAuth } from '@clerk/clerk-react';
import { Outlet, Navigate } from 'react-router-dom';

const AuthGuard: React.FC = () => {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return null;
  if (!isSignedIn) return <Navigate to="/sign-in" replace />;

  return <Outlet />;
};

export default AuthGuard;
