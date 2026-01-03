import React, { useState, useEffect, useRef } from 'react';
import type { AbilityCard as AbilityCardType } from '../../../shared/types/entities';
import { AbilityCard2 } from './AbilityCard2';
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
  // activeCharacterName - intentionally omitted (unused)
  totalCharacters = 1,
  charactersWithSelections = 0,
  // Issue #411 - Initiative selection
  selectedInitiativeCardId,
  onInitiativeChange,
}) => {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const isPortrait = useMediaQuery('(orientation: portrait)');

  // Track which card was selected first (for default initiative)
  const firstSelectedCardRef = useRef<string | null>(null);

  // Issue #411: Auto-select initiative when first card is selected
  // Default to the FIRST card selected (not necessarily the faster one)
  const bothCardsSelected = selectedTopAction !== null && selectedBottomAction !== null;

  // Track first selected card
  useEffect(() => {
    if (selectedTopAction && !selectedBottomAction && !firstSelectedCardRef.current) {
      // First card just selected
      firstSelectedCardRef.current = selectedTopAction.id;
    } else if (!selectedTopAction && !selectedBottomAction) {
      // Selection cleared
      firstSelectedCardRef.current = null;
    }
  }, [selectedTopAction, selectedBottomAction]);

  // Auto-select initiative when both cards selected (use first selected card)
  useEffect(() => {
    if (bothCardsSelected && selectedInitiativeCardId === null && onInitiativeChange) {
      // Default to the first card that was selected
      const defaultInitiativeCardId = firstSelectedCardRef.current || selectedTopAction!.id;
      onInitiativeChange(defaultInitiativeCardId);
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

  // Handle initiative badge click
  const handleInitiativeBadgeClick = (e: React.MouseEvent, cardId: string) => {
    e.stopPropagation(); // Don't trigger card selection
    if (onInitiativeChange && !disabled && !waiting) {
      onInitiativeChange(cardId);
    }
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
          const isInitiativeCard = card.id === selectedInitiativeCardId;

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
              {/* Issue #411: Initiative badge - shown only on selected cards */}
              {isSelected && onInitiativeChange && (
                <button
                  className={`initiative-badge ${isInitiativeCard ? 'active' : ''}`}
                  onClick={(e) => handleInitiativeBadgeClick(e, card.id)}
                  disabled={disabled || waiting}
                  title={isInitiativeCard ? 'This card determines initiative' : 'Tap to use this card\'s initiative'}
                  aria-label={`Initiative ${card.initiative}${isInitiativeCard ? ' (selected)' : ''}`}
                >
                  {card.initiative}
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
