import React, { useState } from 'react';
import type { AbilityCard as AbilityCardType } from '../../../shared/types/entities';
import { AbilityCard2 } from './AbilityCard2';
import './CardSelectionPanel.css';

interface CardSelectionPanelProps {
  cards: AbilityCardType[];
  onCardSelect: (card: AbilityCardType) => void;
  onClearSelection: () => void;
  onConfirmSelection: (initiativeCardId?: string) => void;
  onLongRest?: () => void;
  // Issue #411: Renamed from selectedTopAction/selectedBottomAction to selectedCards
  // These represent the 2 cards selected for the round (no longer tied to top/bottom)
  selectedTopAction: AbilityCardType | null;
  selectedBottomAction: AbilityCardType | null;
  disabled?: boolean;
  waiting?: boolean;
  canLongRest?: boolean;
  discardPileCount?: number;
  // Multi-character support
  activeCharacterName?: string;
  totalCharacters?: number;
  charactersWithSelections?: number;
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
  activeCharacterName,
  totalCharacters = 1,
  charactersWithSelections = 0,
}) => {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  // Issue #411: Track which card determines initiative (defaults to lower initiative card)
  const [selectedInitiativeCardId, setSelectedInitiativeCardId] = useState<string | null>(null);
  const isPortrait = useMediaQuery('(orientation: portrait)');

  // Issue #411: Get the two selected cards as an array
  const selectedCards = [selectedTopAction, selectedBottomAction].filter(
    (card): card is AbilityCardType => card !== null
  );

  // Issue #411: When both cards are selected, auto-select the one with lower initiative
  React.useEffect(() => {
    if (selectedCards.length === 2 && !selectedInitiativeCardId) {
      const lowerInitiativeCard = selectedCards[0].initiative <= selectedCards[1].initiative
        ? selectedCards[0]
        : selectedCards[1];
      setSelectedInitiativeCardId(lowerInitiativeCard.id);
    } else if (selectedCards.length < 2) {
      setSelectedInitiativeCardId(null);
    }
  }, [selectedCards.length, selectedCards, selectedInitiativeCardId]);

  const canConfirm = selectedTopAction !== null && selectedBottomAction !== null;
  const mustRest = cards.length < 2 && canLongRest;
  const panelClassName = `card-selection-panel ${isPortrait ? 'portrait' : ''}`;

  // Multi-character: check if current character has both cards selected
  const currentCharacterHasSelection = selectedTopAction !== null && selectedBottomAction !== null;
  // All characters ready when all have selections
  const allCharactersReady = totalCharacters > 1
    ? (charactersWithSelections + (currentCharacterHasSelection ? 1 : 0)) >= totalCharacters
    : canConfirm;

  // Issue #411: Build instruction text - now focused on card selection (not top/bottom designation)
  const getInstructionText = () => {
    if (waiting) return 'Waiting for other players...';
    if (mustRest) return `Cannot play 2 cards (${cards.length} in hand). Must rest.`;
    if (selectedCards.length === 0) return 'Select your first card';
    if (selectedCards.length === 1) return 'Select your second card';
    if (totalCharacters > 1 && !allCharactersReady) {
      return `Cards selected! Click confirm to select for next character.`;
    }
    // Show initiative info when both cards are selected
    const initiativeCard = selectedCards.find(c => c.id === selectedInitiativeCardId);
    if (initiativeCard) {
      return `Initiative: ${initiativeCard.initiative} (${initiativeCard.name})`;
    }
    return 'Cards selected! Ready to confirm.';
  };

  // Issue #411: Build confirm button text
  const getConfirmText = () => {
    if (waiting) return 'Waiting...';
    if (totalCharacters > 1) {
      if (allCharactersReady) {
        return `Confirm All (${totalCharacters})`;
      }
      return `Next Character (${charactersWithSelections + (currentCharacterHasSelection ? 1 : 0)}/${totalCharacters})`;
    }
    return 'Confirm Cards';
  };

  // Issue #411: Handle confirm with initiative card
  const handleConfirm = () => {
    onConfirmSelection(selectedInitiativeCardId || undefined);
  };

  return (
    <div className={panelClassName}>
      <div className="selection-instructions">
        <h3>
          {activeCharacterName && totalCharacters > 1
            ? `Select Cards: ${activeCharacterName}`
            : 'Select Your Cards'}
        </h3>
        {totalCharacters > 1 && (
          <span className="character-progress">
            {charactersWithSelections + (currentCharacterHasSelection ? 1 : 0)}/{totalCharacters} characters ready
          </span>
        )}
        <p>{getInstructionText()}</p>
      </div>

      <div className="cards-container">
        {cards.map((card) => {
          const isSelected = card.id === selectedTopAction?.id || card.id === selectedBottomAction?.id;
          const isFocused = card.id === focusedId;
          // Issue #411: Check if this card is the initiative card
          const isInitiativeCard = isSelected && card.id === selectedInitiativeCardId;

          const wrapperClassName = `card-wrapper ${isFocused ? 'focused' : ''} ${isSelected ? 'selected' : ''} ${isInitiativeCard ? 'initiative-card' : ''}`;

          return (
            <div
              key={card.id}
              className={wrapperClassName}
              onMouseEnter={() => !waiting && setFocusedId(card.id)}
              onMouseLeave={() => !waiting && setFocusedId(null)}
            >
              <AbilityCard2
                card={card}
                variant="full"
                isSelected={isSelected}
                isTop={
                  card.id === selectedTopAction?.id
                    ? true
                    : card.id === selectedBottomAction?.id
                      ? false
                      : undefined
                }
                disabled={disabled || waiting}
                onClick={() => !waiting && onCardSelect(card)}
              />
              {/* Issue #411: Initiative selection buttons for selected cards */}
              {isSelected && selectedCards.length === 2 && !waiting && (
                <button
                  className={`initiative-selector ${isInitiativeCard ? 'selected' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedInitiativeCardId(card.id);
                  }}
                  title={`Use ${card.name}'s initiative (${card.initiative})`}
                >
                  {isInitiativeCard ? `Initiative: ${card.initiative}` : `Set Initiative (${card.initiative})`}
                </button>
              )}
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
              onClick={() => {
                onClearSelection();
                setSelectedInitiativeCardId(null);
              }}
              disabled={!selectedTopAction && !selectedBottomAction || disabled || waiting}
            >
              Clear
            </button>
            <button
              className={`btn-confirm ${allCharactersReady ? 'all-ready' : ''}`}
              onClick={handleConfirm}
              disabled={!canConfirm || disabled || waiting}
            >
              {getConfirmText()}
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
