/**
 * Login Page (T096, T099)
 * Allows users to authenticate with existing credentials
 */

import { useNavigate } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';

export function Login() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    // Redirect to lobby after successful login
    navigate('/');
  };

  const handleSwitchToRegister = () => {
    navigate('/register');
  };

  return (
    <LoginForm
      onSuccess={handleSuccess}
      onSwitchToRegister={handleSwitchToRegister}
    />
  );
}
