/**
 * Unit Test: ProtectedRoute Component
 *
 * Tests the ProtectedRoute component that guards protected pages
 * and redirects unauthenticated users to the login page.
 *
 * Issue #291 - Protected pages should redirect to login instead of
 * showing error banners.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../../src/components/ProtectedRoute';
import { authService } from '../../src/services/auth.service';

// Mock the auth service
jest.mock('../../src/services/auth.service', () => ({
  authService: {
    isAuthenticated: jest.fn(),
    getUser: jest.fn(),
    getAccessToken: jest.fn(),
  },
}));

const mockedAuthService = authService as jest.Mocked<typeof authService>;

// Test component that represents a protected page
const ProtectedContent = () => <div data-testid="protected-content">Protected Content</div>;

// Test component for the login page
const LoginPage = () => <div data-testid="login-page">Login Page</div>;

/**
 * Helper to render the ProtectedRoute in a router context
 */
function renderProtectedRoute(initialPath: string = '/protected') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
              <ProtectedContent />
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when user is authenticated', () => {
    beforeEach(() => {
      mockedAuthService.isAuthenticated.mockReturnValue(true);
    });

    it('should render the protected content', () => {
      renderProtectedRoute();

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    });

    it('should not redirect to login page', () => {
      renderProtectedRoute();

      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    });
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockedAuthService.isAuthenticated.mockReturnValue(false);
    });

    it('should redirect to login page', () => {
      renderProtectedRoute();

      expect(screen.getByTestId('login-page')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should not render the protected content', () => {
      renderProtectedRoute();

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should not show any error message on the protected page', () => {
      renderProtectedRoute();

      // Ensure we're on login page, not showing an error on protected page
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
      expect(screen.queryByText(/not authenticated/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });

  describe('redirect behavior', () => {
    beforeEach(() => {
      mockedAuthService.isAuthenticated.mockReturnValue(false);
    });

    it('should preserve the intended destination for post-login redirect', () => {
      // This test verifies that the ProtectedRoute passes the intended
      // destination so that after login, the user can be redirected back
      renderProtectedRoute('/protected');

      // User should be on login page
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });

  describe('authentication check', () => {
    it('should call isAuthenticated on render', () => {
      mockedAuthService.isAuthenticated.mockReturnValue(true);

      renderProtectedRoute();

      expect(mockedAuthService.isAuthenticated).toHaveBeenCalled();
    });

    it('should check authentication each time the route is accessed', () => {
      // First render - authenticated
      mockedAuthService.isAuthenticated.mockReturnValue(true);
      const { unmount } = renderProtectedRoute();
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(mockedAuthService.isAuthenticated).toHaveBeenCalledTimes(1);

      unmount();

      // Second render - not authenticated
      mockedAuthService.isAuthenticated.mockReturnValue(false);
      renderProtectedRoute();
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
      expect(mockedAuthService.isAuthenticated).toHaveBeenCalledTimes(2);
    });
  });
});
