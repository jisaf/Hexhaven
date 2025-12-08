/**
 * Header Component
 *
 * Fixed header bar that appears on all non-game pages.
 * Contains Hexhaven branding on the left and menu controls on the right.
 * - Logo/branding (left)
 * - Language selector (right)
 * - Menu toggle button (right)
 */

import React from 'react';
import styles from './Header.module.css';
import LanguageSelector from './LanguageSelector';

interface HeaderProps {
  menuOpen: boolean;
  onMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ menuOpen, onMenuToggle }) => {
  return (
    <header className={styles.header}>
      {/* Left: Hexhaven Logo/Branding */}
      <div className={styles.headerLeft}>
        <h1 className={styles.brand}>Hexhaven</h1>
      </div>

      {/* Center: Spacer */}
      <div className={styles.headerSpacer}></div>

      {/* Right: Language Selector + Menu Toggle */}
      <div className={styles.headerRight}>
        <LanguageSelector />
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
