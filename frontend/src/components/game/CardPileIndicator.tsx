/**
 * CardPileIndicator Component
 *
 * Full-width bar (44px height) showing card counts in each pile.
 * Clickable to view cards in each pile.
 * Indicates when rest is available.
 * Also includes an inventory button (Issue #205).
 */

import React from 'react';
import 'rpg-awesome/css/rpg-awesome.min.css';
import styles from './CardPileIndicator.module.css';

export type PileType = 'hand' | 'discard' | 'lost' | 'actions';

interface CardPileIndicatorProps {
  handCount: number;
  discardCount: number;
  lostCount: number;
  canRest: boolean;
  onPileClick: (pile: PileType) => void;
  selectedPile?: PileType | null;
  /** Number of items in inventory (for badge) */
  inventoryCount?: number;
  /** Click handler for inventory button */
  onInventoryClick?: () => void;
  /** Whether inventory is currently selected */
  inventorySelected?: boolean;
  /** Issue #411: Show actions button when it's player's turn with cards selected */
  showActions?: boolean;
  /** Issue #411: Number of actions remaining (0-2) */
  actionsRemaining?: number;
  /** Issue #411: Click handler for actions button */
  onActionsClick?: () => void;
  /** Issue #411: Whether actions is currently selected */
  actionsSelected?: boolean;
}

export const CardPileIndicator: React.FC<CardPileIndicatorProps> = ({
  handCount,
  discardCount,
  lostCount,
  canRest,
  onPileClick,
  selectedPile,
  inventoryCount = 0,
  onInventoryClick,
  inventorySelected = false,
  showActions = false,
  actionsRemaining = 0,
  onActionsClick,
  actionsSelected = false,
}) => {
  return (
    <div className={styles.indicator} data-testid="card-pile-indicator">
      <button
        className={`${styles.pile} ${selectedPile === 'hand' ? styles.selected : ''}`}
        title="Click to view cards in hand"
        data-testid="hand-pile"
        onClick={() => onPileClick('hand')}
      >
        <span className={styles.label}>Hand</span>
        <span className={styles.count}>{handCount}</span>
      </button>

      <button
        className={`${styles.pile} ${canRest ? styles.restAvailable : ''} ${selectedPile === 'discard' ? styles.selected : ''}`}
        title={canRest ? "Discarded cards (Rest available) - Click to view" : "Click to view discarded cards"}
        data-testid="discard-pile"
        onClick={() => onPileClick('discard')}
      >
        <span className={styles.label}>Discard</span>
        <span className={styles.count}>{discardCount}</span>
        {canRest && <span className={styles.restBadge}>Rest</span>}
      </button>

      <button
        className={`${styles.pile} ${selectedPile === 'lost' ? styles.selected : ''}`}
        title="Click to view lost cards"
        data-testid="lost-pile"
        onClick={() => onPileClick('lost')}
      >
        <span className={styles.label}>Lost</span>
        <span className={styles.count}>{lostCount}</span>
      </button>

      {/* Actions Button (Issue #411) */}
      {showActions && onActionsClick && (
        <button
          className={`${styles.pile} ${styles.actionsPile} ${actionsSelected ? styles.selected : ''}`}
          title="Execute card actions"
          data-testid="actions-button"
          onClick={onActionsClick}
        >
          <i className="ra ra-crossed-swords" style={{ fontSize: '16px' }} />
          {actionsRemaining > 0 && (
            <span className={styles.actionsBadge}>{actionsRemaining}</span>
          )}
        </button>
      )}

      {/* Inventory Button (Issue #205) */}
      {onInventoryClick && (
        <button
          className={`${styles.pile} ${styles.inventoryPile} ${inventorySelected ? styles.selected : ''}`}
          title="Click to open inventory"
          data-testid="inventory-button"
          onClick={onInventoryClick}
        >
          <i className="ra ra-knapsack" style={{ fontSize: '16px' }} />
          {inventoryCount > 0 && (
            <span className={styles.inventoryBadge}>{inventoryCount}</span>
          )}
        </button>
      )}
    </div>
  );
};
