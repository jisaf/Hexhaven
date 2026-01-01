/**
 * Unit Test: CardActionRegion Component (Issue #411 - Phase 4.1)
 *
 * Tests the CardActionRegion component which displays a clickable region
 * for the top or bottom half of an ability card during turn execution.
 *
 * Features tested:
 * - Visual states (available, selected, used, disabled)
 * - Action type display (attack, move, heal, etc.)
 * - Lost action indicator
 * - Tap-to-select, tap-to-confirm flow
 * - Touch-friendly sizing
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardActionRegion, type CardActionState } from '../../src/components/game/CardActionRegion';
import type { CardAction } from '../../../shared/types/modifiers';

describe('CardActionRegion', () => {
  // Sample actions for testing
  const mockAttackAction: CardAction = {
    type: 'attack',
    value: 3,
    modifiers: [{ type: 'range', distance: 2 }],
  };

  const mockMoveAction: CardAction = {
    type: 'move',
    value: 4,
    modifiers: [],
  };

  const mockLostAction: CardAction = {
    type: 'attack',
    value: 5,
    modifiers: [{ type: 'lost' }],
  };

  const mockHealAction: CardAction = {
    type: 'heal',
    value: 3,
    modifiers: [],
  };

  const defaultProps = {
    action: mockAttackAction,
    position: 'top' as const,
    state: 'available' as CardActionState,
    cardName: 'Trample',
    initiative: 72,
    onClick: jest.fn(),
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render card name and initiative', () => {
      render(<CardActionRegion {...defaultProps} />);

      expect(screen.getByText('Trample')).toBeInTheDocument();
      expect(screen.getByText('72')).toBeInTheDocument();
    });

    it('should render action type for attack', () => {
      render(<CardActionRegion {...defaultProps} action={mockAttackAction} />);

      expect(screen.getByText('Attack')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should render action type for move', () => {
      render(<CardActionRegion {...defaultProps} action={mockMoveAction} />);

      expect(screen.getByText('Move')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('should render action type for heal', () => {
      render(<CardActionRegion {...defaultProps} action={mockHealAction} />);

      expect(screen.getByText('Heal')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should render range modifier when present', () => {
      render(<CardActionRegion {...defaultProps} action={mockAttackAction} />);

      expect(screen.getByText('Range 2')).toBeInTheDocument();
    });

    it('should render position label', () => {
      render(<CardActionRegion {...defaultProps} position="top" />);
      expect(screen.getByText('TOP')).toBeInTheDocument();

      const { rerender } = render(<CardActionRegion {...defaultProps} position="bottom" />);
      rerender(<CardActionRegion {...defaultProps} position="bottom" />);
      expect(screen.getByText('BOTTOM')).toBeInTheDocument();
    });

    it('should render lost action indicator when action has lost modifier', () => {
      render(<CardActionRegion {...defaultProps} action={mockLostAction} />);

      // Lost indicator should be present
      const lostIndicator = screen.getByTitle('This action is lost when used');
      expect(lostIndicator).toBeInTheDocument();
    });

    it('should not render lost indicator when action is not lost', () => {
      render(<CardActionRegion {...defaultProps} action={mockMoveAction} />);

      expect(screen.queryByTitle('This action is lost when used')).not.toBeInTheDocument();
    });
  });

  describe('States', () => {
    it('should be interactive when state is available', () => {
      render(<CardActionRegion {...defaultProps} state="available" />);

      const region = screen.getByRole('button');
      expect(region).toHaveAttribute('tabIndex', '0');
      expect(region).toHaveAttribute('aria-disabled', 'false');
    });

    it('should be interactive when state is selected', () => {
      render(<CardActionRegion {...defaultProps} state="selected" />);

      // Use aria-label to target the main region (there are also confirm/cancel buttons)
      const region = screen.getByLabelText(/top action/i);
      expect(region).toHaveAttribute('tabIndex', '0');
      expect(region).toHaveAttribute('aria-disabled', 'false');
    });

    it('should not be interactive when state is used', () => {
      render(<CardActionRegion {...defaultProps} state="used" />);

      const region = screen.getByRole('button');
      expect(region).toHaveAttribute('tabIndex', '-1');
      expect(region).toHaveAttribute('aria-disabled', 'true');
    });

    it('should not be interactive when state is disabled', () => {
      render(<CardActionRegion {...defaultProps} state="disabled" />);

      const region = screen.getByRole('button');
      expect(region).toHaveAttribute('tabIndex', '-1');
      expect(region).toHaveAttribute('aria-disabled', 'true');
    });

    it('should show "Used" overlay when state is used', () => {
      render(<CardActionRegion {...defaultProps} state="used" />);

      expect(screen.getByText('Used')).toBeInTheDocument();
    });

    it('should show confirm/cancel buttons when state is selected', () => {
      render(<CardActionRegion {...defaultProps} state="selected" />);

      expect(screen.getByText('Confirm')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should not show confirm/cancel buttons when state is not selected', () => {
      render(<CardActionRegion {...defaultProps} state="available" />);

      expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onClick when region is clicked in available state', () => {
      const onClick = jest.fn();
      render(<CardActionRegion {...defaultProps} state="available" onClick={onClick} />);

      fireEvent.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should call onClick when region is clicked in selected state', () => {
      const onClick = jest.fn();
      render(<CardActionRegion {...defaultProps} state="selected" onClick={onClick} />);

      // Click on the main region (not buttons) - use aria-label to target the main region
      const region = screen.getByLabelText(/top action/i);
      fireEvent.click(region);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when region is clicked in used state', () => {
      const onClick = jest.fn();
      render(<CardActionRegion {...defaultProps} state="used" onClick={onClick} />);

      fireEvent.click(screen.getByRole('button'));
      expect(onClick).not.toHaveBeenCalled();
    });

    it('should not call onClick when region is clicked in disabled state', () => {
      const onClick = jest.fn();
      render(<CardActionRegion {...defaultProps} state="disabled" onClick={onClick} />);

      fireEvent.click(screen.getByRole('button'));
      expect(onClick).not.toHaveBeenCalled();
    });

    it('should call onConfirm when confirm button is clicked', () => {
      const onConfirm = jest.fn();
      render(<CardActionRegion {...defaultProps} state="selected" onConfirm={onConfirm} />);

      fireEvent.click(screen.getByText('Confirm'));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when cancel button is clicked', () => {
      const onCancel = jest.fn();
      render(<CardActionRegion {...defaultProps} state="selected" onCancel={onCancel} />);

      fireEvent.click(screen.getByText('Cancel'));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when confirm button is clicked', () => {
      const onClick = jest.fn();
      const onConfirm = jest.fn();
      render(<CardActionRegion {...defaultProps} state="selected" onClick={onClick} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByLabelText('Confirm action'));
      expect(onClick).not.toHaveBeenCalled();
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should respond to keyboard Enter when available', () => {
      const onClick = jest.fn();
      render(<CardActionRegion {...defaultProps} state="available" onClick={onClick} />);

      fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should respond to keyboard Space when available', () => {
      const onClick = jest.fn();
      render(<CardActionRegion {...defaultProps} state="available" onClick={onClick} />);

      fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have accessible aria-label describing the action', () => {
      render(<CardActionRegion {...defaultProps} position="top" action={mockAttackAction} />);

      const region = screen.getByRole('button');
      expect(region).toHaveAttribute('aria-label', expect.stringContaining('top action'));
      expect(region).toHaveAttribute('aria-label', expect.stringContaining('Attack'));
    });

    it('should have aria-disabled attribute matching state', () => {
      const { rerender } = render(<CardActionRegion {...defaultProps} state="available" />);
      expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'false');

      rerender(<CardActionRegion {...defaultProps} state="disabled" />);
      expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
    });

    it('should have accessible labels on confirm/cancel buttons', () => {
      render(<CardActionRegion {...defaultProps} state="selected" />);

      expect(screen.getByLabelText('Confirm action')).toBeInTheDocument();
      expect(screen.getByLabelText('Cancel selection')).toBeInTheDocument();
    });
  });
});

/**
 * Test Coverage Summary:
 *
 * - Rendering: Card name, initiative, action type, value, modifiers, position, lost indicator
 * - States: Available, selected, used, disabled with correct interactivity
 * - Interactions: onClick, onConfirm, onCancel, keyboard support
 * - Accessibility: aria-label, aria-disabled, button labels
 */
