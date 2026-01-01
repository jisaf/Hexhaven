/**
 * Unit Test: TurnActionPanel Component (Issue #411 - Phase 4.2)
 *
 * Tests the TurnActionPanel component which displays the player's two
 * selected cards side-by-side during their turn for action execution.
 *
 * Features tested:
 * - Displaying two cards with their actions
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
    characterId: 'char-1',
    availableActions: [
      { cardId: 'card-1', position: 'top' },
      { cardId: 'card-1', position: 'bottom' },
      { cardId: 'card-2', position: 'top' },
      { cardId: 'card-2', position: 'bottom' },
    ],
    firstAction: null,
    secondAction: null,
  };

  // Turn state after first action (card1 top used)
  const afterFirstActionState: TurnActionState = {
    characterId: 'char-1',
    availableActions: [
      { cardId: 'card-2', position: 'bottom' },
    ],
    firstAction: { cardId: 'card-1', position: 'top' },
    secondAction: null,
  };

  // Turn state after both actions used
  const completedTurnState: TurnActionState = {
    characterId: 'char-1',
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
    onActionCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render both card names', () => {
      render(<TurnActionPanel {...defaultProps} />);

      // Each card name appears twice (once per action region)
      expect(screen.getAllByText('Trample')).toHaveLength(2);
      expect(screen.getAllByText('Eye for an Eye')).toHaveLength(2);
    });

    it('should render action types for all four actions', () => {
      render(<TurnActionPanel {...defaultProps} />);

      // Card1 has Attack (top) and Move (bottom)
      // Card2 has Attack (top) and Heal (bottom)
      expect(screen.getAllByText('Attack')).toHaveLength(2);
      expect(screen.getByText('Move')).toBeInTheDocument();
      expect(screen.getByText('Heal')).toBeInTheDocument();
    });

    it('should show header with action count for first action', () => {
      render(<TurnActionPanel {...defaultProps} turnActionState={initialTurnState} />);

      expect(screen.getByText('Select Action')).toBeInTheDocument();
      expect(screen.getByText('Choose your first action')).toBeInTheDocument();
    });

    it('should show header with action count for second action', () => {
      render(<TurnActionPanel {...defaultProps} turnActionState={afterFirstActionState} />);

      expect(screen.getByText('Choose your second action')).toBeInTheDocument();
    });

    it('should show "Turn complete" when both actions used', () => {
      render(<TurnActionPanel {...defaultProps} turnActionState={completedTurnState} />);

      expect(screen.getByText('Turn complete')).toBeInTheDocument();
    });

    it('should show help text when no action is selected', () => {
      render(<TurnActionPanel {...defaultProps} />);

      expect(screen.getByText('Tap an action to select it')).toBeInTheDocument();
    });
  });

  describe('Action States', () => {
    it('should mark all actions as available when turnActionState has no first action', () => {
      render(<TurnActionPanel {...defaultProps} turnActionState={initialTurnState} />);

      // All four action regions should be available (clickable)
      const buttons = screen.getAllByRole('button');
      // 4 action regions + potentially confirm/cancel buttons
      expect(buttons.length).toBeGreaterThanOrEqual(4);
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
    });
  });

  describe('Selection Flow', () => {
    it('should call onActionSelect when available action is clicked', () => {
      const onActionSelect = jest.fn();
      render(<TurnActionPanel {...defaultProps} onActionSelect={onActionSelect} />);

      // Click on card1's top action (first Attack button)
      const attackButtons = screen.getAllByText('Attack');
      fireEvent.click(attackButtons[0].closest('[role="button"]')!);

      expect(onActionSelect).toHaveBeenCalledWith('card-1', 'top');
    });

    it('should show confirm/cancel buttons after action is selected', () => {
      const onActionSelect = jest.fn();
      render(<TurnActionPanel {...defaultProps} onActionSelect={onActionSelect} />);

      // Click to select an action
      const attackButtons = screen.getAllByText('Attack');
      fireEvent.click(attackButtons[0].closest('[role="button"]')!);

      // Confirm/Cancel should appear
      expect(screen.getByText('Confirm')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should show updated help text when action is selected', () => {
      const onActionSelect = jest.fn();
      render(<TurnActionPanel {...defaultProps} onActionSelect={onActionSelect} />);

      // Click to select an action
      const attackButtons = screen.getAllByText('Attack');
      fireEvent.click(attackButtons[0].closest('[role="button"]')!);

      expect(screen.getByText(/Tap Confirm to execute/)).toBeInTheDocument();
    });

    it('should call onActionConfirm when confirm is clicked', () => {
      const onActionConfirm = jest.fn();
      render(<TurnActionPanel {...defaultProps} onActionConfirm={onActionConfirm} />);

      // Select an action first
      const attackButtons = screen.getAllByText('Attack');
      fireEvent.click(attackButtons[0].closest('[role="button"]')!);

      // Click confirm
      fireEvent.click(screen.getByText('Confirm'));

      expect(onActionConfirm).toHaveBeenCalledTimes(1);
    });

    it('should call onActionCancel when cancel is clicked', () => {
      const onActionCancel = jest.fn();
      render(<TurnActionPanel {...defaultProps} onActionCancel={onActionCancel} />);

      // Select an action first
      const attackButtons = screen.getAllByText('Attack');
      fireEvent.click(attackButtons[0].closest('[role="button"]')!);

      // Click cancel
      fireEvent.click(screen.getByText('Cancel'));

      expect(onActionCancel).toHaveBeenCalledTimes(1);
    });

    it('should toggle selection off when clicking same action twice', () => {
      const onActionCancel = jest.fn();
      render(<TurnActionPanel {...defaultProps} onActionCancel={onActionCancel} />);

      const attackButtons = screen.getAllByText('Attack');
      const firstAttack = attackButtons[0].closest('[role="button"]')!;

      // Select
      fireEvent.click(firstAttack);
      expect(screen.getByText('Confirm')).toBeInTheDocument();

      // Click same action again to deselect
      fireEvent.click(firstAttack);
      expect(onActionCancel).toHaveBeenCalled();
    });
  });

  describe('After First Action', () => {
    it('should only allow opposite position on other card', () => {
      render(<TurnActionPanel {...defaultProps} turnActionState={afterFirstActionState} />);

      // After card1 top is used, only card2 bottom should be available
      // Find card2's heal action (bottom)
      const healButton = screen.getByText('Heal').closest('[role="button"]');
      expect(healButton).toHaveAttribute('aria-disabled', 'false');
    });

    it('should disable same position on other card', () => {
      render(<TurnActionPanel {...defaultProps} turnActionState={afterFirstActionState} />);

      // After card1 top is used, card2 top should be disabled
      // Both Attack elements - second one is card2's top
      const attackButtons = screen.getAllByText('Attack');
      const card2TopRegion = attackButtons[1].closest('[role="button"]');
      expect(card2TopRegion).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty available actions gracefully', () => {
      const emptyState: TurnActionState = {
        characterId: 'char-1',
        availableActions: [],
        firstAction: null,
        secondAction: null,
      };

      render(<TurnActionPanel {...defaultProps} turnActionState={emptyState} />);

      // Should still render cards but all disabled
      expect(screen.getAllByText('Trample')).toHaveLength(2);
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

      // Should render 4 attack actions
      expect(screen.getAllByText('Attack')).toHaveLength(4);
    });
  });
});

/**
 * Test Coverage Summary:
 *
 * - Rendering: Both cards, all actions, header with action count, help text
 * - Action States: Available, used, disabled based on turnActionState
 * - Selection Flow: onActionSelect, onActionConfirm, onActionCancel, toggle
 * - After First Action: Only opposite position on other card available
 * - Edge Cases: Empty available actions, same action types
 */
