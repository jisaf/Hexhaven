
import React, { useState } from 'react';
import type { AbilityCard as AbilityCardType } from '../../../shared/types/entities';
import { AbilityCard } from './AbilityCard';
import './CardSelectionPanel.css';

interface CardSelectionPanelProps {
  cards: AbilityCardType[];
  onCardSelect: (card: AbilityCardType) => void;
  onClearSelection: () => void;
  onConfirmSelection: () => void;
  onLongRest?: () => void;
  selectedTopAction: AbilityCardType | null;
  selectedBottomAction: AbilityCardType | null;
  disabled?: boolean;
  waiting?: boolean;
  canLongRest?: boolean;
  discardPileCount?: number;
}

import { useMediaQuery } from '../hooks/useMediaQuery';

export const CardSelectionPanel: React.FC<CardSelectionPanelProps> = ({
  cards,
  onCardSelect,
  onClearSelection,
  onConfirmSelection,
  onLongRest,
  selectedTopAction,
  selectedBottomAction,
  disabled = false,
  waiting = false,
  canLongRest = false,
  discardPileCount = 0,
}) => {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const isPortrait = useMediaQuery('(orientation: portrait)');

  const canConfirm = selectedTopAction !== null && selectedBottomAction !== null;
  const mustRest = cards.length < 2 && canLongRest;
  const panelClassName = `card-selection-panel ${isPortrait ? 'portrait' : ''}`;

  return (
    <div className={panelClassName}>
      <div className="selection-instructions">
        <h3>Select Your Actions</h3>
        <p>
          {waiting
            ? 'Waiting for other players...'
            : mustRest
              ? `Cannot play 2 cards (${cards.length} in hand). Must rest.`
              : !selectedTopAction
                ? 'Select a card for your TOP action'
                : !selectedBottomAction
                  ? 'Select a card for your BOTTOM action'
                  : 'Cards selected! Ready to confirm.'}
        </p>
      </div>

      <div className="cards-container">
        {cards.map((card) => {
          const isSelected = card.id === selectedTopAction?.id || card.id === selectedBottomAction?.id;
          const isFocused = card.id === focusedId;

          const wrapperClassName = `card-wrapper ${isFocused ? 'focused' : ''} ${isSelected ? 'selected' : ''}`;

          return (
            <div
              key={card.id}
              className={wrapperClassName}
              onClick={() => !waiting && onCardSelect(card)}
              onMouseEnter={() => !waiting && setFocusedId(card.id)}
              onMouseLeave={() => !waiting && setFocusedId(null)}
            >
              <AbilityCard
                card={card}
                isSelected={isSelected}
                isTop={
                  card.id === selectedTopAction?.id
                    ? true
                    : card.id === selectedBottomAction?.id
                      ? false
                      : undefined
                }
                disabled={disabled || waiting}
              />
            </div>
          );
        })}
      </div>

      <div className="action-buttons">
        {!mustRest && canLongRest && (
          <button
            className="btn-long-rest"
            onClick={onLongRest}
            disabled={disabled || waiting}
            title={`Long Rest: Heal 2 HP, refresh items (${discardPileCount} cards in discard)`}
          >
            Long Rest (Initiative 99)
          </button>
        )}
        {!mustRest && (
          <>
            <button
              className="btn-clear"
              onClick={onClearSelection}
              disabled={!selectedTopAction && !selectedBottomAction || disabled || waiting}
            >
              Clear
            </button>
            <button
              className="btn-confirm"
              onClick={onConfirmSelection}
              disabled={!canConfirm || disabled || waiting}
            >
              {waiting ? 'Waiting...' : 'Confirm'}
            </button>
          </>
        )}
        {mustRest && canLongRest && (
          <button
            className="btn-long-rest must-rest"
            onClick={onLongRest}
            disabled={disabled || waiting}
            title="You must rest - not enough cards to play"
          >
            Long Rest (Initiative 99)
          </button>
        )}
      </div>
    </div>
  );
};
