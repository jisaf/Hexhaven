/**
 * TurnActionPanel Component (Issue #411 - Phase 4.2)
 *
 * Displays the player's two selected cards side-by-side during their turn.
 * Each card shows its actual card content using AbilityCard2 with clickable
 * overlay regions for top and bottom actions.
 *
 * Features:
 * - Displays 2 AbilityCard2 cards side-by-side (stacked on mobile)
 * - Clickable overlay divs positioned over top/bottom halves of each card
 * - Manages selected action state internally
 * - Shows which actions are available based on turnActionState
 * - Visual states: available (golden border), selected (highlighted), used (grayed), disabled
 * - Responsive layout
 *
 * Turn execution flow:
 * 1. Player sees their 2 selected cards with full card content
 * 2. Click top or bottom half of either card to select that action
 * 3. First action: any of 4 options available
 * 4. After first action: only opposite section of other card available
 * 5. Tap-to-select, tap-to-confirm flow
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { AbilityCard } from '../../../../shared/types/entities';
import type { TurnActionState, TurnAction } from '../../../../shared/types/events';
import { AbilityCard2 } from '../AbilityCard2';
import styles from './TurnActionPanel.module.css';

const LONG_PRESS_DURATION = 350; // ms before zoom activates

export type CardActionState = 'available' | 'selected' | 'used' | 'disabled';

export interface TurnActionPanelProps {
  /** First selected card for the turn */
  card1: AbilityCard;
  /** Second selected card for the turn */
  card2: AbilityCard;
  /** Current turn action state from backend */
  turnActionState: TurnActionState;
  /** Callback when an action is selected */
  onActionSelect: (cardId: string, position: 'top' | 'bottom') => void;
  /** Callback when selected action is confirmed (tap-again pattern) */
  onActionConfirm: () => void;
  /** Issue #411: Current targeting mode (actions that need hex/target selection) */
  targetingMode?: 'move' | 'attack' | 'heal' | 'summon' | 'push' | 'pull' | null;
  /** Pending forced movement info (for skip button) */
  pendingForcedMovement?: {
    movementType: 'push' | 'pull';
    targetName: string;
  } | null;
  /** Callback when player wants to skip forced movement */
  onSkipForcedMovement?: () => void;
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
  targetingMode,
  pendingForcedMovement,
  onSkipForcedMovement,
}: TurnActionPanelProps) {
  // Track the currently selected (pending) action
  const [pendingAction, setPendingAction] = useState<TurnAction | null>(null);
  // Track which card is zoomed for long-press viewing
  const [zoomedCard, setZoomedCard] = useState<AbilityCard | null>(null);
  // Track previous targeting mode to detect when it exits
  const prevTargetingMode = useRef(targetingMode);

  // Clear pendingAction when targeting mode exits (action confirmed via hex selection)
  useEffect(() => {
    if (prevTargetingMode.current && !targetingMode) {
      setPendingAction(null);
    }
    prevTargetingMode.current = targetingMode;
  }, [targetingMode]);

  // Calculate number of actions used
  const actionsUsed = useMemo(() => {
    let count = 0;
    if (turnActionState.firstAction) count++;
    if (turnActionState.secondAction) count++;
    return count;
  }, [turnActionState]);

  // Handle action region click
  // - Targeting actions (move, attack, heal, summon): first tap enters targeting mode, hex tap confirms
  // - Non-targeting actions: first tap selects, second tap (tap-again) confirms
  // - Tapping a different action while one is selected cancels the original and selects the new one
  const handleActionClick = useCallback((cardId: string, position: 'top' | 'bottom') => {
    const isSameAction = pendingAction?.cardId === cardId && pendingAction?.position === position;

    // If in targeting mode and tapping the SAME action, ignore (must tap hex to confirm)
    if (targetingMode && isSameAction) {
      return;
    }

    // If clicking the same action that's already selected (and not in targeting mode),
    // this is tap-again confirmation for non-targeting actions
    if (isSameAction && !targetingMode) {
      setPendingAction(null);
      onActionConfirm();
      return;
    }

    // If in targeting mode and tapping a DIFFERENT action, switch to the new action
    // (the game state manager will handle clearing the old targeting state)

    // Set as pending and notify parent - this may enter targeting mode for move/attack
    setPendingAction({ cardId, position });
    onActionSelect(cardId, position);
  }, [pendingAction, onActionSelect, onActionConfirm, targetingMode]);


  // Get states for all four action regions
  const card1TopState = getActionRegionState(card1.id, 'top', turnActionState, pendingAction);
  const card1BottomState = getActionRegionState(card1.id, 'bottom', turnActionState, pendingAction);
  const card2TopState = getActionRegionState(card2.id, 'top', turnActionState, pendingAction);
  const card2BottomState = getActionRegionState(card2.id, 'bottom', turnActionState, pendingAction);

  /**
   * ActionOverlay Component - handles long-press for card zoom
   * Separated into a component to properly manage refs and effects per overlay
   */
  const ActionOverlay = ({
    card,
    cardId,
    position,
    state,
    actionLabel,
    isInTargetingMode,
  }: {
    card: AbilityCard;
    cardId: string;
    position: 'top' | 'bottom';
    state: CardActionState;
    actionLabel: string;
    isInTargetingMode: boolean;
  }) => {
    const isInteractive = state === 'available' || state === 'selected';
    const overlayRef = useRef<HTMLDivElement>(null);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLongPress = useRef(false);
    const touchStartPos = useRef<{ x: number; y: number } | null>(null);

    const cancelLongPress = useCallback(() => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }, []);

    const handleOverlayClick = useCallback(() => {
      // Cancel any pending long press timer (for safety)
      cancelLongPress();

      // Don't trigger click if it was a long press
      if (isLongPress.current) {
        isLongPress.current = false;
        return;
      }
      if (isInteractive) {
        handleActionClick(cardId, position);
      }
    }, [isInteractive, cardId, position, cancelLongPress, handleActionClick]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        handleActionClick(cardId, position);
      }
    };

    // Native touch event handlers for long-press detection
    useEffect(() => {
      const overlay = overlayRef.current;
      if (!overlay) return;

      const handleTouchStart = (e: TouchEvent) => {
        // Store touch position to detect movement
        const touch = e.touches[0];
        touchStartPos.current = { x: touch.clientX, y: touch.clientY };
        isLongPress.current = false;

        longPressTimer.current = setTimeout(() => {
          isLongPress.current = true;
          setZoomedCard(card);
        }, LONG_PRESS_DURATION);
      };

      const handleTouchMove = (e: TouchEvent) => {
        // If user moves finger significantly, cancel long press
        if (touchStartPos.current && e.touches[0]) {
          const touch = e.touches[0];
          const dx = Math.abs(touch.clientX - touchStartPos.current.x);
          const dy = Math.abs(touch.clientY - touchStartPos.current.y);
          if (dx > 10 || dy > 10) {
            cancelLongPress();
            touchStartPos.current = null;
          }
        }
      };

      const handleTouchEnd = (e: TouchEvent) => {
        cancelLongPress();
        touchStartPos.current = null;

        if (zoomedCard) {
          // Close zoom modal on touch end
          e.preventDefault();
          setTimeout(() => setZoomedCard(null), 50);
        }
      };

      const handleTouchCancel = () => {
        cancelLongPress();
        touchStartPos.current = null;
        setZoomedCard(null);
      };

      const handleContextMenu = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };

      overlay.addEventListener('touchstart', handleTouchStart, { passive: false });
      overlay.addEventListener('touchmove', handleTouchMove, { passive: false });
      overlay.addEventListener('touchend', handleTouchEnd, { passive: false });
      overlay.addEventListener('touchcancel', handleTouchCancel, { passive: false });
      overlay.addEventListener('contextmenu', handleContextMenu, { capture: true });

      return () => {
        overlay.removeEventListener('touchstart', handleTouchStart);
        overlay.removeEventListener('touchmove', handleTouchMove);
        overlay.removeEventListener('touchend', handleTouchEnd);
        overlay.removeEventListener('touchcancel', handleTouchCancel);
        overlay.removeEventListener('contextmenu', handleContextMenu, { capture: true });
        cancelLongPress();
      };
    }, [card, cancelLongPress, zoomedCard]);

    // Mouse long-press handlers for desktop
    const handleMouseDown = useCallback(() => {
      isLongPress.current = false;
      longPressTimer.current = setTimeout(() => {
        isLongPress.current = true;
        setZoomedCard(card);
      }, LONG_PRESS_DURATION);
    }, [card]);

    const handleMouseUp = useCallback(() => {
      cancelLongPress();
      // Close zoom if it was open - setZoomedCard is stable so we don't need it in deps
      setTimeout(() => setZoomedCard(null), 50);
    }, [cancelLongPress]);

    const handleMouseLeave = useCallback(() => {
      cancelLongPress();
    }, [cancelLongPress]);

    return (
      <div
        ref={overlayRef}
        className={`${styles.actionOverlay} ${styles[position]} ${styles[state]}`}
        onClick={handleOverlayClick}
        onKeyDown={handleKeyDown}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        role="button"
        tabIndex={isInteractive ? 0 : -1}
        aria-label={`${position} action: ${actionLabel}`}
        aria-disabled={!isInteractive}
      >
        {/* Used overlay label */}
        {state === 'used' && (
          <div className={styles.usedOverlay}>
            <span>Used</span>
          </div>
        )}

        {/* Selected state - show "Tap again" hint only for non-targeting actions */}
        {state === 'selected' && !isInTargetingMode && (
          <div className={styles.selectedOverlay}>
            <span>Tap again to confirm</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.panel}>
      {/* Cards container */}
      <div className={styles.cardsContainer}>
        {/* Card 1 with action overlays */}
        <div className={styles.cardWrapper}>
          <AbilityCard2
            card={card1}
            variant="full"
            className={styles.actionCard}
          />
          {/* Clickable overlay regions */}
          <div className={styles.overlayContainer}>
            <ActionOverlay
              card={card1}
              cardId={card1.id}
              position="top"
              state={card1TopState}
              actionLabel={`${card1.name} - ${card1.topAction.type}`}
              isInTargetingMode={!!targetingMode}
            />
            <ActionOverlay
              card={card1}
              cardId={card1.id}
              position="bottom"
              state={card1BottomState}
              actionLabel={`${card1.name} - ${card1.bottomAction.type}`}
              isInTargetingMode={!!targetingMode}
            />
          </div>
        </div>

        {/* Card 2 with action overlays */}
        <div className={styles.cardWrapper}>
          <AbilityCard2
            card={card2}
            variant="full"
            className={styles.actionCard}
          />
          {/* Clickable overlay regions */}
          <div className={styles.overlayContainer}>
            <ActionOverlay
              card={card2}
              cardId={card2.id}
              position="top"
              state={card2TopState}
              actionLabel={`${card2.name} - ${card2.topAction.type}`}
              isInTargetingMode={!!targetingMode}
            />
            <ActionOverlay
              card={card2}
              cardId={card2.id}
              position="bottom"
              state={card2BottomState}
              actionLabel={`${card2.name} - ${card2.bottomAction.type}`}
              isInTargetingMode={!!targetingMode}
            />
          </div>
        </div>
      </div>

      {/* Help text */}
      <div className={styles.helpText}>
        {targetingMode === 'move' ? (
          <span className={styles.targetingHint}>Tap a green hex to move there</span>
        ) : targetingMode === 'attack' ? (
          <span className={styles.targetingHint}>Tap a red hex to attack</span>
        ) : targetingMode === 'heal' ? (
          <span className={styles.targetingHint}>Tap an ally to heal them</span>
        ) : targetingMode === 'summon' ? (
          <span className={styles.targetingHint}>Tap a purple hex to place your summon</span>
        ) : (targetingMode === 'push' || targetingMode === 'pull') && pendingForcedMovement ? (
          <span className={styles.targetingHint}>
            Tap a yellow hex to {targetingMode} {pendingForcedMovement.targetName}
          </span>
        ) : pendingAction ? (
          <span>Tap again to confirm, or tap a different action</span>
        ) : actionsUsed < 2 ? (
          <span>Tap an action to select it</span>
        ) : null}
      </div>

      {/* Skip button for push/pull */}
      {(targetingMode === 'push' || targetingMode === 'pull') && onSkipForcedMovement && (
        <div className={styles.skipButtonContainer}>
          <button
            className={styles.skipButton}
            onClick={onSkipForcedMovement}
            type="button"
          >
            Skip {targetingMode === 'push' ? 'Push' : 'Pull'}
          </button>
        </div>
      )}

      {/* Zoomed card modal - rendered via portal */}
      {zoomedCard && createPortal(
        <div
          className={styles.zoomOverlay}
          onMouseUp={() => setZoomedCard(null)}
          onTouchEnd={(e) => {
            e.preventDefault();
            setTimeout(() => setZoomedCard(null), 50);
          }}
        >
          <div className={styles.zoomModal}>
            <AbilityCard2
              card={zoomedCard}
              variant="full"
              className={styles.zoomedCard}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
