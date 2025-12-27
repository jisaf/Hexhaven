/**
 * Toast Component (Issue #335, #338)
 *
 * Individual toast notification with:
 * - Type-based styling (success, error, warning, info)
 * - Icon per type
 * - Dismiss button
 * - Slide animation
 * - Accessibility support
 */

import { useEffect, useState } from 'react';
import type { Toast as ToastType, ToastType as ToastVariant } from '../contexts/ToastContext';
import styles from './Toast.module.css';

interface ToastProps {
  toast: ToastType;
  onDismiss: () => void;
  index: number;
}

// Icons for each toast type
const TOAST_ICONS: Record<ToastVariant, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

export function Toast({ toast, onDismiss, index }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  // Handle dismiss with exit animation
  const handleDismiss = () => {
    setIsExiting(true);
    // Wait for animation to complete
    setTimeout(onDismiss, 200);
  };

  // Auto-dismiss timer visual indicator could be added here
  useEffect(() => {
    // If toast has duration, we might want to show a progress bar
    // For now, the context handles the auto-dismiss
  }, [toast.duration]);

  // Calculate vertical offset for stacking
  const offsetTop = 80 + index * 70; // 80px base + 70px per toast

  return (
    <div
      className={`${styles.toast} ${styles[toast.type]} ${isExiting ? styles.exiting : ''}`}
      style={{ top: `${offsetTop}px` }}
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <span className={styles.icon} aria-hidden="true">
        {TOAST_ICONS[toast.type]}
      </span>
      <span className={styles.message}>{toast.message}</span>
      {toast.dismissible && (
        <button
          className={styles.dismissButton}
          onClick={handleDismiss}
          aria-label="Dismiss notification"
        >
          ×
        </button>
      )}
    </div>
  );
}

export default Toast;
