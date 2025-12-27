/**
 * Unit Tests: ToastContext
 *
 * Tests for toast notification context including:
 * - Toast addition and removal
 * - Auto-dismiss functionality
 * - Timer cleanup on unmount (memory leak prevention)
 * - Maximum toast limit enforcement
 *
 * Issue #335, #338 - Toast notification system
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ToastProvider,
  useToast,
} from '../../src/contexts/ToastContext';

// Test component that exposes toast context for testing
function TestConsumer({
  onMount,
}: {
  onMount?: (context: ReturnType<typeof useToast>) => void;
}) {
  const context = useToast();
  React.useEffect(() => {
    onMount?.(context);
  }, [context, onMount]);

  return (
    <div>
      <div data-testid="toast-count">{context.toasts.length}</div>
      {context.toasts.map((toast) => (
        <div key={toast.id} data-testid={`toast-${toast.id}`}>
          <span data-testid="toast-type">{toast.type}</span>
          <span data-testid="toast-message">{toast.message}</span>
          <button onClick={() => context.removeToast(toast.id)}>Dismiss</button>
        </div>
      ))}
      <button
        data-testid="add-success"
        onClick={() => context.success('Success message')}
      >
        Add Success
      </button>
      <button
        data-testid="add-error"
        onClick={() => context.error('Error message')}
      >
        Add Error
      </button>
      <button data-testid="clear-all" onClick={() => context.clearToasts()}>
        Clear All
      </button>
    </div>
  );
}

describe('ToastContext', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Toast Provider', () => {
    it('should render children', () => {
      render(
        <ToastProvider>
          <div data-testid="child">Child content</div>
        </ToastProvider>
      );
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('should throw error when useToast is used outside provider', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      expect(() => render(<TestConsumer />)).toThrow(
        'useToast must be used within a ToastProvider'
      );
      consoleError.mockRestore();
    });
  });

  describe('Adding Toasts', () => {
    it('should add a success toast', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(
        <ToastProvider>
          <TestConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByTestId('add-success'));

      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
      expect(screen.getByTestId('toast-message')).toHaveTextContent(
        'Success message'
      );
    });

    it('should add an error toast', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(
        <ToastProvider>
          <TestConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByTestId('add-error'));

      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
      expect(screen.getByTestId('toast-type')).toHaveTextContent('error');
    });

    it('should generate unique IDs for each toast', async () => {
      let toastContext: ReturnType<typeof useToast>;
      render(
        <ToastProvider>
          <TestConsumer onMount={(ctx) => (toastContext = ctx)} />
        </ToastProvider>
      );

      const id1 = toastContext!.success('Message 1');
      const id2 = toastContext!.success('Message 2');

      expect(id1).not.toEqual(id2);
      expect(id1).toMatch(/^toast-\d+-[a-z0-9]+$/);
    });
  });

  describe('Auto-dismiss', () => {
    it('should auto-dismiss success toast after default duration', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(
        <ToastProvider>
          <TestConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByTestId('add-success'));
      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');

      // Fast-forward past the default success duration (4000ms)
      act(() => {
        jest.advanceTimersByTime(4001);
      });

      expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
    });

    it('should NOT auto-dismiss error toast by default', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(
        <ToastProvider>
          <TestConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByTestId('add-error'));
      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');

      // Fast-forward a long time
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      // Error toast should still be there
      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
    });
  });

  describe('Manual Dismiss', () => {
    it('should remove toast when dismissed manually', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(
        <ToastProvider>
          <TestConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByTestId('add-success'));
      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');

      await user.click(screen.getByRole('button', { name: 'Dismiss' }));
      expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
    });

    it('should clear timer when toast is dismissed manually', async () => {
      let toastContext: ReturnType<typeof useToast>;
      render(
        <ToastProvider>
          <TestConsumer onMount={(ctx) => (toastContext = ctx)} />
        </ToastProvider>
      );

      // Add a toast that would auto-dismiss
      act(() => {
        toastContext!.success('Test message', 5000);
      });

      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');

      // Dismiss it manually before the timer fires
      act(() => {
        const toastId = toastContext!.toasts[0].id;
        toastContext!.removeToast(toastId);
      });

      expect(screen.getByTestId('toast-count')).toHaveTextContent('0');

      // Advance past original timer - should not cause any issues
      act(() => {
        jest.advanceTimersByTime(6000);
      });

      // Still 0 toasts
      expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
    });
  });

  describe('Clear All Toasts', () => {
    it('should remove all toasts when clearToasts is called', async () => {
      let toastContext: ReturnType<typeof useToast>;
      render(
        <ToastProvider>
          <TestConsumer onMount={(ctx) => (toastContext = ctx)} />
        </ToastProvider>
      );

      // Add multiple toasts
      act(() => {
        toastContext!.success('Message 1');
        toastContext!.warning('Message 2');
        toastContext!.info('Message 3');
      });

      expect(screen.getByTestId('toast-count')).toHaveTextContent('3');

      // Clear all
      act(() => {
        toastContext!.clearToasts();
      });

      expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
    });

    it('should clear all pending timers when clearToasts is called', async () => {
      let toastContext: ReturnType<typeof useToast>;
      render(
        <ToastProvider>
          <TestConsumer onMount={(ctx) => (toastContext = ctx)} />
        </ToastProvider>
      );

      // Add toasts with auto-dismiss
      act(() => {
        toastContext!.success('Message 1', 5000);
        toastContext!.info('Message 2', 5000);
      });

      expect(screen.getByTestId('toast-count')).toHaveTextContent('2');

      // Clear all
      act(() => {
        toastContext!.clearToasts();
      });

      expect(screen.getByTestId('toast-count')).toHaveTextContent('0');

      // Advance timers - should not cause any issues or errors
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
    });
  });

  describe('Maximum Toast Limit', () => {
    it('should remove oldest toast when limit is exceeded', async () => {
      let toastContext: ReturnType<typeof useToast>;
      render(
        <ToastProvider>
          <TestConsumer onMount={(ctx) => (toastContext = ctx)} />
        </ToastProvider>
      );

      // Add 6 toasts (limit is 5)
      act(() => {
        toastContext!.error('Message 1'); // Will be removed
        toastContext!.error('Message 2');
        toastContext!.error('Message 3');
        toastContext!.error('Message 4');
        toastContext!.error('Message 5');
        toastContext!.error('Message 6');
      });

      expect(screen.getByTestId('toast-count')).toHaveTextContent('5');

      // First message should have been removed
      const messages = screen.getAllByTestId('toast-message');
      expect(messages[0]).toHaveTextContent('Message 2');
      expect(messages[4]).toHaveTextContent('Message 6');
    });
  });

  describe('Memory Leak Prevention', () => {
    it('should cleanup timers on unmount', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      let toastContext: ReturnType<typeof useToast>;

      const { unmount } = render(
        <ToastProvider>
          <TestConsumer onMount={(ctx) => (toastContext = ctx)} />
        </ToastProvider>
      );

      // Add toasts with auto-dismiss timers
      act(() => {
        toastContext!.success('Message 1', 5000);
        toastContext!.success('Message 2', 5000);
        toastContext!.success('Message 3', 5000);
      });

      expect(screen.getByTestId('toast-count')).toHaveTextContent('3');

      // Unmount - should clear all timers
      unmount();

      // Verify clearTimeout was called for cleanup
      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });

    it('should not cause state updates after unmount', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      let toastContext: ReturnType<typeof useToast>;

      const { unmount } = render(
        <ToastProvider>
          <TestConsumer onMount={(ctx) => (toastContext = ctx)} />
        </ToastProvider>
      );

      // Add toast with auto-dismiss
      act(() => {
        toastContext!.success('Test message', 1000);
      });

      // Unmount before timer fires
      unmount();

      // Advance past timer
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Should not see React warning about state update on unmounted component
      const reactWarnings = consoleError.mock.calls.filter((call) =>
        call[0]?.toString().includes("Can't perform a React state update")
      );
      expect(reactWarnings).toHaveLength(0);

      consoleError.mockRestore();
    });
  });

  describe('Convenience Methods', () => {
    it.each([
      ['success', 'success'],
      ['error', 'error'],
      ['warning', 'warning'],
      ['info', 'info'],
    ])('should add %s toast via convenience method', async (method, expectedType) => {
      let toastContext: ReturnType<typeof useToast>;
      render(
        <ToastProvider>
          <TestConsumer onMount={(ctx) => (toastContext = ctx)} />
        </ToastProvider>
      );

      act(() => {
        (toastContext as any)[method](`${method} message`);
      });

      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
      expect(screen.getByTestId('toast-type')).toHaveTextContent(expectedType);
    });
  });
});
