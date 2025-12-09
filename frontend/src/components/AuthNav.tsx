/**
 * Authentication Navigation Component
 * Shows login/register links when logged out, or user info when logged in
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/auth.service';
import './AuthNav.css';

export function AuthNav() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = () => {
      const loggedIn = authService.isAuthenticated();
      setIsLoggedIn(loggedIn);

      if (loggedIn) {
        // Get username from stored user data
        const userData = localStorage.getItem('hexhaven_user');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            setUsername(user.username);
          } catch (e) {
            console.error('Failed to parse user data:', e);
          }
        }
      }
    };

    checkAuth();

    // Listen for auth changes
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  const handleLogout = () => {
    authService.logout();
    setIsLoggedIn(false);
    setUsername(null);
    window.location.reload();
  };

  return (
    <nav className="auth-nav">
      {isLoggedIn ? (
        <div className="auth-nav-logged-in">
          <span className="auth-nav-username">👤 {username}</span>
          <Link to="/characters" className="auth-nav-link">
            My Characters
          </Link>
          <Link to="/history" className="auth-nav-link">
            Match History
          </Link>
          <button onClick={handleLogout} className="auth-nav-logout">
            Logout
          </button>
        </div>
      ) : (
        <div className="auth-nav-logged-out">
          <Link to="/login" className="auth-nav-link">
            Login
          </Link>
          <Link to="/register" className="auth-nav-link auth-nav-register">
            Register
          </Link>
        </div>
      )}
    </nav>
  );
}
