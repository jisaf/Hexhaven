/**
 * GamePanel Component
 *
 * Container for the hex map game board (PixiJS canvas).
 * Handles proper sizing and positioning for both portrait and landscape modes.
 */

import { forwardRef } from 'react';
import styles from './GamePanel.module.css';

interface GamePanelProps {
  className?: string;
}

export const GamePanel = forwardRef<HTMLDivElement, GamePanelProps>(
  ({ className }, ref) => {
    return (
      <div ref={ref} className={`${styles.gamePanel} ${className || ''}`} />
    );
  }
);

GamePanel.displayName = 'GamePanel';
