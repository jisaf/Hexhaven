
import React, { useState } from 'react';
import type { AbilityCard as AbilityCardType } from '../../../shared/types/entities';
import { AbilityCard } from './AbilityCard';
import { useMediaQuery } from '../hooks/useMediaQuery';

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
  const panelClassName = `fixed bottom-0 left-0 right-0 p-4 bg-slate-900 border-t-2 border-slate-700 ${isPortrait ? 'h-[25vh]' : 'h-[50vh]'}`;

  return (
    <div className={panelClassName}>
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold">Select Your Actions</h3>
        <p className="text-sm text-slate-400">
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

      <div className="flex justify-center items-center gap-4">
        {cards.map((card) => {
          const isSelected = card.id === selectedTopAction?.id || card.id === selectedBottomAction?.id;
          const isFocused = card.id === focusedId;

          return (
            <div
              key={card.id}
              className={`w-48 transform transition-transform ${isFocused ? 'scale-105' : ''}`}
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

      <div className="flex justify-center gap-4 mt-4">
        {!mustRest && canLongRest && (
          <button
            className="px-4 py-2 bg-blue-800 rounded hover:bg-blue-700 disabled:opacity-50"
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
              className="px-4 py-2 bg-slate-700 rounded hover:bg-slate-600 disabled:opacity-50"
              onClick={onClearSelection}
              disabled={!selectedTopAction && !selectedBottomAction || disabled || waiting}
            >
              Clear
            </button>
            <button
              className="px-4 py-2 bg-green-700 rounded hover:bg-green-600 disabled:opacity-50"
              onClick={onConfirmSelection}
              disabled={!canConfirm || disabled || waiting}
            >
              {waiting ? 'Waiting...' : 'Confirm'}
            </button>
          </>
        )}
        {mustRest && canLongRest && (
          <button
            className="px-4 py-2 bg-blue-800 rounded hover:bg-blue-700 disabled:opacity-50"
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
