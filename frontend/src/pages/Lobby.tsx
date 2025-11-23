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
import { JoinRoomForm } from '../components/JoinRoomForm';
import { NicknameInput } from '../components/NicknameInput';
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
  const { t } = useTranslation(['common', 'lobby']);

  // State
  const [mode, setMode] = useState<LobbyMode>('initial');
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterClass | undefined>();
  const [selectedScenario, setSelectedScenario] = useState<string>('scenario-1');
  const [activeTab, setActiveTab] = useState(1);

  // Use custom hooks
  const { activeRooms, loadingRooms, myRooms, isLoading, error, createRoom, joinRoom, setError } = useRoomManagement({ mode });
  const sessionState = useRoomSession();

  // Update active tab based on myRooms
  useEffect(() => {
    if (myRooms.length > 0) {
      setActiveTab(0);
    } else {
      setActiveTab(1);
    }
  }, [myRooms]);

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

  // Character selection (T069)
  const handleSelectCharacter = (characterClass: CharacterClass) => {
    setSelectedCharacter(characterClass);
    websocketService.selectCharacter(characterClass);
  };

  // Scenario selection (US5 - T179)
  const handleSelectScenario = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    websocketService.selectScenario(scenarioId);
  };

  // Game start (T070 - host only)
  const handleStartGame = () => {
    if (!isCurrentPlayerHost) {
      return;
    }

    if (players.length < 1) {
      setError(t('needAtLeastOnePlayer', { ns: 'lobby' }));
      return;
    }

    websocketService.startGame(selectedScenario);
  };

  // Get disabled character classes using utility
  const disabledClasses = getDisabledCharacterClasses(players, currentPlayerId);

  // Check if current player is host - use state or check players array
  const currentPlayer = findPlayerById(players, currentPlayerId || '');
  const isCurrentPlayerHost = isHost || isPlayerHost(currentPlayer);

  const playersReady = allPlayersReady(players);
  const canStartGame = players.length >= 1 && playersReady;

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
            onTabChange={setActiveTab}
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
              ← {t('back')}
            </button>

            <div className={styles.nicknameContent}>
              <h2>{t('enterNicknameTitle', { ns: 'lobby' })}</h2>
              <p className={styles.nicknameInstruction}>
                {t('nicknameInstruction', { ns: 'lobby' })}
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
            selectedScenario={selectedScenario}
            canStartGame={canStartGame}
            allPlayersReady={playersReady}
            error={error}
            onSelectCharacter={handleSelectCharacter}
            onSelectScenario={handleSelectScenario}
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
