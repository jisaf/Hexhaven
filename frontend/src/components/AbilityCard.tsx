/**
 * AbilityCard Component (US2 - T103)
 *
 * Displays a single ability card with top/bottom actions, initiative, and selection state.
 * Mobile-first design with touch-friendly interactions.
 */

import React from 'react';
import type { AbilityCard as AbilityCardType, Action, ElementType } from '../../../shared/types/entities';
import './AbilityCard.css';

interface AbilityCardProps {
  card: AbilityCardType;
  isSelected?: boolean;
  isTop?: boolean; // Which half is being used
  onClick?: () => void;
  disabled?: boolean;
}

const ActionDisplay: React.FC<{ action: Action }> = ({ action }) => {
  const getActionIcon = (type: Action['type']): string => {
    const icons = {
      move: '🏃',
      attack: '⚔️',
      heal: '❤️',
      loot: '💰',
      special: '✨',
    };
    return icons[type] || '❓';
  };

  const getElementIcon = (element: ElementType): string => {
    const icons = {
      fire: '🔥',
      ice: '❄️',
      air: '💨',
      earth: '🪨',
      light: '☀️',
      dark: '🌙',
    };
    return icons[element];
  };

  return (
    <div className="action-display">
      <div className="action-main">
        <span className="action-icon">{getActionIcon(action.type)}</span>
        {action.value !== undefined && (
          <span className="action-value">{action.value}</span>
        )}
        {action.range !== undefined && action.range > 0 && (
          <span className="action-range">Range {action.range}</span>
        )}
      </div>

      {action.elementGenerate && (
        <div className="action-element generate">
          <span className="element-icon">{getElementIcon(action.elementGenerate)}</span>
          <span className="element-label">Generate</span>
        </div>
      )}

      {action.elementConsume && (
        <div className="action-element consume">
          <span className="element-icon">{getElementIcon(action.elementConsume)}</span>
          <span className="element-label">Consume</span>
        </div>
      )}

      {action.effects && action.effects.length > 0 && (
        <div className="action-effects">
          {action.effects.map((effect, idx) => (
            <span key={idx} className="effect-tag">{effect}</span>
          ))}
        </div>
      )}
    </div>
  );
};

export const AbilityCard: React.FC<AbilityCardProps> = ({
  card,
  isSelected = false,
  isTop,
  onClick,
  disabled = false,
}) => {
  return (
    <div
      className={`ability-card ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''} ${isTop !== undefined ? (isTop ? 'highlight-top' : 'highlight-bottom') : ''}`}
      onClick={!disabled ? onClick : undefined}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-pressed={isSelected}
    >
      {/* Card Header */}
      <div className="card-header">
        <span className="card-name">{card.name}</span>
        <span className="card-initiative">Initiative: {card.initiative}</span>
      </div>

      {/* Top Action */}
      <div className={`card-section top ${isTop === true ? 'active' : ''}`}>
        <div className="section-label">Top</div>
        <ActionDisplay action={card.topAction} />
      </div>

      {/* Divider */}
      <div className="card-divider" />

      {/* Bottom Action */}
      <div className={`card-section bottom ${isTop === false ? 'active' : ''}`}>
        <div className="section-label">Bottom</div>
        <ActionDisplay action={card.bottomAction} />
      </div>

      {/* Card Footer */}
      <div className="card-footer">
        <span className="card-level">Level {card.level}</span>
      </div>

      {/* Selection Indicator */}
      {isSelected && (
        <div className="selection-indicator">
          <span>✓</span>
        </div>
      )}
    </div>
  );
};
