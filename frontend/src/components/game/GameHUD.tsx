import { FaSignOutAlt } from 'react-icons/fa';
import styles from './GameHUD.module.css';

type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

interface GameHUDProps {
  logs: string[];
  connectionStatus: ConnectionStatus;
  isMyTurn: boolean;
  isActionActive: boolean;
  onBackToLobby: () => void;
  onEndTurn: () => void;
  onSkipAction: () => void;
}

export function GameHUD({
  logs,
  connectionStatus,
  isMyTurn,
  isActionActive,
  onBackToLobby,
  onEndTurn,
  onSkipAction,
}: GameHUDProps) {
  const statusClassName = styles[connectionStatus] || '';

  return (
    <div className={styles.hudContainer}>
      <div className={styles.hudHeader}>
        <button onClick={onBackToLobby} className={styles.backButton} aria-label="Back to Lobby">
          <FaSignOutAlt />
        </button>
        {isActionActive && (
          <button
            onClick={onSkipAction}
            className={styles.skipButton}
            disabled={!isMyTurn}
            aria-label="Skip Action"
          >
            Skip
          </button>
        )}
        <button
          onClick={onEndTurn}
          className={styles.endTurnButton}
          disabled={!isMyTurn}
          aria-label="End Turn"
        >
          End Turn
        </button>
        <div className={`${styles.statusDot} ${statusClassName}`} />
      </div>
      <div className={styles.logContainer}>
        {logs.map((log, index) => (
          <p key={index} className={styles.logMessage}>
            {log}
          </p>
        ))}
      </div>
    </div>
  );
}
