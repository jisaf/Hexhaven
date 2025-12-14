/**
 * ActionModule Component
 *
 * Displays ability actions (top/bottom) with type, value, range, elements, and effects.
 * Shows section label (Top/Bottom) and handles element generation/consumption.
 */

import React from 'react';
import { FadedBorder } from './FadedBorder';
import type { CardModule } from '../../../../shared/types/card-config';
import type { Action, ElementType } from '../../../../shared/types/entities';
import '../../styles/card-modules.css';

export interface ActionModuleProps {
  module: CardModule;
  action?: Action;
  isActive?: boolean;
  className?: string;
}

/**
 * Get icon for action type
 */
function getActionIcon(type: Action['type']): string {
  const icons: Record<Action['type'], string> = {
    move: '🏃',
    attack: '⚔️',
    heal: '❤️',
    loot: '💰',
    special: '✨',
    summon: '🐾',
    text: '📜',
  };
  return icons[type] || '❓';
}

/**
 * Get icon for element type
 */
function getElementIcon(element: ElementType): string {
  const icons = {
    fire: '🔥',
    ice: '❄️',
    air: '💨',
    earth: '🪨',
    light: '☀️',
    dark: '🌙',
  };
  return icons[element];
}

export const ActionModule: React.FC<ActionModuleProps> = ({
  module,
  action,
  isActive = false,
  className = '',
}) => {
  const { compact, config } = module;
  const noBorder = config?.noBorder ?? false;
  const position = config?.position || 'top';
  const showElements = config?.showElements ?? true;
  const showEffects = config?.showEffects ?? true;

  // If no action data, show placeholder
  if (!action) {
    return (
      <div
        className={`action-module ${compact ? 'compact' : ''} ${isActive ? 'active' : ''} ${config?.customClass || ''} ${className}`}
        style={{ gridRow: `span ${module.rows} / span ${module.rows}` }}
        data-position={position}
      >
        <div className="action-display">
          <div className="action-main">No action</div>
        </div>
        {!noBorder && <FadedBorder compact={compact} />}
      </div>
    );
  }

  return (
    <div
      className={`action-module ${compact ? 'compact' : ''} ${isActive ? 'active' : ''} ${config?.customClass || ''} ${className}`}
      style={{ gridRow: `span ${module.rows} / span ${module.rows}` }}
      data-position={position}
      data-testid={`action-module-${position}`}
    >
      <div className="action-display">
        {/* Main action (type, value, range) */}
        <div className="action-main">
          <span className="action-icon" aria-label={action.type}>
            {getActionIcon(action.type)}
          </span>

          {action.value !== undefined && (
            <span className="action-value">{action.value}</span>
          )}

          {action.range !== undefined && action.range > 0 && (
            <span className="action-range">Range {action.range}</span>
          )}
        </div>

        {/* Element Generation */}
        {showElements && action.elementGenerate && (
          <div className="action-element generate">
            <span className="element-icon" aria-label={`Generate ${action.elementGenerate}`}>
              {getElementIcon(action.elementGenerate)}
            </span>
            <span className="element-label">Generate</span>
          </div>
        )}

        {/* Element Consumption */}
        {showElements && action.elementConsume && (
          <div className="action-element consume">
            <span className="element-icon" aria-label={`Consume ${action.elementConsume}`}>
              {getElementIcon(action.elementConsume)}
            </span>
            <span className="element-label">Consume</span>
          </div>
        )}

        {/* Effects */}
        {showEffects && action.effects && action.effects.length > 0 && (
          <div className="action-effects">
            {action.effects.map((effect, idx) => (
              <span key={idx} className="effect-tag">
                {effect}
              </span>
            ))}
          </div>
        )}

        {/* Element Bonus (if applicable) */}
        {showElements && action.elementBonus && (
          <div className="action-element consume">
            <span className="element-label">
              {action.elementBonus.effect} +{action.elementBonus.value}
            </span>
          </div>
        )}
      </div>

      {!noBorder && <FadedBorder compact={compact} />}
    </div>
  );
};

export default ActionModule;
