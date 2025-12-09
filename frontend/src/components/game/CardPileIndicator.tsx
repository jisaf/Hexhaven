/**
 * CardPileIndicator Component
 *
 * Full-width bar (44px height) showing card counts in each pile.
 * Clickable to view cards in each pile.
 * Indicates when rest is available.
 */

import React from 'react';
import styles from './CardPileIndicator.module.css';

export type PileType = 'hand' | 'discard' | 'lost';

interface CardPileIndicatorProps {
  handCount: number;
  discardCount: number;
  lostCount: number;
  canRest: boolean;
  onPileClick: (pile: PileType) => void;
  selectedPile?: PileType | null;
}

export const CardPileIndicator: React.FC<CardPileIndicatorProps> = ({
  handCount,
  discardCount,
  lostCount,
  canRest,
  onPileClick,
  selectedPile,
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
    </div>
  );
};
