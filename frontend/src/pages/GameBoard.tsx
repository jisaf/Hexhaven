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

import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { GameBoardData } from '../game/HexGrid';
import type { CharacterData } from '../game/CharacterSprite';
import { gameSessionCoordinator } from '../services/game-session-coordinator.service';
import { gameStateManager } from '../services/game-state.service';
import { CardSelectionPanel } from '../components/CardSelectionPanel';
import type { Monster, HexTile } from '../../../shared/types/entities.ts';
import { TerrainType } from '../../../shared/types/entities.ts';
import { GameHUD } from '../components/game/GameHUD';
import { GameHints } from '../components/game/GameHints';
import { ReconnectingOverlay } from '../components/game/ReconnectingOverlay';
import { ActionButtons } from '../components/game/ActionButtons';
import { useHexGrid } from '../hooks/useHexGrid';
import { useGameState } from '../hooks/useGameState';
import TurnOrder from '../components/TurnOrder';
import styles from './GameBoard.module.css';

export function GameBoard() {
  const navigate = useNavigate();
  const { roomCode } = useParams<{ roomCode: string }>();
  const containerRef = useRef<HTMLDivElement>(null);
  const gameState = useGameState();

  // Redirect to lobby if no roomCode provided
  useEffect(() => {
    if (!roomCode) {
      navigate('/');
    }
  }, [roomCode, navigate]);

  // CENTRALIZED CLEANUP: Reset all session state when navigating to different game
  useEffect(() => {
    if (roomCode) {
      console.log('[GameBoard] Room code changed, resetting session for:', roomCode);
      gameSessionCoordinator.switchGame(); // ✅ Complete atomic operation
    }
  }, [roomCode]);

  const {
    hexGridReady,
    initializeBoard,
    showMovementRange,
    showAttackRange,
    clearAttackRange,
    setSelectedHex,
    moveCharacter,
    updateMonsterPosition,
    updateCharacterHealth,
    updateMonsterHealth,
  } = useHexGrid(containerRef, {
    onHexClick: (hex) => gameStateManager.selectHex(hex),
    onCharacterSelect: (id) => gameStateManager.selectCharacter(id),
    onMonsterSelect: (id) => gameStateManager.selectAttackTarget(id),
  });

  // Register visual update callbacks with gameStateManager
  useEffect(() => {
    if (hexGridReady) {
      gameStateManager.registerVisualCallbacks({
        moveCharacter,
        updateMonsterPosition,
        updateCharacterHealth,
        updateMonsterHealth,
      });
    }
  }, [hexGridReady, moveCharacter, updateMonsterPosition, updateCharacterHealth, updateMonsterHealth]);

  useEffect(() => {
    if (hexGridReady) {
        showMovementRange(gameState.validMovementHexes);
    }
  }, [gameState.validMovementHexes, hexGridReady, showMovementRange]);

  useEffect(() => {
    if (hexGridReady) {
        setSelectedHex(gameState.selectedHex);
    }
  }, [gameState.selectedHex, hexGridReady, setSelectedHex]);

  useEffect(() => {
    if (hexGridReady) {
      if (gameState.attackMode && gameState.validAttackHexes.length > 0) {
        showAttackRange(gameState.validAttackHexes);
      } else {
        clearAttackRange();
      }
    }
  }, [gameState.attackMode, gameState.validAttackHexes, hexGridReady, showAttackRange, clearAttackRange]);


  // Render game data when HexGrid is ready
  useEffect(() => {
    if (hexGridReady && gameState.gameData) {
      const typedTiles: HexTile[] = gameState.gameData.mapLayout.map(tile => ({
        ...tile,
        terrain: tile.terrain as TerrainType,
        features: (tile as HexTile).features ?? [],
        triggers: (tile as HexTile).triggers ?? [],
      }));

      const boardData: GameBoardData = {
        tiles: typedTiles,
        characters: gameState.gameData.characters as CharacterData[],
        monsters: (gameState.gameData.monsters as Monster[]) || [],
      };

      initializeBoard(boardData);
    }
  }, [hexGridReady, gameState.gameData, initializeBoard]);


  const handleBackToLobby = () => {
    navigate('/');
  };

  const handleAttackClick = () => {
    const attackAction = gameStateManager.getAttackAction();
    if (attackAction && gameState.myCharacterId) {
      gameStateManager.enterAttackMode(gameState.myCharacterId, attackAction.range);
    }
  };

  const handleMoveClick = () => {
    gameStateManager.enterMoveMode();
  };

  const attackAction = gameStateManager.getAttackAction();
  const moveAction = gameStateManager.getMoveAction();

  const gameBoardClass = `${styles.gameBoardPage} ${gameState.showCardSelection ? styles.cardSelectionActive : ''}`;

  return (
    <div className={gameBoardClass}>
      <div ref={containerRef} className={styles.gameContainer} />

      <div className={styles.rightPanel}>
        {gameState.currentRound > 0 && (
          <TurnOrder
            turnOrder={gameState.turnOrder}
            currentTurnEntityId={gameState.currentTurnEntityId}
            currentRound={gameState.currentRound}
            characters={gameState.gameData?.characters || []}
            monsters={gameState.gameData?.monsters || []}
          />
        )}
        <div className={styles.hudWrapper}>
          <GameHUD
            logs={gameState.logs}
            connectionStatus={gameState.connectionStatus}
            isMyTurn={gameState.isMyTurn}
            onBackToLobby={handleBackToLobby}
            onEndTurn={() => gameStateManager.endTurn()}
          />
        </div>
      </div>

      <div className={styles.bottomPlaceholder} />

      {/* T111: Card Selection Panel */}
      {gameState.showCardSelection && (
        <CardSelectionPanel
          cards={gameState.playerHand}
          onCardSelect={(card) => gameStateManager.selectCard(card)}
          onClearSelection={() => gameStateManager.clearCardSelection()}
          onConfirmSelection={() => gameStateManager.confirmCardSelection()}
          selectedTopAction={gameState.selectedTopAction}
          selectedBottomAction={gameState.selectedBottomAction}
        />
      )}

      <ActionButtons
        hasAttack={attackAction !== null}
        hasMove={moveAction !== null}
        attackMode={gameState.attackMode}
        isMyTurn={gameState.isMyTurn}
        onAttackClick={handleAttackClick}
        onMoveClick={handleMoveClick}
      />

      <GameHints
        attackMode={gameState.attackMode}
        showMovementHint={gameState.selectedCharacterId !== null && gameState.isMyTurn && !gameState.attackMode}
      />

      <ReconnectingOverlay show={gameState.connectionStatus === 'reconnecting'} />
    </div>
  );
}
