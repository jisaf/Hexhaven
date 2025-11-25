import { FaSignOutAlt } from 'react-icons/fa';
import styles from './GameHUD.module.css';

type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

interface GameHUDProps {
  logs: string[];
  connectionStatus: ConnectionStatus;
  onBackToLobby: () => void;
  isMyTurn: boolean;
  onEndTurn: () => void;
}

export function GameHUD({ logs, connectionStatus, onBackToLobby, isMyTurn, onEndTurn }: GameHUDProps) {
  const statusClassName = styles[connectionStatus] || '';

  return (
    <div className={styles.hudContainer}>
      <div className={styles.hudHeader}>
        <button onClick={onBackToLobby} className={styles.backButton} aria-label="Back to Lobby">
          <FaSignOutAlt />
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
      {isMyTurn && (
        <div className={styles.actionsContainer}>
          <button onClick={onEndTurn} className={styles.endTurnButton}>
            End Turn
          </button>
        </div>
      )}
    </div>
  );
}
