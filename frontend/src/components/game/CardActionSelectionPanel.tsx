/**
 * CardActionSelectionPanel Component
 *
 * Issue #411 - Card Action Selection During Round
 *
 * Displays 2 full ability cards side by side with clickable top/bottom halves
 * allowing players to execute card actions during their turn.
 *
 * Uses AbilityCard2 component for consistent card display.
 * Reuses CardSelectionPanel.css for consistent styling.
 *
 * Gloomhaven constraint: After using one action (e.g., Card-A top),
 * only the opposite card's opposite half (Card-B bottom) is available.
 *
 * Player can skip actions and end turn with 0, 1, or 2 actions executed.
 */

import React from 'react';
import type { AbilityCard } from '../../../../shared/types/entities';
import { AbilityCard2 } from '../AbilityCard2';
// Reuse CardSelectionPanel styles for consistency
import '../CardSelectionPanel.css';

export interface ExecutedAction {
  cardId: string;
  actionPosition: 'top' | 'bottom';
}

export interface CardActionSelectionPanelProps {
  card1: AbilityCard;
  card2: AbilityCard;
  executedActions: ExecutedAction[];
  onActionClick: (cardId: string, actionPosition: 'top' | 'bottom') => void;
}

/**
 * Determines which actions are available based on executed actions.
 *
 * Rules:
 * - No actions executed: all 4 actions available
 * - 1 action executed: only opposite card + opposite position available
 * - 2 actions executed: no actions available
 */
function getAvailableActions(
  card1Id: string,
  card2Id: string,
  executedActions: ExecutedAction[]
): { cardId: string; position: 'top' | 'bottom' }[] {
  if (executedActions.length >= 2) {
    return [];
  }

  if (executedActions.length === 0) {
    // All 4 actions available
    return [
      { cardId: card1Id, position: 'top' },
      { cardId: card1Id, position: 'bottom' },
      { cardId: card2Id, position: 'top' },
      { cardId: card2Id, position: 'bottom' },
    ];
  }

  // One action executed - only opposite card + opposite position available
  const firstAction = executedActions[0];
  const oppositeCardId = firstAction.cardId === card1Id ? card2Id : card1Id;
  const oppositePosition: 'top' | 'bottom' = firstAction.actionPosition === 'top' ? 'bottom' : 'top';

  return [{ cardId: oppositeCardId, position: oppositePosition }];
}

/**
 * Check if an action is available (can be clicked)
 */
function isActionAvailable(
  cardId: string,
  position: 'top' | 'bottom',
  availableActions: { cardId: string; position: 'top' | 'bottom' }[]
): boolean {
  return availableActions.some(
    (action) => action.cardId === cardId && action.position === position
  );
}

export function CardActionSelectionPanel({
  card1,
  card2,
  executedActions,
  onActionClick,
}: CardActionSelectionPanelProps) {
  const availableActions = getAvailableActions(card1.id, card2.id, executedActions);
  const actionsRemaining = 2 - executedActions.length;

  const renderCard = (card: AbilityCard, cardIndex: number) => {
    const topAvailable = isActionAvailable(card.id, 'top', availableActions);
    const bottomAvailable = isActionAvailable(card.id, 'bottom', availableActions);
    const isExecuted = executedActions.some(a => a.cardId === card.id);

    return (
      <div
        key={card.id}
        className={`card-wrapper ${isExecuted ? 'selected' : ''}`}
        data-testid={`action-card-${cardIndex}`}
      >
        <AbilityCard2
          card={card}
          variant="full"
          onTopClick={topAvailable ? () => onActionClick(card.id, 'top') : undefined}
          onBottomClick={bottomAvailable ? () => onActionClick(card.id, 'bottom') : undefined}
          topDisabled={!topAvailable}
          bottomDisabled={!bottomAvailable}
        />
      </div>
    );
  };

  return (
    <div className="card-selection-panel">
      <div className="selection-instructions">
        <h3>Select Action</h3>
        <p>{actionsRemaining} action{actionsRemaining !== 1 ? 's' : ''} remaining</p>
      </div>

      <div className="cards-container">
        {renderCard(card1, 1)}
        {renderCard(card2, 2)}
      </div>
    </div>
  );
}
