/**
 * PileView Component
 *
 * Unified card pile viewer for displaying cards consistently across
 * Hand, Discard, Lost, and other pile types.
 * View-only - no card selection functionality.
 * Note: Title is handled by BottomSheet - this component only renders cards.
 */

import React from 'react';
import type { AbilityCard } from '../../../../shared/types/entities';
import { AbilityCard2 } from '../AbilityCard2';
import styles from './PileView.module.css';

interface PileViewProps {
  /** Cards to display */
  cards: AbilityCard[];
  /** Empty state message */
  emptyMessage?: string;
}

export const PileView: React.FC<PileViewProps> = ({
  cards,
  emptyMessage = 'No cards in this pile',
}) => {
  return (
    <div className={styles.pileView}>
      {/* Cards container */}
      {cards.length > 0 ? (
        <div className={styles.cardsContainer}>
          {cards.map((card) => (
            <div key={card.id} className={styles.cardWrapper}>
              <AbilityCard2
                card={card}
                variant="full"
                className={styles.card}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <span>{emptyMessage}</span>
        </div>
      )}
    </div>
  );
};
