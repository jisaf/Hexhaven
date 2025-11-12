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
import { v4 as uuidv4 } from 'uuid';
import { websocketService } from '../services/websocket.service';
import { JoinRoomForm } from '../components/JoinRoomForm';
import { NicknameInput } from '../components/NicknameInput';
import { PlayerList, type Player } from '../components/PlayerList';
import { CharacterSelect, type CharacterClass } from '../components/CharacterSelect';
import { DebugConsole } from '../components/DebugConsole';

type LobbyMode = 'initial' | 'nickname-for-create' | 'creating' | 'joining' | 'in-room';

interface GameRoom {
  roomCode: string;
  status: 'lobby' | 'playing' | 'completed';
}

export function Lobby() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // State
  const [mode, setMode] = useState<LobbyMode>('initial');
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterClass | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCopied, setShowCopied] = useState(false);

  // Event handlers - defined before useEffect that uses them
  const handleRoomJoined = useCallback((data: { roomCode: string; players: unknown[]; playerId: string; isHost: boolean }) => {
    console.log('Room joined event received:', data);
    setRoom({ roomCode: data.roomCode, status: 'lobby' });
    setPlayers(data.players as Player[]);
    setCurrentPlayerId(data.playerId);
    setIsHost(data.isHost);
    setMode('in-room');
    setIsLoading(false);
    setError(null);
  }, []);

  const handlePlayerJoined = useCallback((data: { player: unknown }) => {
    setPlayers((prev) => [...prev, data.player as Player]);
  }, []);

  const handlePlayerLeft = useCallback((data: { playerId: string }) => {
    setPlayers((prev) => prev.filter((p) => p.id !== data.playerId));
  }, []);

  const handleCharacterSelected = useCallback((data: { playerId: string; characterClass: string }) => {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === data.playerId
          ? { ...p, characterClass: data.characterClass as CharacterClass, isReady: true }
          : p
      )
    );

    // Update own selection
    if (data.playerId === currentPlayerId) {
      setSelectedCharacter(data.characterClass as CharacterClass);
    }
  }, [currentPlayerId]);

  const handleGameStarted = useCallback(() => {
    navigate('/game');
  }, [navigate]);

  const handleError = useCallback((data: { message: string }) => {
    setError(data.message);
    setIsLoading(false);
  }, []);

  // Connect to WebSocket on mount
  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3000';
    websocketService.connect(wsUrl);

    // Setup event listeners
    websocketService.on('room_joined', handleRoomJoined);
    websocketService.on('player_joined', handlePlayerJoined);
    websocketService.on('player_left', handlePlayerLeft);
    websocketService.on('character_selected', handleCharacterSelected);
    websocketService.on('game_started', handleGameStarted);
    websocketService.on('error', handleError);

    return () => {
      // Cleanup
      websocketService.off('room_joined');
      websocketService.off('player_joined');
      websocketService.off('player_left');
      websocketService.off('character_selected');
      websocketService.off('game_started');
      websocketService.off('error');
    };
  }, [handleRoomJoined, handlePlayerJoined, handlePlayerLeft, handleCharacterSelected, handleGameStarted, handleError]);

  // Room creation flow (T067)
  const handleCreateRoom = () => {
    // Check if nickname is already set
    const storedNickname = localStorage.getItem('playerNickname');
    if (storedNickname) {
      // If nickname exists, proceed directly
      proceedWithRoomCreation(storedNickname);
    } else {
      // Show nickname input first
      setMode('nickname-for-create');
    }
  };

  const handleNicknameSubmit = (submittedNickname: string) => {
    localStorage.setItem('playerNickname', submittedNickname);
    proceedWithRoomCreation(submittedNickname);
  };

  const proceedWithRoomCreation = async (playerNickname: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Get or create UUID
      let uuid = localStorage.getItem('playerUUID');
      if (!uuid) {
        uuid = uuidv4();
        localStorage.setItem('playerUUID', uuid);
      }

      console.log('Creating room for:', { uuid, nickname: playerNickname });

      // Call REST API to create room
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      console.log('API URL:', apiUrl);

      // Add timeout to fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        console.log('Starting fetch request...');
        const response = await fetch(`${apiUrl}/rooms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ uuid, nickname: playerNickname }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        console.log('API Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('API Error:', errorData);
          throw new Error('Failed to create room');
        }

        const data = await response.json();
        console.log('Room created:', data);

        // Check WebSocket connection status
        console.log('WebSocket connected:', websocketService.isConnected());

        // Join the room via WebSocket
        console.log('Joining room via WebSocket:', data.room.roomCode);
        websocketService.joinRoom(data.room.roomCode, playerNickname, uuid);
        setMode('creating');
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        if (fetchErr.name === 'AbortError') {
          console.error('Request timed out after 10 seconds');
          throw new Error('Request timed out - please check your network connection');
        }
        throw fetchErr;
      }
    } catch (err) {
      console.error('Room creation error:', err);
      console.error('Error type:', err.constructor.name);
      console.error('Error details:', {
        message: err.message,
        name: err.name,
        stack: err.stack
      });
      setError(err instanceof Error ? err.message : 'Failed to create room');
      setIsLoading(false);
    }
  };

  // Room join flow (T068)
  const handleJoinRoom = (roomCode: string, playerNickname: string) => {
    setIsLoading(true);
    setError(null);

    // Get or create UUID
    let uuid = localStorage.getItem('playerUUID');
    if (!uuid) {
      uuid = uuidv4();
      localStorage.setItem('playerUUID', uuid);
    }

    // Store nickname
    localStorage.setItem('playerNickname', playerNickname);

    websocketService.joinRoom(roomCode, playerNickname, uuid);
    setMode('joining');
  };

  // Character selection (T069)
  const handleSelectCharacter = (characterClass: CharacterClass) => {
    setSelectedCharacter(characterClass);
    websocketService.selectCharacter(characterClass);
  };

  // Game start (T070 - host only)
  const handleStartGame = () => {
    if (!isHost) return;

    const allReady = players.every((p) => p.characterClass);
    if (!allReady) {
      setError(t('lobby.notAllReady', 'All players must select a character'));
      return;
    }

    if (players.length < 2) {
      setError(t('lobby.needMorePlayers', 'Need at least 2 players to start'));
      return;
    }

    websocketService.startGame();
  };

  // Copy room code to clipboard
  const handleCopyRoomCode = async () => {
    if (!room) return;

    try {
      await navigator.clipboard.writeText(room.roomCode);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy room code:', err);
    }
  };

  // Get disabled character classes
  const disabledClasses = players
    .filter((p) => p.id !== currentPlayerId && p.characterClass)
    .map((p) => p.characterClass as CharacterClass);

  const allPlayersReady = players.length >= 2 && players.every((p) => p.characterClass);

  return (
    <div className="lobby-page">
      <DebugConsole />
      <header className="lobby-header">
        <h1>{t('lobby.title', 'Hexhaven Multiplayer')}</h1>
      </header>

      <main className="lobby-content">
        {mode === 'initial' && (
          <div className="initial-mode">
            <div className="button-group">
              <button
                className="primary-button create-button"
                onClick={handleCreateRoom}
                disabled={isLoading}
              >
                {isLoading
                  ? t('lobby.creating', 'Creating...')
                  : t('lobby.createRoom', 'Create Game')}
              </button>

              <div className="divider">
                <span>{t('lobby.or', 'or')}</span>
              </div>

              <button
                className="secondary-button"
                onClick={() => setMode('joining')}
              >
                {t('lobby.joinRoom', 'Join Game')}
              </button>
            </div>
          </div>
        )}

        {mode === 'nickname-for-create' && (
          <div className="nickname-mode">
            <button
              className="back-button"
              onClick={() => {
                setMode('initial');
                setError(null);
              }}
            >
              ← {t('lobby.back', 'Back')}
            </button>

            <div className="nickname-content">
              <h2>{t('lobby.enterNicknameTitle', 'Enter Your Nickname')}</h2>
              <p className="nickname-instruction">
                {t('lobby.nicknameInstruction', 'Choose a nickname for this game')}
              </p>

              <NicknameInput
                onSubmit={handleNicknameSubmit}
                onCancel={() => setMode('initial')}
                isLoading={isLoading}
                error={error || undefined}
                initialValue={localStorage.getItem('playerNickname') || ''}
                showCancel={true}
              />
            </div>
          </div>
        )}

        {mode === 'joining' && !room && (
          <div className="join-mode">
            <button
              className="back-button"
              onClick={() => {
                setMode('initial');
                setError(null);
              }}
            >
              ← {t('lobby.back', 'Back')}
            </button>

            <div className="join-content">
              <h2>{t('lobby.joinGameTitle', 'Join a Game')}</h2>
              <p className="join-instruction">
                {t('lobby.enterJoinDetails', 'Enter the room code and your nickname')}
              </p>

              <JoinRoomForm
                onSubmit={handleJoinRoom}
                isLoading={isLoading}
                error={error || undefined}
                initialNickname={localStorage.getItem('playerNickname') || ''}
              />
            </div>
          </div>
        )}

        {mode === 'in-room' && room && (
          <div className="in-room-mode" data-testid="lobby-page">
            <div className="room-header">
              <div className="room-code-section">
                <h2>
                  {t('lobby.roomCode', 'Room Code')}: <span className="room-code" data-testid="room-code">{room.roomCode}</span>
                </h2>
                <div className="copy-area">
                  <button
                    className="copy-button"
                    onClick={handleCopyRoomCode}
                    data-testid="copy-room-code"
                    aria-label={t('lobby.copyRoomCode', 'Copy room code')}
                  >
                    📋 {t('lobby.copy', 'Copy')}
                  </button>
                  {showCopied && (
                    <span className="copied-message">
                      {t('lobby.copied', 'Copied!')}
                    </span>
                  )}
                </div>
              </div>
              {isHost && (
                <span className="host-indicator" data-testid="host-indicator">
                  👑 {t('lobby.youAreHost', 'You are the host')}
                </span>
              )}
            </div>

            <div className="room-layout">
              <div className="room-section">
                <PlayerList players={players} currentPlayerId={currentPlayerId || undefined} />
              </div>

              <div className="room-section">
                <CharacterSelect
                  selectedClass={selectedCharacter}
                  disabledClasses={disabledClasses}
                  onSelect={handleSelectCharacter}
                />
              </div>
            </div>

            {isHost && (
              <div className="host-controls">
                <button
                  className="primary-button start-button"
                  onClick={handleStartGame}
                  disabled={!allPlayersReady}
                >
                  {t('lobby.startGame', 'Start Game')}
                </button>

                {!allPlayersReady && (
                  <p className="start-hint">
                    {t('lobby.waitingForPlayers', 'Waiting for all players to select characters...')}
                  </p>
                )}
              </div>
            )}

            {!isHost && (
              <div className="player-waiting">
                <p>{t('lobby.waitingForHost', 'Waiting for host to start the game...')}</p>
              </div>
            )}
          </div>
        )}

        {error && mode !== 'joining' && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
      </main>

      <style>{`
        .lobby-page {
          min-height: 100vh;
          background: #1a1a1a;
          color: #ffffff;
          display: flex;
          flex-direction: column;
        }

        .lobby-header {
          padding: 24px;
          text-align: center;
          border-bottom: 2px solid #333;
        }

        .lobby-header h1 {
          margin: 0;
          font-size: 32px;
          font-weight: 700;
        }

        .lobby-content {
          flex: 1;
          padding: 32px 24px;
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
        }

        .initial-mode, .join-mode, .in-room-mode {
          animation: fadeIn 0.3s ease-in;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .button-group {
          max-width: 400px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .primary-button, .secondary-button {
          padding: 16px 32px;
          font-size: 18px;
          font-weight: 600;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          min-height: 56px;
        }

        .primary-button {
          color: #ffffff;
          background: #5a9fd4;
        }

        .primary-button:hover:not(:disabled) {
          background: #4a8fc4;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(90, 159, 212, 0.4);
        }

        .primary-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .secondary-button {
          color: #ffffff;
          background: transparent;
          border: 2px solid #5a9fd4;
        }

        .secondary-button:hover {
          background: rgba(90, 159, 212, 0.1);
        }

        .divider {
          text-align: center;
          position: relative;
        }

        .divider::before, .divider::after {
          content: '';
          position: absolute;
          top: 50%;
          width: 40%;
          height: 1px;
          background: #444;
        }

        .divider::before { left: 0; }
        .divider::after { right: 0; }

        .divider span {
          padding: 0 16px;
          color: #888;
        }

        .back-button {
          margin-bottom: 24px;
          padding: 8px 16px;
          font-size: 14px;
          color: #5a9fd4;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .back-button:hover {
          color: #4a8fc4;
        }

        .join-content,
        .nickname-content {
          max-width: 500px;
          margin: 0 auto;
          text-align: center;
        }

        .join-content h2,
        .nickname-content h2 {
          margin: 0 0 16px 0;
          font-size: 28px;
        }

        .join-instruction,
        .nickname-instruction {
          margin: 0 0 32px 0;
          color: #aaa;
        }

        .room-header {
          margin-bottom: 32px;
          padding: 20px;
          text-align: center;
          background: #2c2c2c;
          border-radius: 12px;
        }

        .room-header h2 {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 500;
        }

        .room-code-section {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .room-code {
          font-size: 32px;
          font-weight: 700;
          letter-spacing: 0.2em;
          color: #5a9fd4;
        }

        .copy-area {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .copy-button {
          padding: 8px 16px;
          font-size: 14px;
          background: #5a9fd4;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .copy-button:hover {
          background: #4a8fc4;
          transform: translateY(-1px);
        }

        .copied-message {
          color: #10b981;
          font-size: 14px;
          font-weight: 600;
          animation: fadeIn 0.2s;
        }

        .host-indicator {
          display: inline-block;
          margin-top: 8px;
          padding: 6px 12px;
          font-size: 14px;
          background: rgba(255, 215, 0, 0.2);
          border-radius: 8px;
        }

        .room-layout {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 32px;
          margin-bottom: 32px;
        }

        .room-section {
          display: flex;
          flex-direction: column;
        }

        .host-controls {
          text-align: center;
        }

        .start-button {
          min-width: 300px;
        }

        .start-hint {
          margin-top: 16px;
          color: #888;
          font-size: 14px;
        }

        .player-waiting {
          text-align: center;
          padding: 32px;
          color: #888;
          font-style: italic;
        }

        .error-banner {
          margin-top: 24px;
          padding: 16px;
          text-align: center;
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
          border: 2px solid #ef4444;
          border-radius: 8px;
        }

        @media (max-width: 768px) {
          .room-layout {
            grid-template-columns: 1fr;
          }

          .start-button {
            min-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
