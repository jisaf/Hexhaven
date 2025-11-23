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
  disabled?: boolean;
}

export const CardSelectionPanel: React.FC<CardSelectionPanelProps> = ({
  cards,
  selectedTopCard,
  selectedBottomCard,
  onSelectTop,
  onSelectBottom,
  onConfirm,
  disabled = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(Math.floor(cards.length / 2));
  const [selectionMode, setSelectionMode] = useState<'top' | 'bottom' | null>(null);

  const handleCardClick = (cardId: string, index: number) => {
    if (disabled) return;

    // If card is not focused, focus it
    if (index !== focusedIndex) {
      setFocusedIndex(index);
      return;
    }

    // If card is focused, select it
    // If no card selected yet, ask which half to use
    if (!selectionMode) {
      setSelectionMode('top');
      return;
    }

    if (selectionMode === 'top') {
      onSelectTop(cardId);
      setSelectionMode('bottom');
    } else {
      onSelectBottom(cardId);
      setSelectionMode(null);
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
        <h3>Select Your Cards</h3>
        <p>
          {!selectedTopCard && !selectedBottomCard
            ? 'Tap unfocused cards to focus, tap focused cards to select'
            : !selectedTopCard
              ? 'Select TOP action'
              : !selectedBottomCard
                ? 'Select BOTTOM action'
                : 'Cards selected! Click Confirm when ready.'}
        </p>
      </div>

      {/* Selection Summary */}
      {(selectedTopCard || selectedBottomCard) && (
        <div className="selection-summary">
          <div className="summary-item">
            <span className="summary-label">Top:</span>
            <span className="summary-value">
              {selectedTopCard
                ? cards.find((c) => c.id === selectedTopCard)?.name || 'Unknown'
                : 'Not selected'}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Bottom:</span>
            <span className="summary-value">
              {selectedBottomCard
                ? cards.find((c) => c.id === selectedBottomCard)?.name || 'Unknown'
                : 'Not selected'}
            </span>
          </div>
        </div>
      )}

      {/* Fan Display Container */}
      <div className="fan-container" data-testid="card-fan">
        <div className="fan-cards">
          {cards.map((card, index) => {
            const isSelectedTop = selectedTopCard === card.id;
            const isSelectedBottom = selectedBottomCard === card.id;
            const isSelected = isSelectedTop || isSelectedBottom;
            const isFocused = index === focusedIndex;

            // Calculate rotation and position for fan layout
            const totalCards = cards.length;
            const centerIndex = (totalCards - 1) / 2;
            const offset = index - centerIndex;
            const maxRotation = 20; // degrees from center
            const rotation = (offset / (centerIndex || 1)) * maxRotation;
            const horizontalOffset = offset * 40; // px
            const verticalOffset = Math.abs(offset) * 20; // px

            const transform = isFocused
              ? `translateY(-20px) scale(1.15)`
              : `translateX(${horizontalOffset}px) translateY(${verticalOffset}px) rotate(${rotation}deg) scale(0.85)`;

            const finalTransform = isSelected
              ? `${transform} translateY(-40px)`
              : transform;

            return (
              <div
                key={card.id}
                className={`fan-card ${isFocused ? 'focused' : ''} ${isSelected ? 'selected' : ''}`}
                style={{
                  transform: finalTransform,
                  zIndex: isFocused ? 100 : 50 - Math.abs(offset),
                }}
                data-testid={`fan-card-${index}`}
              >
                <AbilityCard
                  card={card}
                  isSelected={isSelected}
                  isTop={isSelectedTop ? true : isSelectedBottom ? false : undefined}
                  onClick={() => handleCardClick(card.id, index)}
                  disabled={disabled}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button
          className="btn-clear"
          onClick={() => {
            onSelectTop('');
            onSelectBottom('');
            setSelectionMode(null);
          }}
          disabled={!selectedTopCard && !selectedBottomCard}
        >
          Clear Selection
        </button>
        <button
          className="btn-confirm"
          onClick={onConfirm}
          disabled={!canConfirm || disabled}
          data-testid="confirm-cards-button"
        >
          Confirm Cards
        </button>
      </div>
    </div>
  );
};
