/**
 * GameLog Component
 *
 * Displays a scrollable log of combat events and game messages.
 * Extracted from the original GameHUD component.
 * Auto-scrolls to bottom when new messages arrive.
 */

import { useEffect, useRef } from 'react';
import type { LogMessage } from '../../../../shared/types';
import styles from './GameLog.module.css';

interface GameLogProps {
  logs: LogMessage[];
}

export function GameLog({ logs }: GameLogProps) {
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs appear
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className={styles.gameLog}>
      <div className={styles.logHeader}>
        <h3>Combat Log</h3>
      </div>
      <div ref={logContainerRef} className={styles.logContainer}>
        {logs.length === 0 ? (
          <p className={styles.emptyMessage}>No events yet...</p>
        ) : (
          logs.map((log) => (
            <p key={log.id} className={styles.logMessage}>
              {log.parts.map((part, partIndex) => (
                <span key={partIndex} className={part.color ? styles[part.color] : ''}>
                  {part.text}
                </span>
              ))}
            </p>
          ))
        )}
      </div>
    </div>
  );
}
