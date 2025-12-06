/**
 * TurnStatus Component
 *
 * Full status panel combining:
 * - Horizontal scrolling turn order
 * - Action buttons (Attack/Move)
 * - Round counter
 * - Connection status
 * - End Turn and Back to Lobby buttons
 *
 * Replaces and combines: TurnOrder, ActionButtons, and parts of GameHUD
 */

import { useState } from 'react';
import { FaSignOutAlt } from 'react-icons/fa';
import { GiCrossedSwords, GiBootPrints } from 'react-icons/gi';
import type { Character, Monster } from '../../../../shared/types/entities';
import styles from './TurnStatus.module.css';

type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

interface TurnOrderEntity {
  id: string;
  name: string;
  initiative: number;
  type: 'character' | 'monster';
  currentHealth?: number;
  maxHealth?: number;
}

interface TurnStatusProps {
  turnOrder: TurnOrderEntity[];
  currentTurnEntityId: string | null;
  currentRound: number;
  characters: Character[];
  monsters: Monster[];
  connectionStatus: ConnectionStatus;
  isMyTurn: boolean;
  hasAttack: boolean;
  hasMove: boolean;
  attackMode: boolean;
  onAttackClick: () => void;
  onMoveClick: () => void;
  onEndTurn: () => void;
  onBackToLobby: () => void;
}

export function TurnStatus({
  turnOrder,
  currentTurnEntityId,
  currentRound,
  characters,
  monsters,
  connectionStatus,
  isMyTurn,
  hasAttack,
  hasMove,
  attackMode,
  onAttackClick,
  onMoveClick,
  onEndTurn,
  onBackToLobby,
}: TurnStatusProps) {
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  const statusClassName = styles[connectionStatus] || '';

  const handleActorClick = (entityId: string) => {
    setSelectedActorId(selectedActorId === entityId ? null : entityId);
  };

  const selectedActor = selectedActorId
    ? turnOrder.find(e => e.id === selectedActorId)
    : null;

  const selectedActorDetails = selectedActorId
    ? (selectedActor?.type === 'character'
        ? characters.find(c => c.id === selectedActorId)
        : monsters.find(m => m.id === selectedActorId))
    : null;

  return (
    <div className={styles.turnStatus}>
      {/* Top controls bar */}
      <div className={styles.controlBar}>
        <button onClick={onBackToLobby} className={styles.backButton} aria-label="Back to Lobby">
          <FaSignOutAlt />
        </button>

        <div className={styles.roundCounter}>
          Round {currentRound}
        </div>

        <div className={styles.statusGroup}>
          <div className={`${styles.statusDot} ${statusClassName}`} />
          <button
            onClick={onEndTurn}
            className={styles.endTurnButton}
            disabled={!isMyTurn}
            aria-label="End Turn"
          >
            End Turn
          </button>
        </div>
      </div>

      {/* Horizontal scrolling turn order */}
      <div className={styles.turnOrderContainer}>
        <div className={styles.turnOrderLabel}>Turn Order:</div>
        <div className={styles.turnOrderScroll}>
          {turnOrder.map((entity) => {
            const isCurrentTurn = entity.id === currentTurnEntityId;
            const isSelected = entity.id === selectedActorId;
            const entityClassName = `${styles.turnEntity} ${isCurrentTurn ? styles.currentTurn : ''} ${isSelected ? styles.selected : ''} ${styles[entity.type]}`;

            return (
              <div
                key={entity.id}
                className={entityClassName}
                onClick={() => handleActorClick(entity.id)}
              >
                <div className={styles.entityName}>{entity.name}</div>
                <div className={styles.entityInitiative}>{entity.initiative}</div>
                {entity.currentHealth !== undefined && entity.maxHealth !== undefined && (
                  <div className={styles.entityHealth}>
                    {entity.currentHealth}/{entity.maxHealth}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Character/Monster details panel */}
      {selectedActor && selectedActorDetails && (
        <div className={styles.detailsPanel}>
          <div className={styles.detailsHeader}>
            <div className={styles.detailsName}>{selectedActor.name}</div>
            <button
              className={styles.closeDetails}
              onClick={() => setSelectedActorId(null)}
              aria-label="Close details"
            >
              ×
            </button>
          </div>
          <div className={styles.detailsStats}>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>HP:</span>
              <span className={styles.statValue}>
                {selectedActorDetails.health}/{selectedActorDetails.maxHealth}
              </span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Initiative:</span>
              <span className={styles.statValue}>{selectedActor.initiative}</span>
            </div>
            {selectedActorDetails.conditions && selectedActorDetails.conditions.length > 0 && (
              <div className={styles.conditionsRow}>
                <span className={styles.statLabel}>Conditions:</span>
                <div className={styles.conditions}>
                  {selectedActorDetails.conditions.map((condition: string, idx: number) => (
                    <span key={idx} className={styles.condition}>
                      {condition}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action buttons - only show when it's player's turn */}
      {isMyTurn && (hasAttack || hasMove) && (
        <div className={styles.actionButtons}>
          {hasMove && (
            <button
              onClick={onMoveClick}
              className={styles.moveButton}
              aria-label="Move"
            >
              <GiBootPrints />
              <span>Move</span>
            </button>
          )}
          {hasAttack && (
            <button
              onClick={onAttackClick}
              className={`${styles.attackButton} ${attackMode ? styles.active : ''}`}
              aria-label="Attack"
            >
              <GiCrossedSwords />
              <span>Attack</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
