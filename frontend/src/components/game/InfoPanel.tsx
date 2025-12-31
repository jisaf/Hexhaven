/**
 * InfoPanel Component (Updated for Issue #411)
 *
 * Container that manages:
 * 1. Always visible: TurnStatus + GameLog + CardPileBar (44px at bottom)
 * 2. Overlay when active: Content panel (no tabs - navigation via pile bar)
 *
 * Issue #411: Tabs removed - use pile bar at bottom for navigation.
 */

import type { ReactNode } from 'react';
import styles from './InfoPanel.module.css';

export type SheetTab = 'cards' | 'inventory' | 'actions';

interface InfoPanelProps {
  /** Upper section: TurnStatus component */
  turnStatus: ReactNode;

  /** Middle section: GameLog component */
  gameLog: ReactNode;

  /** Bottom section: CardPileIndicator (44px fixed height) */
  cardPileBar: ReactNode;

  /** Optional: CardSelectionPanel content */
  cardSelection?: ReactNode;

  /** Optional: Inventory content */
  inventoryContent?: ReactNode;

  /** Optional: CardActionSelectionPanel content - Issue #411 */
  actionSelection?: ReactNode;

  /** Whether the overlay is open */
  showCardSelection: boolean;

  /** Currently active content type */
  activeTab?: SheetTab;

  /** Callback when sheet is closed */
  onSheetClose?: () => void;
}

export function InfoPanel({
  turnStatus,
  gameLog,
  cardPileBar,
  cardSelection,
  inventoryContent,
  actionSelection,
  showCardSelection,
  activeTab = 'cards',
  onSheetClose,
}: InfoPanelProps) {
  // Determine which content to show based on activeTab
  const getActiveContent = (): ReactNode => {
    switch (activeTab) {
      case 'actions':
        return actionSelection;
      case 'inventory':
        return inventoryContent;
      case 'cards':
      default:
        return cardSelection;
    }
  };

  const activeContent = getActiveContent();

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

      {/* Content overlay: slides in on top when active - no tabs */}
      {showCardSelection && activeContent && (
        <div className={styles.cardSelectionOverlay}>
          <div className={styles.contentPanel}>
            {/* Close button if closeable */}
            {onSheetClose && (
              <button
                className={styles.closeButton}
                onClick={onSheetClose}
                aria-label="Close panel"
              >
                ×
              </button>
            )}
            <div className={styles.contentArea}>
              {activeContent}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
