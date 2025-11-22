/**
 * LobbyWelcome Component
 *
 * Displays the initial lobby screen with create/join options and active games list.
 */

import { useTranslation } from 'react-i18next';
import type { ActiveRoom } from '../../hooks/useRoomManagement';
import { ActiveRoomsList } from './ActiveRoomsList';
import styles from './LobbyWelcome.module.css';

interface LobbyWelcomeProps {
  myRoom: ActiveRoom | null;
  activeRooms: ActiveRoom[];
  loadingRooms: boolean;
  isLoading: boolean;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onRejoinMyRoom: () => void;
  onQuickJoinRoom: (roomCode: string) => void;
}

export function LobbyWelcome({
  myRoom,
  activeRooms,
  loadingRooms,
  isLoading,
  onCreateRoom,
  onJoinRoom,
  onRejoinMyRoom,
  onQuickJoinRoom,
}: LobbyWelcomeProps) {
  const { t } = useTranslation();

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
