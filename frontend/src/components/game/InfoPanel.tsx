/**
 * InfoPanel Component
 *
 * Container that manages:
 * 1. Always visible: TurnStatus + GameLog + CardPileBar (44px at bottom)
 * 2. Overlay when active: CardSelectionPanel (100%) with slide animation
 *
 * CardSelectionPanel can be minimized to see game state underneath.
 */

import type { ReactNode } from 'react';
import styles from './InfoPanel.module.css';

interface InfoPanelProps {
  /** Upper section: TurnStatus component */
  turnStatus: ReactNode;

  /** Middle section: GameLog component */
  gameLog: ReactNode;

  /** Bottom section: CardPileIndicator (44px fixed height) */
  cardPileBar: ReactNode;

  /** Optional: CardSelectionPanel (overlays on top when active) */
  cardSelection?: ReactNode;

  /** Whether card selection is currently active */
  showCardSelection: boolean;
}

export function InfoPanel({
  turnStatus,
  gameLog,
  cardPileBar,
  cardSelection,
  showCardSelection,
}: InfoPanelProps) {
  return (
    <div className={styles.infoPanel}>
      {/* Always visible: TurnStatus + GameLog + CardPileBar */}
      <div className={styles.turnStatusContainer}>
        {turnStatus}
      </div>
      <div className={styles.gameLogContainer}>
        {gameLog}
      </div>
      <div className={styles.cardPileBarContainer}>
        {cardPileBar}
      </div>

      {/* Card selection overlay: slides in on top when active */}
      {showCardSelection && cardSelection && (
        <div className={styles.cardSelectionOverlay}>
          {cardSelection}
        </div>
      )}
    </div>
  );
}
