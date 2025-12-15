/**
 * InfoPanel Component (Updated for Issue #205)
 *
 * Container that manages:
 * 1. Always visible: TurnStatus + GameLog + CardPileBar (44px at bottom)
 * 2. Overlay when active: BottomSheet with tabs (Cards | Inventory)
 *
 * BottomSheet can be swiped down to dismiss.
 */

import type { ReactNode } from 'react';
import { BottomSheet, type BottomSheetTab } from '../BottomSheet';
import styles from './InfoPanel.module.css';

export type SheetTab = 'cards' | 'inventory';

interface InfoPanelProps {
  /** Upper section: TurnStatus component */
  turnStatus: ReactNode;

  /** Middle section: GameLog component */
  gameLog: ReactNode;

  /** Bottom section: CardPileIndicator (44px fixed height) */
  cardPileBar: ReactNode;

  /** Optional: CardSelectionPanel content (displayed in Cards tab) */
  cardSelection?: ReactNode;

  /** Optional: Inventory content (displayed in Inventory tab) */
  inventoryContent?: ReactNode;

  /** Whether the bottom sheet is open */
  showCardSelection: boolean;

  /** Currently active tab */
  activeTab?: SheetTab;

  /** Callback when tab changes */
  onTabChange?: (tab: SheetTab) => void;

  /** Callback when sheet is closed */
  onSheetClose?: () => void;

  /** Count of items (for badge on inventory tab) */
  inventoryCount?: number;
}

export function InfoPanel({
  turnStatus,
  gameLog,
  cardPileBar,
  cardSelection,
  inventoryContent,
  showCardSelection,
  activeTab = 'cards',
  onTabChange,
  onSheetClose,
  inventoryCount,
}: InfoPanelProps) {
  // Build tabs array
  const tabs: BottomSheetTab[] = [];

  // Cards tab (always present when there's card selection content)
  if (cardSelection) {
    tabs.push({
      id: 'cards',
      label: 'Cards',
      icon: 'ra ra-scroll-unfurled',
      content: cardSelection,
    });
  }

  // Inventory tab (always present when there's inventory content)
  if (inventoryContent) {
    tabs.push({
      id: 'inventory',
      label: 'Inventory',
      icon: 'ra ra-knapsack',
      content: inventoryContent,
      badge: inventoryCount,
    });
  }

  const handleTabChange = (tabId: string) => {
    onTabChange?.(tabId as SheetTab);
  };

  const handleClose = () => {
    console.log('[InfoPanel] handleClose called, onSheetClose defined:', !!onSheetClose);
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
      {showCardSelection && tabs.length > 0 && (
        <div className={styles.cardSelectionOverlay}>
          <BottomSheet
            tabs={tabs}
            activeTabId={activeTab}
            onTabChange={handleTabChange}
            isOpen={showCardSelection}
            onClose={handleClose}
            showCloseButton={!!onSheetClose}
          />
        </div>
      )}
    </div>
  );
}
