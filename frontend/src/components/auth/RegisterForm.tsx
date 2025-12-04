/**
 * Registration Form Component (T094)
 * Allows users to create a new account
 */

import { useState } from 'react';
import { authService } from '../../services/auth.service';
import type { RegisterCredentials } from '../../types/auth.types';
import './AuthForms.css';

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const [credentials, setCredentials] = useState<RegisterCredentials>({
    username: '',
    password: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (credentials.password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length (client-side)
    if (credentials.password.length < 12) {
      setError('Password must be at least 12 characters');
      return;
    }

    // Validate username
    if (credentials.username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    setIsLoading(true);

    try {
      await authService.register(credentials);

      // Registration successful
      if (onSuccess) {
        onSuccess();
      } else {
        // Default: redirect to home
        window.location.href = '/';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-form-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>Create Account</h2>

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
            placeholder="Choose a username (3-20 characters)"
            required
            minLength={3}
            maxLength={20}
            pattern="[a-zA-Z0-9_-]+"
            title="Username can only contain letters, numbers, underscore, and hyphen"
            disabled={isLoading}
            autoComplete="username"
          />
          <small className="form-hint">
            3-20 characters, letters, numbers, underscore, hyphen only
          </small>
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
            placeholder="Create a strong password"
            required
            minLength={12}
            maxLength={128}
            disabled={isLoading}
            autoComplete="new-password"
          />
          <small className="form-hint">Minimum 12 characters</small>
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">
            Confirm Password
            <span className="required">*</span>
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            required
            minLength={12}
            maxLength={128}
            disabled={isLoading}
            autoComplete="new-password"
          />
        </div>

        <button type="submit" className="submit-button" disabled={isLoading}>
          {isLoading ? 'Creating Account...' : 'Register'}
        </button>

        {onSwitchToLogin && (
          <div className="form-footer">
            Already have an account?{' '}
            <button type="button" onClick={onSwitchToLogin} className="link-button">
              Login here
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
