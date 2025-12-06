/**
 * AbilityCard Component (US2 - T103)
 *
 * Displays a single ability card with top/bottom actions, initiative, and selection state.
 * Mobile-first design with touch-friendly interactions.
 *
 * Now powered by ConfigurableCard with modular layout system.
 */

import React from 'react';
import { ConfigurableCard } from './ConfigurableCard';
import type { CardLayoutTemplate } from './ConfigurableCard';
import type { AbilityCard as AbilityCardType } from '../../../shared/types/entities';
import './AbilityCard.css';

interface AbilityCardProps {
  card: AbilityCardType;
  isSelected?: boolean;
  isTop?: boolean; // Which half is being used
  onClick?: () => void;
  disabled?: boolean;
  compact?: boolean; // Use compact layout mode
}

/**
 * Default card layout template (hardcoded until backend integration)
 * Matches the original card structure: header, top action, divider, bottom action, footer
 */
const DEFAULT_ABILITY_CARD_TEMPLATE: CardLayoutTemplate = {
  id: 'default-ability-card',
  name: 'Default Ability Card',
  description: 'Standard ability card layout with top/bottom actions',
  modules: [
    {
      id: 'header',
      type: 'header',
      rows: 1,
      order: 1,
      config: {
        fields: ['name', 'initiative'],
        layout: 'horizontal',
      },
    },
    {
      id: 'top-action',
      type: 'action',
      rows: 3,
      order: 2,
      config: {
        position: 'top',
        showElements: true,
        showEffects: true,
      },
    },
    {
      id: 'divider',
      type: 'divider',
      rows: 1,
      order: 3,
      config: {
        style: 'faded',
      },
    },
    {
      id: 'bottom-action',
      type: 'action',
      rows: 3,
      order: 4,
      config: {
        position: 'bottom',
        showElements: true,
        showEffects: true,
      },
    },
    {
      id: 'footer',
      type: 'footer',
      rows: 1,
      order: 5,
      config: {
        fields: ['level'],
      },
    },
  ],
};

export const AbilityCard: React.FC<AbilityCardProps> = ({
  card,
  isSelected = false,
  isTop,
  onClick,
  disabled = false,
  compact = false,
}) => {
  return (
    <div
      className={`ability-card-wrapper ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''} ${isTop !== undefined ? (isTop ? 'highlight-top' : 'highlight-bottom') : ''}`}
      onClick={!disabled ? onClick : undefined}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-pressed={isSelected}
    >
      <ConfigurableCard
        card={card}
        template={DEFAULT_ABILITY_CARD_TEMPLATE}
        isActive={isSelected}
        compact={compact}
        className="ability-card-content"
      />

      {/* Selection Indicator */}
      {isSelected && (
        <div className="selection-indicator">
          <span>✓</span>
        </div>
      )}
    </div>
  );
};
