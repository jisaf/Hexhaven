/**
 * RoomCodeDisplay Component
 *
 * Displays the room code with a copy-to-clipboard button.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './RoomCodeDisplay.module.css';

interface RoomCodeDisplayProps {
  roomCode: string;
  isHost: boolean;
}

export function RoomCodeDisplay({ roomCode, isHost }: RoomCodeDisplayProps) {
  const { t } = useTranslation();
  const [showCopied, setShowCopied] = useState(false);

  const handleCopyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy room code:', err);
    }
  };

  return (
    <div className={styles.roomHeader}>
      <div className={styles.roomCodeSection}>
        <h2>
          {t('roomCode', 'Room Code')}: <span className={styles.roomCode} data-testid="room-code">{roomCode}</span>
        </h2>
        <div className={styles.copyArea}>
          <button
            className={styles.copyButton}
            onClick={handleCopyRoomCode}
            data-testid="copy-room-code"
            aria-label={t('copyRoomCode', 'Copy room code')}
          >
            📋 {t('copy', 'Copy')}
          </button>
          {showCopied && (
            <span className={styles.copiedMessage}>
              {t('copied', 'Copied!')}
            </span>
          )}
        </div>
      </div>
      {isHost && (
        <span className={styles.hostIndicator} data-testid="host-indicator">
          👑 {t('youAreHost', 'You are the host')}
        </span>
      )}
    </div>
  );
}
