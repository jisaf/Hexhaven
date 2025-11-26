import { FaSignOutAlt } from 'react-icons/fa';
import styles from './GameHUD.module.css';

type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

interface GameHUDProps {
  logs: string[];
  connectionStatus: ConnectionStatus;
  isMyTurn: boolean;
  onBackToLobby: () => void;
  onEndTurn: () => void;
}

export function GameHUD({ logs, connectionStatus, isMyTurn, onBackToLobby, onEndTurn }: GameHUDProps) {
  const statusClassName = styles[connectionStatus] || '';

  return (
    <div className={styles.hudContainer}>
      <div className={styles.hudHeader}>
        <button onClick={onBackToLobby} className={styles.backButton} aria-label="Back to Lobby">
          <FaSignOutAlt />
        </button>
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
