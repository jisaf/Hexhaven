/**
 * ActionRowLayout Component (Issue #217)
 *
 * Generic layout for rendering ability actions.
 * Displays action type, value, range, elements, and effects.
 * Supports summon creatures (StatBlockLayout) and text boxes (TextRowLayout).
 *
 * Updated for Issue #220 - uses new modifier-based format
 */

import React from 'react';
import type {
  Action,
  ElementType,
  SummonAction,
  TextAction as TextActionType,
} from '../../../../shared/types/entities';
import { getRange } from '../../../../shared/types/modifiers';
import type { CardVariant } from '../AbilityCard2';
import { StatBlockLayout, createDefaultStats } from './StatBlockLayout';
import { TextRowLayout } from './TextRowLayout';
import { formatEffect, ACTION_ICONS, ELEMENT_ICONS, CARD_ICONS } from './effectIcons';
import {
  getInfuseModifier,
  getConsumeModifier,
  getActionValue,
  getEffectStrings,
} from '../../utils/action-helpers';
import 'rpg-awesome/css/rpg-awesome.min.css';
import './layouts.css';

export interface ActionRowLayoutProps {
  action: Action;
  position: 'top' | 'bottom';
  variant: CardVariant;
  className?: string;
}

/**
 * Get RPG Awesome icon class for action type
 */
function getActionIconClass(type: Action['type']): string {
  return ACTION_ICONS[type]?.icon || 'ra-help';
}

/**
 * Get color for action type
 */
function getActionColor(type: Action['type']): string | undefined {
  return ACTION_ICONS[type]?.color;
}

/**
 * Get RPG Awesome icon class for element type
 */
function getElementIconClass(element: ElementType): string {
  return ELEMENT_ICONS[element]?.icon || 'ra-help';
}

/**
 * Get color for element type
 */
function getElementColor(element: ElementType): string | undefined {
  return ELEMENT_ICONS[element]?.color;
}

/**
 * Get CSS class for action type
 */
function getActionTypeClass(type: Action['type']): string {
  return `action-type-${type}`;
}


/**
 * Card icons component - shows loss, persistence, and XP icons
 * Exported for use in AbilityCard2 right column
 */
export const CardIcons: React.FC<{
  isLost?: boolean;
  isPersistent?: boolean;
  xp?: number;
  className?: string;
}> = ({ isLost, isPersistent, xp, className = '' }) => {
  if (!isLost && !isPersistent && (xp === undefined || xp <= 0)) return null;

  return (
    <div className={`card-icons ${className}`}>
      {isLost && (
        <span
          className="card-icon loss"
          title="Lost after use"
          style={{ color: CARD_ICONS.loss.color }}
        >
          <i className={`ra ${CARD_ICONS.loss.icon}`} aria-hidden="true" />
        </span>
      )}
      {isPersistent && (
        <span
          className="card-icon persistent"
          title="Persistent effect"
          style={{ color: CARD_ICONS.persistent.color }}
        >
          <i className={`ra ${CARD_ICONS.persistent.icon}`} aria-hidden="true" />
        </span>
      )}
      {xp !== undefined && xp > 0 && (
        <span
          className="card-icon xp"
          title={`${xp} XP`}
          style={{ color: CARD_ICONS.xp.color }}
        >
          <i className={`ra ${CARD_ICONS.xp.icon}`} aria-hidden="true" />
          <span className="xp-value">{xp}</span>
        </span>
      )}
    </div>
  );
};

