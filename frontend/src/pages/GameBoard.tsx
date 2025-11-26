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
import type { AbilityCard, Monster, HexTile, LogMessage, LogMessagePart } from '../../../shared/types/entities';
import { TerrainType, Condition } from '../../../shared/types/entities';
import { GameHUD } from '../components/game/GameHUD';
import { GameHints } from '../components/game/GameHints';
import { ReconnectingOverlay } from '../components/game/ReconnectingOverlay';
import { useRoomSession } from '../hooks/useRoomSession';
import { useGameWebSocket } from '../hooks/useGameWebSocket';
import { useHexGrid } from '../hooks/useHexGrid';
import type { GameStartedPayload, TurnEntity, CharacterMovedPayload, AttackResolvedPayload, MonsterActivatedPayload } from '../../../shared/types/events';
import TurnOrder from '../components/TurnOrder';
import styles from './GameBoard.module.css';

// Helper to format modifier value into a string like "+1", "-2"
const formatModifier = (modifier: number | 'null' | 'x2'): string => {
  if (modifier === 'x2') {
    return ', x2 modifier';
  }
  if (modifier === 'null') {
    return ' (null modifier)';
  }
  if (typeof modifier === 'number') {
    return modifier >= 0 ? `+${modifier}` : `${modifier}`;
  }
  return '';
};

