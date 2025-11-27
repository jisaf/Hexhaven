import type { AbilityCard } from '../../../../shared/types';
import styles from './ActiveCardDisplay.module.css';

interface ActiveCardDisplayProps {
  cards: [AbilityCard, AbilityCard];
  onActionSelect: (cardId: string, actionType: 'top' | 'bottom') => void;
  usedActionTypes: { top: boolean; bottom: boolean };
  usedCardId: string | null;
}

export function ActiveCardDisplay({
  cards,
  onActionSelect,
  usedActionTypes,
  usedCardId,
}: ActiveCardDisplayProps) {
  return (
    <div className={styles.container}>
      <div className={styles.cards}>
        {cards.map((card) => {
          const isUsed = usedCardId === card.id;
          return (
            <div
              key={card.id}
              className={`${styles.card} ${isUsed ? styles.disabled : ''}`}
            >
              <div
                className={`${styles.action} ${
                  usedActionTypes.top ? styles.disabled : ''
                }`}
                onClick={() =>
                  !isUsed && !usedActionTypes.top && onActionSelect(card.id, 'top')
                }
              >
                <p>
                  {card.topAction.type} {card.topAction.value}
                </p>
              </div>
              <div
                className={`${styles.action} ${
                  usedActionTypes.bottom ? styles.disabled : ''
                }`}
                onClick={() =>
                  !isUsed &&
                  !usedActionTypes.bottom &&
                  onActionSelect(card.id, 'bottom')
                }
              >
                <p>
                  {card.bottomAction.type} {card.bottomAction.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
