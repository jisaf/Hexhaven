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
import { CampaignsList } from '../components/lobby/CampaignsList';
import { CampaignView } from '../components/lobby/CampaignView';
import { Tabs } from '../components/Tabs';
import { useRoomSession } from '../hooks/useRoomSession';
import { useCharacterSelection } from '../hooks/useCharacterSelection';
import { useAutoSelectCharacters } from '../hooks/useAutoSelectCharacters';
import {
  getPlayerNickname,
  getDisplayName,
  isUserAuthenticated,
} from '../utils/storage';
import { allPlayersReady, findPlayerById, isPlayerHost } from '../utils/playerTransformers';
import { fetchActiveRooms as apiFetchActiveRooms, fetchMyRooms as apiFetchMyRooms } from '../services/room.api';
import styles from './Lobby.module.css';

export function Lobby() {
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'lobby']);

  // Local UI state (derived from sessionState)
  const [selectedScenario, setSelectedScenario] = useState<string>('scenario-1');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null); // Campaign for current room
  const [pendingCampaignCharacters, setPendingCampaignCharacters] = useState<string[]>([]); // Characters to auto-select after room creation
  const [showNicknameInput, setShowNicknameInput] = useState(false); // Show nickname input for room creation
  const [showJoinForm, setShowJoinForm] = useState(false); // Show join form

  // Use custom hooks
  const sessionState = useRoomSession();
  const room = sessionState.roomCode ? { roomCode: sessionState.roomCode, status: sessionState.status } : null;
  const players = sessionState.players;

  // Character selection hook - single source of truth from RoomSessionManager
  const {
    selectedCharacters,
    activeCharacterIndex,
    addCharacter,
    removeCharacter,
    setActiveCharacter,
    disabledCharacterIds,
  } = useCharacterSelection();

  // Auto-select characters from CreateGamePage navigation state (Issue #443 code review)
  useAutoSelectCharacters({
    isReady: sessionState.status === 'lobby' && !!sessionState.roomCode,
    addCharacter,
  });

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
      navigate(`/rooms/${sessionState.roomCode}/play`);
    }
    // Close nickname/join forms when room is established
    if (sessionState.status === 'lobby' && sessionState.roomCode) {
      setShowNicknameInput(false);
      setShowJoinForm(false);
    }
  }, [sessionState.status, sessionState.roomCode, navigate]);

  // Auto-select campaign characters after room creation
  useEffect(() => {
    if (sessionState.status === 'lobby' && sessionState.roomCode && pendingCampaignCharacters.length > 0) {
      console.log('[Lobby] Auto-selecting campaign characters:', pendingCampaignCharacters);
      // Add each character to the selection
      pendingCampaignCharacters.forEach((characterId) => {
        addCharacter(characterId);
      });
      // Clear pending characters
      setPendingCampaignCharacters([]);
      setIsLoading(false);
    }
  }, [sessionState.status, sessionState.roomCode, pendingCampaignCharacters, addCharacter]);

  const proceedWithRoomCreation = async (playerNickname: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await roomSessionManager.createRoom(playerNickname);
      // Room creation will automatically update sessionState and trigger effect to close form
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setIsLoading(false);
    }
  };

  // Listen for create game event from header
  useEffect(() => {
    const handleHeaderCreateGame = () => {
      // Reset session state to allow creating new room
      gameSessionCoordinator.switchGame();

      const displayName = getDisplayName();
      if (displayName) {
        proceedWithRoomCreation(displayName);
      } else {
        setShowNicknameInput(true);
      }
    };

    window.addEventListener('header-create-game', handleHeaderCreateGame);

    return () => {
      window.removeEventListener('header-create-game', handleHeaderCreateGame);
    };
  }, []);

  const handleJoinRoom = async (roomCode: string, playerNickname: string) => {
    // Reset session state before joining different room
    gameSessionCoordinator.switchGame();

    setIsLoading(true);
    setError(null);
    try {
      await roomSessionManager.joinRoom(roomCode, playerNickname);
      // Room join will automatically update sessionState and trigger effect to close form
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setIsLoading(false);
    }
  };

  const handleNicknameSubmit = (submittedNickname: string) => {
    proceedWithRoomCreation(submittedNickname);
  };

  // Quick join from active room list
  const handleQuickJoinRoom = (roomCode: string) => {
    // Reset session state before joining different room
    gameSessionCoordinator.switchGame();

    const displayName = getDisplayName();
    if (displayName) {
      handleJoinRoom(roomCode, displayName);
    } else {
      setShowJoinForm(true);
    }
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

  // Campaign handlers (Issue #244)
  const handleSelectCampaign = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
  };

  const handleBackFromCampaign = () => {
    setSelectedCampaignId(null);
  };

  const handleStartCampaignGame = async (scenarioId: string, campaignId: string, characterIds: string[]) => {
    // Create a room with campaign context - scenario will be pre-selected
    const displayName = getDisplayName();
    if (!displayName) {
      setError('Please set a nickname first');
      return;
    }

    setIsLoading(true);
    try {
      // Store characters to auto-select after room creation
      setPendingCampaignCharacters(characterIds);

      // Create room for campaign game with pre-selected scenario
      await roomSessionManager.createRoom(displayName, {
        campaignId,
        scenarioId,
      });
      // Set the selected scenario and campaign context
      setSelectedScenario(scenarioId);
      setActiveCampaignId(campaignId);
      // The room creation will trigger mode change via useEffect
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start campaign game');
      setIsLoading(false);
      setPendingCampaignCharacters([]); // Clear on error
    }
  };

  // Get current player info
  const currentPlayerId = websocketService.getPlayerUUID();
  const currentPlayer = findPlayerById(players, currentPlayerId || '');
  const isCurrentPlayerHost = sessionState.playerRole === 'host' || isPlayerHost(currentPlayer);

  const playersReady = allPlayersReady(players);
  const canStartGame = players.length >= 1 && playersReady;

  const defaultTab = myRooms.length > 0 ? 0 : 1;

  // Derive what to show from state
  const inRoom = sessionState.status === 'lobby' && sessionState.roomCode;
  const showInitialTabs = !inRoom && !selectedCampaignId && !showNicknameInput && !showJoinForm;
  const showCampaignView = selectedCampaignId && !inRoom;

  return (
    <div className={styles.lobbyContainer}>
      <main className={styles.lobbyContent}>
        {showInitialTabs && (
          <Tabs
            tabs={[
              {
                label: t('myGames', { ns: 'lobby' }),
                content: <MyRoomsList rooms={myRooms} />,
              },
              {
                label: t('campaigns', { ns: 'lobby', defaultValue: 'Campaigns' }),
                content: <CampaignsList onSelectCampaign={handleSelectCampaign} />,
              },
              {
                label: t('activeGames', { ns: 'lobby' }),
                content: (
                  <LobbyWelcome
                    activeRooms={activeRooms}
                    loadingRooms={loadingRooms}
                    isLoading={isLoading}
                    onJoinRoom={() => setShowJoinForm(true)}
                    onQuickJoinRoom={handleQuickJoinRoom}
                  />
                ),
              },
            ]}
            defaultTab={defaultTab}
          />
        )}

        {showCampaignView && selectedCampaignId && (
          <CampaignView
            campaignId={selectedCampaignId}
            onBack={handleBackFromCampaign}
            onStartGame={handleStartCampaignGame}
          />
        )}

        {showNicknameInput && (
          <div className={styles.nicknameMode}>
            <button
              className={styles.backButton}
              onClick={() => {
                setShowNicknameInput(false);
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
                onCancel={() => setShowNicknameInput(false)}
                isLoading={isLoading}
                error={error || undefined}
                initialValue={getPlayerNickname() || ''}
                showCancel={true}
              />
            </div>
          </div>
        )}

        {showJoinForm && !room && (
          <div className={styles.joinMode}>
            <button
              className={styles.backButton}
              onClick={() => {
                setShowJoinForm(false);
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
                initialNickname={getDisplayName() || ''}
                isAuthenticated={isUserAuthenticated()}
              />
            </div>
          </div>
        )}

        {inRoom && room && (
          <LobbyRoomView
            roomCode={room.roomCode}
            players={players}
            currentPlayerId={currentPlayerId || undefined}
            isHost={isCurrentPlayerHost}
            selectedCharacters={selectedCharacters}
            disabledCharacterIds={disabledCharacterIds}
            activeCharacterIndex={activeCharacterIndex}
            selectedScenario={selectedScenario}
            canStartGame={canStartGame}
            allPlayersReady={playersReady}
            error={error}
            campaignId={activeCampaignId}
            onAddCharacter={addCharacter}
            onRemoveCharacter={(index: number) => {
              // Convert index-based to ID-based removal
              const char = selectedCharacters[index];
              if (char) removeCharacter(char.id);
            }}
            onSetActiveCharacter={(index: number) => {
              // Convert index-based to ID-based set active
              const char = selectedCharacters[index];
              if (char) setActiveCharacter(char.id);
            }}
            onSelectScenario={handleSelectScenario}
            onStartGame={handleStartGame}
          />
        )}

        {error && !showJoinForm && (
          <div className={styles.errorBanner} role="alert">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}
