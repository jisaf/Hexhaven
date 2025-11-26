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
import type { CharacterData } from '../game/CharacterSprite';
import { websocketService } from '../services/websocket.service';
import { roomSessionManager } from '../services/room-session.service';
import type { Axial } from '../game/hex-utils';
import { hexRangeReachable } from '../game/hex-utils';
import { CardSelectionPanel } from '../components/CardSelectionPanel';
import type { AbilityCard, Monster, HexTile, TerrainType } from '../../../shared/types/entities';
import { GameHUD } from '../components/game/GameHUD';
import { GameHints } from '../components/game/GameHints';
import { ReconnectingOverlay } from '../components/game/ReconnectingOverlay';
import { useRoomSession } from '../hooks/useRoomSession';
import { useGameWebSocket } from '../hooks/useGameWebSocket';
import { useHexGrid } from '../hooks/useHexGrid';
import type { GameStartedPayload, TurnEntity } from '../../../shared/types/events';
import TurnOrder from '../components/TurnOrder';
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
  const [turnOrder, setTurnOrder] = useState<TurnEntity[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [currentTurnEntityId, setCurrentTurnEntityId] = useState<string | null>(null);
  const [currentMovementPoints, setCurrentMovementPoints] = useState(0);

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

  const {
    hexGridReady,
    initializeBoard,
    moveCharacter,
    deselectAll,
    showMovementRange,
    clearMovementRange,
    getCharacter,
    updateMonsterPosition,
    updateCharacterHealth,
    updateMonsterHealth,
    removeCharacter,
    removeMonster,
    isHexBlocked,
    setSelectedHex: highlightSelectedHex,
  } = useHexGrid(containerRef, {
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
        clearMovementRange();
      } else {
        addLog(`CHANGE DESTINATION: Old=${selectedHexCoords}, New=${clickedHexCoords}.`);
        setSelectedHex(hex);
      }
    } else {
      addLog(`SET DESTINATION: ${clickedHexCoords}.`);
      setSelectedHex(hex);
    }
  }, [selectedCharacterId, isMyTurn, addLog, selectedHex, clearMovementRange]);

  // Effect to sync the selected hex highlight with the state
  useEffect(() => {
    highlightSelectedHex(selectedHex);
  }, [selectedHex, highlightSelectedHex]);

  const handleCharacterSelectClick = useCallback((characterId: string) => {
    if (isMyTurn) {
      setSelectedCharacterId(characterId);
      setSelectedHex(null);

      // Determine movement points from the selected card
      // This assumes the bottom action is always the move action for now
      const moveValue = selectedBottomAction?.bottomAction.type === 'move'
        ? selectedBottomAction.bottomAction.value || 0
        : 0;

      setCurrentMovementPoints(moveValue);

      // Calculate and show movement range
      const character = getCharacter(characterId);
      if (character && moveValue > 0) {
        const data = character.getData();
        const reachableHexes = hexRangeReachable(
          data.currentHex,
          moveValue,
          isHexBlocked
        );
        showMovementRange(reachableHexes);
      } else {
        clearMovementRange();
      }
    }
  }, [isMyTurn, selectedBottomAction, getCharacter, showMovementRange, clearMovementRange]);

  const handleMonsterSelectClick = useCallback((monsterId: string) => {
    if (attackMode && isMyTurn && attackableTargets.includes(monsterId)) {
      websocketService.attackTarget(monsterId);
      setAttackMode(false);
      setAttackableTargets([]);
    }
  }, [attackMode, isMyTurn, attackableTargets]);


  // Event handlers for WebSocket
  const handleGameStarted = useCallback((data: GameStartedPayload, ackCallback?: (ack: boolean) => void) => {
    console.log('🎮 handleGameStarted called with data:', data);
    addLog('DEBUG: game_started event received');

    try {
      // Find my character
      const playerUUID = websocketService.getPlayerUUID();
      if (!playerUUID) {
        addLog('ERROR: No playerUUID found');
        if (ackCallback) {
          ackCallback(false);
        }
        return;
      }
      addLog(`DEBUG: Looking for UUID: ${playerUUID.substring(0, 8)}...`);
      const myCharacter = data.characters.find(char => char.playerId === playerUUID);

      if (myCharacter) {
        addLog(`DEBUG: Found character ID: ${myCharacter.id}`);
        setMyCharacterId(myCharacter.id);

        // Load ability deck (if available in extended character data)
        const characterWithDeck = myCharacter as typeof myCharacter & { abilityDeck?: AbilityCard[] };
        const deckLength = characterWithDeck.abilityDeck?.length || 0;
        const isArray = Array.isArray(characterWithDeck.abilityDeck);

        addLog(`DEBUG: abilityDeck exists: ${!!characterWithDeck.abilityDeck}`);
        addLog(`DEBUG: abilityDeck is array: ${isArray}`);
        addLog(`DEBUG: abilityDeck length: ${deckLength}`);

        if (characterWithDeck.abilityDeck && Array.isArray(characterWithDeck.abilityDeck)) {
          addLog(`DEBUG: Setting playerHand with ${deckLength} cards`);
          setPlayerHand(characterWithDeck.abilityDeck);
          // Do not set showCardSelection here directly to avoid race condition
        } else {
          addLog('ERROR: No abilityDeck found or not array');
        }
      } else {
        addLog('ERROR: Character not found in payload');
      }

      setGameData(data);
      setCurrentRound(1); // Start with Round 1

      // Acknowledge the event was processed successfully on the client.
      if (ackCallback) {
        ackCallback(true);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addLog(`ERROR: game_started failed: ${errorMsg}`);
      console.error('❌ Error processing game_started event:', error);
      if (ackCallback) {
        ackCallback(false);
      }
    }
  }, [addLog]);

  const handleCharacterMoved = useCallback((data: { characterId: string; fromHex: Axial; toHex: Axial; movementPath: Axial[] }) => {
    moveCharacter(data.characterId, data.toHex, data.movementPath);
    const charName = data.characterId === myCharacterId ? 'You' : 'Opponent';
    addLog(`${charName} moved.`);

    // Update movement points and refresh highlights
    const movedDistance = data.movementPath.length > 0 ? data.movementPath.length - 1 : 0;
    const remainingMoves = currentMovementPoints - movedDistance;
    setCurrentMovementPoints(remainingMoves);
    setSelectedHex(null); // Clear selected hex after move

    const character = getCharacter(data.characterId);
    if (character && remainingMoves > 0) {
      const reachableHexes = hexRangeReachable(
        data.toHex,
        remainingMoves,
        isHexBlocked
      );
      showMovementRange(reachableHexes);
    } else {
      clearMovementRange();
    }
  }, [moveCharacter, addLog, myCharacterId, currentMovementPoints, getCharacter, showMovementRange, clearMovementRange]);

  const handleRoundStarted = useCallback((data: { roundNumber: number; turnOrder: TurnEntity[] }) => {
    setTurnOrder(data.turnOrder);
    setCurrentRound(data.roundNumber);
    addLog(`Round ${data.roundNumber} has started.`);
  }, [addLog]);

  const handleRoundEnded = useCallback((data: { roundNumber: number }) => {
    addLog(`Round ${data.roundNumber} has ended. Select cards for next round.`);
    setShowCardSelection(true);
  }, [addLog]);

  const handleTurnStarted = useCallback((data: { turnIndex: number; entityId: string; entityType: 'character' | 'monster' }) => {
    const myTurn = data.entityType === 'character' && data.entityId === myCharacterId;
    setIsMyTurn(myTurn);
    setCurrentTurnEntityId(data.entityId);

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

  const handleMonsterActivated = useCallback((data: {
    monsterId: string;
    focusTarget: string;
    movement: Axial;
    attack: { targetId: string; damage: number; modifier: number | 'null' | 'x2' } | null;
  }) => {
    addLog(`Monster activated and moved`);

    // Update monster position
    updateMonsterPosition(data.monsterId, data.movement);

    // Handle attack damage
    if (data.attack && gameData) {
      const targetCharacter = gameData.characters.find(c => c.id === data.attack!.targetId);

      if (targetCharacter) {
        const newHealth = Math.max(0, targetCharacter.health - data.attack.damage);
        addLog(`Monster attacked for ${data.attack.damage} damage`);

        updateCharacterHealth(data.attack.targetId, newHealth);

        if (newHealth <= 0) {
          addLog(`Character was killed!`);
          removeCharacter(data.attack.targetId);
        }

        // Update gameData to keep it in sync
        targetCharacter.health = newHealth;
      }
    }
  }, [addLog, updateMonsterPosition, gameData, updateCharacterHealth, removeCharacter]);

  const handleAttackResolved = useCallback((data: {
    attackerId: string;
    targetId: string;
    damage: number;
    modifier: number | 'null' | 'x2';
    effects: string[];
    targetHealth: number;
    targetDead: boolean;
  }) => {
    addLog(`Attack resolved: ${data.damage} damage to ${data.targetId}`);

    // Update target health (could be character or monster)
    // Check if target is in gameData
    if (gameData) {
      const isCharacter = gameData.characters.some(c => c.id === data.targetId);
      const isMonster = gameData.monsters.some(m => m.id === data.targetId);

      if (isCharacter) {
        updateCharacterHealth(data.targetId, data.targetHealth);
        if (data.targetDead) {
          addLog(`Character ${data.targetId} was killed!`);
          removeCharacter(data.targetId);
        }
      } else if (isMonster) {
        updateMonsterHealth(data.targetId, data.targetHealth);
        if (data.targetDead) {
          addLog(`Monster ${data.targetId} was killed!`);
          removeMonster(data.targetId);
        }
      }
    }
  }, [addLog, gameData, updateCharacterHealth, updateMonsterHealth, removeCharacter, removeMonster]);

  // Memoize handlers object to prevent useGameWebSocket's useEffect from running on every render
  const gameWebSocketHandlers = useMemo(() => ({
    onGameStarted: handleGameStarted,
    onCharacterMoved: handleCharacterMoved,
    onRoundStarted: handleRoundStarted,
    onRoundEnded: handleRoundEnded,
    onTurnStarted: handleTurnStarted,
    onGameStateUpdate: handleGameStateUpdate,
    onConnectionStatusChange: handleConnectionStatusChange,
    onMonsterActivated: handleMonsterActivated,
    onAttackResolved: handleAttackResolved,
  }), [handleGameStarted, handleCharacterMoved, handleRoundStarted, handleRoundEnded, handleTurnStarted, handleGameStateUpdate, handleConnectionStatusChange, handleMonsterActivated, handleAttackResolved]);

  // Setup WebSocket
  useGameWebSocket(gameWebSocketHandlers);

  // T111: Effect to show card selection only after hand is populated
  useEffect(() => {
    // Wrap all state updates in queueMicrotask to avoid cascading renders
    queueMicrotask(() => {
      addLog(`DEBUG: playerHand changed, length: ${playerHand.length}`);
      if (playerHand.length > 0) {
        addLog('DEBUG: playerHand has cards, showing card selection');
        addLog('DEBUG: Setting showCardSelection=true');
        setShowCardSelection(true);
      } else {
        addLog('DEBUG: playerHand empty, not showing cards');
      }
    });
  }, [playerHand, addLog]);

  // Render game data when HexGrid is ready
  useEffect(() => {
    if (hexGridReady && gameData) {
      // Data from the backend (originating from JSON) will have string enums
      // and may be missing optional fields if they are empty. We map the data
      // here to ensure it conforms to the strict HexTile interface used in the
      // frontend renderer.
      const typedTiles: HexTile[] = gameData.mapLayout.map(tile => ({
        ...tile,
        terrain: tile.terrain as TerrainType, // Cast string to enum
        features: (tile as HexTile).features ?? [], // Add missing optional fields
        triggers: (tile as HexTile).triggers ?? [],
      }));

      const boardData: GameBoardData = {
        tiles: typedTiles,
        characters: gameData.characters as CharacterData[],
        monsters: (gameData.monsters as Monster[]) || [],
      };

      initializeBoard(boardData);
    }
  }, [hexGridReady, gameData, initializeBoard]);


  // T111: Card selection handlers
  const handleCardSelect = useCallback((card: AbilityCard) => {
    addLog(`DEBUG: Card selected: ${card.name}`);
    if (!selectedTopAction) {
      addLog(`DEBUG: Setting as TOP action`);
      setSelectedTopAction(card);
    } else if (!selectedBottomAction && card.id !== selectedTopAction.id) {
      addLog(`DEBUG: Setting as BOTTOM action`);
      setSelectedBottomAction(card);
    } else {
      addLog(`DEBUG: Card selection ignored (both slots filled or same card)`);
    }
  }, [selectedTopAction, selectedBottomAction, addLog]);

  const handleConfirmCardSelection = useCallback(() => {
    addLog(`DEBUG: Confirm clicked. Top: ${selectedTopAction?.name || 'none'}, Bottom: ${selectedBottomAction?.name || 'none'}`);
    if (selectedTopAction && selectedBottomAction) {
      addLog(`DEBUG: Emitting select_cards event`);
      websocketService.selectCards(selectedTopAction.id, selectedBottomAction.id);
      addLog(`Cards selected: ${selectedTopAction.name} (top) and ${selectedBottomAction.name} (bottom)`);
      setShowCardSelection(false);
      setSelectedTopAction(null);
      setSelectedBottomAction(null);
    } else {
      addLog('ERROR: Cannot confirm - need both top and bottom cards');
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

  const handleEndTurn = useCallback(() => {
    if (isMyTurn) {
      websocketService.endTurn();
      addLog('Turn ended.');
      setIsMyTurn(false);
    }
  }, [isMyTurn, addLog]);

  const gameBoardClass = `${styles.gameBoardPage} ${showCardSelection ? styles.cardSelectionActive : ''}`;

  return (
    <div className={gameBoardClass}>
      <div ref={containerRef} className={styles.gameContainer} />

      <div className={styles.rightPanel}>
        {currentRound > 0 && (
          <TurnOrder
            turnOrder={turnOrder}
            currentTurnEntityId={currentTurnEntityId}
            currentRound={currentRound}
          />
        )}
        <div className={styles.hudWrapper}>
          <GameHUD
            logs={logs}
            connectionStatus={connectionStatus}
            isMyTurn={isMyTurn}
            onBackToLobby={handleBackToLobby}
            onEndTurn={handleEndTurn}
          />
        </div>
      </div>

      <div className={styles.bottomPlaceholder} />

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
    </div>
  );
}
