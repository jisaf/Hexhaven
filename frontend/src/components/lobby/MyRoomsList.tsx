/**
 * MyRoomsList Component
 *
 * Displays all game rooms the current player has joined.
 * Supports multi-game join feature - users can be in multiple rooms simultaneously.
 */

import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './MyRoomsList.module.css';

export interface RoomWithPlayers {
  room: {
    id: string;
    roomCode: string;
    status: string;
    scenarioId?: string;
    playerCount: number;
    createdAt: string;
    updatedAt: string;
    expiresAt: string;
  };
  players: {
    id: string;
    uuid: string;
    nickname: string;
    isHost: boolean;
    characterClass?: string;
    connectionStatus: string;
  }[];
}

interface MyRoomsListProps {
  rooms: RoomWithPlayers[];
}

export function MyRoomsList({ rooms }: MyRoomsListProps) {
  const { t } = useTranslation('lobby');
  const navigate = useNavigate();

  const handleJoinGame = (roomCode: string) => {
    navigate(`/game/${roomCode}`);
  };

  return (
    <div className={styles.myRoomsList}>
      <h2 className={styles.title}>{t('myGames', 'My Games')}</h2>
      {rooms.length === 0 ? (
        <div className={styles.noRooms}>
          <p>{t('noGames', 'You have not joined any games yet.')}</p>
        </div>
      ) : (
        <div className={styles.roomsGrid}>
          {rooms.map(({ room, players }) => {
            const isHost = players.find((p: { isHost: boolean; }) => p.isHost)?.nickname;
            const statusClass = room.status === 'active' ? styles.active : styles.lobby;

            return (
              <div key={room.roomCode} className={`${styles.roomCard} ${statusClass}`}>
                <div className={styles.roomHeader}>
                  <span className={styles.roomCode}>{room.roomCode}</span>
                  <span className={styles.roomStatus}>
                    {room.status === 'active' ? t('inProgress', 'In Progress') : t('inLobby', 'In Lobby')}
                  </span>
                </div>
                <div className={styles.roomInfo}>
                  <span className={styles.playerCount}>
                    {t('players', 'Players')}: {room.playerCount}/4
                  </span>
                  <span className={styles.host}>
                    {t('host', 'Host')}: {isHost}
                  </span>
                </div>
                <button
                  className={styles.joinButton}
                  onClick={() => handleJoinGame(room.roomCode)}
                >
                  {room.status === 'active' ? t('resume', 'Resume Game') : t('viewLobby', 'View Lobby')}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
