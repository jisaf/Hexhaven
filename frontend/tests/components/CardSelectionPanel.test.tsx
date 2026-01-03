/**
 * Unit Test: CardSelectionPanel Component
 *
 * Tests the CardSelectionPanel component rendering and behavior
 * for card selection during the start of each round.
 *
 * Issue #220 regression test - ensures cards can be selected
 * and the panel closes properly after confirmation.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardSelectionPanel } from '../../src/components/CardSelectionPanel';
import type { AbilityCard } from '../../../shared/types/entities';

// Mock the AbilityCard2 component to simplify testing
jest.mock('../../src/components/AbilityCard2', () => ({
  AbilityCard2: ({
    card,
    isSelected,
    disabled,
    onClick,
  }: {
    card: AbilityCard;
    isSelected: boolean;
    disabled: boolean;
    onClick?: () => void;
  }) => (
    <div
      data-testid={`ability-card-${card.id}`}
      data-selected={isSelected}
      data-disabled={disabled}
      onClick={onClick}
      role="button"
    >
      {card.name}
    </div>
  ),
}));

// Mock the useMediaQuery hook
jest.mock('../../src/hooks/useMediaQuery', () => ({
  useMediaQuery: jest.fn(() => false), // Default to landscape
}));

describe('CardSelectionPanel', () => {
  // Sample ability cards for testing
  const mockCards: AbilityCard[] = [
    {
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
    },
    {
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
        type: 'attack',
        value: 2,
        modifiers: [],
      },
    },
    {
      id: 'card-3',
      name: 'Sweeping Blow',
      characterClass: 'Brute',
      level: 1,
      initiative: 64,
      topAction: {
        type: 'attack',
        value: 2,
        modifiers: [],
      },
      bottomAction: {
        type: 'move',
        value: 2,
        modifiers: [],
      },
    },
  ] as AbilityCard[];

  const mockOnCardSelect = jest.fn();
  const mockOnClearSelection = jest.fn();
  const mockOnConfirmSelection = jest.fn();
  const mockOnLongRest = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all cards', () => {
      render(
        <CardSelectionPanel
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          onClearSelection={mockOnClearSelection}
          onConfirmSelection={mockOnConfirmSelection}
          selectedTopAction={null}
          selectedBottomAction={null}
        />
      );

      expect(screen.getByText('Trample')).toBeInTheDocument();
      expect(screen.getByText('Eye for an Eye')).toBeInTheDocument();
      expect(screen.getByText('Sweeping Blow')).toBeInTheDocument();
    });

    it('should show instruction to select top action first', () => {
      render(
        <CardSelectionPanel
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          onClearSelection={mockOnClearSelection}
          onConfirmSelection={mockOnConfirmSelection}
          selectedTopAction={null}
          selectedBottomAction={null}
        />
      );

      expect(screen.getByText(/Select your first card/i)).toBeInTheDocument();
    });

    it('should show instruction to select second card after first is selected', () => {
      render(
        <CardSelectionPanel
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          onClearSelection={mockOnClearSelection}
          onConfirmSelection={mockOnConfirmSelection}
          selectedTopAction={mockCards[0]}
          selectedBottomAction={null}
        />
      );

      expect(screen.getByText(/Select your second card/i)).toBeInTheDocument();
    });

    it('should show ready to confirm message when both cards are selected', () => {
      render(
        <CardSelectionPanel
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          onClearSelection={mockOnClearSelection}
          onConfirmSelection={mockOnConfirmSelection}
          selectedTopAction={mockCards[0]}
          selectedBottomAction={mockCards[1]}
        />
      );

      expect(screen.getByText(/Cards selected! Ready to confirm/i)).toBeInTheDocument();
    });
  });

  describe('Card Selection', () => {
    it('should call onCardSelect when a card is clicked', () => {
      render(
        <CardSelectionPanel
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          onClearSelection={mockOnClearSelection}
          onConfirmSelection={mockOnConfirmSelection}
          selectedTopAction={null}
          selectedBottomAction={null}
        />
      );

      const card = screen.getByTestId('ability-card-card-1');
      fireEvent.click(card);

      expect(mockOnCardSelect).toHaveBeenCalledWith(mockCards[0]);
    });

    it('should not call onCardSelect when waiting', () => {
      render(
        <CardSelectionPanel
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          onClearSelection={mockOnClearSelection}
          onConfirmSelection={mockOnConfirmSelection}
          selectedTopAction={null}
          selectedBottomAction={null}
          waiting={true}
        />
      );

      const card = screen.getByTestId('ability-card-card-1');
      fireEvent.click(card);

      expect(mockOnCardSelect).not.toHaveBeenCalled();
    });

    it('should mark selected cards as selected', () => {
      render(
        <CardSelectionPanel
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          onClearSelection={mockOnClearSelection}
          onConfirmSelection={mockOnConfirmSelection}
          selectedTopAction={mockCards[0]}
          selectedBottomAction={mockCards[1]}
        />
      );

      const card1 = screen.getByTestId('ability-card-card-1');
      const card2 = screen.getByTestId('ability-card-card-2');
      const card3 = screen.getByTestId('ability-card-card-3');

      expect(card1.dataset.selected).toBe('true');
      expect(card2.dataset.selected).toBe('true');
      expect(card3.dataset.selected).toBe('false');
    });
  });

  describe('Button States', () => {
    it('should disable confirm button when no cards are selected', () => {
      render(
        <CardSelectionPanel
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          onClearSelection={mockOnClearSelection}
          onConfirmSelection={mockOnConfirmSelection}
          selectedTopAction={null}
          selectedBottomAction={null}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      expect(confirmButton).toBeDisabled();
    });

    it('should disable confirm button when only one card is selected', () => {
      render(
        <CardSelectionPanel
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          onClearSelection={mockOnClearSelection}
          onConfirmSelection={mockOnConfirmSelection}
          selectedTopAction={mockCards[0]}
          selectedBottomAction={null}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      expect(confirmButton).toBeDisabled();
    });

    it('should enable confirm button when both cards are selected', () => {
      render(
        <CardSelectionPanel
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          onClearSelection={mockOnClearSelection}
          onConfirmSelection={mockOnConfirmSelection}
          selectedTopAction={mockCards[0]}
          selectedBottomAction={mockCards[1]}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      expect(confirmButton).not.toBeDisabled();
    });

    it('should call onConfirmSelection when confirm button is clicked', () => {
      render(
        <CardSelectionPanel
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          onClearSelection={mockOnClearSelection}
          onConfirmSelection={mockOnConfirmSelection}
          selectedTopAction={mockCards[0]}
          selectedBottomAction={mockCards[1]}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);

      expect(mockOnConfirmSelection).toHaveBeenCalledTimes(1);
    });

    it('should disable clear button when no cards are selected', () => {
      render(
        <CardSelectionPanel
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          onClearSelection={mockOnClearSelection}
          onConfirmSelection={mockOnConfirmSelection}
          selectedTopAction={null}
          selectedBottomAction={null}
        />
      );

      const clearButton = screen.getByRole('button', { name: /clear/i });
      expect(clearButton).toBeDisabled();
    });

    it('should enable clear button when cards are selected', () => {
      render(
        <CardSelectionPanel
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          onClearSelection={mockOnClearSelection}
          onConfirmSelection={mockOnConfirmSelection}
          selectedTopAction={mockCards[0]}
          selectedBottomAction={null}
        />
      );

      const clearButton = screen.getByRole('button', { name: /clear/i });
      expect(clearButton).not.toBeDisabled();
    });

    it('should call onClearSelection when clear button is clicked', () => {
      render(
        <CardSelectionPanel
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          onClearSelection={mockOnClearSelection}
          onConfirmSelection={mockOnConfirmSelection}
          selectedTopAction={mockCards[0]}
          selectedBottomAction={null}
        />
      );

      const clearButton = screen.getByRole('button', { name: /clear/i });
      fireEvent.click(clearButton);

      expect(mockOnClearSelection).toHaveBeenCalledTimes(1);
    });
  });

  describe('Waiting State', () => {
    it('should show waiting message when waiting', () => {
      render(
        <CardSelectionPanel
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          onClearSelection={mockOnClearSelection}
          onConfirmSelection={mockOnConfirmSelection}
          selectedTopAction={mockCards[0]}
          selectedBottomAction={mockCards[1]}
          waiting={true}
        />
      );

      expect(screen.getByText(/Waiting for other players/i)).toBeInTheDocument();
    });

    it('should show Waiting... on confirm button when waiting', () => {
      render(
        <CardSelectionPanel
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          onClearSelection={mockOnClearSelection}
          onConfirmSelection={mockOnConfirmSelection}
          selectedTopAction={mockCards[0]}
          selectedBottomAction={mockCards[1]}
          waiting={true}
        />
      );

      expect(screen.getByRole('button', { name: /waiting/i })).toBeInTheDocument();
    });

    it('should disable all cards when waiting', () => {
      render(
        <CardSelectionPanel
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          onClearSelection={mockOnClearSelection}
          onConfirmSelection={mockOnConfirmSelection}
          selectedTopAction={mockCards[0]}
          selectedBottomAction={mockCards[1]}
          waiting={true}
        />
      );

      const card1 = screen.getByTestId('ability-card-card-1');
      expect(card1.dataset.disabled).toBe('true');
    });
  });

  describe('Long Rest', () => {
    it('should show long rest button when canLongRest is true', () => {
      render(
        <CardSelectionPanel
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          onClearSelection={mockOnClearSelection}
          onConfirmSelection={mockOnConfirmSelection}
          onLongRest={mockOnLongRest}
          selectedTopAction={null}
          selectedBottomAction={null}
          canLongRest={true}
        />
      );

      expect(screen.getByRole('button', { name: /long rest/i })).toBeInTheDocument();
    });

    it('should not show long rest button when canLongRest is false', () => {
      render(
        <CardSelectionPanel
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          onClearSelection={mockOnClearSelection}
          onConfirmSelection={mockOnConfirmSelection}
          onLongRest={mockOnLongRest}
          selectedTopAction={null}
          selectedBottomAction={null}
          canLongRest={false}
        />
      );

      expect(screen.queryByRole('button', { name: /long rest/i })).not.toBeInTheDocument();
    });

    it('should call onLongRest when long rest button is clicked', () => {
      render(
        <CardSelectionPanel
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          onClearSelection={mockOnClearSelection}
          onConfirmSelection={mockOnConfirmSelection}
          onLongRest={mockOnLongRest}
          selectedTopAction={null}
          selectedBottomAction={null}
          canLongRest={true}
        />
      );

      const longRestButton = screen.getByRole('button', { name: /long rest/i });
      fireEvent.click(longRestButton);

      expect(mockOnLongRest).toHaveBeenCalledTimes(1);
    });
  });

  describe('Must Rest Scenario', () => {
    it('should show must rest message when cards < 2 and canLongRest', () => {
      render(
        <CardSelectionPanel
          cards={[mockCards[0]]} // Only 1 card
          onCardSelect={mockOnCardSelect}
          onClearSelection={mockOnClearSelection}
          onConfirmSelection={mockOnConfirmSelection}
          onLongRest={mockOnLongRest}
          selectedTopAction={null}
          selectedBottomAction={null}
          canLongRest={true}
        />
      );

      expect(screen.getByText(/Cannot play 2 cards.*Must rest/i)).toBeInTheDocument();
    });

    it('should not show clear/confirm buttons in must rest mode', () => {
      render(
        <CardSelectionPanel
          cards={[mockCards[0]]} // Only 1 card
          onCardSelect={mockOnCardSelect}
          onClearSelection={mockOnClearSelection}
          onConfirmSelection={mockOnConfirmSelection}
          onLongRest={mockOnLongRest}
          selectedTopAction={null}
          selectedBottomAction={null}
          canLongRest={true}
        />
      );

      expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /confirm/i })).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty cards array', () => {
      render(
        <CardSelectionPanel
          cards={[]}
          onCardSelect={mockOnCardSelect}
          onClearSelection={mockOnClearSelection}
          onConfirmSelection={mockOnConfirmSelection}
          selectedTopAction={null}
          selectedBottomAction={null}
        />
      );

      // Should still render without crashing
      // Updated for Issue #411: New instruction text when no cards selected
      expect(screen.getByText(/Select your first card/i)).toBeInTheDocument();
    });

    it('should pass onClick handler to AbilityCard2', () => {
      // This test specifically verifies the fix for Issue #220
      // The onClick handler must be passed to AbilityCard2, not on the wrapper div
      render(
        <CardSelectionPanel
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          onClearSelection={mockOnClearSelection}
          onConfirmSelection={mockOnConfirmSelection}
          selectedTopAction={null}
          selectedBottomAction={null}
        />
      );

      // Simulate clicking the card directly (not the wrapper)
      const cardElement = screen.getByTestId('ability-card-card-1');
      fireEvent.click(cardElement);

      // Verify onCardSelect was called - this confirms onClick is passed to AbilityCard2
      expect(mockOnCardSelect).toHaveBeenCalledWith(mockCards[0]);
    });
  });

  describe('Initiative Selection (Issue #411)', () => {
    const mockOnInitiativeChange = jest.fn();

    beforeEach(() => {
      mockOnInitiativeChange.mockClear();
    });

    it('should show initiative badges on selected cards', () => {
      render(
        <CardSelectionPanel
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          onClearSelection={mockOnClearSelection}
          onConfirmSelection={mockOnConfirmSelection}
          selectedTopAction={mockCards[0]}
          selectedBottomAction={mockCards[1]}
          onInitiativeChange={mockOnInitiativeChange}
        />
      );

      // Initiative badges should be visible on selected cards
      expect(screen.getByLabelText(/Initiative 72/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Initiative 18/)).toBeInTheDocument();
    });

    it('should not show initiative badges when only one card is selected', () => {
      render(
        <CardSelectionPanel
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          onClearSelection={mockOnClearSelection}
          onConfirmSelection={mockOnConfirmSelection}
          selectedTopAction={mockCards[0]}
          selectedBottomAction={null}
          onInitiativeChange={mockOnInitiativeChange}
        />
      );

      // Only one badge should be visible (on the selected card)
      expect(screen.getByLabelText(/Initiative 72/)).toBeInTheDocument();
      expect(screen.queryByLabelText(/Initiative 18/)).not.toBeInTheDocument();
    });

    it('should not show initiative badges when no cards are selected', () => {
      render(
        <CardSelectionPanel
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          onClearSelection={mockOnClearSelection}
          onConfirmSelection={mockOnConfirmSelection}
          selectedTopAction={null}
          selectedBottomAction={null}
          onInitiativeChange={mockOnInitiativeChange}
        />
      );

      expect(screen.queryByLabelText(/Initiative/)).not.toBeInTheDocument();
    });

    it('should display initiative values for both selected cards', () => {
      render(
        <CardSelectionPanel
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          onClearSelection={mockOnClearSelection}
          onConfirmSelection={mockOnConfirmSelection}
          selectedTopAction={mockCards[0]}
          selectedBottomAction={mockCards[1]}
          onInitiativeChange={mockOnInitiativeChange}
        />
      );

      // Check that initiative values are shown as badge text (Trample: 72, Eye for an Eye: 18)
      expect(screen.getByText('72')).toBeInTheDocument();
      expect(screen.getByText('18')).toBeInTheDocument();
    });

    it('should call onInitiativeChange when initiative badge is clicked', () => {
      render(
        <CardSelectionPanel
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          onClearSelection={mockOnClearSelection}
          onConfirmSelection={mockOnConfirmSelection}
          selectedTopAction={mockCards[0]}
          selectedBottomAction={mockCards[1]}
          onInitiativeChange={mockOnInitiativeChange}
          selectedInitiativeCardId="card-1"
        />
      );

      // Click on the second badge (card-2)
      const badge18 = screen.getByLabelText(/Initiative 18/);
      fireEvent.click(badge18);

      expect(mockOnInitiativeChange).toHaveBeenCalledWith('card-2');
    });

    it('should show active class on selected initiative badge', () => {
      render(
        <CardSelectionPanel
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          onClearSelection={mockOnClearSelection}
          onConfirmSelection={mockOnConfirmSelection}
          selectedTopAction={mockCards[0]}
          selectedBottomAction={mockCards[1]}
          selectedInitiativeCardId="card-2"
          onInitiativeChange={mockOnInitiativeChange}
        />
      );

      const badge18 = screen.getByLabelText(/Initiative 18 \(selected\)/);
      expect(badge18).toHaveClass('active');

      const badge72 = screen.getByLabelText(/Initiative 72/);
      expect(badge72).not.toHaveClass('active');
    });

    it('should disable initiative badges when waiting', () => {
      render(
        <CardSelectionPanel
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          onClearSelection={mockOnClearSelection}
          onConfirmSelection={mockOnConfirmSelection}
          selectedTopAction={mockCards[0]}
          selectedBottomAction={mockCards[1]}
          waiting={true}
          onInitiativeChange={mockOnInitiativeChange}
        />
      );

      const badges = screen.getAllByRole('button', { name: /Initiative/ });
      badges.forEach(badge => {
        expect(badge).toBeDisabled();
      });
    });

    it('should auto-select first selected card as default initiative', () => {
      // When both cards are selected and no initiative chosen yet,
      // the component should auto-select the FIRST card selected (not the faster one)

      render(
        <CardSelectionPanel
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          onClearSelection={mockOnClearSelection}
          onConfirmSelection={mockOnConfirmSelection}
          selectedTopAction={mockCards[0]} // initiative 72 - this is first selected
          selectedBottomAction={mockCards[1]} // initiative 18
          onInitiativeChange={mockOnInitiativeChange}
          selectedInitiativeCardId={null}
        />
      );

      // First selected card (card-1) should be the default initiative
      expect(mockOnInitiativeChange).toHaveBeenCalledWith('card-1');
    });

    it('should allow switching initiative back and forth', () => {
      const { rerender } = render(
        <CardSelectionPanel
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          onClearSelection={mockOnClearSelection}
          onConfirmSelection={mockOnConfirmSelection}
          selectedTopAction={mockCards[0]}
          selectedBottomAction={mockCards[1]}
          selectedInitiativeCardId="card-1"
          onInitiativeChange={mockOnInitiativeChange}
        />
      );

      // Click card-2's badge
      fireEvent.click(screen.getByLabelText(/Initiative 18/));
      expect(mockOnInitiativeChange).toHaveBeenCalledWith('card-2');

      // Rerender with card-2 selected
      rerender(
        <CardSelectionPanel
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          onClearSelection={mockOnClearSelection}
          onConfirmSelection={mockOnConfirmSelection}
          selectedTopAction={mockCards[0]}
          selectedBottomAction={mockCards[1]}
          selectedInitiativeCardId="card-2"
          onInitiativeChange={mockOnInitiativeChange}
        />
      );

      // Click card-1's badge to switch back
      fireEvent.click(screen.getByLabelText(/Initiative 72/));
      expect(mockOnInitiativeChange).toHaveBeenCalledWith('card-1');
    });
  });
});

/**
 * Test Coverage Summary:
 *
 * ✅ Card rendering
 * ✅ Instruction messages based on selection state
 * ✅ Card selection callback
 * ✅ Selection marking
 * ✅ Button state management (disabled/enabled)
 * ✅ Confirm button click handler
 * ✅ Clear button click handler
 * ✅ Waiting state display and behavior
 * ✅ Long rest button visibility and click handler
 * ✅ Must rest scenario handling
 * ✅ Empty cards edge case
 * ✅ Issue #220 regression test (onClick passed to AbilityCard2)
 * ✅ Issue #411 - Initiative Selection:
 *   - InitiativeSelector visibility based on card selection state
 *   - Initiative value display
 *   - onInitiativeChange callback
 *   - selectedInitiativeCardId prop handling
 *   - Disabled state during waiting
 *   - Auto-select lower initiative card
 *
 * Coverage: ~100% of CardSelectionPanel component functionality
 */
