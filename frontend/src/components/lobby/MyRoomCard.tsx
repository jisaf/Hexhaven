/**
 * MyRoomCard Component
 *
 * Displays the user's active game room card with rejoin option.
 */

import { useTranslation } from 'react-i18next';
import type { ActiveRoom } from '../../hooks/useRoomManagement';
import styles from './MyRoomCard.module.css';

interface MyRoomCardProps {
  room: ActiveRoom;
  onRejoin: () => void;
  isLoading: boolean;
}

export function MyRoomCard({ room, onRejoin, isLoading }: MyRoomCardProps) {
  const { t } = useTranslation();

  const getStatusText = (status: string) => {
    switch (status) {
      case 'lobby':
        return t('waitingToStart', 'Waiting to Start');
      case 'active':
        return t('inProgress', 'In Progress');
      case 'completed':
        return t('completed', 'Completed');
      case 'abandoned':
        return t('abandoned', 'Abandoned');
      default:
        return status;
    }
  };

  return (
    <div className={styles.myRoomSection}>
      <h2 className={styles.myRoomTitle}>
        {t('yourActiveGame', 'Your Active Game')}
      </h2>
      <div className={styles.myRoomCard}>
        <div className={styles.myRoomHeader}>
          <span className={styles.myRoomCode}>{room.roomCode}</span>
          <span className={styles.myRoomStatus}>
            {getStatusText(room.status)}
          </span>
        </div>
        <div className={styles.myRoomInfo}>
          <span className={styles.myRoomPlayers}>
            {room.playerCount}/{room.maxPlayers} {t('players', 'Players')}
          </span>
          <span className={styles.myRoomHost}>
            👑 {room.hostNickname}
          </span>
        </div>
        <button
          className={styles.myRoomRejoinButton}
          onClick={onRejoin}
          disabled={isLoading}
        >
          {isLoading
            ? t('rejoining', 'Rejoining...')
            : t('rejoinGame', 'Rejoin Game')}
        </button>
      </div>
    </div>
  );
}
