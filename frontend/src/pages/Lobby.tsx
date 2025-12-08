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
import { gameSessionCoordinator } from '../services/game-session-coordinator.service';
import { JoinRoomForm } from '../components/JoinRoomForm';
import { NicknameInput } from '../components/NicknameInput';
import { LobbyWelcome } from '../components/lobby/LobbyWelcome';
import { LobbyRoomView } from '../components/lobby/LobbyRoomView';
import { MyRoomsList } from '../components/lobby/MyRoomsList';
import { Tabs } from '../components/Tabs';
import { useRoomSession } from '../hooks/useRoomSession';
import {
  getPlayerNickname,
} from '../utils/storage';
import { allPlayersReady, findPlayerById, isPlayerHost } from '../utils/playerTransformers';
import { fetchActiveRooms as apiFetchActiveRooms, fetchMyRooms as apiFetchMyRooms } from '../services/room.api';
import styles from './Lobby.module.css';

type LobbyMode = 'initial' | 'nickname-for-create' | 'creating' | 'joining' | 'in-room';

export function Lobby() {
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'lobby']);

  // State
  const [mode, setMode] = useState<LobbyMode>('initial');
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | undefined>();
  const [selectedScenario, setSelectedScenario] = useState<string>('scenario-1');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use custom hooks
  const sessionState = useRoomSession();
  const room = sessionState.roomCode ? { roomCode: sessionState.roomCode, status: sessionState.status } : null;
  const players = sessionState.players;

  const [activeRooms, setActiveRooms] = useState([]);
  const [myRooms, setMyRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const fetchActiveRooms = useCallback(async () => {
    setLoadingRooms(true);
    try {
      const rooms = await apiFetchActiveRooms();
      setActiveRooms(rooms);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('[Lobby] Failed to fetch active rooms:', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
        fullError: error,
      });
      setError(`Failed to fetch active rooms: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  const fetchMyRooms = useCallback(async () => {
    try {
      const rooms = await apiFetchMyRooms();
      setMyRooms(rooms);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('[Lobby] Failed to fetch my rooms:', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
        fullError: error,
      });
    }
  }, []);

  useEffect(() => {
    fetchActiveRooms();
    fetchMyRooms();
    const interval = setInterval(fetchActiveRooms, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [fetchActiveRooms, fetchMyRooms]);

  // CENTRALIZED CLEANUP: Reset all session state when arriving at lobby FROM another page
  // Only reset if we're not currently in an active game or lobby
  useEffect(() => {
    const currentStatus = sessionState.status;

    // Don't reset if we're already in lobby or active game
    // This prevents clearing state when navigating back to lobby mid-game
    if (currentStatus === 'disconnected' || currentStatus === 'joining') {
      gameSessionCoordinator.switchGame(); // ✅ Complete atomic operation
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Navigate to game when room status becomes active
  useEffect(() => {
    if (sessionState.status === 'active' && sessionState.roomCode) {
      navigate(`/game/${sessionState.roomCode}`);
    } else if (sessionState.status === 'lobby' && sessionState.roomCode) {
      setMode('in-room');
    }
  }, [sessionState.status, sessionState.roomCode, navigate]);

  // Listen for create game event from header
  useEffect(() => {
    const handleHeaderCreateGame = () => {
      handleCreateRoom();
    };

    window.addEventListener('header-create-game', handleHeaderCreateGame);

    return () => {
      window.removeEventListener('header-create-game', handleHeaderCreateGame);
    };
  }, [handleCreateRoom]);

  const proceedWithRoomCreation = async (playerNickname: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await roomSessionManager.createRoom(playerNickname);
      setMode('creating');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (roomCode: string, playerNickname: string) => {
    // Reset session state before joining different room
    gameSessionCoordinator.switchGame();

    setIsLoading(true);
    setError(null);
    try {
      await roomSessionManager.joinRoom(roomCode, playerNickname);
      setMode('joining');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setIsLoading(false);
    }
  };

  // Room creation flow (T067)
  const handleCreateRoom = () => {
    // Reset session state to allow creating new room
    gameSessionCoordinator.switchGame();

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

  // Quick join from active room list
  const handleQuickJoinRoom = (roomCode: string) => {
    // Reset session state before joining different room
    gameSessionCoordinator.switchGame();

    const storedNickname = getPlayerNickname();
    if (storedNickname) {
      handleJoinRoom(roomCode, storedNickname);
    } else {
      setMode('joining');
    }
  };

  // Character selection (T069) - Updated for persistent characters
  const handleSelectCharacter = (characterId: string) => {
    setSelectedCharacterId(characterId);
    websocketService.selectCharacter(characterId);
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

  // Get disabled character IDs (characters already selected by other players)
  const currentPlayerId = websocketService.getPlayerUUID();
  // TODO: Implement getDisabledCharacterIds when backend supports character ID in player state
  const disabledCharacterIds: string[] = [];

  const currentPlayer = findPlayerById(players, currentPlayerId || '');
  const isCurrentPlayerHost = sessionState.playerRole === 'host' || isPlayerHost(currentPlayer);

  const playersReady = allPlayersReady(players);
  const canStartGame = players.length >= 1 && playersReady;

  const defaultTab = myRooms.length > 0 ? 0 : 1;

  return (
    <div className={styles.lobbyContainer}>
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
            defaultTab={defaultTab}
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
            selectedCharacterId={selectedCharacterId}
            disabledCharacterIds={disabledCharacterIds}
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
