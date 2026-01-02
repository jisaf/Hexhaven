import React, { useState, useEffect } from 'react';
import type { AbilityCard as AbilityCardType } from '../../../shared/types/entities';
import { AbilityCard2 } from './AbilityCard2';
import { InitiativeSelector } from './InitiativeSelector';
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
  // Multi-character support
  activeCharacterName?: string;
  totalCharacters?: number;
  charactersWithSelections?: number;
  // Issue #411 - Initiative selection
  selectedInitiativeCardId?: string | null;
  onInitiativeChange?: (cardId: string) => void;
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
  // Issue #411 - Initiative selection
  selectedInitiativeCardId,
  onInitiativeChange,
}) => {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const isPortrait = useMediaQuery('(orientation: portrait)');

  // Issue #411: Auto-select initiative card when both cards are selected
  // Default to the card with lower initiative (faster)
  const bothCardsSelected = selectedTopAction !== null && selectedBottomAction !== null;

  useEffect(() => {
    if (bothCardsSelected && selectedInitiativeCardId === null && onInitiativeChange) {
      // Auto-select the card with lower initiative (faster turn)
      const fasterCardId = selectedTopAction!.initiative <= selectedBottomAction!.initiative
        ? selectedTopAction!.id
        : selectedBottomAction!.id;
      onInitiativeChange(fasterCardId);
    }
  }, [bothCardsSelected, selectedTopAction, selectedBottomAction, selectedInitiativeCardId, onInitiativeChange]);

  const canConfirm = selectedTopAction !== null && selectedBottomAction !== null;
  const mustRest = cards.length < 2 && canLongRest;
  const panelClassName = `card-selection-panel ${isPortrait ? 'portrait' : ''}`;

  // Multi-character: check if current character has both cards selected
  const currentCharacterHasSelection = selectedTopAction !== null && selectedBottomAction !== null;
  // All characters ready when all have selections
  const allCharactersReady = totalCharacters > 1
    ? (charactersWithSelections + (currentCharacterHasSelection ? 1 : 0)) >= totalCharacters
    : canConfirm;

  // Build instruction text
  const getInstructionText = () => {
    if (waiting) return 'Waiting for other players...';
    if (mustRest) return `Cannot play 2 cards (${cards.length} in hand). Must rest.`;
    if (!selectedTopAction) return 'Select your first card';
    if (!selectedBottomAction) return 'Select your second card';
    if (totalCharacters > 1 && !allCharactersReady) {
      return `Cards selected! Click confirm to select for next character.`;
    }
    return 'Cards selected! Ready to confirm.';
  };

  // Build confirm button text
  const getConfirmText = () => {
    if (waiting) return 'Waiting...';
    if (totalCharacters > 1) {
      if (allCharactersReady) {
        return `Confirm All (${totalCharacters})`;
      }
      return `Next Character (${charactersWithSelections + (currentCharacterHasSelection ? 1 : 0)}/${totalCharacters})`;
    }
    return 'Confirm';
  };

  return (
    <div className={panelClassName}>
      {/* Status text shown in cards area */}
      <div className="status-text">
        {totalCharacters > 1 && (
          <span className="character-progress">
            {charactersWithSelections + (currentCharacterHasSelection ? 1 : 0)}/{totalCharacters} ready
          </span>
        )}
        <span className="instruction">{getInstructionText()}</span>
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
              onMouseEnter={() => !waiting && setFocusedId(card.id)}
              onMouseLeave={() => !waiting && setFocusedId(null)}
            >
              <AbilityCard2
                card={card}
                variant="full"
                isSelected={isSelected}
                disabled={disabled || waiting}
                onClick={() => !waiting && onCardSelect(card)}
              />
            </div>
          );
        })}
      </div>

      {/* Issue #411: Initiative Selection - Show when both cards are selected */}
      {bothCardsSelected && onInitiativeChange && (
        <div className="initiative-selector-container">
          <InitiativeSelector
            card1={selectedTopAction!}
            card2={selectedBottomAction!}
            selectedCardId={selectedInitiativeCardId ?? null}
            onChange={onInitiativeChange}
            disabled={disabled || waiting}
          />
        </div>
      )}

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
              className={`btn-confirm ${allCharactersReady ? 'all-ready' : ''}`}
              onClick={onConfirmSelection}
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
