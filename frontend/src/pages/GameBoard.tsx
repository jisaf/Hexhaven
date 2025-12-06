/**
 * GameBoard Page Component
 *
 * Main game interface with hex grid rendering and character movement.
 * Refactored with new layout:
 * - GamePanel: Hex map container
 * - InfoPanel: TurnStatus + GameLog (or CardSelectionPanel when active)
 */

import { useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { GameBoardData } from '../game/HexGrid';
import type { CharacterData } from '../game/CharacterSprite';
import { gameStateManager } from '../services/game-state.service';
import { gameSessionCoordinator } from '../services/game-session-coordinator.service';
import { CardSelectionPanel } from '../components/CardSelectionPanel';
import type { Monster, HexTile } from '../../../shared/types/entities.ts';
import { TerrainType } from '../../../shared/types/entities.ts';
import { GamePanel } from '../components/game/GamePanel';
import { InfoPanel } from '../components/game/InfoPanel';
import { TurnStatus } from '../components/game/TurnStatus';
import { GameLog } from '../components/game/GameLog';
import { GameHints } from '../components/game/GameHints';
import { ReconnectingOverlay } from '../components/game/ReconnectingOverlay';
import { useHexGrid } from '../hooks/useHexGrid';
import { useGameState } from '../hooks/useGameState';
import { useFullscreen, exitFullscreen } from '../hooks/useFullscreen';
import styles from './GameBoard.module.css';

export function GameBoard() {
  const navigate = useNavigate();
  const { roomCode } = useParams<{ roomCode: string }>();
  const gameState = useGameState();
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle navigation back (exit fullscreen and go to lobby)
  // Memoized to prevent useFullscreen effect from re-running on every render
  const navigateToLobby = useCallback(async () => {
    // Exit fullscreen if active
    await exitFullscreen();
    // Clean up game state
    gameSessionCoordinator.switchGame();
    // Navigate to lobby
    navigate('/');
  }, [navigate]);

  // Enable fullscreen for game page with ESC key handler
  useFullscreen(true, navigateToLobby);

  // Handle browser back button
  useEffect(() => {
    // Add a history entry when game loads
    window.history.pushState({ gamePage: true }, '');

    const handlePopState = (event: PopStateEvent) => {
      // User pressed back button - exit and navigate
      navigateToLobby();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigateToLobby]);

  // Redirect to lobby if no roomCode provided
  useEffect(() => {
    if (!roomCode) {
      navigate('/');
    }
  }, [roomCode, navigate]);

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
    removeMonster,
    spawnLootToken,
    collectLootToken,
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
        removeMonster,
        spawnLootToken,
        collectLootToken,
      });
    }
  }, [hexGridReady, moveCharacter, updateMonsterPosition, updateCharacterHealth, updateMonsterHealth, removeMonster, spawnLootToken, collectLootToken]);

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
    // User clicked leave game button - exit and navigate
    navigateToLobby();
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

  return (
    <div className={styles.gameBoardPage}>
      {/* Game Panel - Left/Top: Hex Map */}
      <GamePanel ref={containerRef} />

      {/* Info Panel - Right/Bottom: TurnStatus + GameLog OR CardSelection */}
      <InfoPanel
        showCardSelection={gameState.showCardSelection}
        turnStatus={
          <TurnStatus
            turnOrder={gameState.turnOrder}
            currentTurnEntityId={gameState.currentTurnEntityId}
            currentRound={gameState.currentRound}
            characters={gameState.gameData?.characters || []}
            monsters={gameState.gameData?.monsters || []}
            connectionStatus={gameState.connectionStatus}
            isMyTurn={gameState.isMyTurn}
            hasAttack={attackAction !== null}
            hasMove={moveAction !== null}
            attackMode={gameState.attackMode}
            onAttackClick={handleAttackClick}
            onMoveClick={handleMoveClick}
            onEndTurn={() => gameStateManager.endTurn()}
            onBackToLobby={handleBackToLobby}
          />
        }
        gameLog={<GameLog logs={gameState.logs} />}
        cardSelection={
          gameState.showCardSelection ? (
            <CardSelectionPanel
              cards={gameState.playerHand}
              onCardSelect={(card) => gameStateManager.selectCard(card)}
              onClearSelection={() => gameStateManager.clearCardSelection()}
              onConfirmSelection={() => gameStateManager.confirmCardSelection()}
              selectedTopAction={gameState.selectedTopAction}
              selectedBottomAction={gameState.selectedBottomAction}
              waiting={gameState.waitingForRoundStart}
            />
          ) : undefined
        }
      />

      {/* Overlays */}
      <GameHints
        attackMode={gameState.attackMode}
        showMovementHint={gameState.selectedCharacterId !== null && gameState.isMyTurn && !gameState.attackMode}
      />
      <ReconnectingOverlay show={gameState.connectionStatus === 'reconnecting'} />
    </div>
  );
}
