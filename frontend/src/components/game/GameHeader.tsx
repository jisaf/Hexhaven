/**
 * GameHeader Component
 *
 * Displays the game header with title, turn indicator, connection status, and controls.
 */

import { useTranslation } from 'react-i18next';
import { TurnIndicator } from './TurnIndicator';
import { ConnectionStatus } from './ConnectionStatus';
import styles from './GameHeader.module.css';

interface GameHeaderProps {
  isMyTurn: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  onBackToLobby: () => void;
}

export function GameHeader({ isMyTurn, connectionStatus, onBackToLobby }: GameHeaderProps) {
  const { t } = useTranslation();

  return (
    <header className={styles.gameHeader}>
      <div className={styles.gameInfo}>
        <h2>{t('game:title', 'Hexhaven Battle')}</h2>
        <TurnIndicator isMyTurn={isMyTurn} />
      </div>

      <div className={styles.gameControls}>
        <ConnectionStatus status={connectionStatus} />
        <button className={styles.leaveButton} onClick={onBackToLobby}>
          {t('game:backToLobby', 'Back to Lobby')}
        </button>
      </div>
    </header>
  );
}
