/**
 * LobbyHeader Component
 *
 * Displays the lobby page header with title, language selector, and welcome message.
 */

import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '../LanguageSelector';
import styles from './LobbyHeader.module.css';

interface LobbyHeaderProps {
  playerNickname?: string | null;
  onCreateRoom: () => void;
}

export function LobbyHeader({ playerNickname, onCreateRoom }: LobbyHeaderProps) {
  const { t } = useTranslation('lobby');

  return (
    <header className={styles.lobbyHeader}>
      <div className={styles.headerContent}>
        <div className={styles.titleContainer}>
          <h1>{t('title', 'Hexhaven')}</h1>
          {playerNickname && (
            <p className={styles.welcomeMessage}>
              {t('welcome', 'Welcome')}, <strong>{playerNickname}</strong>
            </p>
          )}
        </div>
        <div className={styles.actionsContainer}>
          <button
            className={styles.createRoomButton}
            onClick={onCreateRoom}
            aria-label={t('createGame', 'Create Game')}
            data-testid="create-room-button"
          >
            +
          </button>
          <LanguageSelector className="header-language-selector" />
        </div>
      </div>
    </header>
  );
}
