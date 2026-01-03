/**
 * Unit Test: FloatingChip Component
 *
 * Tests the FloatingChip component which is a reusable circular chip
 * for displaying entities (characters, monsters) and elements.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FloatingChip } from '../../src/components/game/FloatingChip';

describe('FloatingChip', () => {
  const defaultProps = {
    id: 'test-chip',
    icon: 'T',
    color: '#ff0000',
    intensity: 'full' as const,
  };

  describe('basic rendering', () => {
    it('should render the chip with icon', () => {
      render(<FloatingChip {...defaultProps} testId="test-chip" />);

      const chip = screen.getByTestId('test-chip');
      expect(chip).toBeInTheDocument();
      expect(chip).toHaveTextContent('T');
    });

    it('should apply the correct color', () => {
      render(<FloatingChip {...defaultProps} testId="test-chip" />);

      const chip = screen.getByTestId('test-chip');
      expect(chip).toHaveStyle('--chip-color: #ff0000');
    });

    it('should render with title tooltip', () => {
      render(<FloatingChip {...defaultProps} title="Test Tooltip" testId="test-chip" />);

      const chip = screen.getByTestId('test-chip');
      expect(chip).toHaveAttribute('title', 'Test Tooltip');
    });
  });

  describe('intensity states', () => {
    it('should not render when intensity is "off"', () => {
      render(<FloatingChip {...defaultProps} intensity="off" testId="test-chip" />);

      expect(screen.queryByTestId('test-chip')).not.toBeInTheDocument();
    });

    it('should render with waning class when intensity is "waning"', () => {
      render(<FloatingChip {...defaultProps} intensity="waning" testId="test-chip" />);

      const chip = screen.getByTestId('test-chip');
      expect(chip).toHaveClass('waning');
    });

    it('should not have waning class when intensity is "full"', () => {
      render(<FloatingChip {...defaultProps} intensity="full" testId="test-chip" />);

      const chip = screen.getByTestId('test-chip');
      expect(chip).not.toHaveClass('waning');
    });
  });

  describe('border styling', () => {
    it('should render intensity border when full with borderColor', () => {
      render(
        <FloatingChip
          {...defaultProps}
          intensity="full"
          borderColor="#880000"
          testId="test-chip"
        />
      );

      const chip = screen.getByTestId('test-chip');
      expect(chip).toHaveStyle('--chip-border-color: #880000');
    });

    it('should not apply border color when intensity is waning', () => {
      render(
        <FloatingChip
          {...defaultProps}
          intensity="waning"
          borderColor="#880000"
          testId="test-chip"
        />
      );

      const chip = screen.getByTestId('test-chip');
      // Border is transparent for waning intensity
      expect(chip).toHaveStyle('--chip-border-color: transparent');
    });
  });

  describe('active and turn states', () => {
    it('should apply active class when isActive is true', () => {
      render(<FloatingChip {...defaultProps} isActive testId="test-chip" />);

      const chip = screen.getByTestId('test-chip');
      expect(chip).toHaveClass('active');
    });

    it('should apply current-turn class when isTurn is true', () => {
      render(<FloatingChip {...defaultProps} isTurn testId="test-chip" />);

      const chip = screen.getByTestId('test-chip');
      expect(chip).toHaveClass('current-turn');
    });

    it('should render turn indicator when isTurn is true', () => {
      render(<FloatingChip {...defaultProps} isTurn testId="test-chip" />);

      const chip = screen.getByTestId('test-chip');
      const turnIndicator = chip.querySelector('.turn-indicator');
      expect(turnIndicator).toBeInTheDocument();
    });
  });

  describe('badge and overlay', () => {
    it('should render badge when provided', () => {
      render(<FloatingChip {...defaultProps} badge="★" testId="test-chip" />);

      const chip = screen.getByTestId('test-chip');
      expect(chip).toHaveTextContent('★');
    });

    it('should render overlay when provided', () => {
      render(<FloatingChip {...defaultProps} overlay="💀" testId="test-chip" />);

      const chip = screen.getByTestId('test-chip');
      expect(chip).toHaveClass('has-overlay');
      expect(chip).toHaveTextContent('💀');
    });
  });

  describe('health ring', () => {
    it('should render health ring when ringPercent and ringColor provided', () => {
      render(
        <FloatingChip
          {...defaultProps}
          ringPercent={75}
          ringColor="#4ade80"
          testId="test-chip"
        />
      );

      const chip = screen.getByTestId('test-chip');
      const ring = chip.querySelector('.health-ring');
      expect(ring).toBeInTheDocument();
    });

    it('should not render health ring when ringPercent not provided', () => {
      render(<FloatingChip {...defaultProps} testId="test-chip" />);

      const chip = screen.getByTestId('test-chip');
      const ring = chip.querySelector('.health-ring');
      expect(ring).not.toBeInTheDocument();
    });
  });

  describe('interaction', () => {
    it('should call onClick when clicked', () => {
      const handleClick = jest.fn();
      render(<FloatingChip {...defaultProps} onClick={handleClick} testId="test-chip" />);

      const chip = screen.getByTestId('test-chip');
      fireEvent.click(chip);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should be a button element for accessibility', () => {
      render(<FloatingChip {...defaultProps} testId="test-chip" />);

      const chip = screen.getByTestId('test-chip');
      expect(chip.tagName).toBe('BUTTON');
      expect(chip).toHaveAttribute('type', 'button');
    });
  });

  describe('custom className', () => {
    it('should apply additional className', () => {
      render(<FloatingChip {...defaultProps} className="custom-class" testId="test-chip" />);

      const chip = screen.getByTestId('test-chip');
      expect(chip).toHaveClass('custom-class');
    });
  });
});
