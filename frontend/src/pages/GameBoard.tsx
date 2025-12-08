/**
 * GameBoard Page Component
 *
 * Main game interface with hex grid rendering and character movement.
 * Refactored with new layout:
 * - GamePanel: Hex map container
 * - InfoPanel: TurnStatus + GameLog (or CardSelectionPanel when active)
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { GameBoardData } from '../game/HexGrid';
import type { CharacterData } from '../game/CharacterSprite';
import { gameStateManager } from '../services/game-state.service';
import { gameSessionCoordinator } from '../services/game-session-coordinator.service';
import { roomSessionManager } from '../services/room-session.service';
import { websocketService } from '../services/websocket.service';
import { CardSelectionPanel } from '../components/CardSelectionPanel';
import type { Monster, HexTile, Character } from '../../../shared/types/entities.ts';
import { TerrainType } from '../../../shared/types/entities.ts';
import type {
  ObjectivesLoadedPayload,
  ObjectiveProgressUpdatePayload,
  ScenarioCompletedPayload,
} from '../../../shared/types/events';
import type { ScenarioResult } from '../components/ScenarioCompleteModal';
import { ScenarioCompleteModal } from '../components/ScenarioCompleteModal';
import { GamePanel } from '../components/game/GamePanel';
import { InfoPanel } from '../components/game/InfoPanel';
import { TurnStatus } from '../components/game/TurnStatus';
import { GameLog } from '../components/game/GameLog';
import { GameHints } from '../components/game/GameHints';
import { ReconnectingOverlay } from '../components/game/ReconnectingOverlay';
import { ObjectiveTracker } from '../components/game/ObjectiveTracker';
import { useHexGrid } from '../hooks/useHexGrid';
import { useGameState } from '../hooks/useGameState';
import { useFullscreen, exitFullscreen } from '../hooks/useFullscreen';
import styles from './GameBoard.module.css';

export function GameBoard() {
  const navigate = useNavigate();
  const { roomCode } = useParams<{ roomCode: string }>();
  const gameState = useGameState();
  const containerRef = useRef<HTMLDivElement>(null);

  // Objective and completion state
  const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(null);
  const [objectives, setObjectives] = useState<ObjectivesLoadedPayload | null>(null);
  const [objectiveProgress, setObjectiveProgress] = useState<Map<string, ObjectiveProgressUpdatePayload>>(new Map());

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

    const handlePopState = () => {
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

  // Initialize game session when component mounts
  useEffect(() => {
    if (!roomCode) {
      return;
    }

    const initializeGame = async () => {
      try {
        console.log('[GameBoard] Ensuring joined to room:', roomCode);
        // Ensure we're joined to the room with 'refresh' intent
        // This will trigger the backend to send game_started event with current state
        await roomSessionManager.ensureJoined('refresh');
        console.log('[GameBoard] Join request sent successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to join game';
        console.error('[GameBoard] Failed to join game:', errorMessage);
      }
    };

    initializeGame();
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

  // Extract objectives from game state when it loads (Primary method)
  useEffect(() => {
    if (gameState.gameData?.objectives) {
      console.log('[GameBoard] ✅ Objectives loaded from game state:', {
        primary: {
          id: gameState.gameData.objectives.primary.id,
          description: gameState.gameData.objectives.primary.description,
          trackProgress: gameState.gameData.objectives.primary.trackProgress,
        },
        secondary: gameState.gameData.objectives.secondary?.length || 0,
        failureConditions: gameState.gameData.objectives.failureConditions?.length || 0,
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setObjectives(gameState.gameData.objectives);
    } else {
      console.log('[GameBoard] ⚠️ No objectives in game state');
    }
  }, [gameState.gameData]);

  // WebSocket event listeners for objective progress and completion
  useEffect(() => {
    console.log('[GameBoard] Registering objective_progress listener');

    // Objective progress updates
    const unsubObjectiveProgress = websocketService.on('objective_progress', (payload: ObjectiveProgressUpdatePayload) => {
      console.log('[GameBoard] ✅ Received objective_progress event:', {
        objectiveId: payload.objectiveId,
        description: payload.description,
        progress: `${payload.current}/${payload.target}`,
        percentage: payload.percentage,
        milestone: payload.milestone,
      });
      setObjectiveProgress(prev => {
        const newMap = new Map(prev);
        newMap.set(payload.objectiveId, payload);
        console.log('[GameBoard] Updated progress map, now has', newMap.size, 'entries');
        return newMap;
      });
    });

    // Scenario completed
    const unsubScenarioCompleted = websocketService.on('scenario_completed', (payload: ScenarioCompletedPayload) => {
      console.log('[GameBoard] Scenario completed:', payload);

      // Build player stats with names
      const playerStats = payload.playerStats.map(s => {
        const character = gameState.gameData?.characters.find(c => c.playerId === s.playerId);
        return {
          playerName: s.playerId, // TODO: Map to actual player name from room data
          characterClass: character?.classType || 'Unknown',
          damageDealt: s.damageDealt,
          damageTaken: s.damageTaken,
          monstersKilled: s.monstersKilled,
          cardsLost: s.cardsLost,
        };
      });

      const result: ScenarioResult = {
        victory: payload.victory,
        scenarioName: gameState.gameData?.scenarioName || 'Unknown Scenario',
        roundsCompleted: gameState.currentRound || 0,
        lootCollected: payload.loot.reduce((sum, p) => sum + p.gold, 0),
        experienceGained: payload.experience,
        goldEarned: payload.loot.reduce((sum, p) => sum + p.gold, 0),
        objectivesCompleted: [
          ...(payload.primaryObjectiveCompleted && objectives?.primary?.description
            ? [objectives.primary.description]
            : []),
          ...(payload.secondaryObjectivesCompleted?.map(id => {
            const secondaryObj = objectives?.secondary?.find(obj => obj.id === id);
            return secondaryObj?.description || id;
          }) || []),
        ],
        playerStats,
      };

      setScenarioResult(result);
    });

    return () => {
      unsubObjectiveProgress();
      unsubScenarioCompleted();
    };
  }, [gameState.gameData, gameState.currentRound, objectives]);

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

  const handleReturnToLobby = useCallback(async () => {
    if (!roomCode) return;

    // Emit leave_game event
    websocketService.emit('leave_game', { roomCode });

    // Clean up game state
    gameSessionCoordinator.switchGame();

    // Navigate to lobby
    navigate('/');
  }, [roomCode, navigate]);

  const handlePlayAgain = useCallback(() => {
    // Future enhancement: restart scenario
    // For now, just close the modal
    setScenarioResult(null);
  }, []);

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

  // Transform TurnEntity[] to TurnOrderEntity[] with health information
  const turnOrderWithHealth = gameState.turnOrder.map((entity) => {
    const character = gameState.gameData?.characters.find((c) => c.id === entity.entityId);
    const monster = gameState.gameData?.monsters.find((m) => m.id === entity.entityId);

    return {
      id: entity.entityId,
      name: entity.name,
      initiative: entity.initiative,
      type: entity.entityType,
      currentHealth: character?.health ?? monster?.health,
      maxHealth: character?.maxHealth ?? monster?.maxHealth,
      isExhausted: character?.isExhausted ?? false,
      classType: character?.classType,
      isElite: monster?.isElite,
    };
  });

  return (
    <div className={styles.gameBoardPage}>
      {/* Game Panel - Left/Top: Hex Map */}
      <GamePanel ref={containerRef} />

      {/* Info Panel - Right/Bottom: TurnStatus + GameLog OR CardSelection */}
      <InfoPanel
        showCardSelection={gameState.showCardSelection}
        turnStatus={
          <TurnStatus
            turnOrder={turnOrderWithHealth}
            currentTurnEntityId={gameState.currentTurnEntityId}
            currentRound={gameState.currentRound}
            characters={(gameState.gameData?.characters || []) as Character[]}
            monsters={(gameState.gameData?.monsters || []) as Monster[]}
            connectionStatus={gameState.connectionStatus}
            isMyTurn={gameState.isMyTurn}
            hasAttack={attackAction !== null}
            hasMove={moveAction !== null}
            attackMode={gameState.attackMode}
            onAttackClick={handleAttackClick}
            onMoveClick={handleMoveClick}
            onEndTurn={() => gameStateManager.endTurn()}
            onBackToLobby={handleBackToLobby}
            objectivesSlot={<ObjectiveTracker objectives={objectives} progress={objectiveProgress} />}
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

      {/* Scenario Complete Modal */}
      {scenarioResult && (
        <ScenarioCompleteModal
          result={scenarioResult}
          onClose={() => setScenarioResult(null)}
          onReturnToLobby={handleReturnToLobby}
          onPlayAgain={handlePlayAgain}
        />
      )}
    </div>
  );
}
