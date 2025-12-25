/**
 * ErrorBanner Component
 *
 * Reusable error banner with dismiss button.
 * Used across multiple pages for consistent error display.
 */

import styles from './ErrorBanner.module.css';

export interface ErrorBannerProps {
  /** Error message to display */
  message: string;
  /** Callback when dismiss button is clicked */
  onDismiss?: () => void;
  /** Optional role attribute for accessibility (defaults to 'alert') */
  role?: 'alert' | 'status';
}

export function ErrorBanner({ message, onDismiss, role = 'alert' }: ErrorBannerProps) {
  return (
    <div className={styles.errorBanner} role={role}>
      <span className={styles.message}>{message}</span>
      {onDismiss && (
        <button
          className={styles.dismissButton}
          onClick={onDismiss}
          aria-label="Dismiss error"
        >
          ✕
        </button>
      )}
    </div>
  );
}
