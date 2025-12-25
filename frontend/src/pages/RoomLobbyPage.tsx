/**
 * Room Lobby Page Component (Issue #313)
 *
 * Standalone room lobby page showing:
 * - Room code and share link
 * - Player list
 * - Character selection
 * - Scenario selection (host only, non-campaign)
 * - Start game button (host only)
 *
 * Supports:
 * - Character pre-selection from Create Game flow
 * - Page refresh via ensureJoined()
 * - Campaign mode context
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { websocketService } from '../services/websocket.service';
import { roomSessionManager } from '../services/room-session.service';
import { gameSessionCoordinator } from '../services/game-session-coordinator.service';
import { LobbyRoomView } from '../components/lobby/LobbyRoomView';
import { useRoomSession } from '../hooks/useRoomSession';
import { useCharacterSelection } from '../hooks/useCharacterSelection';
import { getDisplayName, saveLastRoomCode } from '../utils/storage';
import { allPlayersReady, findPlayerById, isPlayerHost } from '../utils/playerTransformers';
import styles from './RoomLobbyPage.module.css';

export const RoomLobbyPage: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'lobby']);

  // Session state
  const sessionState = useRoomSession();
  const players = sessionState.players;

  // Local state
  const [selectedScenario, setSelectedScenario] = useState<string>(
    sessionState.scenarioId || 'scenario-1'
  );
  const [error, setError] = useState<string | null>(null);
  const [isRejoining, setIsRejoining] = useState(false);

  // Character selection hook
  const {
    selectedCharacters,
    activeCharacterIndex,
    addCharacter,
    removeCharacter,
    setActiveCharacter,
    disabledCharacterIds,
  } = useCharacterSelection();

  // Ensure joined on mount/refresh
  useEffect(() => {
    const ensureRoomConnection = async () => {
      // Already connected to this room
      if (sessionState.connectionStatus === 'connected' && sessionState.roomCode === roomCode) {
        return;
      }

      // Trying to access room but not connected
      if (sessionState.connectionStatus === 'disconnected' && roomCode) {
        setIsRejoining(true);

        // Save room code for rejoin attempt
        saveLastRoomCode(roomCode);

        try {
          const displayName = getDisplayName();
          if (!displayName) {
            // No display name - redirect to join page with room code
            navigate(`/games/join/${roomCode}`);
            return;
          }

          // Try to rejoin the room
          await roomSessionManager.ensureJoined();
        } catch (err) {
          console.error('Failed to rejoin room:', err);
          setError(err instanceof Error ? err.message : 'Failed to rejoin room');
        } finally {
          setIsRejoining(false);
        }
      }
    };

    ensureRoomConnection();
  }, [roomCode, sessionState.connectionStatus, sessionState.roomCode, navigate]);

  // Navigate to game when room becomes active
  useEffect(() => {
    if (sessionState.isGameActive && sessionState.roomCode) {
      navigate(`/rooms/${sessionState.roomCode}/play`);
    }
  }, [sessionState.isGameActive, sessionState.roomCode, navigate]);

  // Handle session errors
  useEffect(() => {
    if (sessionState.error) {
      setError(sessionState.error.message);
    }
  }, [sessionState.error]);

  // Update selected scenario from session state
  useEffect(() => {
    if (sessionState.scenarioId) {
      setSelectedScenario(sessionState.scenarioId);
    }
  }, [sessionState.scenarioId]);

  // Scenario selection (host only)
  const handleSelectScenario = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    websocketService.selectScenario(scenarioId);
  };

  // Game start (host only)
  const handleStartGame = () => {
    if (!isCurrentPlayerHost) {
      return;
    }

    if (players.length < 1) {
      setError(t('lobby:needAtLeastOnePlayer', 'Need at least one player'));
      return;
    }

    websocketService.startGame(selectedScenario);
  };

  // Leave room and return to games hub
  const handleLeaveRoom = () => {
    gameSessionCoordinator.switchGame();
    navigate('/games');
  };

  // Character management callbacks
  const handleRemoveCharacter = (index: number) => {
    const char = selectedCharacters[index];
    if (char) removeCharacter(char.id);
  };

  const handleSetActiveCharacter = (index: number) => {
    const char = selectedCharacters[index];
    if (char) setActiveCharacter(char.id);
  };

  // Get current player info
  const currentPlayerId = websocketService.getPlayerUUID();
  const currentPlayer = findPlayerById(players, currentPlayerId || '');
  const isCurrentPlayerHost = sessionState.playerRole === 'host' || isPlayerHost(currentPlayer);

  const playersReady = allPlayersReady(players);
  const canStartGame = players.length >= 1 && playersReady;

  // Show loading state while rejoining
  if (isRejoining) {
    return (
      <div className={styles.roomLobbyContainer}>
        <div className={styles.roomLobbyContent}>
          <div className={styles.loadingState}>
            <p>{t('lobby:rejoiningRoom', 'Rejoining room...')}</p>
          </div>
        </div>
      </div>
    );
  }

  // Not connected and not rejoining - show error or redirect
  if (sessionState.connectionStatus !== 'connected' || !sessionState.roomCode) {
    return (
      <div className={styles.roomLobbyContainer}>
        <div className={styles.roomLobbyContent}>
          <div className={styles.notConnected}>
            <h2>{t('lobby:notInRoom', 'Not in a room')}</h2>
            {error && (
              <div className={styles.errorBanner}>
                {error}
              </div>
            )}
            <button
              className={styles.backButton}
              onClick={() => navigate('/games')}
            >
              {t('lobby:backToGames', 'Back to Games')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.roomLobbyContainer}>
      <div className={styles.roomLobbyContent}>
        {/* Header with leave button */}
        <div className={styles.header}>
          <button
            className={styles.leaveButton}
            onClick={handleLeaveRoom}
          >
            ← {t('lobby:leaveRoom', 'Leave Room')}
          </button>
        </div>

        {/* Room lobby view */}
        <LobbyRoomView
          roomCode={sessionState.roomCode}
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
          campaignId={sessionState.campaignId}
          onAddCharacter={addCharacter}
          onRemoveCharacter={handleRemoveCharacter}
          onSetActiveCharacter={handleSetActiveCharacter}
          onSelectScenario={handleSelectScenario}
          onStartGame={handleStartGame}
        />
      </div>
    </div>
  );
};
