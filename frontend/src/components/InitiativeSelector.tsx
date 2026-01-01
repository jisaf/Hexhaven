/**
 * InitiativeSelector Component (Issue #411 - Phase 2)
 *
 * Allows players to select which of their two chosen ability cards
 * determines their initiative for the round.
 *
 * Per Gloomhaven rules:
 * - Players select two ability cards each round
 * - One card's initiative value determines turn order
 * - Lower initiative = earlier in turn order (faster)
 */

import React from 'react';
import type { AbilityCard } from '../../../shared/types/entities';
import './InitiativeSelector.css';

export interface InitiativeSelectorProps {
  /** First selected ability card */
  card1: AbilityCard;
  /** Second selected ability card */
  card2: AbilityCard;
  /** ID of the currently selected initiative card (null if none selected) */
  selectedCardId: string | null;
  /** Callback when initiative card selection changes */
  onChange: (cardId: string) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

export const InitiativeSelector: React.FC<InitiativeSelectorProps> = ({
  card1,
  card2,
  selectedCardId,
  onChange,
  disabled = false,
}) => {
  // Determine which card is faster (lower initiative = faster)
  const fasterCardId = card1.initiative <= card2.initiative ? card1.id : card2.id;

  const handleChange = (cardId: string) => {
    if (!disabled) {
      onChange(cardId);
    }
  };

  return (
    <div
      className="initiative-selector"
      role="radiogroup"
      aria-label="Select initiative card"
    >
      <span className="initiative-label">Choose Initiative:</span>
      <div className="initiative-options">
        <InitiativeOption
          card={card1}
          isSelected={selectedCardId === card1.id}
          isFaster={fasterCardId === card1.id}
          disabled={disabled}
          onChange={handleChange}
        />
        <InitiativeOption
          card={card2}
          isSelected={selectedCardId === card2.id}
          isFaster={fasterCardId === card2.id}
          disabled={disabled}
          onChange={handleChange}
        />
      </div>
    </div>
  );
};

interface InitiativeOptionProps {
  card: AbilityCard;
  isSelected: boolean;
  isFaster: boolean;
  disabled: boolean;
  onChange: (cardId: string) => void;
}

const InitiativeOption: React.FC<InitiativeOptionProps> = ({
  card,
  isSelected,
  isFaster,
  disabled,
  onChange,
}) => {
  const optionClassName = `initiative-option ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`;

  return (
    <label className={optionClassName}>
      <input
        type="radio"
        name="initiative-card"
        value={card.id}
        checked={isSelected}
        disabled={disabled}
        onChange={() => onChange(card.id)}
        aria-label={`${card.name} with initiative ${card.initiative}`}
      />
      <div className="initiative-option-content">
        <span className="initiative-value">{card.initiative}</span>
        <span className="card-name">{card.name}</span>
        {isFaster && <span className="faster-badge">faster</span>}
      </div>
    </label>
  );
};

export default InitiativeSelector;
