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

import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HexGrid, type GameBoardData } from '../game/HexGrid';
import type { HexTileData } from '../game/HexTile';
import type { CharacterData } from '../game/CharacterSprite';
import { websocketService } from '../services/websocket.service';
import type { Axial } from '../game/hex-utils';
import { CardSelectionPanel } from '../components/CardSelectionPanel';
import type { AbilityCard, Monster } from '../../../shared/types/entities';

export function GameBoard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const hexGridRef = useRef<HexGrid | null>(null);

  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [myCharacterId, setMyCharacterId] = useState<string | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');

  // Store game data until HexGrid is ready (fixes race condition)
  const [pendingGameData, setPendingGameData] = useState<{
    scenarioId: string;
    scenarioName: string;
    mapLayout: { coordinates: { q: number; r: number }; terrain: string; occupiedBy: string | null; hasLoot: boolean; hasTreasure: boolean }[];
    monsters: { id: string; monsterType: string; isElite: boolean; currentHex: { q: number; r: number }; health: number; maxHealth: number; conditions: string[] }[];
    characters: { id: string; playerId: string; classType: string; health: number; maxHealth: number; currentHex: { q: number; r: number }; conditions: string[]; isExhausted: boolean; abilityDeck?: { name: string; level: string | number; initiative: number }[] }[]
  } | null>(null);

  // Card selection state (T111, T181)
  const [showCardSelection, setShowCardSelection] = useState(false);
  const [playerHand, setPlayerHand] = useState<AbilityCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<{ top: string | null; bottom: string | null }>({ top: null, bottom: null });

  // Attack targeting state (T115)
  const [attackMode, setAttackMode] = useState(false);
  const [attackableTargets, setAttackableTargets] = useState<string[]>([]);

  // Event handlers - defined before useEffects that use them
  const handleGameStarted = useCallback((data: {
    scenarioId: string;
    scenarioName: string;
    mapLayout: { coordinates: { q: number; r: number }; terrain: string; occupiedBy: string | null; hasLoot: boolean; hasTreasure: boolean }[];
    monsters: { id: string; monsterType: string; isElite: boolean; currentHex: { q: number; r: number }; health: number; maxHealth: number; conditions: string[] }[];
    characters: { id: string; playerId: string; classType: string; health: number; maxHealth: number; currentHex: { q: number; r: number }; conditions: string[]; isExhausted: boolean; abilityDeck?: { name: string; level: string | number; initiative: number }[] }[]
  }) => {
    console.log('handleGameStarted called with data:', data);
    console.log('handleGameStarted: Received mapLayout with', data.mapLayout?.length || 0, 'tiles');

    // Store the game data - it will be rendered when HexGrid is ready
    setPendingGameData(data);

    // Find my character from the characters array using playerUUID from localStorage
    const playerUUID = websocketService.getPlayerUUID();
    console.log('My playerUUID:', playerUUID);
    console.log('Characters:', data.characters);

    const myCharacter = data.characters.find((char) => char.playerId === playerUUID);
    console.log('My character:', myCharacter);

    if (myCharacter) {
      setMyCharacterId(myCharacter.id);
      console.log('Set myCharacterId to:', myCharacter.id);

      // T181: Load character's unique ability deck
      if (myCharacter.abilityDeck && Array.isArray(myCharacter.abilityDeck)) {
        console.log('Loading ability deck for character:', myCharacter.classType);
        console.log('Ability deck:', myCharacter.abilityDeck);
        setPlayerHand(myCharacter.abilityDeck as never[]);

        // Show card selection at start of first turn
        // In a real game, this would be triggered by turn_started event
        setShowCardSelection(true);
      } else {
        console.warn('No ability deck found for character!');
      }
    } else {
      console.error('Could not find my character in the characters array!');
    }
  }, []);

  const handleCharacterMoved = useCallback((data: { characterId: string; fromHex: Axial; toHex: Axial; movementPath: Axial[] }) => {
    if (!hexGridRef.current) return;

    hexGridRef.current.moveCharacter(data.characterId, data.toHex);
    hexGridRef.current.deselectAll();
    setSelectedCharacterId(null);
  }, []);

  const handleNextTurn = useCallback((data: { turnIndex: number; entityId: string; entityType: 'character' | 'monster' }) => {
    console.log('handleNextTurn called with data:', data);
    console.log('myCharacterId:', myCharacterId);

    // Check if it's current player's turn by comparing entityId with my character ID
    const myTurn = data.entityType === 'character' && data.entityId === myCharacterId;
    console.log('Is my turn?', myTurn);

    setIsMyTurn(myTurn);

    if (!myTurn) {
      // Deselect character when not our turn
      hexGridRef.current?.deselectAll();
      setSelectedCharacterId(null);
    }
  }, [myCharacterId]);

  const handleGameStateUpdate = useCallback((data: { gameState: unknown }) => {
    // Handle full game state updates (for reconnection, etc.)
    console.log('Game state update:', data);
  }, []);

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

  // T115: Attack target selection handlers
  const handleMonsterSelect = useCallback((monsterId: string) => {
    if (!attackMode || !isMyTurn) return;

    if (attackableTargets.includes(monsterId)) {
      // Confirm attack
      websocketService.attackTarget(monsterId);
      setAttackMode(false);
      setAttackableTargets([]);
    }
  }, [attackMode, isMyTurn, attackableTargets]);

  // T071: Character movement implementation
  const handleCharacterSelect = useCallback((characterId: string) => {
    if (!isMyTurn) {
      console.log('Not your turn');
      return;
    }

    setSelectedCharacterId(characterId);
  }, [isMyTurn]);

  const handleHexClick = useCallback((hex: Axial) => {
    if (!selectedCharacterId) return;
    if (!isMyTurn) {
      console.log('Not your turn');
      return;
    }

    // Emit move event to server
    websocketService.moveCharacter(hex);

    // Optimistic update (server will confirm or reject)
    // The server response will trigger handleCharacterMoved
  }, [selectedCharacterId, isMyTurn]);

  // Initialize hex grid
  useEffect(() => {
    console.log('=== HEX GRID INITIALIZATION EFFECT ===');
    console.log('containerRef.current:', containerRef.current ? 'EXISTS' : 'NULL');
    console.log('hexGridRef.current:', hexGridRef.current ? 'ALREADY INITIALIZED' : 'NULL');

    if (!containerRef.current || hexGridRef.current) {
      console.log('Skipping HexGrid init - already initialized or no container');
      return;
    }

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    console.log('🎨 Container dimensions:', { width, height });

    const hexGrid = new HexGrid(containerRef.current, {
      width,
      height,
      onHexClick: handleHexClick,
      onCharacterSelect: handleCharacterSelect,
      onMonsterSelect: handleMonsterSelect,
    });
    console.log('🎨 HexGrid instance created, starting async initialization...');

    // Initialize the HexGrid asynchronously (PixiJS v8 requirement)
    let mounted = true;
    let initCompleted = false;

    hexGrid.init().then(() => {
      console.log('✅ HexGrid.init() promise resolved!');
      initCompleted = true;
      if (mounted) {
        hexGridRef.current = hexGrid;
        console.log('✅ HexGrid reference set! Ready to render game data.');
      } else {
        console.log('⚠️ Component unmounted before init completed');
      }
      // Note: Don't destroy here if unmounted - the cleanup function will handle it
    }).catch((error) => {
      console.error('❌ Failed to initialize HexGrid:', error);
      initCompleted = true; // Mark as completed even on error
    });

    // Handle resize
    const handleResize = () => {
      if (containerRef.current && hexGridRef.current) {
        hexGridRef.current.resize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      mounted = false;
      window.removeEventListener('resize', handleResize);

      // Only try to destroy if init has completed
      // Otherwise, the PixiJS app hasn't been created yet and there's nothing to cleanup
      if (initCompleted && hexGrid) {
        try {
          hexGrid.destroy();
        } catch (error) {
          console.error('Error destroying HexGrid:', error);
        }
      }

      // Clear the ref
      hexGridRef.current = null;
    };
  }, [handleHexClick, handleCharacterSelect, handleMonsterSelect]);

  // Render game data when HexGrid is ready (fixes race condition)
  useEffect(() => {
    console.log('=== RENDER GAME DATA EFFECT TRIGGERED ===');
    console.log('hexGridRef.current:', hexGridRef.current ? 'EXISTS' : 'NULL');
    console.log('pendingGameData:', pendingGameData ? 'EXISTS' : 'NULL');

    if (!hexGridRef.current) {
      console.log('⏳ HexGrid not ready yet - waiting for initialization');
      return;
    }

    if (!pendingGameData) {
      console.log('⏳ No pending game data yet');
      return;
    }

    console.log('✅ HexGrid is ready and game data is available - initializing board');
    console.log('📦 pendingGameData:', JSON.stringify(pendingGameData, null, 2));

    // Initialize board with the map layout and entities
    const boardData: GameBoardData = {
      tiles: pendingGameData.mapLayout as HexTileData[],
      characters: pendingGameData.characters as CharacterData[],
      monsters: pendingGameData.monsters as Monster[],
    };

    console.log('🎮 Calling hexGridRef.current.initializeBoard with boardData containing:');
    console.log('  - Tiles:', boardData.tiles.length);
    console.log('  - Characters:', boardData.characters.length);
    console.log('  - Monsters:', boardData.monsters.length);

    try {
      hexGridRef.current.initializeBoard(boardData);
      console.log('✅ Board initialized successfully!');

      // Clear pending data after rendering
      setPendingGameData(null);
      console.log('✅ Cleared pending game data');
    } catch (error) {
      console.error('❌ ERROR initializing board:', error);
    }
  }, [pendingGameData]); // Only depend on pendingGameData, not hexGridRef

  // Auto-rejoin room when GameBoard mounts to get game state
  useEffect(() => {
    const roomCode = localStorage.getItem('currentRoomCode');
    const playerUUID = localStorage.getItem('playerUUID');
    const nickname = localStorage.getItem('playerNickname');

    if (roomCode && playerUUID && nickname) {
      console.log(`GameBoard mounted - rejoining room ${roomCode} to get game state`);
      // Wait for WebSocket to be connected before rejoining
      if (websocketService.isConnected()) {
        websocketService.joinRoom(roomCode, nickname, playerUUID);
      } else {
        // Wait for connection then rejoin
        const handleConnected = () => {
          console.log('WebSocket connected, now joining room');
          websocketService.joinRoom(roomCode, nickname, playerUUID);
          websocketService.off('ws_connected', handleConnected);
        };
        websocketService.on('ws_connected', handleConnected);
      }
    } else {
      console.error('Cannot rejoin room - missing roomCode, playerUUID, or nickname');
      navigate('/');
    }
  }, [navigate]);

  // Setup WebSocket event listeners
  useEffect(() => {
    // Connection status
    websocketService.on('ws_connected', () => setConnectionStatus('connected'));
    websocketService.on('ws_disconnected', () => setConnectionStatus('disconnected'));
    websocketService.on('ws_reconnecting', () => setConnectionStatus('reconnecting'));

    // Game events
    console.log('Registering game_started event listener');
    websocketService.on('game_started', handleGameStarted);
    console.log('game_started listener registered');
    websocketService.on('character_moved', handleCharacterMoved);
    websocketService.on('turn_started', handleNextTurn);
    websocketService.on('game_state_update', handleGameStateUpdate);

    return () => {
      websocketService.off('ws_connected');
      websocketService.off('ws_disconnected');
      websocketService.off('ws_reconnecting');
      websocketService.off('game_started');
      websocketService.off('character_moved');
      websocketService.off('turn_started');
      websocketService.off('game_state_update');
    };
  }, [handleGameStarted, handleCharacterMoved, handleNextTurn, handleGameStateUpdate]);

  const handleLeaveGame = () => {
    websocketService.leaveRoom();
    navigate('/');
  };

  return (
    <div className="game-board-page">
      <header className="game-header">
        <div className="game-info">
          <h2>{t('game:title', 'Hexhaven Battle')}</h2>
          <div className="turn-indicator">
            {isMyTurn ? (
              <span className="your-turn">{t('game:yourTurn', 'Your Turn')}</span>
            ) : (
              <span className="waiting">{t('game:opponentTurn', "Opponent's Turn")}</span>
            )}
          </div>
        </div>

        <div className="game-controls">
          <div className={`connection-status ${connectionStatus}`}>
            <span className="status-dot" />
            <span className="status-text">
              {t(`game:connection.${connectionStatus}`, connectionStatus)}
            </span>
          </div>

          <button className="leave-button" onClick={handleLeaveGame}>
            {t('game:leaveGame', 'Leave Game')}
          </button>
        </div>
      </header>

      <div ref={containerRef} className="game-container" />

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

      {/* T115: Attack Mode Indicator */}
      {attackMode && (
        <div className="attack-mode-hint">
          {t('game:attackHint', 'Select an enemy to attack')}
        </div>
      )}

      {selectedCharacterId && isMyTurn && !attackMode && (
        <div className="movement-hint">
          {t('game:movementHint', 'Tap a highlighted hex to move your character')}
        </div>
      )}

      {connectionStatus === 'reconnecting' && (
        <div className="reconnecting-overlay">
          <div className="reconnecting-message">
            <div className="spinner" />
            <p>{t('game:reconnecting', 'Reconnecting...')}</p>
          </div>
        </div>
      )}

      <style>{`
        .game-board-page {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: #1a1a1a;
          color: #ffffff;
          overflow: hidden;
        }

        .game-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background: #2c2c2c;
          border-bottom: 2px solid #333;
          flex-shrink: 0;
        }

        .game-info h2 {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 600;
        }

        .turn-indicator {
          font-size: 14px;
        }

        .your-turn {
          padding: 4px 12px;
          background: #4ade80;
          color: #000;
          font-weight: 600;
          border-radius: 12px;
        }

        .waiting {
          color: #888;
        }

        .game-controls {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .connection-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 13px;
        }

        .connection-status.connected {
          background: rgba(74, 222, 128, 0.1);
          color: #4ade80;
        }

        .connection-status.disconnected {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        .connection-status.reconnecting {
          background: rgba(251, 191, 36, 0.1);
          color: #fbbf24;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
        }

        .leave-button {
          padding: 8px 16px;
          font-size: 14px;
          color: #ef4444;
          background: transparent;
          border: 1px solid #ef4444;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .leave-button:hover {
          background: rgba(239, 68, 68, 0.1);
        }

        .game-container {
          flex: 1;
          position: relative;
          overflow: hidden;
        }

        .movement-hint,
        .attack-mode-hint {
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          padding: 12px 24px;
          background: rgba(90, 159, 212, 0.9);
          color: #ffffff;
          font-size: 14px;
          font-weight: 500;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          pointer-events: none;
          animation: slideUp 0.3s ease-out;
        }

        .attack-mode-hint {
          background: rgba(239, 68, 68, 0.9);
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }

        .reconnecting-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .reconnecting-message {
          text-align: center;
        }

        .spinner {
          width: 48px;
          height: 48px;
          margin: 0 auto 16px;
          border: 4px solid #444;
          border-top-color: #5a9fd4;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .reconnecting-message p {
          margin: 0;
          font-size: 18px;
          color: #ffffff;
        }

        @media (max-width: 768px) {
          .game-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .game-controls {
            width: 100%;
            justify-content: space-between;
          }

          .movement-hint {
            bottom: 16px;
            left: 16px;
            right: 16px;
            transform: none;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
