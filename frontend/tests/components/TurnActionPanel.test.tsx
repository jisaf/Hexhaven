/**
 * Unit Test: TurnActionPanel Component (Issue #411 - Phase 4.2)
 *
 * Tests the TurnActionPanel component which displays the player's two
 * selected cards side-by-side during their turn for action execution.
 * Now uses AbilityCard2 with clickable overlay regions for top/bottom actions.
 *
 * Features tested:
 * - Displaying two cards using AbilityCard2
 * - Clickable overlay regions for top/bottom action selection
 * - Action state management based on turnActionState
 * - Tap-to-select, tap-to-confirm flow
 * - Available action calculation after first action
 * - Responsive layout support
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TurnActionPanel } from '../../src/components/game/TurnActionPanel';
import type { AbilityCard } from '../../../shared/types/entities';
import type { TurnActionState } from '../../../shared/types/events';

describe('TurnActionPanel', () => {
  // Sample ability cards for testing
  const mockCard1: AbilityCard = {
    id: 'card-1',
    name: 'Trample',
    characterClass: 'Brute',
    level: 1,
    initiative: 72,
    topAction: {
      type: 'attack',
      value: 3,
      modifiers: [],
    },
    bottomAction: {
      type: 'move',
      value: 4,
      modifiers: [],
    },
  };

  const mockCard2: AbilityCard = {
    id: 'card-2',
    name: 'Eye for an Eye',
    characterClass: 'Brute',
    level: 1,
    initiative: 18,
    topAction: {
      type: 'attack',
      value: 2,
      modifiers: [],
    },
    bottomAction: {
      type: 'heal',
      value: 2,
      modifiers: [],
    },
  };

  // Initial turn state with all actions available
  const initialTurnState: TurnActionState = {
    availableActions: [
      { cardId: 'card-1', position: 'top' },
      { cardId: 'card-1', position: 'bottom' },
      { cardId: 'card-2', position: 'top' },
      { cardId: 'card-2', position: 'bottom' },
    ],
    firstAction: undefined,
    secondAction: undefined,
  };

  // Turn state after first action (card1 top used)
  const afterFirstActionState: TurnActionState = {
    availableActions: [
      { cardId: 'card-2', position: 'bottom' },
    ],
    firstAction: { cardId: 'card-1', position: 'top' },
    secondAction: undefined,
  };

  // Turn state after both actions used
  const completedTurnState: TurnActionState = {
    availableActions: [],
    firstAction: { cardId: 'card-1', position: 'top' },
    secondAction: { cardId: 'card-2', position: 'bottom' },
  };

  const defaultProps = {
    card1: mockCard1,
    card2: mockCard2,
    turnActionState: initialTurnState,
    onActionSelect: jest.fn(),
    onActionConfirm: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render both card names using AbilityCard2', () => {
      render(<TurnActionPanel {...defaultProps} />);

      // Each card name appears once (in the AbilityCard2 header)
      expect(screen.getByText('Trample')).toBeInTheDocument();
      expect(screen.getByText('Eye for an Eye')).toBeInTheDocument();
    });

    it('should render clickable overlay regions for each card', () => {
      render(<TurnActionPanel {...defaultProps} />);

      // Should have 4 action overlay regions (top/bottom for each card)
      const actionButtons = screen.getAllByRole('button', { name: /action/i });
      expect(actionButtons).toHaveLength(4);
    });

    // Note: Header/title is now handled by BottomSheet, not TurnActionPanel
    // Action count is shown in BottomSheet title as "Select Action (0/2)", etc.

    it('should show help text when no action is selected', () => {
      render(<TurnActionPanel {...defaultProps} />);

      expect(screen.getByText('Tap an action to select it')).toBeInTheDocument();
    });
  });

  describe('Action States', () => {
    it('should mark all actions as available when turnActionState has no first action', () => {
      render(<TurnActionPanel {...defaultProps} turnActionState={initialTurnState} />);

      // All four action overlay regions should be available (clickable)
      const actionButtons = screen.getAllByRole('button', { name: /action/i });
      expect(actionButtons).toHaveLength(4);
      // All should be clickable (aria-disabled=false)
      actionButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-disabled', 'false');
      });
    });

    it('should mark first action as used after it is executed', () => {
      render(<TurnActionPanel {...defaultProps} turnActionState={afterFirstActionState} />);

      // Card1 top action should be used, card2 bottom should be available
      // Other actions should be disabled
      expect(screen.getByText('Used')).toBeInTheDocument();
    });

    it('should mark both actions as used when turn is complete', () => {
      render(<TurnActionPanel {...defaultProps} turnActionState={completedTurnState} />);

      // Both used actions should show "Used" overlay
      expect(screen.getAllByText('Used')).toHaveLength(2);
    });

    it('should disable non-available actions after first action', () => {
      render(<TurnActionPanel {...defaultProps} turnActionState={afterFirstActionState} />);

      // After using card1 top, only card2 bottom should be available
      // card1 bottom and card2 top should be disabled
      const disabledButtons = screen.getAllByRole('button', { name: /action/i }).filter(
        button => button.getAttribute('aria-disabled') === 'true'
      );
      // 2 disabled (card1 bottom and card2 top) + 1 used (card1 top) = 3 non-available
      expect(disabledButtons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Selection Flow', () => {
    it('should call onActionSelect when available action is clicked', () => {
      const onActionSelect = jest.fn();
      render(<TurnActionPanel {...defaultProps} onActionSelect={onActionSelect} />);

      // Click on card1's top action overlay
      const topActionOverlay = screen.getByRole('button', { name: /top action: Trample - attack/i });
      fireEvent.click(topActionOverlay);

      expect(onActionSelect).toHaveBeenCalledWith('card-1', 'top');
    });

    it('should show tap-again hint after action is selected', () => {
      const onActionSelect = jest.fn();
      render(<TurnActionPanel {...defaultProps} onActionSelect={onActionSelect} />);

      // Click to select an action
      const topActionOverlay = screen.getByRole('button', { name: /top action: Trample - attack/i });
      fireEvent.click(topActionOverlay);

      // Tap-again hint should appear
      expect(screen.getByText('Tap again to confirm')).toBeInTheDocument();
    });

    it('should show updated help text when action is selected', () => {
      const onActionSelect = jest.fn();
      render(<TurnActionPanel {...defaultProps} onActionSelect={onActionSelect} />);

      // Click to select an action
      const topActionOverlay = screen.getByRole('button', { name: /top action: Trample - attack/i });
      fireEvent.click(topActionOverlay);

      expect(screen.getByText(/Tap again to confirm, or tap a different action/)).toBeInTheDocument();
    });

    it('should call onActionConfirm when same action is tapped twice', () => {
      const onActionConfirm = jest.fn();
      render(<TurnActionPanel {...defaultProps} onActionConfirm={onActionConfirm} />);

      // Select an action first
      const topActionOverlay = screen.getByRole('button', { name: /top action: Trample - attack/i });
      fireEvent.click(topActionOverlay);

      // Re-query after state change
      const topActionOverlayAfterSelect = screen.getByRole('button', { name: /top action: Trample - attack/i });

      // Tap again to confirm (tap-again pattern)
      fireEvent.click(topActionOverlayAfterSelect);

      expect(onActionConfirm).toHaveBeenCalledTimes(1);
    });

    it('should switch selection when different action is tapped', () => {
      const onActionSelect = jest.fn();
      render(<TurnActionPanel {...defaultProps} onActionSelect={onActionSelect} />);

      // Select first action
      const topActionOverlay = screen.getByRole('button', { name: /top action: Trample - attack/i });
      fireEvent.click(topActionOverlay);
      expect(onActionSelect).toHaveBeenCalledWith('card-1', 'top');

      // Select a different action (bottom of card 2: Eye for an Eye - heal)
      const bottomActionOverlay = screen.getByRole('button', { name: /bottom action: Eye for an Eye - heal/i });
      fireEvent.click(bottomActionOverlay);

      // Should select the new action
      expect(onActionSelect).toHaveBeenCalledWith('card-2', 'bottom');
    });
  });

  describe('After First Action', () => {
    it('should only allow opposite position on other card', () => {
      render(<TurnActionPanel {...defaultProps} turnActionState={afterFirstActionState} />);

      // After card1 top is used, only card2 bottom should be available
      // Find card2's bottom action overlay
      const card2BottomOverlay = screen.getByRole('button', { name: /bottom action: Eye for an Eye - heal/i });
      expect(card2BottomOverlay).toHaveAttribute('aria-disabled', 'false');
    });

    it('should disable same position on other card', () => {
      render(<TurnActionPanel {...defaultProps} turnActionState={afterFirstActionState} />);

      // After card1 top is used, card2 top should be disabled
      const card2TopOverlay = screen.getByRole('button', { name: /top action: Eye for an Eye - attack/i });
      expect(card2TopOverlay).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty available actions gracefully', () => {
      const emptyState: TurnActionState = {
        availableActions: [],
        firstAction: undefined,
        secondAction: undefined,
      };

      render(<TurnActionPanel {...defaultProps} turnActionState={emptyState} />);

      // Should still render cards but all action overlays disabled
      expect(screen.getByText('Trample')).toBeInTheDocument();
      expect(screen.getByText('Eye for an Eye')).toBeInTheDocument();

      // All overlays should be disabled
      const actionOverlays = screen.getAllByRole('button', { name: /action/i });
      actionOverlays.forEach(overlay => {
        expect(overlay).toHaveAttribute('aria-disabled', 'true');
      });
    });

    it('should handle cards with same actions gracefully', () => {
      const sameCard: AbilityCard = {
        ...mockCard1,
        id: 'card-same',
        topAction: { type: 'attack', value: 2, modifiers: [] },
        bottomAction: { type: 'attack', value: 2, modifiers: [] },
      };

      render(
        <TurnActionPanel
          {...defaultProps}
          card1={sameCard}
          card2={sameCard}
        />
      );

      // Should render 4 action overlay regions (top/bottom for each card)
      const actionOverlays = screen.getAllByRole('button', { name: /action/i });
      expect(actionOverlays).toHaveLength(4);
    });
  });
});

/**
 * Test Coverage Summary:
 *
 * - Rendering: Both cards using AbilityCard2, clickable overlay regions, header with action count, help text
 * - Action States: Available, used, disabled based on turnActionState
 * - Selection Flow: onActionSelect, tap-again confirmation (onActionConfirm), switch selection
 * - After First Action: Only opposite position on other card available
 * - Edge Cases: Empty available actions, same action types
 */
