/**
 * Unit Test: InitiativeSelector Component (Issue #411 - Phase 2)
 *
 * Tests the InitiativeSelector component that allows players to choose
 * which of their two selected cards determines their initiative for the round.
 *
 * Per Gloomhaven rules, players select two ability cards, then choose which
 * card's initiative value determines their turn order.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { InitiativeSelector } from '../../src/components/InitiativeSelector';
import type { AbilityCard } from '../../../shared/types/entities';

describe('InitiativeSelector', () => {
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
      type: 'attack',
      value: 2,
      modifiers: [],
    },
  };

  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render both cards with their names and initiative values', () => {
      render(
        <InitiativeSelector
          card1={mockCard1}
          card2={mockCard2}
          selectedCardId={null}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Trample')).toBeInTheDocument();
      expect(screen.getByText('72')).toBeInTheDocument();
      expect(screen.getByText('Eye for an Eye')).toBeInTheDocument();
      expect(screen.getByText('18')).toBeInTheDocument();
    });

    it('should display a label for initiative selection', () => {
      render(
        <InitiativeSelector
          card1={mockCard1}
          card2={mockCard2}
          selectedCardId={null}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/initiative/i)).toBeInTheDocument();
    });

    it('should render radio inputs for each card', () => {
      render(
        <InitiativeSelector
          card1={mockCard1}
          card2={mockCard2}
          selectedCardId={null}
          onChange={mockOnChange}
        />
      );

      const radioInputs = screen.getAllByRole('radio');
      expect(radioInputs).toHaveLength(2);
    });
  });

  describe('Selection', () => {
    it('should show no card selected when selectedCardId is null', () => {
      render(
        <InitiativeSelector
          card1={mockCard1}
          card2={mockCard2}
          selectedCardId={null}
          onChange={mockOnChange}
        />
      );

      const radioInputs = screen.getAllByRole('radio');
      expect(radioInputs[0]).not.toBeChecked();
      expect(radioInputs[1]).not.toBeChecked();
    });

    it('should show first card selected when selectedCardId matches card1', () => {
      render(
        <InitiativeSelector
          card1={mockCard1}
          card2={mockCard2}
          selectedCardId="card-1"
          onChange={mockOnChange}
        />
      );

      const radioInputs = screen.getAllByRole('radio');
      expect(radioInputs[0]).toBeChecked();
      expect(radioInputs[1]).not.toBeChecked();
    });

    it('should show second card selected when selectedCardId matches card2', () => {
      render(
        <InitiativeSelector
          card1={mockCard1}
          card2={mockCard2}
          selectedCardId="card-2"
          onChange={mockOnChange}
        />
      );

      const radioInputs = screen.getAllByRole('radio');
      expect(radioInputs[0]).not.toBeChecked();
      expect(radioInputs[1]).toBeChecked();
    });

    it('should call onChange with card1 id when first option is clicked', () => {
      render(
        <InitiativeSelector
          card1={mockCard1}
          card2={mockCard2}
          selectedCardId={null}
          onChange={mockOnChange}
        />
      );

      const radioInputs = screen.getAllByRole('radio');
      fireEvent.click(radioInputs[0]);

      expect(mockOnChange).toHaveBeenCalledWith('card-1');
    });

    it('should call onChange with card2 id when second option is clicked', () => {
      render(
        <InitiativeSelector
          card1={mockCard1}
          card2={mockCard2}
          selectedCardId={null}
          onChange={mockOnChange}
        />
      );

      const radioInputs = screen.getAllByRole('radio');
      fireEvent.click(radioInputs[1]);

      expect(mockOnChange).toHaveBeenCalledWith('card-2');
    });

    it('should allow clicking on the label to select a card', () => {
      render(
        <InitiativeSelector
          card1={mockCard1}
          card2={mockCard2}
          selectedCardId={null}
          onChange={mockOnChange}
        />
      );

      // Click on the card name label
      const trampleLabel = screen.getByText('Trample').closest('label');
      if (trampleLabel) {
        fireEvent.click(trampleLabel);
        expect(mockOnChange).toHaveBeenCalledWith('card-1');
      }
    });
  });

  describe('Disabled State', () => {
    it('should disable radio inputs when disabled prop is true', () => {
      render(
        <InitiativeSelector
          card1={mockCard1}
          card2={mockCard2}
          selectedCardId={null}
          onChange={mockOnChange}
          disabled={true}
        />
      );

      const radioInputs = screen.getAllByRole('radio');
      expect(radioInputs[0]).toBeDisabled();
      expect(radioInputs[1]).toBeDisabled();
    });

    it('should not call onChange when disabled and clicked', () => {
      render(
        <InitiativeSelector
          card1={mockCard1}
          card2={mockCard2}
          selectedCardId={null}
          onChange={mockOnChange}
          disabled={true}
        />
      );

      const radioInputs = screen.getAllByRole('radio');
      fireEvent.click(radioInputs[0]);

      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('Visual Feedback', () => {
    it('should apply selected class to chosen option', () => {
      render(
        <InitiativeSelector
          card1={mockCard1}
          card2={mockCard2}
          selectedCardId="card-1"
          onChange={mockOnChange}
        />
      );

      // Find the option container for the selected card
      const selectedOption = screen.getByText('Trample').closest('.initiative-option');
      expect(selectedOption).toHaveClass('selected');
    });

    it('should highlight lower initiative value as faster', () => {
      render(
        <InitiativeSelector
          card1={mockCard1}
          card2={mockCard2}
          selectedCardId={null}
          onChange={mockOnChange}
        />
      );

      // Card2 has initiative 18 (lower = faster)
      const fasterIndicator = screen.getByText(/faster/i);
      expect(fasterIndicator).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels for screen readers', () => {
      render(
        <InitiativeSelector
          card1={mockCard1}
          card2={mockCard2}
          selectedCardId={null}
          onChange={mockOnChange}
        />
      );

      // Check for aria-label or accessible name on radio group
      expect(screen.getByRole('radiogroup')).toHaveAccessibleName();
    });

    it('should associate labels with radio inputs', () => {
      render(
        <InitiativeSelector
          card1={mockCard1}
          card2={mockCard2}
          selectedCardId={null}
          onChange={mockOnChange}
        />
      );

      // Each radio should have an associated label
      const radioInputs = screen.getAllByRole('radio');
      radioInputs.forEach((radio) => {
        expect(radio).toHaveAccessibleName();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle cards with same initiative value', () => {
      const sameInitCard1 = { ...mockCard1, initiative: 50 };
      const sameInitCard2 = { ...mockCard2, initiative: 50 };

      render(
        <InitiativeSelector
          card1={sameInitCard1}
          card2={sameInitCard2}
          selectedCardId={null}
          onChange={mockOnChange}
        />
      );

      // Both should show initiative 50
      const initiativeValues = screen.getAllByText('50');
      expect(initiativeValues).toHaveLength(2);
    });
  });
});

/**
 * Test Coverage Summary:
 *
 * - Rendering: Card names, initiative values, labels, radio inputs
 * - Selection: Null selection, card1 selected, card2 selected, onChange callbacks
 * - Disabled state: Inputs disabled, no onChange calls
 * - Visual feedback: Selected class applied, faster card indicated
 * - Accessibility: Accessible names, label associations
 * - Edge cases: Same initiative values
 */
