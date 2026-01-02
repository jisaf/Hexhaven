/**
 * InfoPanel Component (Updated for Issue #205)
 *
 * Container that manages:
 * 1. Always visible: TurnStatus + GameLog + CardPileBar (44px at bottom)
 * 2. Overlay when active: BottomSheet with content
 *
 * BottomSheet can be swiped down to dismiss.
 * Content is controlled by which card pile is clicked.
 */

import type { ReactNode } from 'react';
import { BottomSheet } from '../BottomSheet';
import styles from './InfoPanel.module.css';

interface InfoPanelProps {
  /** Upper section: TurnStatus component */
  turnStatus: ReactNode;

  /** Middle section: GameLog component */
  gameLog: ReactNode;

  /** Bottom section: CardPileIndicator (44px fixed height) */
  cardPileBar: ReactNode;

  /** Content to display in the bottom sheet */
  sheetContent?: ReactNode;

  /** Whether the bottom sheet is open */
  isSheetOpen: boolean;

  /** Callback when sheet is closed */
  onSheetClose?: () => void;

  /** Title for the sheet */
  sheetTitle?: string;
}

export function InfoPanel({
  turnStatus,
  gameLog,
  cardPileBar,
  sheetContent,
  isSheetOpen,
  onSheetClose,
  sheetTitle,
}: InfoPanelProps) {
  const handleClose = () => {
    onSheetClose?.();
  };

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

      {/* Bottom sheet overlay: slides in on top when active */}
      {isSheetOpen && sheetContent && (
        <div className={styles.cardSelectionOverlay}>
          <BottomSheet
            isOpen={isSheetOpen}
            onClose={handleClose}
            showCloseButton={!!onSheetClose}
            title={sheetTitle}
          >
            {sheetContent}
          </BottomSheet>
        </div>
      )}
    </div>
  );
}
