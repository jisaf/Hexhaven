import React from 'react';
import type { AbilityCard as AbilityCardType } from '../../../shared/types/entities';
import { AbilityCardV2 } from './CardV2/AbilityCardV2';

interface AbilityCardProps {
  card: AbilityCardType;
  isSelected?: boolean;
  isTop?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export const AbilityCard: React.FC<AbilityCardProps> = ({
  card,
  isSelected = false,
  isTop,
  onClick,
  disabled = false,
}) => {
  // The wrapper div is preserved to maintain existing functionality like click handlers and selection states
  return (
    <div
      className="ability-card-wrapper"
      onClick={!disabled ? onClick : undefined}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-pressed={isSelected}
    >
      <AbilityCardV2
        card={card}
        isSelected={isSelected}
        isTop={isTop}
        disabled={disabled}
      />
    </div>
  );
};
