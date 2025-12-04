/**
 * Login Form Component (T095)
 * Allows users to authenticate with existing credentials
 */

import { useState } from 'react';
import { authService } from '../../services/auth.service';
import type { LoginCredentials } from '../../types/auth.types';
import './AuthForms.css';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

export function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await authService.login(credentials);

      // Login successful
      if (onSuccess) {
        onSuccess();
      } else {
        // Default: redirect to home
        window.location.href = '/';
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';

      // Check for rate limit error
      if (errorMessage.includes('Account locked') || errorMessage.includes('too many')) {
        setError('Account temporarily locked due to too many failed login attempts. Please try again in 15 minutes.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-form-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>Login</h2>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="username">
            Username
            <span className="required">*</span>
          </label>
          <input
            id="username"
            type="text"
            value={credentials.username}
            onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
            placeholder="Enter your username"
            required
            disabled={isLoading}
            autoComplete="username"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">
            Password
            <span className="required">*</span>
          </label>
          <input
            id="password"
            type="password"
            value={credentials.password}
            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
            placeholder="Enter your password"
            required
            disabled={isLoading}
            autoComplete="current-password"
          />
        </div>

        <button type="submit" className="submit-button" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>

        {onSwitchToRegister && (
          <div className="form-footer">
            Don't have an account?{' '}
            <button type="button" onClick={onSwitchToRegister} className="link-button">
              Register here
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
