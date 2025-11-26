import React from 'react';
import styles from './TurnOrder.module.css';

interface TurnEntity {
  entityId: string;
  name: string;
  entityType: 'character' | 'monster';
  initiative: number;
}

interface TurnOrderProps {
  turnOrder: TurnEntity[];
  currentTurnEntityId: string | null;
  currentRound: number;
}

const TurnOrder: React.FC<TurnOrderProps> = ({ turnOrder, currentTurnEntityId, currentRound }) => {
  return (
    <div className={styles.turnOrderContainer}>
      <h3 className={styles.roundCounter}>Round {currentRound}</h3>
      {turnOrder.length === 0 ? (
        <p className={styles.guidingMessage}>Select cards to determine initiative</p>
      ) : (
        <ul className={styles.turnOrderList}>
          {turnOrder.map((entity) => {
            const isCurrentTurn = entity.entityId === currentTurnEntityId;
            return (
              <li
                key={entity.entityId}
                className={`${styles.turnOrderItem} ${isCurrentTurn ? styles.activeTurn : ''}`}
              >
                <div className={`${styles.portrait} ${styles[entity.entityType]}`}></div>
                <span className={styles.name}>{entity.name}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default TurnOrder;
