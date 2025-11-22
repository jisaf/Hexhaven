/**
 * ConnectionStatus Component
 *
 * Displays the current WebSocket connection status.
 */

import { useTranslation } from 'react-i18next';
import styles from './ConnectionStatus.module.css';

interface ConnectionStatusProps {
  status: 'connected' | 'disconnected' | 'reconnecting';
}

export function ConnectionStatus({ status }: ConnectionStatusProps) {
  const { t } = useTranslation();

  return (
    <div className={`${styles.connectionStatus} ${styles[status]}`}>
      <span className={styles.statusDot} />
      <span className={styles.statusText}>
        {t(`game:connection.${status}`, status)}
      </span>
    </div>
  );
}
