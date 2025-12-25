/**
 * Home Page Component (Issue #309)
 *
 * Landing page with quick actions for game navigation:
 * - Create Game
 * - Join Game
 * - My Games
 * - Campaigns
 * - Continue Last Game (if active session exists)
 */

import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getLastRoomCode, getLastGameActive } from '../utils/storage';
import styles from './HomePage.module.css';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('home');
  const lastRoomCode = getLastRoomCode();
  const lastGameActive = getLastGameActive();

  return (
    <div className={styles.homeContainer}>
      <div className={styles.homeContent}>
        {/* Hero Section */}
        <div className={styles.hero}>
          <h1 className={styles.title}>HexHaven</h1>
          <p className={styles.subtitle}>
            {t('subtitle', 'Tactical Multiplayer Board Game')}
          </p>
        </div>

        {/* Continue Last Game - Only show if there's an active session */}
        {lastRoomCode && (
          <div className={styles.continueSection}>
            <button
              className={styles.continueButton}
              onClick={() => navigate(
                lastGameActive
                  ? `/rooms/${lastRoomCode}/play`
                  : `/rooms/${lastRoomCode}`
              )}
            >
              {t(lastGameActive ? 'continueGame' : 'returnToLobby', lastGameActive ? 'Continue Last Game' : 'Return to Lobby')}
              <span className={styles.roomCode}>{lastRoomCode}</span>
            </button>
          </div>
        )}

        {/* Quick Actions */}
        <div className={styles.actionsGrid}>
          <button
            className={`${styles.actionCard} ${styles.primary}`}
            onClick={() => navigate('/games/create')}
          >
            <div className={styles.actionIcon}>⚔️</div>
            <div className={styles.actionLabel}>
              {t('createGame', 'Create Game')}
            </div>
            <div className={styles.actionDescription}>
              {t('createGameDesc', 'Start a new game session')}
            </div>
          </button>

          <button
            className={styles.actionCard}
            onClick={() => navigate('/games/join')}
          >
            <div className={styles.actionIcon}>🎯</div>
            <div className={styles.actionLabel}>
              {t('joinGame', 'Join Game')}
            </div>
            <div className={styles.actionDescription}>
              {t('joinGameDesc', 'Enter a room code to join')}
            </div>
          </button>

          <button
            className={styles.actionCard}
            onClick={() => navigate('/games')}
          >
            <div className={styles.actionIcon}>📜</div>
            <div className={styles.actionLabel}>
              {t('myGames', 'My Games')}
            </div>
            <div className={styles.actionDescription}>
              {t('myGamesDesc', 'View your active games')}
            </div>
          </button>

          <button
            className={styles.actionCard}
            onClick={() => navigate('/campaigns')}
          >
            <div className={styles.actionIcon}>🗺️</div>
            <div className={styles.actionLabel}>
              {t('campaigns', 'Campaigns')}
            </div>
            <div className={styles.actionDescription}>
              {t('campaignsDesc', 'Continue your adventures')}
            </div>
          </button>
        </div>

        {/* Quick Links */}
        <div className={styles.quickLinks}>
          <button
            className={styles.linkButton}
            onClick={() => navigate('/characters')}
          >
            {t('manageCharacters', 'Manage Characters')}
          </button>
          <button
            className={styles.linkButton}
            onClick={() => navigate('/history')}
          >
            {t('matchHistory', 'Match History')}
          </button>
        </div>
      </div>
    </div>
  );
};
