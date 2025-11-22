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
}

export function LobbyHeader({ playerNickname }: LobbyHeaderProps) {
  const { t } = useTranslation();

  return (
    <header className={styles.lobbyHeader}>
      <div className={styles.headerTop}>
        <h1>{t('title', 'Hexhaven Multiplayer')}</h1>
        <LanguageSelector className="header-language-selector" />
      </div>
      {playerNickname && (
        <p className={styles.welcomeMessage}>
          {t('welcome', 'Welcome')}, <strong>{playerNickname}</strong>
        </p>
      )}
    </header>
  );
}
