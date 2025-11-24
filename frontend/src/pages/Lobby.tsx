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
import { websocketService } from '../services/websocket.service';
import { roomSessionManager } from '../services/room-session.service';
import { JoinRoomForm } from '../components/JoinRoomForm';
import type { Player } from '../components/PlayerList';
import type { CharacterClass } from '../components/CharacterSelect';
import { DebugConsole } from '../components/DebugConsole';
import { LobbyHeader } from '../components/lobby/LobbyHeader';
import { LobbyWelcome } from '../components/lobby/LobbyWelcome';
import { LobbyRoomView } from '../components/lobby/LobbyRoomView';
import { MyRoomsList } from '../components/lobby/MyRoomsList';
import { Tabs } from '../components/Tabs';
import { useLobbyWebSocket } from '../hooks/useLobbyWebSocket';
import { useRoomManagement } from '../hooks/useRoomManagement';
import { useRoomSession } from '../hooks/useRoomSession';
import { getPlayerUUID, getPlayerNickname } from '../utils/storage';
import { getDisabledCharacterClasses, allPlayersReady, findPlayerById, isPlayerHost } from '../utils/playerTransformers';
import styles from './Lobby.module.css';

type LobbyMode = 'initial' | 'creating' | 'joining' | 'in-room';

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
  const { t } = useTranslation(['common', 'lobby']);

  // State
  const [mode, setMode] = useState<LobbyMode>('initial');
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterClass | undefined>();

  // Use custom hooks
  const { activeRooms, loadingRooms, myRooms, isLoading, error, joinRoom, setError } = useRoomManagement({ mode });
  const sessionState = useRoomSession();

  // CENTRALIZED CLEANUP: Reset room session when arriving at lobby
  // This handles ALL navigation methods: back button, direct URL, "Back to Lobby" button, etc.
  useEffect(() => {
    console.log('[Lobby] Component mounted - resetting room session for clean state');
    roomSessionManager.switchRoom();
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navigate to game when room status becomes active (only when creating/joining)
  useEffect(() => {
    if (sessionState.status === 'active' && sessionState.roomCode && mode !== 'initial') {
      console.log(`[Lobby] Game started, navigating to /game/${sessionState.roomCode}`);
      navigate(`/game/${sessionState.roomCode}`);
    }
  }, [sessionState.status, sessionState.roomCode, mode, navigate]);

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

    if (playerId === currentPlayerId) {
      setSelectedCharacter(characterClass);
    }
  }, [currentPlayerId]);

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

  const handleSelectCharacter = (characterClass: CharacterClass) => {
    websocketService.selectCharacter(characterClass);
  };

  // Room creation flow (T067)
  const handleCreateRoom = () => {
    navigate('/new-game');
  };

  const handleStartGame = () => {
    if (isCurrentPlayerHost) {
      websocketService.emit('start_game', {});
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


  // Get disabled character classes using utility
  const disabledClasses = getDisabledCharacterClasses(players, currentPlayerId);

  // Check if current player is host - use state or check players array
  const currentPlayer = findPlayerById(players, currentPlayerId || '');
  const isCurrentPlayerHost = isHost || isPlayerHost(currentPlayer);

  const playersReady = allPlayersReady(players);
  const canStartGame = players.length >= 1 && playersReady;

  const activeTab = myRooms.length > 0 ? 0 : 1;

  return (
    <div className={styles.lobbyPage}>
      <DebugConsole />
      <LobbyHeader playerNickname={getPlayerNickname()} onCreateRoom={handleCreateRoom} />

      <main className={styles.lobbyContent}>
        {mode === 'initial' && (
          <Tabs
            tabs={[
              {
                label: t('myGames', { ns: 'lobby' }),
                content: <MyRoomsList rooms={myRooms} />,
              },
              {
                label: t('activeGames', { ns: 'lobby' }),
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
            activeTab={activeTab}
          />
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
              ← {t('back')}
            </button>

            <div className={styles.joinContent}>
              <h2>{t('joinGameTitle', { ns: 'lobby' })}</h2>
              <p className={styles.joinInstruction}>
                {t('enterJoinDetails', { ns: 'lobby' })}
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

        {mode === 'in-room' && room && (
          <LobbyRoomView
            roomCode={room.roomCode}
            players={players}
            currentPlayerId={currentPlayerId || undefined}
            isHost={isCurrentPlayerHost}
            selectedCharacter={selectedCharacter}
            disabledClasses={disabledClasses}
            canStartGame={canStartGame}
            allPlayersReady={playersReady}
            error={error}
            onSelectCharacter={handleSelectCharacter}
            onStartGame={handleStartGame}
          />
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
