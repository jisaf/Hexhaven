/**
 * ProtectedRoute Component
 *
 * A route guard that checks if the user is authenticated before
 * rendering protected content. Redirects unauthenticated users
 * to the login page.
 *
 * Issue #291 - Protected pages should redirect to login instead of
 * showing error banners.
 */

import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '../services/auth.service';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Wraps protected routes to ensure only authenticated users can access them.
 * Unauthenticated users are redirected to /login with the original
 * destination preserved in location state for post-login redirect.
 *
 * Includes a brief loading state to prevent flash of redirect during
 * initial auth state determination.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check auth state after component mounts to ensure localStorage is available
    const checkAuth = () => {
      setIsAuthenticated(authService.isAuthenticated());
      setIsLoading(false);
    };

    // Small delay to handle any async initialization
    checkAuth();
  }, []);

  // Show nothing during initial auth check to prevent flash
  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    // Redirect to login, preserving the intended destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
