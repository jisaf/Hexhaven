/**
 * ActionModule Component
 *
 * Displays ability actions (top/bottom) with type, value, range, elements, and effects.
 * Shows section label (Top/Bottom) and handles element generation/consumption.
 *
 * Updated for Issue #220 - uses new modifier-based format
 */

import React from 'react';
import { FadedBorder } from './FadedBorder';
import type { CardModule } from '../../../../shared/types/card-config';
import type { Action, ElementType } from '../../../../shared/types/entities';
import { getRange } from '../../../../shared/types/modifiers';
import {
  getInfuseModifier,
  getConsumeModifier,
  getActionValue,
  getEffectStrings,
} from '../../utils/action-helpers';
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

  // Extract values from new modifier-based format
  const value = getActionValue(action);
  const range = getRange(action.modifiers);
  const infuseModifier = getInfuseModifier(action.modifiers);
  const consumeModifier = getConsumeModifier(action.modifiers);
  const effectStrings = getEffectStrings(action.modifiers);

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

          {value !== undefined && <span className="action-value">{value}</span>}

          {range > 0 && <span className="action-range">Range {range}</span>}
        </div>

        {/* Element Generation */}
        {showElements && infuseModifier && (
          <div className="action-element generate">
            <span className="element-icon" aria-label={`Generate ${infuseModifier.element}`}>
              {getElementIcon(infuseModifier.element)}
            </span>
            <span className="element-label">Generate</span>
          </div>
        )}

        {/* Element Consumption */}
        {showElements && consumeModifier && (
          <div className="action-element consume">
            <span className="element-icon" aria-label={`Consume ${consumeModifier.element}`}>
              {getElementIcon(consumeModifier.element)}
            </span>
            <span className="element-label">Consume</span>
          </div>
        )}

        {/* Effects from modifiers */}
        {showEffects && effectStrings.length > 0 && (
          <div className="action-effects">
            {effectStrings.map((effect, idx) => (
              <span key={idx} className="effect-tag">
                {effect}
              </span>
            ))}
          </div>
        )}

        {/* Element Bonus (if applicable) */}
        {showElements && consumeModifier?.bonus && (
          <div className="action-element consume">
            <span className="element-label">
              {consumeModifier.bonus.effect} +{consumeModifier.bonus.value}
            </span>
          </div>
        )}
      </div>

      {!noBorder && <FadedBorder compact={compact} />}
    </div>
  );
};

export default ActionModule;
