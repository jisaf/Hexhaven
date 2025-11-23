/**
 * Lobby Page Component
 *
 * Main lobby interface where players:
 * - Create or join game rooms
 * - See other players in the room
 * - Select characters
 * - Start the game (host only)
 *
 * Implements:
 * - T056: Create Lobby page component
 * - T067: Room creation flow
 * - T068: Room join flow
 * - T069: Character selection UI
 * - T070: Game start button (host only)
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { roomSessionManager } from '../services/room-session.service';
import { JoinRoomForm } from '../components/JoinRoomForm';
import { NicknameInput } from '../components/NicknameInput';
import type { Player } from '../components/PlayerList';
import type { CharacterClass } from '../components/CharacterSelect';
import { DebugConsole } from '../components/DebugConsole';
import { LobbyHeader } from '../components/lobby/LobbyHeader';
import { LobbyWelcome } from '../components/lobby/LobbyWelcome';
import { MyRoomsList } from '../components/lobby/MyRoomsList';
import { Tabs } from '../components/Tabs';
import { useLobbyWebSocket } from '../hooks/useLobbyWebSocket';
import { useRoomManagement } from '../hooks/useRoomManagement';
import { getPlayerUUID, getPlayerNickname } from '../utils/storage';
import styles from './Lobby.module.css';

type LobbyMode = 'initial' | 'nickname-for-create' | 'creating' | 'joining' | 'in-room';

interface GameRoom {
  roomCode: string;
  status: 'lobby' | 'active' | 'completed' | 'abandoned';
}

interface RoomJoinedEventData {
  roomCode: string;
  roomStatus: 'lobby' | 'active' | 'completed' | 'abandoned';
  players: Player[];
  playerId?: string;
  isHost?: boolean;
}

export function Lobby() {
  const navigate = useNavigate();
  const { t } = useTranslation('lobby');

  // State
  const [mode, setMode] = useState<LobbyMode>('initial');
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [, setPlayers] = useState<Player[]>([]);
  const [, setCurrentPlayerId] = useState<string | null>(null);
  const [, setIsHost] = useState(false);

  // Use custom hooks
  const { activeRooms, loadingRooms, myRooms, isLoading, error, createRoom, joinRoom, setError } = useRoomManagement({ mode });

  // CENTRALIZED CLEANUP: Reset room session when arriving at lobby
  // This handles ALL navigation methods: back button, direct URL, "Back to Lobby" button, etc.
  useEffect(() => {
    console.log('[Lobby] Component mounted - resetting room session for clean state');
    roomSessionManager.switchRoom();
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navigate to game room when a room is joined or created
  useEffect(() => {
    if (mode === 'in-room' && room?.roomCode) {
      navigate(`/room/${room.roomCode}`);
    }
  }, [mode, room, navigate]);

  // WebSocket event handlers
  const handleRoomJoined = useCallback((data: RoomJoinedEventData) => {
    setRoom({ roomCode: data.roomCode, status: data.roomStatus });
    setPlayers(data.players);

    // Get current player ID from localStorage UUID
    const uuid = getPlayerUUID();
    if (uuid) {
      setCurrentPlayerId(uuid);

      // Find if this player is the host
      const currentPlayer = data.players.find((p: Player) => p.id === uuid);
      if (currentPlayer) {
        setIsHost(currentPlayer.isHost);
      }
    }

    if (data.roomStatus !== 'active') {
      setMode('in-room');
    }
  }, []);

  const handlePlayerJoined = useCallback((player: Player) => {
    setPlayers((prev) => [...prev, player]);
  }, []);

  const handlePlayerLeft = useCallback((playerId: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
  }, []);

  const handleCharacterSelected = useCallback((playerId: string, characterClass: CharacterClass) => {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === playerId
          ? { ...p, characterClass, isReady: true }
          : p
      )
    );
  }, []);

  const handleWebSocketError = useCallback((message: string) => {
    setError(message);
  }, [setError]);

  // Setup WebSocket listeners
  useLobbyWebSocket({
    onRoomJoined: handleRoomJoined,
    onPlayerJoined: handlePlayerJoined,
    onPlayerLeft: handlePlayerLeft,
    onCharacterSelected: handleCharacterSelected,
    onError: handleWebSocketError,
  });

  // Room creation flow (T067)
  const handleCreateRoom = () => {
    const storedNickname = getPlayerNickname();
    if (storedNickname) {
      proceedWithRoomCreation(storedNickname);
    } else {
      setMode('nickname-for-create');
    }
  };

  const handleNicknameSubmit = (submittedNickname: string) => {
    proceedWithRoomCreation(submittedNickname);
  };

  const proceedWithRoomCreation = async (playerNickname: string) => {
    try {
      await createRoom(playerNickname);
      setMode('creating');
    } catch (err) {
      console.error('Room creation error:', err);
    }
  };

  // Room join flow (T068)
  const handleJoinRoom = async (roomCode: string, playerNickname: string) => {
    try {
      await joinRoom(roomCode, playerNickname);
      setMode('joining');
    } catch (err) {
      console.error('Room join error:', err);
    }
  };

  // Quick join from active room list
  const handleQuickJoinRoom = (roomCode: string) => {
    const storedNickname = getPlayerNickname();
    if (storedNickname) {
      handleJoinRoom(roomCode, storedNickname);
    } else {
      setMode('joining');
    }
  };

  return (
    <div className={styles.lobbyPage}>
      <DebugConsole />
      <LobbyHeader playerNickname={getPlayerNickname()} onCreateRoom={handleCreateRoom} />

      <main className={styles.lobbyContent}>
        {mode === 'initial' && (
          <Tabs
            tabs={[
              {
                label: t('myGames', 'My Games'),
                content: <MyRoomsList rooms={myRooms} />,
              },
              {
                label: t('activeGames', 'Active Games'),
                content: (
                  <LobbyWelcome
                    activeRooms={activeRooms}
                    loadingRooms={loadingRooms}
                    isLoading={isLoading}
                    onJoinRoom={() => setMode('joining')}
                    onQuickJoinRoom={handleQuickJoinRoom}
                  />
                ),
              },
            ]}
            defaultTab={myRooms.length > 0 ? 0 : 1}
          />
        )}

        {mode === 'nickname-for-create' && (
          <div className={styles.nicknameMode}>
            <button
              className={styles.backButton}
              onClick={() => {
                setMode('initial');
                setError(null);
              }}
            >
              ← {t('back', 'Back')}
            </button>

            <div className={styles.nicknameContent}>
              <h2>{t('enterNicknameTitle', 'Enter Your Nickname')}</h2>
              <p className={styles.nicknameInstruction}>
                {t('nicknameInstruction', 'Choose a nickname for this game')}
              </p>

              <NicknameInput
                onSubmit={handleNicknameSubmit}
                onCancel={() => setMode('initial')}
                isLoading={isLoading}
                error={error || undefined}
                initialValue={getPlayerNickname() || ''}
                showCancel={true}
              />
            </div>
          </div>
        )}

        {mode === 'joining' && !room && (
          <div className={styles.joinMode}>
            <button
              className={styles.backButton}
              onClick={() => {
                setMode('initial');
                setError(null);
              }}
            >
              ← {t('back', 'Back')}
            </button>

            <div className={styles.joinContent}>
              <h2>{t('joinGameTitle', 'Join a Game')}</h2>
              <p className={styles.joinInstruction}>
                {t('enterJoinDetails', 'Enter the room code and your nickname')}
              </p>

              <JoinRoomForm
                onSubmit={handleJoinRoom}
                isLoading={isLoading}
                error={error || undefined}
                initialNickname={getPlayerNickname() || ''}
              />
            </div>
          </div>
        )}

        {error && mode !== 'joining' && (
          <div className={styles.errorBanner} role="alert">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}
