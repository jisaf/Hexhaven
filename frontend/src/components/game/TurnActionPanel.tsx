/**
 * TurnActionPanel Component (Issue #411 - Phase 4.2)
 *
 * Displays the player's two selected cards side-by-side during their turn.
 * Each card shows its top and bottom action regions that the player can
 * click to execute.
 *
 * Features:
 * - Displays 2 cards side-by-side (stacked on mobile)
 * - Each card has 2 CardActionRegion components (top/bottom)
 * - Manages selected action state internally
 * - Shows which actions are available based on turnActionState
 * - Responsive layout
 *
 * Turn execution flow:
 * 1. Player sees their 2 selected cards
 * 2. Click top or bottom of either card to select that action
 * 3. First action: any of 4 options available
 * 4. After first action: only opposite section of other card available
 * 5. Tap-to-select, tap-to-confirm flow
 */

import { useState, useCallback, useMemo } from 'react';
import type { AbilityCard } from '../../../../shared/types/entities';
import type { TurnActionState, TurnAction } from '../../../../shared/types/events';
import { CardActionRegion, type CardActionState } from './CardActionRegion';
import styles from './TurnActionPanel.module.css';

export interface TurnActionPanelProps {
  /** First selected card for the turn */
  card1: AbilityCard;
  /** Second selected card for the turn */
  card2: AbilityCard;
  /** Current turn action state from backend */
  turnActionState: TurnActionState;
  /** Callback when an action is selected */
  onActionSelect: (cardId: string, position: 'top' | 'bottom') => void;
  /** Callback when selected action is confirmed */
  onActionConfirm: () => void;
  /** Callback when selection is cancelled */
  onActionCancel: () => void;
}

/**
 * Determine the state of a card action region based on turn state
 */
function getActionRegionState(
  cardId: string,
  position: 'top' | 'bottom',
  turnActionState: TurnActionState,
  pendingAction: { cardId: string; position: 'top' | 'bottom' } | null
): CardActionState {
  // Check if this is the currently selected/pending action
  if (pendingAction?.cardId === cardId && pendingAction?.position === position) {
    return 'selected';
  }

  // Check if this action was already used
  const isFirstAction = turnActionState.firstAction?.cardId === cardId &&
    turnActionState.firstAction?.position === position;
  const isSecondAction = turnActionState.secondAction?.cardId === cardId &&
    turnActionState.secondAction?.position === position;

  if (isFirstAction || isSecondAction) {
    return 'used';
  }

  // Check if this action is available
  const isAvailable = turnActionState.availableActions.some(
    (action) => action.cardId === cardId && action.position === position
  );

  return isAvailable ? 'available' : 'disabled';
}

export function TurnActionPanel({
  card1,
  card2,
  turnActionState,
  onActionSelect,
  onActionConfirm,
  onActionCancel,
}: TurnActionPanelProps) {
  // Track the currently selected (pending) action
  const [pendingAction, setPendingAction] = useState<TurnAction | null>(null);

  // Calculate number of actions used
  const actionsUsed = useMemo(() => {
    let count = 0;
    if (turnActionState.firstAction) count++;
    if (turnActionState.secondAction) count++;
    return count;
  }, [turnActionState]);

  // Handle action region click
  const handleActionClick = useCallback((cardId: string, position: 'top' | 'bottom') => {
    // If clicking the same action, treat as toggle off
    if (pendingAction?.cardId === cardId && pendingAction?.position === position) {
      setPendingAction(null);
      onActionCancel();
      return;
    }

    // Set as pending and notify parent
    setPendingAction({ cardId, position });
    onActionSelect(cardId, position);
  }, [pendingAction, onActionSelect, onActionCancel]);

  // Handle confirm
  const handleConfirm = useCallback(() => {
    setPendingAction(null);
    onActionConfirm();
  }, [onActionConfirm]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setPendingAction(null);
    onActionCancel();
  }, [onActionCancel]);

  // Get states for all four action regions
  const card1TopState = getActionRegionState(card1.id, 'top', turnActionState, pendingAction);
  const card1BottomState = getActionRegionState(card1.id, 'bottom', turnActionState, pendingAction);
  const card2TopState = getActionRegionState(card2.id, 'top', turnActionState, pendingAction);
  const card2BottomState = getActionRegionState(card2.id, 'bottom', turnActionState, pendingAction);

  return (
    <div className={styles.panel}>
      {/* Header showing action count */}
      <div className={styles.header}>
        <span className={styles.title}>Select Action</span>
        <span className={styles.actionCount}>
          {actionsUsed === 0 ? 'Choose your first action' :
           actionsUsed === 1 ? 'Choose your second action' :
           'Turn complete'}
        </span>
      </div>

      {/* Cards container */}
      <div className={styles.cardsContainer}>
        {/* Card 1 */}
        <div className={styles.card}>
          <CardActionRegion
            action={card1.topAction}
            position="top"
            state={card1TopState}
            cardName={card1.name}
            initiative={card1.initiative}
            onClick={() => handleActionClick(card1.id, 'top')}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
          <CardActionRegion
            action={card1.bottomAction}
            position="bottom"
            state={card1BottomState}
            cardName={card1.name}
            initiative={card1.initiative}
            onClick={() => handleActionClick(card1.id, 'bottom')}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        </div>

        {/* Card 2 */}
        <div className={styles.card}>
          <CardActionRegion
            action={card2.topAction}
            position="top"
            state={card2TopState}
            cardName={card2.name}
            initiative={card2.initiative}
            onClick={() => handleActionClick(card2.id, 'top')}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
          <CardActionRegion
            action={card2.bottomAction}
            position="bottom"
            state={card2BottomState}
            cardName={card2.name}
            initiative={card2.initiative}
            onClick={() => handleActionClick(card2.id, 'bottom')}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        </div>
      </div>

      {/* Help text */}
      <div className={styles.helpText}>
        {pendingAction ? (
          <span>Tap Confirm to execute this action, or Cancel to choose another</span>
        ) : actionsUsed < 2 ? (
          <span>Tap an action to select it</span>
        ) : null}
      </div>
    </div>
  );
}
