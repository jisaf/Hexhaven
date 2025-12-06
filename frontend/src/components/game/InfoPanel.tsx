/**
 * InfoPanel Component
 *
 * Container that manages:
 * 1. Always visible: TurnStatus (50%) + GameLog (50%)
 * 2. Overlay when active: CardSelectionPanel (100%) with slide animation
 *
 * CardSelectionPanel can be minimized to see game state underneath.
 */

import { ReactNode } from 'react';
import styles from './InfoPanel.module.css';

interface InfoPanelProps {
  /** Upper half: TurnStatus component */
  turnStatus: ReactNode;

  /** Lower half: GameLog component */
  gameLog: ReactNode;

  /** Optional: CardSelectionPanel (overlays on top when active) */
  cardSelection?: ReactNode;

  /** Whether card selection is currently active */
  showCardSelection: boolean;
}

export function InfoPanel({
  turnStatus,
  gameLog,
  cardSelection,
  showCardSelection,
}: InfoPanelProps) {
  return (
    <div className={styles.infoPanel}>
      {/* Always visible: TurnStatus + GameLog */}
      <div className={styles.turnStatusContainer}>
        {turnStatus}
      </div>
      <div className={styles.gameLogContainer}>
        {gameLog}
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
