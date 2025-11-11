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
import { websocketService } from '../services/websocket.service';
import type { Axial } from '../game/hex-utils';
import { CardSelectionPanel } from '../components/CardSelectionPanel';
import type { AbilityCardData } from '../components/AbilityCard';

export function GameBoard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const hexGridRef = useRef<HexGrid | null>(null);

  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');

  // Card selection state (T111)
  const [showCardSelection, setShowCardSelection] = useState(false);
  const [playerHand, setPlayerHand] = useState<AbilityCardData[]>([]);
  const [selectedCards, setSelectedCards] = useState<{ top: string | null; bottom: string | null }>({ top: null, bottom: null });

  // Attack targeting state (T115)
  const [attackMode, setAttackMode] = useState(false);
  const [attackableTargets, setAttackableTargets] = useState<string[]>([]);

  // Event handlers - defined before useEffects that use them
  const handleGameStarted = useCallback((data: { gameState: { board: unknown; currentPlayerId: string } }) => {
    if (!hexGridRef.current) return;

    setCurrentPlayerId(data.gameState.currentPlayerId);
    hexGridRef.current.initializeBoard(data.gameState.board as GameBoardData);
  }, []);

  const handleCharacterMoved = useCallback((data: { characterId: string; targetHex: Axial }) => {
    if (!hexGridRef.current) return;

    hexGridRef.current.moveCharacter(data.characterId, data.targetHex);
    hexGridRef.current.deselectAll();
    setSelectedCharacterId(null);
  }, []);

  const handleNextTurn = useCallback((data: { currentTurnIndex: number; entityId: string }) => {
    // Check if it's current player's turn
    const myTurn = data.entityId === currentPlayerId;
    setIsMyTurn(myTurn);

    if (!myTurn) {
      // Deselect character when not our turn
      hexGridRef.current?.deselectAll();
      setSelectedCharacterId(null);
    }
  }, [currentPlayerId]);

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

  const handleInitiateAttack = useCallback(() => {
    if (!isMyTurn) return;

    // TODO: Get attackable targets from game state based on character position and range
    // For now, use a placeholder
    setAttackMode(true);
    setAttackableTargets([]); // Would be populated from actual game state
  }, [isMyTurn]);

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
    if (!containerRef.current || hexGridRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const hexGrid = new HexGrid(containerRef.current, {
      width,
      height,
      onHexClick: handleHexClick,
      onCharacterSelect: handleCharacterSelect,
      onMonsterSelect: handleMonsterSelect,
    });

    hexGridRef.current = hexGrid;

    // Handle resize
    const handleResize = () => {
      if (containerRef.current) {
        hexGrid.resize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      hexGrid.destroy();
      hexGridRef.current = null;
    };
  }, [handleHexClick, handleCharacterSelect, handleMonsterSelect]);

  // Setup WebSocket event listeners
  useEffect(() => {
    // Connection status
    websocketService.on('connect', () => setConnectionStatus('connected'));
    websocketService.on('disconnect', () => setConnectionStatus('disconnected'));
    websocketService.on('reconnecting', () => setConnectionStatus('reconnecting'));

    // Game events
    websocketService.on('game_started', handleGameStarted);
    websocketService.on('character_moved', handleCharacterMoved);
    websocketService.on('next_turn_started', handleNextTurn);
    websocketService.on('game_state_update', handleGameStateUpdate);

    return () => {
      websocketService.off('connect');
      websocketService.off('disconnect');
      websocketService.off('reconnecting');
      websocketService.off('game_started');
      websocketService.off('character_moved');
      websocketService.off('next_turn_started');
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
          <h2>{t('game.title', 'Hexhaven Battle')}</h2>
          <div className="turn-indicator">
            {isMyTurn ? (
              <span className="your-turn">{t('game.yourTurn', 'Your Turn')}</span>
            ) : (
              <span className="waiting">{t('game.opponentTurn', "Opponent's Turn")}</span>
            )}
          </div>
        </div>

        <div className="game-controls">
          <div className={`connection-status ${connectionStatus}`}>
            <span className="status-dot" />
            <span className="status-text">
              {t(`game.connection.${connectionStatus}`, connectionStatus)}
            </span>
          </div>

          <button className="leave-button" onClick={handleLeaveGame}>
            {t('game.leaveGame', 'Leave Game')}
          </button>
        </div>
      </header>

      <div ref={containerRef} className="game-container" />

      {/* T111: Card Selection Panel */}
      {showCardSelection && (
        <CardSelectionPanel
          cards={playerHand}
          selectedTop={selectedCards.top}
          selectedBottom={selectedCards.bottom}
          onSelectCard={handleCardSelect}
          onConfirm={handleConfirmCardSelection}
          onCancel={() => setShowCardSelection(false)}
        />
      )}

      {/* T115: Attack Mode Indicator */}
      {attackMode && (
        <div className="attack-mode-hint">
          {t('game.attackHint', 'Select an enemy to attack')}
        </div>
      )}

      {selectedCharacterId && isMyTurn && !attackMode && (
        <div className="movement-hint">
          {t('game.movementHint', 'Tap a highlighted hex to move your character')}
        </div>
      )}

      {connectionStatus === 'reconnecting' && (
        <div className="reconnecting-overlay">
          <div className="reconnecting-message">
            <div className="spinner" />
            <p>{t('game.reconnecting', 'Reconnecting...')}</p>
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
