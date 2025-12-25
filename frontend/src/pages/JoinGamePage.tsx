/**
 * Join Game Page Component (Issue #312)
 *
 * Standalone page for joining a game room:
 * - Room code input (pre-filled if URL param provided)
 * - Nickname input (pre-filled for authenticated users)
 * - Join button
 * - Navigation to Room Lobby on success
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { JoinRoomForm } from '../components/JoinRoomForm';
import { roomSessionManager } from '../services/room-session.service';
import { useRoomSession } from '../hooks/useRoomSession';
import {
  getDisplayName,
  isUserAuthenticated,
  saveLastRoomCode,
} from '../utils/storage';
import styles from './JoinGamePage.module.css';

export const JoinGamePage: React.FC = () => {
  const { roomCode: urlRoomCode } = useParams<{ roomCode?: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'lobby']);
  const sessionState = useRoomSession();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get initial values
  const displayName = getDisplayName() || '';
  const isAuthenticated = isUserAuthenticated();

  // Handle join submission
  const handleJoin = async (roomCode: string, nickname: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Save room code for ensureJoined
      saveLastRoomCode(roomCode);

      // Join the room
      await roomSessionManager.joinRoom(roomCode, nickname);
    } catch (err) {
      console.error('Failed to join room:', err);
      setError(err instanceof Error ? err.message : 'Failed to join room');
      setIsLoading(false);
    }
  };

  // Navigate to room lobby when successfully joined
  useEffect(() => {
    if (sessionState.connectionStatus === 'connected' && sessionState.roomCode) {
      // Joined successfully - navigate to room lobby or game
      if (sessionState.isGameActive) {
        navigate(`/rooms/${sessionState.roomCode}/play`);
      } else {
        navigate(`/rooms/${sessionState.roomCode}`);
      }
    }
  }, [sessionState.connectionStatus, sessionState.roomCode, sessionState.isGameActive, navigate]);

  // Handle session errors
  useEffect(() => {
    if (sessionState.error) {
      setError(sessionState.error.message);
      setIsLoading(false);
    }
  }, [sessionState.error]);

  return (
    <div className={styles.joinGameContainer}>
      <div className={styles.joinGameContent}>
        {/* Header */}
        <div className={styles.header}>
          <button
            className={styles.backButton}
            onClick={() => navigate(-1)}
            aria-label={t('common:back', 'Back')}
          >
            ← {t('common:back', 'Back')}
          </button>
          <h1 className={styles.title}>{t('lobby:joinGame', 'Join Game')}</h1>
        </div>

        {/* Join Form */}
        <div className={styles.formContainer}>
          <p className={styles.instructions}>
            {t('lobby:joinInstructions', 'Enter the 6-character room code to join a game.')}
          </p>

          <JoinRoomForm
            onSubmit={handleJoin}
            isLoading={isLoading}
            error={error || undefined}
            initialNickname={displayName}
            isAuthenticated={isAuthenticated}
          />

          {/* Pre-filled room code indicator */}
          {urlRoomCode && (
            <div className={styles.prefillNotice}>
              {t('lobby:roomCodePrefilled', 'Room code pre-filled from invite link')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
