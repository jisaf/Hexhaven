/**
 * TurnStatus Component
 *
 * Full status panel combining:
 * - Horizontal scrolling turn order
 * - Round counter
 * - Connection status
 * - End Turn and Back to Lobby buttons
 * - Objectives tracker (collapsible)
 * - Issue #411: TurnActionPanel for card action selection during turn
 *
 * Note: Legacy Action buttons (Attack/Move) removed in Phase 6 of Issue #411.
 * Actions are now selected via TurnActionPanel card regions.
 */

import { useState } from 'react';
import type { ReactNode } from 'react';
import { FaSignOutAlt } from 'react-icons/fa';
import type { Character, Monster } from '../../../../shared/types/entities';
import type { TurnActionState } from '../../../../shared/types/events';
import styles from './TurnStatus.module.css';

type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

interface TurnOrderEntity {
  id: string;
  name: string;
  initiative: number;
  type: 'character' | 'monster' | 'summon';
  currentHealth?: number;
  maxHealth?: number;
  isExhausted?: boolean;
  classType?: string; // For characters
  isElite?: boolean; // For monsters
}

interface TurnStatusProps {
  turnOrder: TurnOrderEntity[];
  currentTurnEntityId: string | null;
  currentRound: number;
  characters: Character[];
  monsters: Monster[];
  connectionStatus: ConnectionStatus;
  isMyTurn: boolean;
  onEndTurn: () => void;
  onBackToLobby: () => void;
  onShortRest?: () => void;
  canShortRest?: boolean;
  objectivesSlot?: ReactNode;
  // Issue #411: Turn action state for End Turn button logic
  turnActionState?: TurnActionState | null;
}

export function TurnStatus({
  turnOrder,
  currentTurnEntityId,
  currentRound,
  characters,
  monsters,
  connectionStatus,
  isMyTurn,
  onEndTurn,
  onBackToLobby,
  onShortRest,
  canShortRest = false,
  objectivesSlot,
  // Issue #411: Turn action state for End Turn button logic
  turnActionState,
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

        {/* Objectives tracker slot - positioned after back button */}
        {objectivesSlot && (
          <div className={styles.objectivesSlot}>
            {objectivesSlot}
          </div>
        )}

        <div className={styles.roundCounter}>
          Round {currentRound}
        </div>

        <div className={styles.statusGroup}>
          <div className={`${styles.statusDot} ${statusClassName}`} />
          <button
            onClick={onEndTurn}
            className={styles.endTurnButton}
            disabled={
              !isMyTurn ||
              // Issue #411: Disable End Turn until both actions are complete
              (turnActionState != null &&
                turnActionState.availableActions.length > 0)
            }
            aria-label="End Turn"
            title={
              isMyTurn && turnActionState && turnActionState.availableActions.length > 0
                ? 'Complete both card actions before ending turn'
                : undefined
            }
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
            const entityClassName = `${styles.turnEntity} ${isCurrentTurn ? styles.currentTurn : ''} ${isSelected ? styles.selected : ''} ${styles[entity.type]} ${entity.isExhausted ? styles.exhausted : ''}`;

            // Determine avatar path
            const avatarPath = entity.type === 'character' && entity.classType
              ? `/avatars/characters/${entity.classType.toLowerCase()}.svg`
              : entity.type === 'monster'
              ? entity.isElite
                ? '/avatars/monsters/monster-elite.svg'
                : '/avatars/monsters/monster-normal.svg'
              : null;

            return (
              <div
                key={entity.id}
                className={entityClassName}
                onClick={() => handleActorClick(entity.id)}
              >
                {avatarPath && (
                  <img
                    src={avatarPath}
                    alt={entity.name}
                    className={styles.entityAvatar}
                  />
                )}
                <div className={styles.entityName}>
                  {entity.name}
                  {entity.isExhausted && <span className={styles.exhaustedLabel}> (Exhausted)</span>}
                </div>
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

      {/* Issue #411: TurnActionPanel now rendered in BottomSheet via GameBoard.tsx */}

      {/* Short Rest button - only show when not in turn action mode and rest is available */}
      {isMyTurn && !turnActionState && canShortRest && onShortRest && (
        <div className={styles.actionButtons}>
          <button
            onClick={onShortRest}
            className={styles.restButton}
            aria-label="Short Rest"
            title="Short Rest: Randomly lose 1 card from discard, return rest to hand"
          >
            <span>Short Rest</span>
          </button>
        </div>
      )}
    </div>
  );
}
