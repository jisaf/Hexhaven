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
import { useNavigate } from 'react-router-dom';
import type { GameBoardData } from '../game/HexGrid';
import type { HexTileData } from '../game/HexTile';
import type { CharacterData } from '../game/CharacterSprite';
import { websocketService } from '../services/websocket.service';
import type { Axial } from '../game/hex-utils';
import { CardSelectionPanel } from '../components/CardSelectionPanel';
import type { AbilityCard, Monster } from '../../../shared/types/entities';
import { GameHeader } from '../components/game/GameHeader';
import { GameHints } from '../components/game/GameHints';
import { ReconnectingOverlay } from '../components/game/ReconnectingOverlay';
import { useRoomSession } from '../hooks/useRoomSession';
import { useGameWebSocket } from '../hooks/useGameWebSocket';
import { useHexGrid } from '../hooks/useHexGrid';
import styles from './GameBoard.module.css';

interface GameStartedData {
  characters?: Array<{
    id: string;
    playerId: string;
    abilityDeck?: AbilityCard[];
    [key: string]: unknown;
  }>;
  mapLayout?: HexTileData[];
  monsters?: Monster[];
  [key: string]: unknown;
}

export function GameBoard() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  // State
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [myCharacterId, setMyCharacterId] = useState<string | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');

  // Card selection state (T111, T181)
  const [showCardSelection, setShowCardSelection] = useState(false);
  const [playerHand, setPlayerHand] = useState<AbilityCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<{ top: string | null; bottom: string | null }>({ top: null, bottom: null });

  // Attack targeting state (T115)
  const [attackMode, setAttackMode] = useState(false);
  const [attackableTargets, setAttackableTargets] = useState<string[]>([]);

  // Use custom hooks
  const sessionState = useRoomSession();

  // Memoize callbacks to prevent infinite re-renders
  const handleHexClick = useCallback((hex: Axial) => {
    if (!selectedCharacterId || !isMyTurn) return;
    websocketService.moveCharacter(hex);
  }, [selectedCharacterId, isMyTurn]);

  const handleCharacterSelectClick = useCallback((characterId: string) => {
    if (isMyTurn) {
      setSelectedCharacterId(characterId);
    }
  }, [isMyTurn]);

  const handleMonsterSelectClick = useCallback((monsterId: string) => {
    if (attackMode && isMyTurn && attackableTargets.includes(monsterId)) {
      websocketService.attackTarget(monsterId);
      setAttackMode(false);
      setAttackableTargets([]);
    }
  }, [attackMode, isMyTurn, attackableTargets]);

  // HexGrid hook
  const { hexGridReady, initializeBoard, moveCharacter, deselectAll } = useHexGrid(containerRef, {
    onHexClick: handleHexClick,
    onCharacterSelect: handleCharacterSelectClick,
    onMonsterSelect: handleMonsterSelectClick,
  });

  // Event handlers for WebSocket
  const handleGameStarted = useCallback((data: GameStartedData, ackCallback?: (ack: boolean) => void) => {
    console.log('handleGameStarted called with data:', data);

    try {
      // Find my character
      const playerUUID = websocketService.getPlayerUUID();
      const myCharacter = data.characters?.find(char => char.playerId === playerUUID);

      if (myCharacter) {
        setMyCharacterId(myCharacter.id);

        // Load ability deck
        if (myCharacter.abilityDeck && Array.isArray(myCharacter.abilityDeck)) {
          setPlayerHand(myCharacter.abilityDeck as never[]);
          setShowCardSelection(true);
        }
      }

      // Initialize board if ready
      const boardData: GameBoardData = {
        tiles: data.mapLayout as HexTileData[],
        characters: data.characters as CharacterData[],
        monsters: (data.monsters as Monster[]) || [],
      };

      initializeBoard(boardData, ackCallback);
    } catch (error) {
      console.error('❌ Error processing game_started event:', error);
      if (ackCallback) {
        ackCallback(false);
      }
    }
  }, [initializeBoard]);

  const handleCharacterMoved = useCallback((data: { characterId: string; fromHex: Axial; toHex: Axial; movementPath: Axial[] }) => {
    moveCharacter(data.characterId, data.toHex);
    deselectAll();
    setSelectedCharacterId(null);
  }, [moveCharacter, deselectAll]);

  const handleTurnStarted = useCallback((data: { turnIndex: number; entityId: string; entityType: 'character' | 'monster' }) => {
    const myTurn = data.entityType === 'character' && data.entityId === myCharacterId;
    setIsMyTurn(myTurn);

    if (!myTurn) {
      deselectAll();
      setSelectedCharacterId(null);
    }
  }, [myCharacterId, deselectAll]);

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

  // Render game data when HexGrid is ready
  useEffect(() => {
    if (hexGridReady && sessionState.gameState) {
      const boardData: GameBoardData = {
        tiles: sessionState.gameState.mapLayout as HexTileData[],
        characters: sessionState.gameState.characters as CharacterData[],
        monsters: (sessionState.gameState.monsters as Monster[]) || [],
      };

      initializeBoard(boardData);
    }
  }, [hexGridReady, sessionState.gameState, initializeBoard]);

  // T111: Card selection handlers
  const handleCardSelect = useCallback((cardId: string, slot: 'top' | 'bottom') => {
    setSelectedCards(prev => ({ ...prev, [slot]: cardId }));
  }, []);

  const handleConfirmCardSelection = useCallback(() => {
    if (selectedCards.top && selectedCards.bottom) {
      websocketService.selectCards(selectedCards.top, selectedCards.bottom);
      setShowCardSelection(false);
      setSelectedCards({ top: null, bottom: null });
    }
  }, [selectedCards]);



  const handleLeaveGame = () => {
    websocketService.leaveRoom();
    navigate('/');
  };

  return (
    <div className={styles.gameBoardPage}>
      <GameHeader
        isMyTurn={isMyTurn}
        connectionStatus={connectionStatus}
        onLeaveGame={handleLeaveGame}
      />

      <div ref={containerRef} className={styles.gameContainer} />

      {/* T111: Card Selection Panel */}
      {showCardSelection && (
        <CardSelectionPanel
          cards={playerHand}
          selectedTopCard={selectedCards.top}
          selectedBottomCard={selectedCards.bottom}
          onSelectTop={(cardId) => handleCardSelect(cardId, 'top')}
          onSelectBottom={(cardId) => handleCardSelect(cardId, 'bottom')}
          onConfirm={handleConfirmCardSelection}
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
