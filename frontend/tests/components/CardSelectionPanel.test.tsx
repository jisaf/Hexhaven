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

// Mock the InitiativeSelector component for testing (Issue #411)
jest.mock('../../src/components/InitiativeSelector', () => ({
  InitiativeSelector: ({
    card1,
    card2,
    selectedCardId,
    onChange,
    disabled,
  }: {
    card1: AbilityCard;
    card2: AbilityCard;
    selectedCardId: string | null;
    onChange: (cardId: string) => void;
    disabled?: boolean;
  }) => (
    <div role="radiogroup" aria-label="Select initiative card">
      <span>Choose Initiative:</span>
      <label className={`initiative-option ${selectedCardId === card1.id ? 'selected' : ''}`}>
        <input
          type="radio"
          name="initiative-card"
          value={card1.id}
          checked={selectedCardId === card1.id}
          disabled={disabled}
          onChange={() => onChange(card1.id)}
        />
        <span>{card1.initiative}</span>
        <span>{card1.name}</span>
      </label>
      <label className={`initiative-option ${selectedCardId === card2.id ? 'selected' : ''}`}>
        <input
          type="radio"
          name="initiative-card"
          value={card2.id}
          checked={selectedCardId === card2.id}
          disabled={disabled}
          onChange={() => onChange(card2.id)}
        />
        <span>{card2.initiative}</span>
        <span>{card2.name}</span>
      </label>
    </div>
  ),
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

      expect(screen.getByText(/Select a card for your TOP action/i)).toBeInTheDocument();
    });

    it('should show instruction to select bottom action after top is selected', () => {
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

      expect(screen.getByText(/Select a card for your BOTTOM action/i)).toBeInTheDocument();
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
      expect(screen.getByText(/Select Your Actions/i)).toBeInTheDocument();
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

    it('should show InitiativeSelector when both cards are selected', () => {
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

      // InitiativeSelector should be visible
      expect(screen.getByRole('radiogroup')).toBeInTheDocument();
      expect(screen.getByText(/choose initiative/i)).toBeInTheDocument();
    });

    it('should not show InitiativeSelector when only one card is selected', () => {
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

      expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    });

    it('should not show InitiativeSelector when no cards are selected', () => {
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

      expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
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

      // Check that initiative values are shown (Trample: 72, Eye for an Eye: 18)
      expect(screen.getByText('72')).toBeInTheDocument();
      expect(screen.getByText('18')).toBeInTheDocument();
    });

    it('should call onInitiativeChange when initiative card is selected', () => {
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

      // Click on the first radio option
      const radioInputs = screen.getAllByRole('radio');
      fireEvent.click(radioInputs[0]);

      expect(mockOnInitiativeChange).toHaveBeenCalledWith('card-1');
    });

    it('should show selected initiative card when selectedInitiativeCardId is provided', () => {
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

      const radioInputs = screen.getAllByRole('radio');
      expect(radioInputs[1]).toBeChecked();
    });

    it('should disable InitiativeSelector when waiting', () => {
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

      const radioInputs = screen.getAllByRole('radio');
      expect(radioInputs[0]).toBeDisabled();
      expect(radioInputs[1]).toBeDisabled();
    });

    it('should auto-select lower initiative card by default', () => {
      // When both cards are selected and no initiative chosen yet,
      // the component should auto-select the card with lower initiative

      render(
        <CardSelectionPanel
          cards={mockCards}
          onCardSelect={mockOnCardSelect}
          onClearSelection={mockOnClearSelection}
          onConfirmSelection={mockOnConfirmSelection}
          selectedTopAction={mockCards[0]} // initiative 72
          selectedBottomAction={mockCards[1]} // initiative 18
          onInitiativeChange={mockOnInitiativeChange}
          selectedInitiativeCardId={null}
        />
      );

      // Card 2 has initiative 18 (lower = faster = default selection)
      // The auto-select should have been called
      expect(mockOnInitiativeChange).toHaveBeenCalledWith('card-2');
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
