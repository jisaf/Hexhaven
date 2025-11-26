/**
 * LobbyWelcome Component
 *
 * Displays the initial lobby screen with create/join options and active games list.
 */

import { useTranslation } from 'react-i18next';
import { ActiveRoomsList, type ActiveRoom } from './ActiveRoomsList';
import styles from './LobbyWelcome.module.css';

interface LobbyWelcomeProps {
  activeRooms: ActiveRoom[];
  loadingRooms: boolean;
  isLoading: boolean;
  onJoinRoom: () => void;
  onQuickJoinRoom: (roomCode: string) => void;
}

export function LobbyWelcome({
  activeRooms,
  loadingRooms,
  isLoading,
  onJoinRoom,
  onQuickJoinRoom,
}: LobbyWelcomeProps) {
  const { t } = useTranslation('lobby');

  return (
    <div className={styles.initialMode}>
      <ActiveRoomsList
        rooms={activeRooms}
        loading={loadingRooms}
        onJoinRoom={onQuickJoinRoom}
        isLoading={isLoading}
      />

      <div className={styles.joinRoomContainer}>
        <button className={styles.joinButton} onClick={onJoinRoom}>
          {t('joinRoom', 'Join with Room Code')}
        </button>
      </div>
    </div>
  );
}
