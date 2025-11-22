/**
 * LobbyWelcome Component
 *
 * Displays the initial lobby screen with create/join options and active games list.
 */

import { useTranslation } from 'react-i18next';
import type { ActiveRoom } from '../../hooks/useRoomManagement';
import { MyRoomCard } from './MyRoomCard';
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
      {/* Your Active Game Section */}
      {myRoom && myRoom.roomCode && (
        <MyRoomCard
          room={myRoom}
          onRejoin={onRejoinMyRoom}
          isLoading={isLoading}
        />
      )}

      <div className={styles.buttonGroup}>
        <button
          className={styles.primaryButton}
          onClick={onCreateRoom}
          disabled={isLoading}
        >
          {isLoading
            ? t('creating', 'Creating...')
            : t('createRoom', 'Create Game')}
        </button>

        <div className={styles.divider}>
          <span>{t('or', 'or')}</span>
        </div>

        <button
          className={styles.secondaryButton}
          onClick={onJoinRoom}
        >
          {t('joinRoom', 'Join with Room Code')}
        </button>
      </div>

      {/* Active Games List */}
      <ActiveRoomsList
        rooms={activeRooms}
        loading={loadingRooms}
        onJoinRoom={onQuickJoinRoom}
        isLoading={isLoading}
      />
    </div>
  );
}
