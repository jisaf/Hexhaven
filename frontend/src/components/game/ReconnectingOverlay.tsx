/**
 * ReconnectingOverlay Component
 *
 * Displays a fullscreen overlay with spinner when reconnecting to the server.
 */

import { useTranslation } from 'react-i18next';
import styles from './ReconnectingOverlay.module.css';

interface ReconnectingOverlayProps {
  show: boolean;
}

export function ReconnectingOverlay({ show }: ReconnectingOverlayProps) {
  const { t } = useTranslation();

  if (!show) {
    return null;
  }

  return (
    <div className={styles.reconnectingOverlay}>
      <div className={styles.reconnectingMessage}>
        <div className={styles.spinner} />
        <p>{t('game:reconnecting', 'Reconnecting...')}</p>
      </div>
    </div>
  );
}
