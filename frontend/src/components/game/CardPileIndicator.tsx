/**
 * CardPileIndicator Component
 *
 * Full-width bar (44px height) showing card counts in each pile.
 * Clickable to view/toggle each pile's content.
 * All buttons use the same onPileClick handler.
 */

import React from 'react';
import 'rpg-awesome/css/rpg-awesome.min.css';
import styles from './CardPileIndicator.module.css';

export type PileType = 'hand' | 'discard' | 'lost' | 'active' | 'inventory';

interface CardPileIndicatorProps {
  handCount: number;
  discardCount: number;
  lostCount: number;
  canRest: boolean;
  onPileClick: (pile: PileType) => void;
  selectedPile?: PileType | null;
  /** Number of items in inventory (for badge) */
  inventoryCount?: number;
  /** Whether to show the active cards button (during turn with selected cards) */
  showActiveCards?: boolean;
}

export const CardPileIndicator: React.FC<CardPileIndicatorProps> = ({
  handCount,
  discardCount,
  lostCount,
  canRest,
  onPileClick,
  selectedPile,
  inventoryCount = 0,
  showActiveCards = false,
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

      {/* Active Cards Button (Issue #411) - Shows during turn with selected cards */}
      {showActiveCards && (
        <button
          className={`${styles.pile} ${styles.activePile} ${selectedPile === 'active' ? styles.selected : ''}`}
          title="View active turn cards"
          data-testid="active-cards-button"
          onClick={() => onPileClick('active')}
        >
          <i className="ra ra-crossed-swords" style={{ fontSize: '16px' }} />
          <span className={styles.label}>Active</span>
        </button>
      )}

      {/* Inventory Button (Issue #205) */}
      <button
        className={`${styles.pile} ${styles.inventoryPile} ${selectedPile === 'inventory' ? styles.selected : ''}`}
        title="Click to open inventory"
        data-testid="inventory-button"
        onClick={() => onPileClick('inventory')}
      >
        <i className="ra ra-knapsack" style={{ fontSize: '16px' }} />
        {inventoryCount > 0 && (
          <span className={styles.inventoryBadge}>{inventoryCount}</span>
        )}
      </button>
    </div>
  );
};
