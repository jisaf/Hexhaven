/**
 * Header Component
 *
 * Fixed header bar that appears on all non-game pages.
 * Contains Hexhaven branding on the left and menu controls on the right.
 * - Logo/branding (left)
 * - Create Game button (right, only on Lobby page)
 * - Menu toggle button (right)
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Header.module.css';

interface HeaderProps {
  menuOpen: boolean;
  onMenuToggle: () => void;
  onCreateGame?: () => void; // Optional - only passed on Lobby page
  showCreateGame?: boolean; // Whether to show Create Game button
}

export const Header: React.FC<HeaderProps> = ({
  menuOpen,
  onMenuToggle,
  onCreateGame,
  showCreateGame = false
}) => {
  const navigate = useNavigate();

  const handleBrandClick = () => {
    navigate('/');
  };

  return (
    <header className={styles.header}>
      {/* Left: Hexhaven Logo/Branding */}
      <div className={styles.headerLeft}>
        <h1 className={styles.brand} onClick={handleBrandClick}>
          Hexhaven
        </h1>
      </div>

      {/* Center: Spacer */}
      <div className={styles.headerSpacer}></div>

      {/* Right: Create Game Button + Menu Toggle */}
      <div className={styles.headerRight}>
        {showCreateGame && onCreateGame && (
          <button
            className={styles.createGameButton}
            onClick={onCreateGame}
            aria-label="Create Game"
            title="Create a new game"
          >
            Create Game
          </button>
        )}
        <button
          className={`${styles.menuToggleButton} ${menuOpen ? styles.menuOpen : ''}`}
          onClick={onMenuToggle}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          title="Toggle navigation menu"
        >
          <span className={styles.hamburger}>
            <span className={styles.hamburgerLine}></span>
            <span className={styles.hamburgerLine}></span>
            <span className={styles.hamburgerLine}></span>
          </span>
        </button>
      </div>
    </header>
  );
};

export default Header;