export const ActionRowLayout: React.FC<ActionRowLayoutProps> = ({
  action,
  position,
  variant,
  className = '',
}) => {
  if (!action) {
    return (
      <div
        className={`action-row-layout ${variant} ${position} ${className}`}
        data-position={position}
      >
        <div className="action-row-content">
          <span className="action-row-empty">No action</span>
        </div>
      </div>
    );
  }

  // Render summon action with StatBlockLayout
  if (action.type === 'summon' && action.summon) {
    const { summon } = action as SummonAction;
    const summonEffects = getEffectStrings(summon.modifiers);
    const summonInfuse = getInfuseModifier(action.modifiers);

    return (
      <div
        className={`action-row-layout ${variant} ${position} action-type-summon ${className}`}
        data-position={position}
        data-testid={`action-row-${position}`}
      >
        <div className="action-row-summon">
          <div className="summon-header">
            <span className="summon-icon" style={{ color: ACTION_ICONS.summon.color }}>
              <i className={`ra ${ACTION_ICONS.summon.icon}`} aria-hidden="true" />
            </span>
            <span className="summon-name">{summon.name}</span>
          </div>
          <StatBlockLayout
            stats={createDefaultStats(summon.health, summon.attack, summon.move, summon.range)}
            typeIcon={summon.typeIcon}
            typeLabel={summonEffects.length === 0 ? 'SUMMON' : undefined}
            effects={summonEffects}
            variant={variant}
          />
          {/* Element generation for summon */}
          {summonInfuse && (
            <div className="action-row-element generate">
              <span className="element-icon" style={{ color: getElementColor(summonInfuse.element) }}>
                <i className={`ra ${getElementIconClass(summonInfuse.element)}`} aria-hidden="true" />
              </span>
              <span className="element-action">+</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render text action with TextRowLayout
  if (action.type === 'text') {
    const textAction = action as TextActionType;
    return (
      <div
        className={`action-row-layout ${variant} ${position} action-type-text ${className}`}
        data-position={position}
        data-testid={`action-row-${position}`}
      >
        <TextRowLayout
          title={textAction.title}
          text={textAction.description || ''}
          quote={textAction.quote}
          variant={variant}
          alignment="center"
          multiLine
        />
      </div>
    );
  }

  // Extract values from modifiers
  const value = getActionValue(action);
  const range = getRange(action.modifiers);
  const infuseModifier = getInfuseModifier(action.modifiers);
  const consumeModifier = getConsumeModifier(action.modifiers);
  const effectStrings = getEffectStrings(action.modifiers);

  return (
    <div
      className={`action-row-layout ${variant} ${position} ${getActionTypeClass(action.type)} ${className}`}
      data-position={position}
      data-testid={`action-row-${position}`}
    >
      <div className="action-row-content">
        {/* Main action display */}
        <div className="action-row-main">
          <span
            className="action-row-icon"
            aria-label={action.type}
            style={{ color: getActionColor(action.type) }}
          >
            <i className={`ra ${getActionIconClass(action.type)}`} aria-hidden="true" />
          </span>

          {value !== undefined && <span className="action-row-value">{value}</span>}

          {range > 0 && (
            <span className="action-row-range">
              <i className="ra ra-target-arrows range-icon" aria-hidden="true" />
              {range}
            </span>
          )}
        </div>

        {/* Element generation */}
        {infuseModifier && (
          <div className="action-row-element generate">
            <span
              className="element-icon"
              aria-label={`Generate ${infuseModifier.element}`}
              style={{ color: getElementColor(infuseModifier.element) }}
            >
              <i className={`ra ${getElementIconClass(infuseModifier.element)}`} aria-hidden="true" />
            </span>
            <span className="element-action">+</span>
          </div>
        )}

        {/* Element consumption */}
        {consumeModifier && (
          <div className="action-row-element consume">
            <span
              className="element-icon"
              aria-label={`Consume ${consumeModifier.element}`}
              style={{ color: getElementColor(consumeModifier.element) }}
            >
              <i className={`ra ${getElementIconClass(consumeModifier.element)}`} aria-hidden="true" />
            </span>
            <span className="element-action">−</span>
          </div>
        )}

        {/* Effects from modifiers */}
        {effectStrings.length > 0 && (
          <div className="action-row-effects">
            {effectStrings.map((effect, idx) => {
              const formatted = formatEffect(effect);
              return (
                <span
                  key={idx}
                  className="action-row-effect-tag"
                  title={effect}
                  style={
                    formatted.icon?.color
                      ? ({ '--effect-color': formatted.icon.color } as React.CSSProperties)
                      : undefined
                  }
                >
                  {formatted.icon ? (
                    <>
                      <i className={`ra ${formatted.icon.icon}`} aria-hidden="true" />
                      {formatted.value !== null && <span className="effect-value">{formatted.value}</span>}
                    </>
                  ) : (
                    effect
                  )}
                </span>
              );
            })}
          </div>
        )}

        {/* Element bonus (conditional) */}
        {consumeModifier?.bonus && (
          <div className="action-row-bonus">
            <span className="bonus-label">
              {consumeModifier.bonus.effect} +{consumeModifier.bonus.value}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActionRowLayout;
