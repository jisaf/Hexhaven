/**
 * Unit Test: AbilityCard2 Component
 *
 * Tests the AbilityCard2 component's touch gesture handling,
 * specifically the scroll detection logic that prevents accidental
 * card selection during scrolling.
 *
 * Key behaviors tested:
 * - Touch move >10px sets wasScrolling and prevents onClick
 * - Touch move <=10px allows onClick to fire
 * - handleTouchCancel resets all state correctly
 * - Interaction between wasScrolling and isLongPress flags
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AbilityCard2 } from '../../src/components/AbilityCard2';
import type { AbilityCard } from '../../../shared/types/entities';
import { TAP_MOVEMENT_THRESHOLD_PX } from '../../src/utils/touch-constants';

// Mock createPortal to avoid DOM warnings in tests
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: React.ReactNode) => node,
}));

// Mock the ActionRowLayout component
jest.mock('../../src/components/layouts/ActionRowLayout', () => ({
  ActionRowLayout: ({ position }: { action: unknown; position: string }) => (
    <div data-testid={`action-${position}`}>Action: {position}</div>
  ),
  CardIcons: () => <div data-testid="card-icons" />,
}));

describe('AbilityCard2', () => {
  const mockCard: AbilityCard = {
    id: 'test-card-1',
    name: 'Test Card',
    characterClass: 'Brute',
    level: 1,
    initiative: 50,
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

  const defaultProps = {
    card: mockCard,
    variant: 'full' as const,
    onClick: jest.fn(),
  };

  // Helper to create touch events with coordinates - shared across all touch tests
  const createTouchEvent = (type: string, x: number, y: number) => {
    return new TouchEvent(type, {
      touches: [{ clientX: x, clientY: y, identifier: 0 } as Touch],
      bubbles: true,
      cancelable: true,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render the card name', () => {
      render(<AbilityCard2 {...defaultProps} />);
      expect(screen.getByText('Test Card')).toBeInTheDocument();
    });

    it('should render the initiative value', () => {
      render(<AbilityCard2 {...defaultProps} />);
      expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('should render with selected class when isSelected is true', () => {
      render(<AbilityCard2 {...defaultProps} isSelected={true} />);
      const cardElement = screen.getByRole('button');
      expect(cardElement).toHaveClass('selected');
    });

    it('should render with disabled class when disabled is true', () => {
      render(<AbilityCard2 {...defaultProps} disabled={true} />);
      const cardElement = screen.getByRole('button');
      expect(cardElement).toHaveClass('disabled');
    });
  });

  describe('Touch Scroll Detection', () => {
    it('should trigger onClick when touch movement is within threshold', () => {
      const onClick = jest.fn();
      render(<AbilityCard2 {...defaultProps} onClick={onClick} />);

      const cardElement = screen.getByRole('button');

      // Start touch at (100, 100)
      const touchStart = createTouchEvent('touchstart', 100, 100);
      cardElement.dispatchEvent(touchStart);

      // Move slightly within threshold (less than 10px total)
      const touchMove = createTouchEvent('touchmove', 105, 105);
      cardElement.dispatchEvent(touchMove);

      // End touch - should trigger onClick since movement was small
      const touchEnd = new TouchEvent('touchend', {
        touches: [],
        bubbles: true,
        cancelable: true,
      });
      cardElement.dispatchEvent(touchEnd);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should NOT trigger onClick when touch movement exceeds threshold in X direction', () => {
      const onClick = jest.fn();
      render(<AbilityCard2 {...defaultProps} onClick={onClick} />);

      const cardElement = screen.getByRole('button');

      // Start touch at (100, 100)
      const touchStart = createTouchEvent('touchstart', 100, 100);
      cardElement.dispatchEvent(touchStart);

      // Move beyond threshold in X direction (> TAP_MOVEMENT_THRESHOLD_PX)
      const touchMove = createTouchEvent('touchmove', 100 + TAP_MOVEMENT_THRESHOLD_PX + 5, 100);
      cardElement.dispatchEvent(touchMove);

      // End touch - should NOT trigger onClick due to scroll
      const touchEnd = new TouchEvent('touchend', {
        touches: [],
        bubbles: true,
        cancelable: true,
      });
      cardElement.dispatchEvent(touchEnd);

      expect(onClick).not.toHaveBeenCalled();
    });

    it('should NOT trigger onClick when touch movement exceeds threshold in Y direction', () => {
      const onClick = jest.fn();
      render(<AbilityCard2 {...defaultProps} onClick={onClick} />);

      const cardElement = screen.getByRole('button');

      // Start touch at (100, 100)
      const touchStart = createTouchEvent('touchstart', 100, 100);
      cardElement.dispatchEvent(touchStart);

      // Move beyond threshold in Y direction (> TAP_MOVEMENT_THRESHOLD_PX)
      const touchMove = createTouchEvent('touchmove', 100, 100 + TAP_MOVEMENT_THRESHOLD_PX + 5);
      cardElement.dispatchEvent(touchMove);

      // End touch - should NOT trigger onClick due to scroll
      const touchEnd = new TouchEvent('touchend', {
        touches: [],
        bubbles: true,
        cancelable: true,
      });
      cardElement.dispatchEvent(touchEnd);

      expect(onClick).not.toHaveBeenCalled();
    });

    it('should trigger onClick on next touch after wasScrolling is reset', () => {
      const onClick = jest.fn();
      render(<AbilityCard2 {...defaultProps} onClick={onClick} />);

      const cardElement = screen.getByRole('button');

      // First touch: scroll gesture (exceeds threshold)
      cardElement.dispatchEvent(createTouchEvent('touchstart', 100, 100));
      cardElement.dispatchEvent(createTouchEvent('touchmove', 100, 200)); // Scroll
      cardElement.dispatchEvent(new TouchEvent('touchend', { touches: [], bubbles: true, cancelable: true }));

      expect(onClick).not.toHaveBeenCalled();

      // Second touch: tap gesture (within threshold)
      cardElement.dispatchEvent(createTouchEvent('touchstart', 100, 100));
      cardElement.dispatchEvent(createTouchEvent('touchmove', 102, 102)); // Small movement
      cardElement.dispatchEvent(new TouchEvent('touchend', { touches: [], bubbles: true, cancelable: true }));

      // onClick should fire on the second tap since wasScrolling was reset
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should reset state properly on touchcancel', () => {
      const onClick = jest.fn();
      render(<AbilityCard2 {...defaultProps} onClick={onClick} />);

      const cardElement = screen.getByRole('button');

      // Start touch and begin scrolling
      cardElement.dispatchEvent(createTouchEvent('touchstart', 100, 100));
      cardElement.dispatchEvent(createTouchEvent('touchmove', 100, 200)); // Scroll

      // Cancel touch (e.g., browser takes over scroll)
      cardElement.dispatchEvent(new TouchEvent('touchcancel', { bubbles: true, cancelable: true }));

      // New tap should work immediately after touchcancel
      cardElement.dispatchEvent(createTouchEvent('touchstart', 100, 100));
      cardElement.dispatchEvent(new TouchEvent('touchend', { touches: [], bubbles: true, cancelable: true }));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should not trigger onClick when disabled', () => {
      const onClick = jest.fn();
      render(<AbilityCard2 {...defaultProps} onClick={onClick} disabled={true} />);

      const cardElement = screen.getByRole('button');

      // Simple tap
      cardElement.dispatchEvent(createTouchEvent('touchstart', 100, 100));
      cardElement.dispatchEvent(new TouchEvent('touchend', { touches: [], bubbles: true, cancelable: true }));

      expect(onClick).not.toHaveBeenCalled();
    });

    it('should handle boundary case: exactly at threshold', () => {
      const onClick = jest.fn();
      render(<AbilityCard2 {...defaultProps} onClick={onClick} />);

      const cardElement = screen.getByRole('button');

      // Move exactly at threshold (not exceeding it)
      cardElement.dispatchEvent(createTouchEvent('touchstart', 100, 100));
      cardElement.dispatchEvent(createTouchEvent('touchmove', 100 + TAP_MOVEMENT_THRESHOLD_PX, 100));
      cardElement.dispatchEvent(new TouchEvent('touchend', { touches: [], bubbles: true, cancelable: true }));

      // At exactly the threshold, it should still trigger (only > threshold blocks)
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Long Press and Scroll Interaction', () => {
    it('should cancel long press when scrolling starts', () => {
      const { container } = render(<AbilityCard2 {...defaultProps} />);

      const cardElement = screen.getByRole('button');

      // Start touch
      cardElement.dispatchEvent(createTouchEvent('touchstart', 100, 100));

      // Advance timer partially (less than long press duration)
      jest.advanceTimersByTime(200);

      // Start scrolling - this should cancel long press
      cardElement.dispatchEvent(createTouchEvent('touchmove', 100, 200));

      // Advance past long press duration
      jest.advanceTimersByTime(200);

      // Should not show zoom modal since long press was cancelled
      // Use container.querySelector since queryByClassName doesn't exist
      expect(container.querySelector('.card-zoom-overlay')).not.toBeInTheDocument();
    });

    it('should not trigger onClick during long press', () => {
      const onClick = jest.fn();
      render(<AbilityCard2 {...defaultProps} onClick={onClick} />);

      const cardElement = screen.getByRole('button');

      // Start touch
      cardElement.dispatchEvent(createTouchEvent('touchstart', 100, 100));

      // Wait for long press to trigger (350ms as per LONG_PRESS_DURATION)
      jest.advanceTimersByTime(400);

      // End touch
      cardElement.dispatchEvent(new TouchEvent('touchend', { touches: [], bubbles: true, cancelable: true }));

      // Flush any async updates
      jest.runAllTimers();

      // onClick should NOT be called since it was a long press
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Mouse Events', () => {
    it('should trigger onClick on mouse click', () => {
      const onClick = jest.fn();
      render(<AbilityCard2 {...defaultProps} onClick={onClick} />);

      const cardElement = screen.getByRole('button');
      fireEvent.click(cardElement);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should not trigger onClick on mouse click when disabled', () => {
      const onClick = jest.fn();
      render(<AbilityCard2 {...defaultProps} onClick={onClick} disabled={true} />);

      const cardElement = screen.getByRole('button');
      fireEvent.click(cardElement);

      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have role="button"', () => {
      render(<AbilityCard2 {...defaultProps} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should have tabIndex=0 when not disabled', () => {
      render(<AbilityCard2 {...defaultProps} />);
      const cardElement = screen.getByRole('button');
      expect(cardElement).toHaveAttribute('tabIndex', '0');
    });

    it('should have tabIndex=-1 when disabled', () => {
      render(<AbilityCard2 {...defaultProps} disabled={true} />);
      const cardElement = screen.getByRole('button');
      expect(cardElement).toHaveAttribute('tabIndex', '-1');
    });

    it('should have aria-disabled when disabled', () => {
      render(<AbilityCard2 {...defaultProps} disabled={true} />);
      const cardElement = screen.getByRole('button');
      expect(cardElement).toHaveAttribute('aria-disabled', 'true');
    });

    it('should have aria-pressed when selected', () => {
      render(<AbilityCard2 {...defaultProps} isSelected={true} />);
      const cardElement = screen.getByRole('button');
      expect(cardElement).toHaveAttribute('aria-pressed', 'true');
    });
  });
});

/**
 * Test Coverage Summary:
 *
 * - Rendering: Card name, initiative, selected/disabled classes
 * - Touch Scroll Detection:
 *   - Movement within threshold allows onClick
 *   - Movement exceeding threshold in X prevents onClick
 *   - Movement exceeding threshold in Y prevents onClick
 *   - wasScrolling resets after touch ends
 *   - touchcancel resets state properly
 *   - Disabled state prevents onClick
 *   - Boundary case at exactly threshold
 * - Long Press and Scroll Interaction:
 *   - Scrolling cancels long press
 *   - Long press prevents onClick
 * - Mouse Events:
 *   - Click triggers onClick
 *   - Disabled prevents onClick on mouse
 * - Accessibility:
 *   - Proper ARIA attributes
 *   - Keyboard focusability
 */
