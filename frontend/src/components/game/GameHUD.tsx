import { FaSignOutAlt } from 'react-icons/fa';
import styles from './GameHUD.module.css';
import type { LogMessage, AbilityCard } from '../../../../shared/types';
import { ActiveCardDisplay } from './ActiveCardDisplay';

type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

interface GameHUDProps {
  logs: LogMessage[];
  connectionStatus: ConnectionStatus;
  isMyTurn: boolean;
  onBackToLobby: () => void;
  onEndTurn: () => void;
  cardsForTurn: [AbilityCard, AbilityCard] | null;
  onActionSelect: (cardId: string, actionType: 'top' | 'bottom') => void;
  usedActionTypes: { top: boolean; bottom: boolean };
  usedCardId: string | null;
  onSkipAction: () => void;
  activeAction: { cardId: string; actionType: 'top' | 'bottom' } | null;
}

export function GameHUD({
  logs,
  connectionStatus,
  isMyTurn,
  onBackToLobby,
  onEndTurn,
  cardsForTurn,
  onActionSelect,
  usedActionTypes,
  usedCardId,
  onSkipAction,
  activeAction,
}: GameHUDProps) {
  const statusClassName = styles[connectionStatus] || '';

  return (
    <div className={styles.hudContainer}>
      <div className={styles.hudHeader}>
        <button onClick={onBackToLobby} className={styles.backButton} aria-label="Back to Lobby">
          <FaSignOutAlt />
        </button>
        <div className={styles.turnActions}>
          {isMyTurn && activeAction && (
            <button
              onClick={onSkipAction}
              className={styles.skipButton}
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
        </div>
        <div className={`${styles.statusDot} ${statusClassName}`} />
      </div>
      <div className={styles.logContainer}>
        {isMyTurn && cardsForTurn && (
          <ActiveCardDisplay
            cards={cardsForTurn}
            onActionSelect={onActionSelect}
            usedActionTypes={usedActionTypes}
            usedCardId={usedCardId}
          />
        )}
        {logs.map((log) => (
          <p key={log.id} className={styles.logMessage}>
            {log.parts.map((part, partIndex) => (
              <span key={partIndex} className={part.color ? styles[part.color] : ''}>
                {part.text}
              </span>
            ))}
          </p>
        ))}
      </div>
    </div>
  );
}
