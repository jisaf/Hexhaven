/**
 * Unit Test: CardActionSelectionPanel Component
 *
 * Tests the CardActionSelectionPanel component for Issue #411 - Card Action Selection During Round.
 * This panel displays 2 full ability cards side by side with clickable top/bottom halves
 * allowing players to execute card actions during their turn.
 *
 * Key behaviors tested:
 * - Displays 2 cards side by side using AbilityCard2 component
 * - Click on card half executes action immediately
 * - After first action: only opposite card's opposite half is available
 * - After second action: all actions disabled
 *
 * Note: End Turn button was removed - it's now in the TurnStatus control bar.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { AbilityCard } from '../../../shared/types/entities';
import { CharacterClass } from '../../../shared/types/entities';

// Mock the CSS import (uses regular CSS, not module)
jest.mock('../../src/components/CardSelectionPanel.css', () => ({}));

// Mock AbilityCard2 to simplify testing
jest.mock('../../src/components/AbilityCard2', () => ({
  AbilityCard2: ({ card, onTopClick, onBottomClick, topDisabled, bottomDisabled }: {
    card: { id: string; name: string };
    onTopClick?: () => void;
    onBottomClick?: () => void;
    topDisabled?: boolean;
    bottomDisabled?: boolean;
  }) => (
    <div data-testid={`ability-card-${card.id}`}>
      <div>{card.name}</div>
      <button
        data-testid={`action-${card.id}-top`}
        onClick={onTopClick}
        disabled={topDisabled}
        aria-disabled={topDisabled}
      >
        Top Action
      </button>
      <button
        data-testid={`action-${card.id}-bottom`}
        onClick={onBottomClick}
        disabled={bottomDisabled}
        aria-disabled={bottomDisabled}
      >
        Bottom Action
      </button>
    </div>
  ),
}));

import { CardActionSelectionPanel } from '../../src/components/game/CardActionSelectionPanel';

// Sample ability cards for testing
const createMockCard = (id: string, name: string, initiative: number): AbilityCard => ({
  id,
  name,
  characterClass: CharacterClass.BRUTE,
  level: 1,
  initiative,
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
});

const mockCard1 = createMockCard('card-1', 'Trample', 72);
const mockCard2 = createMockCard('card-2', 'Eye for an Eye', 18);

describe('CardActionSelectionPanel', () => {
  const mockOnActionClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render both cards', () => {
      render(
        <CardActionSelectionPanel
          card1={mockCard1}
          card2={mockCard2}
          executedActions={[]}
          onActionClick={mockOnActionClick}
        />
      );

      // Both card names should be visible
      expect(screen.getByText('Trample')).toBeInTheDocument();
      expect(screen.getByText('Eye for an Eye')).toBeInTheDocument();
    });

    it('should display header with title and actions remaining', () => {
      render(
        <CardActionSelectionPanel
          card1={mockCard1}
          card2={mockCard2}
          executedActions={[]}
          onActionClick={mockOnActionClick}
        />
      );

      expect(screen.getByText('Select Action')).toBeInTheDocument();
      expect(screen.getByText('2 actions remaining')).toBeInTheDocument();
    });

    it('should show 1 action remaining after first action', () => {
      render(
        <CardActionSelectionPanel
          card1={mockCard1}
          card2={mockCard2}
          executedActions={[{ cardId: 'card-1', actionPosition: 'top' }]}
          onActionClick={mockOnActionClick}
        />
      );

      expect(screen.getByText('1 action remaining')).toBeInTheDocument();
    });

    it('should show 0 actions remaining after both actions', () => {
      render(
        <CardActionSelectionPanel
          card1={mockCard1}
          card2={mockCard2}
          executedActions={[
            { cardId: 'card-1', actionPosition: 'top' },
            { cardId: 'card-2', actionPosition: 'bottom' },
          ]}
          onActionClick={mockOnActionClick}
        />
      );

      expect(screen.getByText('0 actions remaining')).toBeInTheDocument();
    });
  });

  describe('Action Execution - First Action', () => {
    it('should call onActionClick when clicking card1 top action', () => {
      render(
        <CardActionSelectionPanel
          card1={mockCard1}
          card2={mockCard2}
          executedActions={[]}
          onActionClick={mockOnActionClick}
        />
      );

      const card1TopButton = screen.getByTestId('action-card-1-top');
      card1TopButton.click();

      expect(mockOnActionClick).toHaveBeenCalledWith('card-1', 'top');
    });

    it('should call onActionClick when clicking card1 bottom action', () => {
      render(
        <CardActionSelectionPanel
          card1={mockCard1}
          card2={mockCard2}
          executedActions={[]}
          onActionClick={mockOnActionClick}
        />
      );

      const card1BottomButton = screen.getByTestId('action-card-1-bottom');
      card1BottomButton.click();

      expect(mockOnActionClick).toHaveBeenCalledWith('card-1', 'bottom');
    });

    it('should call onActionClick when clicking card2 top action', () => {
      render(
        <CardActionSelectionPanel
          card1={mockCard1}
          card2={mockCard2}
          executedActions={[]}
          onActionClick={mockOnActionClick}
        />
      );

      const card2TopButton = screen.getByTestId('action-card-2-top');
      card2TopButton.click();

      expect(mockOnActionClick).toHaveBeenCalledWith('card-2', 'top');
    });

    it('should call onActionClick when clicking card2 bottom action', () => {
      render(
        <CardActionSelectionPanel
          card1={mockCard1}
          card2={mockCard2}
          executedActions={[]}
          onActionClick={mockOnActionClick}
        />
      );

      const card2BottomButton = screen.getByTestId('action-card-2-bottom');
      card2BottomButton.click();

      expect(mockOnActionClick).toHaveBeenCalledWith('card-2', 'bottom');
    });
  });

  describe('Action Constraints - After First Action', () => {
    it('should disable other actions on same card after first action (card1 top used)', () => {
      render(
        <CardActionSelectionPanel
          card1={mockCard1}
          card2={mockCard2}
          executedActions={[{ cardId: 'card-1', actionPosition: 'top' }]}
          onActionClick={mockOnActionClick}
        />
      );

      // Card1 top is executed - should be disabled
      const card1TopButton = screen.getByTestId('action-card-1-top');
      expect(card1TopButton).toBeDisabled();

      // Card1 bottom should be disabled (same card)
      const card1BottomButton = screen.getByTestId('action-card-1-bottom');
      expect(card1BottomButton).toBeDisabled();

      // Card2 top should be disabled (same position)
      const card2TopButton = screen.getByTestId('action-card-2-top');
      expect(card2TopButton).toBeDisabled();

      // Card2 bottom should be enabled (opposite card, opposite position)
      const card2BottomButton = screen.getByTestId('action-card-2-bottom');
      expect(card2BottomButton).not.toBeDisabled();
    });

    it('should only enable card1 top after card2 bottom is used', () => {
      render(
        <CardActionSelectionPanel
          card1={mockCard1}
          card2={mockCard2}
          executedActions={[{ cardId: 'card-2', actionPosition: 'bottom' }]}
          onActionClick={mockOnActionClick}
        />
      );

      // Card1 top should be the only enabled action
      const card1TopButton = screen.getByTestId('action-card-1-top');
      expect(card1TopButton).not.toBeDisabled();

      // All others should be disabled
      expect(screen.getByTestId('action-card-1-bottom')).toBeDisabled();
      expect(screen.getByTestId('action-card-2-top')).toBeDisabled();
      expect(screen.getByTestId('action-card-2-bottom')).toBeDisabled();
    });

    it('should only enable card2 top after card1 bottom is used', () => {
      render(
        <CardActionSelectionPanel
          card1={mockCard1}
          card2={mockCard2}
          executedActions={[{ cardId: 'card-1', actionPosition: 'bottom' }]}
          onActionClick={mockOnActionClick}
        />
      );

      // Card2 top should be the only enabled action
      const card2TopButton = screen.getByTestId('action-card-2-top');
      expect(card2TopButton).not.toBeDisabled();

      // All others should be disabled
      expect(screen.getByTestId('action-card-1-top')).toBeDisabled();
      expect(screen.getByTestId('action-card-1-bottom')).toBeDisabled();
      expect(screen.getByTestId('action-card-2-bottom')).toBeDisabled();
    });

    it('should only enable card1 bottom after card2 top is used', () => {
      render(
        <CardActionSelectionPanel
          card1={mockCard1}
          card2={mockCard2}
          executedActions={[{ cardId: 'card-2', actionPosition: 'top' }]}
          onActionClick={mockOnActionClick}
        />
      );

      // Card1 bottom should be the only enabled action
      const card1BottomButton = screen.getByTestId('action-card-1-bottom');
      expect(card1BottomButton).not.toBeDisabled();

      // All others should be disabled
      expect(screen.getByTestId('action-card-1-top')).toBeDisabled();
      expect(screen.getByTestId('action-card-2-top')).toBeDisabled();
      expect(screen.getByTestId('action-card-2-bottom')).toBeDisabled();
    });
  });

  describe('Action Constraints - After Both Actions', () => {
    it('should disable all action buttons after both actions are executed', () => {
      render(
        <CardActionSelectionPanel
          card1={mockCard1}
          card2={mockCard2}
          executedActions={[
            { cardId: 'card-1', actionPosition: 'top' },
            { cardId: 'card-2', actionPosition: 'bottom' },
          ]}
          onActionClick={mockOnActionClick}
        />
      );

      // All action buttons should be disabled
      expect(screen.getByTestId('action-card-1-top')).toBeDisabled();
      expect(screen.getByTestId('action-card-1-bottom')).toBeDisabled();
      expect(screen.getByTestId('action-card-2-top')).toBeDisabled();
      expect(screen.getByTestId('action-card-2-bottom')).toBeDisabled();
    });
  });

  describe('Disabled State', () => {
    it('should not call onActionClick when clicking a disabled action', () => {
      render(
        <CardActionSelectionPanel
          card1={mockCard1}
          card2={mockCard2}
          executedActions={[{ cardId: 'card-1', actionPosition: 'top' }]}
          onActionClick={mockOnActionClick}
        />
      );

      // Card1 bottom is disabled after card1 top was executed
      const card1BottomButton = screen.getByTestId('action-card-1-bottom');
      card1BottomButton.click();

      // Should not call because the button is disabled (no onClick handler passed)
      expect(mockOnActionClick).not.toHaveBeenCalled();
    });
  });
});
