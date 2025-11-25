/**
 * GameBoard Page Component
 *
 * Main game interface with hex grid rendering and character movement.
 * Features:
 * - PixiJS hex grid rendering
 * - Character sprites with tap-to-select
 * - Movement range highlighting
 * - Real-time game state synchronization
 *
 * Implements:
 * - T057: Create GameBoard page component
 * - T071: Implement character movement (tap character → tap hex → emit move event)
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { GameBoardData } from '../game/HexGrid';
import type { HexTileData } from '../game/HexTile';
import type { CharacterData } from '../game/CharacterSprite';
import { websocketService } from '../services/websocket.service';
import { roomSessionManager } from '../services/room-session.service';
import type { Axial } from '../game/hex-utils';
import { CardSelectionPanel } from '../components/CardSelectionPanel';
import type { AbilityCard, Monster } from '../../../shared/types/entities';
import { GameHUD } from '../components/game/GameHUD';
import { GameHints } from '../components/game/GameHints';
import { ReconnectingOverlay } from '../components/game/ReconnectingOverlay';
import { useRoomSession } from '../hooks/useRoomSession';
import { useGameWebSocket } from '../hooks/useGameWebSocket';
import { useHexGrid } from '../hooks/useHexGrid';
import type { GameStartedPayload } from '../../../shared/types/events';
import styles from './GameBoard.module.css';

export function GameBoard() {
  const navigate = useNavigate();
  const { roomCode } = useParams<{ roomCode: string }>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Redirect to lobby if no roomCode provided
  useEffect(() => {
    if (!roomCode) {
      navigate('/');
    }
  }, [roomCode, navigate]);

  // CENTRALIZED CLEANUP: Reset room session when navigating to different game
  // This handles direct URL navigation to a different game (bypassing Lobby)
  // Runs when roomCode changes OR on first mount
  useEffect(() => {
    if (roomCode) {
      console.log('[GameBoard] Room code changed, resetting room session for:', roomCode);
      roomSessionManager.switchRoom();
    }
    // Run when roomCode changes (including first mount)
  }, [roomCode]);

  // State
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [selectedHex, setSelectedHex] = useState<Axial | null>(null);
  const [myCharacterId, setMyCharacterId] = useState<string | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');
  const [logs, setLogs] = useState<string[]>([]);
  const [gameData, setGameData] = useState<GameStartedPayload | null>(null);

  // T200: Action Log
  const addLog = useCallback((message: string) => {
    setLogs(prevLogs => [...prevLogs, message].slice(-5)); // Keep last 5 logs
  }, []);

  // Card selection state (T111, T181)
  const [showCardSelection, setShowCardSelection] = useState(false);
  const [playerHand, setPlayerHand] = useState<AbilityCard[]>([]);
  const [selectedTopAction, setSelectedTopAction] = useState<AbilityCard | null>(null);
  const [selectedBottomAction, setSelectedBottomAction] = useState<AbilityCard | null>(null);

  // Attack targeting state (T115)
  const [attackMode, setAttackMode] = useState(false);
  const [attackableTargets, setAttackableTargets] = useState<string[]>([]);

  // Use custom hooks
  useRoomSession();

  const { hexGridReady, initializeBoard, moveCharacter, deselectAll, showSelectedHex, clearSelectedHex } = useHexGrid(containerRef, {
    onHexClick: (hex) => handleHexClick(hex),
    onCharacterSelect: (characterId) => handleCharacterSelectClick(characterId),
    onMonsterSelect: (monsterId) => handleMonsterSelectClick(monsterId),
  });

  const handleHexClick = useCallback((hex: Axial) => {
    const clickedHexCoords = `q=${hex.q}, r=${hex.r}`;
    addLog(`Hex clicked: ${clickedHexCoords}`);

    if (!selectedCharacterId || !isMyTurn) {
      addLog('Move ignored: Not player turn or no character selected.');
      return;
    }

    if (selectedHex) {
      const selectedHexCoords = `q=${selectedHex.q}, r=${selectedHex.r}`;
      if (selectedHex.q === hex.q && selectedHex.r === hex.r) {
        addLog(`CONFIRM MOVE: Clicked ${clickedHexCoords} matches selected ${selectedHexCoords}.`);
        websocketService.moveCharacter(hex);
        setSelectedHex(null);
        clearSelectedHex();
      } else {
        addLog(`CHANGE DESTINATION: Old=${selectedHexCoords}, New=${clickedHexCoords}.`);
        setSelectedHex(hex);
        showSelectedHex(hex);
      }
    } else {
      addLog(`SET DESTINATION: ${clickedHexCoords}.`);
      setSelectedHex(hex);
      showSelectedHex(hex);
    }
  }, [selectedCharacterId, isMyTurn, addLog, selectedHex, showSelectedHex, clearSelectedHex]);

  const handleCharacterSelectClick = useCallback((characterId: string) => {
    if (isMyTurn) {
      setSelectedCharacterId(characterId);
      setSelectedHex(null);
      clearSelectedHex();
    }
  }, [isMyTurn, clearSelectedHex]);

  const handleMonsterSelectClick = useCallback((monsterId: string) => {
    if (attackMode && isMyTurn && attackableTargets.includes(monsterId)) {
      websocketService.attackTarget(monsterId);
      setAttackMode(false);
      setAttackableTargets([]);
    }
  }, [attackMode, isMyTurn, attackableTargets]);


  // Event handlers for WebSocket
  const handleGameStarted = useCallback((data: GameStartedPayload, ackCallback?: (ack: boolean) => void) => {
    console.log('handleGameStarted called with data:', data);

    try {
      // Find my character
      const playerUUID = websocketService.getPlayerUUID();
      const myCharacter = data.characters.find(char => char.playerId === playerUUID);

      if (myCharacter) {
        setMyCharacterId(myCharacter.id);

        // Load ability deck (if available in extended character data)
        const characterWithDeck = myCharacter as typeof myCharacter & { abilityDeck?: AbilityCard[] };
        if (characterWithDeck.abilityDeck && Array.isArray(characterWithDeck.abilityDeck)) {
          setPlayerHand(characterWithDeck.abilityDeck);
          // Do not set showCardSelection here directly to avoid race condition
        }
      }

      setGameData(data);

      // Acknowledge the event was processed successfully on the client.
      if (ackCallback) {
        ackCallback(true);
      }
    } catch (error) {
      console.error('❌ Error processing game_started event:', error);
      if (ackCallback) {
        ackCallback(false);
      }
    }
  }, []);

  const handleCharacterMoved = useCallback((data: { characterId: string; fromHex: Axial; toHex: Axial; movementPath: Axial[] }) => {
    moveCharacter(data.characterId, data.toHex, data.movementPath);
    const charName = data.characterId === myCharacterId ? 'You' : 'Opponent';
    addLog(`${charName} moved.`);
  }, [moveCharacter, addLog, myCharacterId]);

  const handleTurnStarted = useCallback((data: { turnIndex: number; entityId: string; entityType: 'character' | 'monster' }) => {
    const myTurn = data.entityType === 'character' && data.entityId === myCharacterId;
    setIsMyTurn(myTurn);

    if (myTurn) {
      addLog('Your turn has started.');
    } else if (data.entityType === 'character') {
      addLog("Opponent's turn.");
    } else {
      addLog('Monster turn.');
    }

    if (!myTurn) {
      deselectAll();
      setSelectedCharacterId(null);
    }
  }, [myCharacterId, deselectAll, addLog]);

  const handleGameStateUpdate = useCallback((data: { gameState: unknown }) => {
    console.log('Game state update:', data);
  }, []);

  const handleConnectionStatusChange = useCallback((status: 'connected' | 'disconnected' | 'reconnecting') => {
    setConnectionStatus(status);
  }, []);

  // Memoize handlers object to prevent useGameWebSocket's useEffect from running on every render
  const gameWebSocketHandlers = useMemo(() => ({
    onGameStarted: handleGameStarted,
    onCharacterMoved: handleCharacterMoved,
    onTurnStarted: handleTurnStarted,
    onGameStateUpdate: handleGameStateUpdate,
    onConnectionStatusChange: handleConnectionStatusChange,
  }), [handleGameStarted, handleCharacterMoved, handleTurnStarted, handleGameStateUpdate, handleConnectionStatusChange]);

  // Setup WebSocket
  useGameWebSocket(gameWebSocketHandlers);

  // T111: Effect to show card selection only after hand is populated
  useEffect(() => {
    if (playerHand.length > 0) {
      setShowCardSelection(true);
    }
  }, [playerHand]);

  // T200: Fullscreen management
  useEffect(() => {
    const enterFullscreen = () => {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
      }
    };

    const exitFullscreen = () => {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen();
      }
    };

    // Enter fullscreen only in landscape
    if (window.matchMedia('(orientation: landscape)').matches) {
      enterFullscreen();
    }

    // Cleanup on component unmount
    return () => exitFullscreen();
  }, []);

  // Render game data when HexGrid is ready
  useEffect(() => {
    if (hexGridReady && gameData) {
      const boardData: GameBoardData = {
        tiles: gameData.mapLayout as HexTileData[],
        characters: gameData.characters as CharacterData[],
        monsters: (gameData.monsters as Monster[]) || [],
      };

      initializeBoard(boardData);
    }
  }, [hexGridReady, gameData, initializeBoard]);

  // T111: Card selection handlers
  const handleCardSelect = useCallback((card: AbilityCard) => {
    if (!selectedTopAction) {
      setSelectedTopAction(card);
    } else if (!selectedBottomAction && card.id !== selectedTopAction.id) {
      setSelectedBottomAction(card);
    }
  }, [selectedTopAction, selectedBottomAction]);

  const handleConfirmCardSelection = useCallback(() => {
    if (selectedTopAction && selectedBottomAction) {
      websocketService.selectCards(selectedTopAction.id, selectedBottomAction.id);
      addLog('Cards selected.');
      setShowCardSelection(false);
      setSelectedTopAction(null);
      setSelectedBottomAction(null);
    }
  }, [selectedTopAction, selectedBottomAction, addLog]);

  const handleClearCardSelection = useCallback(() => {
    setSelectedTopAction(null);
    setSelectedBottomAction(null);
  }, []);



  const handleBackToLobby = () => {
    // Navigate to lobby - cleanup will happen automatically when Lobby page mounts
    navigate('/');
  };

  return (
    <div className={styles.gameBoardPage}>
      {/* HUD */}
      <GameHUD
        logs={logs}
        connectionStatus={connectionStatus}
        onBackToLobby={handleBackToLobby}
      />

      <div ref={containerRef} className={styles.gameContainer} />

      {/* T111: Card Selection Panel */}
      {showCardSelection && (
        <CardSelectionPanel
          cards={playerHand}
          onCardSelect={handleCardSelect}
          onClearSelection={handleClearCardSelection}
          onConfirmSelection={handleConfirmCardSelection}
          selectedTopAction={selectedTopAction}
          selectedBottomAction={selectedBottomAction}
        />
      )}

      <GameHints
        attackMode={attackMode}
        showMovementHint={selectedCharacterId !== null && isMyTurn && !attackMode}
      />

      <ReconnectingOverlay show={connectionStatus === 'reconnecting'} />

      {/* T200: Orientation warning */}
      <div className={styles.orientationWarning}>
        <div className={styles.orientationWarningContent}>
          <p>Please rotate your device to landscape mode to play.</p>
        </div>
      </div>
    </div>
  );
}
