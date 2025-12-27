/**
 * ToastContext (Issue #335, #338)
 *
 * Provides toast notification state management throughout the app.
 * Used for shop purchase/sell feedback and real-time multiplayer notifications.
 */

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number; // ms, 0 = manual dismiss only
  dismissible: boolean;
}

export interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  // Convenience methods
  success: (message: string, duration?: number) => string;
  error: (message: string, duration?: number) => string;
  warning: (message: string, duration?: number) => string;
  info: (message: string, duration?: number) => string;
}

// Default durations by type
const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 4000,
  error: 0, // Errors stay until dismissed
  warning: 6000,
  info: 4000,
};

// Maximum concurrent toasts
const MAX_TOASTS = 5;

// Context
const ToastContext = createContext<ToastContextType | null>(null);

// Generate unique ID
function generateId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Provider component
interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Track timer IDs for cleanup to prevent memory leaks
  const timerRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      timerRefs.current.forEach((timerId) => clearTimeout(timerId));
      timerRefs.current.clear();
    };
  }, []);

  // Add a toast
  const addToast = useCallback((toast: Omit<Toast, 'id'>): string => {
    const id = generateId();
    const newToast: Toast = { ...toast, id };

    setToasts((prev) => {
      // If at max, remove oldest toast
      const updated = prev.length >= MAX_TOASTS ? prev.slice(1) : prev;
      return [...updated, newToast];
    });

    // Auto-dismiss if duration > 0
    if (toast.duration > 0) {
      const timerId = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        timerRefs.current.delete(id);
      }, toast.duration);
      timerRefs.current.set(id, timerId);
    }

    return id;
  }, []);

  // Remove a toast
  const removeToast = useCallback((id: string) => {
    // Clear any pending timer for this toast
    const timerId = timerRefs.current.get(id);
    if (timerId) {
      clearTimeout(timerId);
      timerRefs.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Clear all toasts
  const clearToasts = useCallback(() => {
    // Clear all pending timers
    timerRefs.current.forEach((timerId) => clearTimeout(timerId));
    timerRefs.current.clear();
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback(
    (message: string, duration = DEFAULT_DURATIONS.success): string => {
      return addToast({
        type: 'success',
        message,
        duration,
        dismissible: true,
      });
    },
    [addToast]
  );

  const error = useCallback(
    (message: string, duration = DEFAULT_DURATIONS.error): string => {
      return addToast({
        type: 'error',
        message,
        duration,
        dismissible: true,
      });
    },
    [addToast]
  );

  const warning = useCallback(
    (message: string, duration = DEFAULT_DURATIONS.warning): string => {
      return addToast({
        type: 'warning',
        message,
        duration,
        dismissible: true,
      });
    },
    [addToast]
  );

  const info = useCallback(
    (message: string, duration = DEFAULT_DURATIONS.info): string => {
      return addToast({
        type: 'info',
        message,
        duration,
        dismissible: true,
      });
    },
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        clearToasts,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
    </ToastContext.Provider>
  );
}

// Hook to use toast context
export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default ToastContext;
