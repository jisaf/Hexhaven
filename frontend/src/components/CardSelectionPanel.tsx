import React, { useState } from 'react';
import type { AbilityCard as AbilityCardType } from '../../../shared/types/entities';
import { AbilityCard } from './AbilityCard';
import './CardSelectionPanel.css';
import { GiScrollUnfurled, GiScrollQuill } from 'react-icons/gi';

interface CardSelectionPanelProps {
  cards: AbilityCardType[];
  selectedTopCard: string | null;
  selectedBottomCard: string | null;
  onSelectTop: (cardId: string) => void;
  onSelectBottom: (cardId: string) => void;
  onConfirm: () => void;
  onClearSelection: () => void;
  disabled?: boolean;
}

export const CardSelectionPanel: React.FC<CardSelectionPanelProps> = ({
  cards,
  selectedTopCard,
  selectedBottomCard,
  onSelectTop,
  onSelectBottom,
  onConfirm,
  onClearSelection,
  disabled = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const handleCardClick = (cardId: string) => {
    if (disabled) return;

    setFocusedId(cardId);

    if (!selectedTopCard) {
      onSelectTop(cardId);
    } else if (!selectedBottomCard) {
      onSelectBottom(cardId);
    } else {
      // Both are selected, so start a new selection.
      onClearSelection();
      onSelectTop(cardId);
    }
  };

  const canConfirm = selectedTopCard !== null && selectedBottomCard !== null;
  const panelClassName = `card-selection-panel ${isCollapsed ? 'collapsed' : ''}`;

  return (
    <div className={panelClassName}>
      <button className="collapse-toggle" onClick={() => setIsCollapsed(!isCollapsed)}>
        {isCollapsed ? <GiScrollQuill /> : <GiScrollUnfurled />}
      </button>

      {/* Selection Instructions */}
      <div className="selection-instructions">
        <h3>Select Your Actions</h3>
        <p>
          {!selectedTopCard
            ? 'Select a card for your TOP action'
            : !selectedBottomCard
              ? 'Select a card for your BOTTOM action'
              : 'Cards selected! Ready to confirm.'}
        </p>
      </div>

      {/* Horizontal Scroll Container */}
      <div className="cards-container" data-testid="cards-container">
        {cards.map((card) => {
          const isSelectedTop = selectedTopCard === card.id;
          const isSelectedBottom = selectedBottomCard === card.id;
          const isSelected = isSelectedTop || isSelectedBottom;
          const isFocused = focusedId === card.id;

          const wrapperClassName = `card-wrapper ${isFocused ? 'focused' : ''} ${
            isSelected ? 'selected' : ''
          }`;

          return (
            <div
              key={card.id}
              className={wrapperClassName}
              onClick={() => handleCardClick(card.id)}
              data-testid={`card-wrapper-${card.id}`}
            >
              <AbilityCard
                card={card}
                isSelected={isSelected}
                isTop={isSelectedTop ? true : isSelectedBottom ? false : undefined}
                disabled={disabled}
              />
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button
          className="btn-clear"
          onClick={onClearSelection}
          disabled={(!selectedTopCard && !selectedBottomCard) || disabled}
          data-testid="clear-selection-button"
        >
          Clear
        </button>
        <button
          className="btn-confirm"
          onClick={onConfirm}
          disabled={!canConfirm || disabled}
          data-testid="confirm-cards-button"
        >
          Confirm
        </button>
      </div>
    </div>
  );
};
