/**
 * TurnOrderDisplay Component (US2 - T105)
 *
 * Displays the turn order by initiative with visual indicator for current turn.
 * Shows character/monster names and their initiative values.
 */

import React from 'react';
import type { CharacterClass } from '../../../shared/types/entities';
import './TurnOrderDisplay.css';

export interface TurnEntity {
  id: string;
  name: string;
  initiative: number;
  type: 'character' | 'monster';
  characterClass?: CharacterClass;
  isElite?: boolean;
  health?: number;
  maxHealth?: number;
  avatar?: string;
}

interface TurnOrderDisplayProps {
  turnOrder: TurnEntity[];
  currentTurnIndex: number;
  currentRound: number;
}

export const TurnOrderDisplay: React.FC<TurnOrderDisplayProps> = ({
  turnOrder,
  currentTurnIndex,
  currentRound,
}) => {
  const renderEntityIcon = (entity: TurnEntity) => {
    if (entity.avatar) {
      return <img src={entity.avatar} alt={entity.name} className="entity-avatar" />;
    }

    if (entity.type === 'character') {
      const classIcons: Record<string, string> = {
        'brute': '🗡️',
        'tinkerer': '🔧',
        'spellweaver': '🔮',
        'scoundrel': '🗡️',
        'cragheart': '🪨',
        'mindthief': '🧠',
      };
      return <div className="entity-icon-fallback">{classIcons[entity.characterClass || 'brute']}</div>;
    } else {
      return <div className="entity-icon-fallback">{entity.isElite ? '👹' : '👺'}</div>;
    }
  };

  const getHealthPercentage = (entity: TurnEntity): number => {
    if (entity.health === undefined || entity.maxHealth === undefined) {
      return 100;
    }
    return (entity.health / entity.maxHealth) * 100;
  };

  const getHealthColor = (percentage: number): string => {
    if (percentage > 66) return '#2ecc71';
    if (percentage > 33) return '#f39c12';
    return '#e74c3c';
  };

  return (
    <div className="turn-order-display">
      {/* Round Counter */}
      <div className="round-counter">
        <span className="round-label">Round</span>
        <span className="round-number">{currentRound}</span>
      </div>

      {/* Turn Order List */}
      <div className="turn-order-list">
        <div className="list-header">
          <span>Turn Order</span>
        </div>

        <div className="entity-list">
          {turnOrder.map((entity, index) => {
            const isCurrentTurn = index === currentTurnIndex;
            const hasTurnPassed = index < currentTurnIndex;
            const healthPercentage = getHealthPercentage(entity);
            const healthColor = getHealthColor(healthPercentage);

            return (
              <div
                key={entity.id}
                className={`entity-item ${isCurrentTurn ? 'current-turn' : ''} ${
                  hasTurnPassed ? 'turn-passed' : ''
                } ${entity.type}`}
              >
                {/* Current Turn Indicator */}
                {isCurrentTurn && (
                  <div className="turn-indicator">
                    <span className="indicator-arrow">▶</span>
                  </div>
                )}

                {/* Entity Icon */}
                <div className="entity-icon">{renderEntityIcon(entity)}</div>

                {/* Entity Info */}
                <div className="entity-info">
                  <div className="entity-name">
                    {entity.name}
                    {entity.isElite && <span className="elite-badge">Elite</span>}
                  </div>

                  {/* Health Bar */}
                  {entity.health !== undefined && entity.maxHealth !== undefined && (
                    <div className="health-bar-container">
                      <div
                        className="health-bar"
                        style={{
                          width: `${healthPercentage}%`,
                          backgroundColor: healthColor,
                        }}
                      />
                      <span className="health-text">
                        {entity.health}/{entity.maxHealth}
                      </span>
                    </div>
                  )}
                </div>

                {/* Initiative */}
                <div className="entity-initiative">
                  <span className="initiative-value">{entity.initiative}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Turn Banner */}
      {turnOrder[currentTurnIndex] && (
        <div className="current-turn-banner">
          <span className="banner-icon">{renderEntityIcon(turnOrder[currentTurnIndex])}</span>
          <span className="banner-text">
            {turnOrder[currentTurnIndex].name}'s Turn
          </span>
        </div>
      )}
    </div>
  );
};
