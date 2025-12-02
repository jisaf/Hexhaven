import React, { useState, useRef, useEffect } from 'react';
import styles from './TurnOrder.module.css';
import type { TurnEntity } from '../../../shared/types/entities';

// Define leaner types for the props
interface TurnOrderCharacter {
  id: string;
  health: number;
  maxHealth: number;
  conditions: string[];
}

interface TurnOrderMonster {
  id: string;
  health: number;
  maxHealth: number;
  conditions: string[];
  isElite: boolean;
}

interface TurnOrderProps {
  turnOrder: TurnEntity[];
  currentTurnEntityId: string | null;
  currentRound: number;
  characters: TurnOrderCharacter[];
  monsters: TurnOrderMonster[];
  actionButtons?: React.ReactNode;
}

const TurnOrder: React.FC<TurnOrderProps> = ({ turnOrder, currentTurnEntityId, currentRound, characters, monsters, actionButtons }) => {
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  const [listOffset, setListOffset] = useState(0);
  const actorRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    actorRefs.current = actorRefs.current.slice(0, turnOrder.length);
  }, [turnOrder]);

  const handleActorClick = (entityId: string, index: number) => {
    if (selectedActorId === entityId) {
      setSelectedActorId(null);
      setListOffset(0);
    } else {
      setSelectedActorId(entityId);
      const selectedElement = actorRefs.current[index];
      if (selectedElement) {
        setListOffset(-selectedElement.offsetLeft);
      }
    }
  };

  const selectedActorDetails = selectedActorId ? (
    turnOrder.find(t => t.entityId === selectedActorId)?.entityType === 'character'
      ? characters.find(c => c.id === selectedActorId)
      : monsters.find(m => m.id === selectedActorId)
  ) : null;

  const selectedActorTurnInfo = selectedActorId ? turnOrder.find(t => t.entityId === selectedActorId) : null;

  return (
    <div className={`${styles.turnOrderContainer} ${selectedActorId ? styles.detailsVisible : ''}`}>
      <div className={styles.mainContent}>
        <div className={styles.roundCounter}>
          <span className={styles.roundLabel}>R</span>
          <span className={styles.roundNumber}>{currentRound}</span>
        </div>

        <div className={styles.actorsWrapper}>
          <ul className={styles.turnOrderList} style={{ transform: `translateX(${listOffset}px)` }}>
            {turnOrder.map((entity, index) => {
            const actorDetails = entity.entityType === 'character'
              ? characters.find(c => c.id === entity.entityId)
              : monsters.find(m => m.id === entity.entityId);

            const isCurrentTurn = entity.entityId === currentTurnEntityId;
            const isElite = entity.entityType === 'monster' && (actorDetails as TurnOrderMonster)?.isElite;
            const isSelected = entity.entityId === selectedActorId;

            const itemClasses = [
              styles.turnOrderItem,
              isCurrentTurn ? styles.activeTurn : '',
              isElite ? styles.elite : '',
              isSelected ? styles.selected : ''
            ].join(' ');

            return (
              <li
                key={entity.entityId}
                ref={el => { actorRefs.current[index] = el; }}
                className={itemClasses}
                onClick={() => handleActorClick(entity.entityId, index)}
                data-testid={`turn-order-item-${entity.entityId}`}
              >
                <div className={`${styles.portrait} ${styles[entity.entityType]}`}></div>
                <span className={styles.name}>{entity.name}</span>
              </li>
            );
          })}
        </ul>

        {selectedActorDetails && selectedActorTurnInfo && (
          <div className={styles.detailsPanel}>
            <div className={styles.actorName}>{selectedActorTurnInfo.name}</div>
            <div className={styles.stats}>
              <span>HP: {selectedActorDetails.health}/{selectedActorDetails.maxHealth}</span>
              <span>Initiative: {selectedActorTurnInfo.initiative}</span>
            </div>
            <div className={styles.conditions}>
              {selectedActorDetails.conditions.map(c => <span key={c} className={styles.condition}>{c}</span>)}
            </div>
            <div className={styles.cardsInfo}>
              <p>Card Information Placeholder</p>
            </div>
          </div>
        )}
        </div>
      </div>
      {actionButtons && <div className={styles.actionButtonsContainer}>{actionButtons}</div>}
    </div>
  );
};

export default TurnOrder;
