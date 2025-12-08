/**
 * Menu Component
 *
 * Sliding menu panel that appears from the right side.
 * Contains navigation items based on authentication state:
 * - Unauthenticated: Login, Register
 * - Authenticated: My Characters, Create Character, New Game, Logout
 *
 * Features:
 * - Slides in/out with smooth animation
 * - Semi-transparent backdrop for click-to-close
 * - Keyboard handling (Esc to close)
 * - Mobile-responsive width
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Menu.module.css';
import { authService } from '../services/auth.service';

interface MenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Menu: React.FC<MenuProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const isAuthenticated = authService.isAuthenticated();

  // Handle Esc key to close menu
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      // Prevent scrolling when menu is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = () => {
    onClose();
  };

  const handleMenuItemClick = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
    onClose();
  };

  return (
    <>
      {/* Backdrop Overlay */}
      {isOpen && (
        <div
          className={styles.backdrop}
          onClick={handleBackdropClick}
          role="presentation"
          aria-hidden="true"
        ></div>
      )}

      {/* Menu Panel */}
      <nav
        className={`${styles.menuPanel} ${isOpen ? styles.menuOpen : ''}`}
        role="navigation"
        aria-label="Main navigation"
        aria-hidden={!isOpen}
      >
        {/* Menu Items */}
        <div className={styles.menuItems}>
          {!isAuthenticated ? (
            // Unauthenticated Menu Items
            <>
              <button
                className={styles.menuItem}
                onClick={() => handleMenuItemClick('/login')}
              >
                <span className={styles.menuItemText}>Login</span>
              </button>
              <button
                className={styles.menuItem}
                onClick={() => handleMenuItemClick('/register')}
              >
                <span className={styles.menuItemText}>Register</span>
              </button>
            </>
          ) : (
            // Authenticated Menu Items
            <>
              <button
                className={styles.menuItem}
                onClick={() => handleMenuItemClick('/characters')}
              >
                <span className={styles.menuItemText}>My Characters</span>
              </button>
              <button
                className={styles.menuItem}
                onClick={() => handleMenuItemClick('/characters/new')}
              >
                <span className={styles.menuItemText}>Create Character</span>
              </button>
              <button
                className={styles.menuItem}
                onClick={() => handleMenuItemClick('/')}
              >
                <span className={styles.menuItemText}>New Game</span>
              </button>
              <div className={styles.menuDivider}></div>
              <button
                className={`${styles.menuItem} ${styles.menuItemDanger}`}
                onClick={handleLogout}
              >
                <span className={styles.menuItemText}>Logout</span>
              </button>
            </>
          )}
        </div>
      </nav>
    </>
  );
};

export default Menu;
