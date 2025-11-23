/**
 * ActiveRoomsList Component
 *
 * Displays a list of active game rooms that users can join.
 */

import { useTranslation } from 'react-i18next';
import type { ActiveRoom } from '../../hooks/useRoomManagement';
import styles from './ActiveRoomsList.module.css';

interface ActiveRoomsListProps {
  rooms: ActiveRoom[];
  loading: boolean;
  onJoinRoom: (roomCode: string) => void;
  isLoading: boolean;
}

export function ActiveRoomsList({ rooms, loading, onJoinRoom, isLoading }: ActiveRoomsListProps) {
  const { t } = useTranslation('lobby');

  if (loading && rooms.length === 0) {
    return (
      <div className={styles.activeGamesSection}>
        <h2 className={styles.activeGamesTitle}>
          {t('activeGames', 'Active Games')}
        </h2>
        <div className={styles.loadingRooms}>
          <p>{t('loadingRooms', 'Loading available games...')}</p>
        </div>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className={styles.activeGamesSection}>
        <h2 className={styles.activeGamesTitle}>
          {t('activeGames', 'Active Games')}
        </h2>
        <div className={styles.noRooms}>
          <p>{t('noActiveGames', 'No active games available. Create one!')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.activeGamesSection}>
      <h2 className={styles.activeGamesTitle}>
        {t('activeGames', 'Active Games')}
      </h2>
      <div className={styles.roomsList}>
        {rooms.map((room) => (
          <div key={room.roomCode} className={styles.roomCard}>
            <div className={styles.roomCardHeader}>
              <span className={styles.roomCardCode}>{room.roomCode}</span>
              <span className={styles.roomCardPlayers}>
                {room.playerCount}/{room.maxPlayers} {t('players', 'Players')}
              </span>
            </div>
            <div className={styles.roomCardInfo}>
              <span className={styles.roomCardHost}>
                👑 {room.hostNickname}
              </span>
              <span className={styles.roomCardStatus}>
                {t('waitingInLobby', 'Waiting in Lobby')}
              </span>
            </div>
            <button
              className={styles.roomCardJoinButton}
              onClick={() => onJoinRoom(room.roomCode)}
              disabled={isLoading}
            >
              {t('join', 'Join')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