// Helper to get color for a given effect
const getEffectColor = (effect: string) => {
  switch (effect.toLowerCase()) {
    case Condition.POISON:
      return 'green';
    case Condition.WOUND:
      return 'orange';
    case Condition.STUN:
      return 'lightblue';
    case Condition.IMMOBILIZE:
    case Condition.DISARM:
      return 'white';
    default:
      return 'lightgreen';
  }
};

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
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [gameData, setGameData] = useState<GameStartedPayload | null>(null);
  const [turnOrder, setTurnOrder] = useState<TurnEntity[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [currentTurnEntityId, setCurrentTurnEntityId] = useState<string | null>(null);
  const [currentMovementPoints, setCurrentMovementPoints] = useState(0);
  const [validMovementHexes, setValidMovementHexes] = useState<Axial[]>([]);

  // T200: Action Log
  const addLog = useCallback((parts: LogMessagePart[]) => {
    const newLog: LogMessage = {
      id: `${Date.now()}-${Math.random()}`,
      parts,
    };
    setLogs(prevLogs => [...prevLogs, newLog].slice(-10)); // Keep last 10 logs
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
    console.log('🖱️ Hex clicked:', hex, 'Valid hexes:', validMovementHexes.length);

    if (!selectedCharacterId || !isMyTurn) {
      console.log('❌ Ignoring click - no character selected or not your turn');
      return;
    }

    // Only allow selecting hexes that are in the valid movement range
    const isValidHex = validMovementHexes.some(
      validHex => validHex.q === hex.q && validHex.r === hex.r
    );

    if (!isValidHex) {
      console.log('❌ Invalid hex - not in movement range');
      return; // Don't allow selecting invalid hexes
    }

    console.log('✅ Valid hex - highlighting in BLUE');

    if (selectedHex) {
      if (selectedHex.q === hex.q && selectedHex.r === hex.r) {
        console.log('🚀 Confirming move to', hex);
        websocketService.moveCharacter(hex);
        setSelectedHex(null);
        clearMovementRange();
        setValidMovementHexes([]);
      } else {
        console.log('🔄 Changing destination from', selectedHex, 'to', hex);
        setSelectedHex(hex);
      }
    } else {
      console.log('📍 First hex selection:', hex);
      setSelectedHex(hex);
    }
  }, [selectedCharacterId, isMyTurn, selectedHex, validMovementHexes, clearMovementRange]);

  // Effect to sync the selected hex highlight with the state
  useEffect(() => {
    highlightSelectedHex(selectedHex);
  }, [selectedHex, highlightSelectedHex]);

  const handleCharacterSelectClick = useCallback((characterId: string) => {
    console.log('🎯 Character selected:', characterId, 'isMyTurn:', isMyTurn);

    if (isMyTurn) {
      setSelectedCharacterId(characterId);
      setSelectedHex(null);

      // Determine movement points from the selected card
      // This assumes the bottom action is always the move action for now
      const moveValue = selectedBottomAction?.bottomAction.type === 'move'
        ? selectedBottomAction.bottomAction.value || 0
        : 0;

      console.log('📊 Selected bottom action:', selectedBottomAction?.name, 'Move value:', moveValue);
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
        console.log('✅ Showing movement range:', reachableHexes.length, 'hexes in GREEN');
        setValidMovementHexes(reachableHexes);
        showMovementRange(reachableHexes);
      } else {
        console.log('❌ Not showing movement range - moveValue:', moveValue, 'character:', !!character);
        setValidMovementHexes([]);
        clearMovementRange();
      }
    }
  }, [isMyTurn, selectedBottomAction, getCharacter, showMovementRange, clearMovementRange, isHexBlocked]);

  const handleMonsterSelectClick = useCallback((monsterId: string) => {
    if (attackMode && isMyTurn && attackableTargets.includes(monsterId)) {
      websocketService.attackTarget(monsterId);
      setAttackMode(false);
      setAttackableTargets([]);
    }
  }, [attackMode, isMyTurn, attackableTargets]);


  // Event handlers for WebSocket
  const handleGameStarted = useCallback((data: GameStartedPayload, ackCallback?: (ack: boolean) => void) => {
    addLog([{ text: `Scenario started: ${data.scenarioName}` }]);

    try {
      // Find my character
      const playerUUID = websocketService.getPlayerUUID();
      if (!playerUUID) {
        if (ackCallback) ackCallback(false);
        return;
      }

      const myCharacter = data.characters.find(char => char.playerId === playerUUID);
      if (myCharacter) {
        setMyCharacterId(myCharacter.id);

        const characterWithDeck = myCharacter as typeof myCharacter & { abilityDeck?: AbilityCard[] };
        if (characterWithDeck.abilityDeck && Array.isArray(characterWithDeck.abilityDeck)) {
          setPlayerHand(characterWithDeck.abilityDeck);
        }
      }

      setGameData(data);
      setCurrentRound(1);

      if (ackCallback) ackCallback(true);
    } catch (error) {
      console.error('❌ Error processing game_started event:', error);
      if (ackCallback) ackCallback(false);
    }
  }, [addLog]);

  const handleCharacterMoved = useCallback((data: CharacterMovedPayload) => {
    moveCharacter(data.characterId, data.toHex, data.movementPath);
    addLog([
      { text: data.characterName, color: 'lightblue' },
      { text: ` moved ` },
      { text: `${data.distance}`, color: 'blue' },
      { text: ` hexes.` }
    ]);

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
      setValidMovementHexes(reachableHexes);
      showMovementRange(reachableHexes);
    } else {
      setValidMovementHexes([]);
      clearMovementRange();
    }
  }, [moveCharacter, addLog, currentMovementPoints, getCharacter, showMovementRange, clearMovementRange, isHexBlocked]);

  const handleRoundStarted = useCallback((data: { roundNumber: number; turnOrder: TurnEntity[] }) => {
    setTurnOrder(data.turnOrder);
    setCurrentRound(data.roundNumber);
    addLog([{ text: `Round ${data.roundNumber} has started.` }]);
  }, [addLog]);

  const handleRoundEnded = useCallback((data: { roundNumber: number }) => {
    addLog([{ text: `Round ${data.roundNumber} has ended. Select cards for next round.` }]);
    setShowCardSelection(true);
  }, [addLog]);

  const handleTurnStarted = useCallback((data: { turnIndex: number; entityId: string; entityType: 'character' | 'monster' }) => {
    const myTurn = data.entityType === 'character' && data.entityId === myCharacterId;
    setIsMyTurn(myTurn);
    setCurrentTurnEntityId(data.entityId);

    const turnOrderEntry = turnOrder.find(t => t.entityId === data.entityId);
    const entityName = turnOrderEntry ? turnOrderEntry.name : (data.entityType === 'monster' ? 'Monster' : 'Character');

    if (myTurn) {
      addLog([{ text: 'Your turn has started.', color: 'gold' }]);
    } else {
      addLog([{ text: `${entityName}'s turn.` }]);
    }

    if (!myTurn) {
      deselectAll();
      setSelectedCharacterId(null);
    }
  }, [myCharacterId, deselectAll, addLog, turnOrder]);

  const handleGameStateUpdate = useCallback((data: { gameState: unknown }) => {
    console.log('Game state update:', data);
  }, []);

  const handleConnectionStatusChange = useCallback((status: 'connected' | 'disconnected' | 'reconnecting') => {
    setConnectionStatus(status);
  }, []);

  const handleMonsterActivated = useCallback((data: MonsterActivatedPayload) => {
    const logParts: LogMessagePart[] = [{ text: data.monsterName, color: 'orange' }];

    // Movement
    if (data.movementDistance > 0) {
      logParts.push({ text: ' moved ' });
      logParts.push({ text: `${data.movementDistance}`, color: 'blue' });
      logParts.push({ text: ' hexes' });
      if (data.attack) {
        logParts.push({ text: ' and' });
      }
    }
    updateMonsterPosition(data.monsterId, data.movement);

    // Attack
    if (data.attack) {
      const { targetId, baseDamage, damage, modifier, effects } = data.attack;

      if (modifier === 'null') {
        logParts.push({ text: "'s attack missed " });
        logParts.push({ text: data.focusTargetName, color: 'lightblue' });
        logParts.push({ text: formatModifier(modifier) });
      } else {
        logParts.push({ text: ' attacked ' });
        logParts.push({ text: data.focusTargetName, color: 'lightblue' });
        logParts.push({ text: ' for ' });
        logParts.push({ text: `${damage}`, color: 'red' });
        if (modifier === 'x2') {
          logParts.push({ text: ` (${baseDamage} base${formatModifier(modifier)})` });
        } else {
          logParts.push({ text: ` (${baseDamage}${formatModifier(modifier)})` });
        }

        // Effects
        if (effects.length > 0) {
          logParts.push({ text: ' and applied ' });
          effects.forEach((effect, i) => {
            logParts.push({ text: effect, color: getEffectColor(effect) });
            if (i < effects.length - 1) {
              logParts.push({ text: ' and ' });
            }
          });
        }
      }
      logParts.push({ text: '.' });

      if (gameData) {
        const targetCharacter = gameData.characters.find(c => c.id === targetId);
        if (targetCharacter) {
          const newHealth = Math.max(0, targetCharacter.health - damage);
          updateCharacterHealth(targetId, newHealth);
          if (newHealth <= 0) {
            addLog([{ text: `${data.focusTargetName} was killed!`, color: 'red' }]);
            removeCharacter(targetId);
          }
          targetCharacter.health = newHealth;
        }
      }
    } else {
      logParts.push({ text: '.' });
    }
    addLog(logParts);
  }, [addLog, updateMonsterPosition, gameData, updateCharacterHealth, removeCharacter]);


  const handleAttackResolved = useCallback((data: AttackResolvedPayload) => {
    const logParts: LogMessagePart[] = [];
    logParts.push({ text: data.attackerName, color: 'lightblue' });

    if (data.modifier === 'null') {
      logParts.push({ text: "'s attack missed " });
      logParts.push({ text: data.targetName, color: 'orange' });
      logParts.push({ text: formatModifier(data.modifier) });
    } else {
      logParts.push({ text: ' attacked ' });
      logParts.push({ text: data.targetName, color: 'orange' });
      logParts.push({ text: ' for ' });
      logParts.push({ text: `${data.damage}`, color: 'red' });
      if (data.modifier === 'x2') {
        logParts.push({ text: ` (${data.baseDamage} base${formatModifier(data.modifier)})` });
      } else {
        logParts.push({ text: ` (${data.baseDamage}${formatModifier(data.modifier)})` });
      }

      if (data.effects.length > 0) {
        logParts.push({ text: ' and applied ' });
        data.effects.forEach((effect, i) => {
          logParts.push({ text: effect, color: getEffectColor(effect) });
          if (i < data.effects.length - 1) {
            logParts.push({ text: ' and ' });
          }
        });
      }
    }
    logParts.push({ text: '.' });
    addLog(logParts);

    // Update target health
    if (gameData) {
      const isCharacter = gameData.characters.some(c => c.id === data.targetId);
      const isMonster = gameData.monsters.some(m => m.id === data.targetId);

      if (isCharacter) {
        updateCharacterHealth(data.targetId, data.targetHealth);
        if (data.targetDead) {
          addLog([{ text: `${data.targetName} was killed!`, color: 'red' }]);
          removeCharacter(data.targetId);
        }
      } else if (isMonster) {
        updateMonsterHealth(data.targetId, data.targetHealth);
        if (data.targetDead) {
          addLog([{ text: `${data.targetName} was killed!`, color: 'red' }]);
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
      if (playerHand.length > 0) {
        setShowCardSelection(true);
      }
    });
  }, [playerHand]);

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
    if (!selectedTopAction) {
      setSelectedTopAction(card);
    } else if (!selectedBottomAction && card.id !== selectedTopAction.id) {
      setSelectedBottomAction(card);
    }
  }, [selectedTopAction, selectedBottomAction]);

  const handleConfirmCardSelection = useCallback(() => {
    if (selectedTopAction && selectedBottomAction) {
      websocketService.selectCards(selectedTopAction.id, selectedBottomAction.id);
      addLog([
          { text: 'Cards selected: '},
          { text: selectedTopAction.name, color: 'white' },
          { text: ' and ' },
          { text: selectedBottomAction.name, color: 'white' }
      ]);
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

  const handleEndTurn = useCallback(() => {
    if (isMyTurn) {
      websocketService.endTurn();
      addLog([{ text: 'Turn ended.' }]);
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
