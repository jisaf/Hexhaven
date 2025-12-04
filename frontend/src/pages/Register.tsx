/**
 * Register Page (T097, T098)
 * Allows users to create a new account
 */

import { useNavigate } from 'react-router-dom';
import { RegisterForm } from '../components/auth/RegisterForm';

export function Register() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    // Redirect to lobby after successful registration
    navigate('/');
  };

  const handleSwitchToLogin = () => {
    navigate('/login');
  };

  return (
    <RegisterForm
      onSuccess={handleSuccess}
      onSwitchToLogin={handleSwitchToLogin}
    />
  );
}
