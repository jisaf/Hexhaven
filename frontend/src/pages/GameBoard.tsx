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
import { saveLastRoomCode } from '../utils/storage';
import { CardSelectionPanel } from '../components/CardSelectionPanel';
import type { Monster, HexTile, Character, AbilityCard } from '../../../shared/types/entities';
import { TerrainType } from '../../../shared/types/entities';
import type {
  ObjectivesLoadedPayload,
  ObjectiveProgressUpdatePayload,
  ScenarioCompletedPayload,
} from '../../../shared/types/events';
import type { ScenarioResult } from '../components/ScenarioCompleteModal';
import { ScenarioCompleteModal } from '../components/ScenarioCompleteModal';
import { RestModal } from '../components/RestModal';
import { ExhaustionModal } from '../components/ExhaustionModal';
import { GamePanel } from '../components/game/GamePanel';
import { InfoPanel } from '../components/game/InfoPanel';
import { TurnStatus } from '../components/game/TurnStatus';
import { TurnActionPanel } from '../components/game/TurnActionPanel';
import { GameLog } from '../components/game/GameLog';
import { GameHints } from '../components/game/GameHints';
import { ReconnectingOverlay } from '../components/game/ReconnectingOverlay';
import { ObjectiveTracker } from '../components/game/ObjectiveTracker';
import { CardPileIndicator, type PileType } from '../components/game/CardPileIndicator';
import { PileView } from '../components/game/PileView';
import { EntityChipsPanel } from '../components/game/EntityChipsPanel';
import { MonsterAbilityOverlay } from '../components/game/MonsterAbilityOverlay';
import { InventoryTabContent } from '../components/inventory/InventoryTabContent';
import { NarrativeOverlay } from '../components/narrative';
import { useHexGrid } from '../hooks/useHexGrid';
import { useNarrative } from '../hooks/useNarrative';
import { useGameState } from '../hooks/useGameState';
import { useInventory } from '../hooks/useInventory';
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

  // Bottom sheet state - controlled by pile selection
  const [selectedPile, setSelectedPile] = useState<PileType | null>(null);
  const [pileViewCards, setPileViewCards] = useState<AbilityCard[]>([]);
  const closingRef = useRef(false); // Guard against click-through after close

  // Monster ability overlay state
  const [selectedMonster, setSelectedMonster] = useState<Monster | null>(null);

  // Use inventory hook to manage inventory state
  const {
    ownedItems,
    equippedItems,
    itemStates,
    loading: inventoryLoading,
    error: inventoryError,
    useItem,
    equipItem,
    unequipItem,
  } = useInventory({
    characterId: gameState.myUserCharacterId, // Use database ID for inventory API
    enabled: !!gameState.myUserCharacterId,
  });

  // Get player ID for narrative acknowledgment
  const myPlayerId = websocketService.getPlayerUUID();

  // Campaign narrative system
  const {
    activeNarrative,
    isDisplaying: isNarrativeDisplaying,
    acknowledgments: narrativeAcknowledgments,
    myAcknowledgment: narrativeMyAcknowledgment,
    acknowledge: acknowledgeNarrative,
  } = useNarrative(myPlayerId);

  // Handle navigation back (exit fullscreen and go to games hub)
  // Memoized to prevent useFullscreen effect from re-running on every render
  const navigateToGamesHub = useCallback(async () => {
    // Exit fullscreen if active
    await exitFullscreen();
    // Clean up game state
    gameSessionCoordinator.switchGame();
    // Navigate to games hub
    navigate('/games');
  }, [navigate]);

  // Enable fullscreen for game page with ESC key handler
  useFullscreen(true, navigateToGamesHub);

  // Note: Browser back button now works naturally via URL routing (Issue #314)
  // No synthetic history state manipulation needed

  // Redirect to games hub if no roomCode provided
  useEffect(() => {
    if (!roomCode) {
      navigate('/games');
    }
  }, [roomCode, navigate]);

  // Initialize game session when component mounts
  useEffect(() => {
    if (!roomCode) {
      return;
    }

    const initializeGame = async () => {
      try {
        // Save URL roomCode to localStorage so ensureJoined uses the correct room
        // This is critical when navigating directly to /game/:roomCode via URL
        saveLastRoomCode(roomCode);
        // Ensure we're joined to the room with 'refresh' intent
        // This will trigger the backend to send game_started event with current state
        await roomSessionManager.ensureJoined('refresh');
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
    showHealRange,
    clearHealRange,
    showSummonPlacementRange,
    clearSummonPlacementRange,
    setSelectedHex,
    moveCharacter,
    updateMonsterPosition,
    updateCharacterHealth,
    updateMonsterHealth,
    removeMonster,
    spawnMonster,
    spawnLootToken,
    collectLootToken,
    setBackgroundImage, // Issue #191 - auto-fits to 20x20 world
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
        spawnMonster,
        spawnLootToken,
        collectLootToken,
      });
    }
  }, [hexGridReady, moveCharacter, updateMonsterPosition, updateCharacterHealth, updateMonsterHealth, removeMonster, spawnMonster, spawnLootToken, collectLootToken]);

  // Extract objectives from game state when it loads (Primary method)
  // Sanitize to ensure we only have id, description, trackProgress (not type, milestones)
  useEffect(() => {
    if (gameState.gameData?.objectives) {
      const raw = gameState.gameData.objectives;
      // DEBUG: Log what we received from backend
      console.log('[DEBUG-OBJECTIVES] Raw from backend:', JSON.stringify(raw.primary));
      const sanitized = {
        primary: {
          id: raw.primary.id,
          description: raw.primary.description,
          trackProgress: raw.primary.trackProgress ?? true,
        },
        secondary: (raw.secondary || []).map((obj) => ({
          id: obj.id,
          description: obj.description,
          trackProgress: obj.trackProgress ?? true,
          optional: true,
        })),
        failureConditions: (raw.failureConditions || []).map((fc) => ({
          id: fc.id,
          description: fc.description,
        })),
      };
      console.log('[DEBUG-OBJECTIVES] Sanitized (should NOT have type/milestones):', JSON.stringify(sanitized.primary));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setObjectives(sanitized);
    }
  }, [gameState.gameData]);

  // WebSocket event listeners for objective progress and completion
  useEffect(() => {
    // Objective progress updates
    const unsubObjectiveProgress = websocketService.on('objective_progress', (payload: ObjectiveProgressUpdatePayload) => {
      setObjectiveProgress(prev => {
        const newMap = new Map(prev);
        newMap.set(payload.objectiveId, payload);
        return newMap;
      });
    });

    // Scenario completed
    const unsubScenarioCompleted = websocketService.on('scenario_completed', (payload: ScenarioCompletedPayload) => {

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

      // DEBUG: Log objectives state when scenario completes
      console.log('[DEBUG-SCENARIO-COMPLETE] objectives state:', JSON.stringify(objectives?.primary));
      console.log('[DEBUG-SCENARIO-COMPLETE] objectives.primary.description:', objectives?.primary?.description);
      console.log('[DEBUG-SCENARIO-COMPLETE] typeof description:', typeof objectives?.primary?.description);

      const objectivesCompletedArr = [
        ...(payload.primaryObjectiveCompleted && objectives?.primary?.description
          ? [objectives.primary.description]
          : []),
        ...(payload.secondaryObjectivesCompleted?.map(id => {
          const secondaryObj = objectives?.secondary?.find(obj => obj.id === id);
          return secondaryObj?.description || id;
        }) || []),
      ];

      console.log('[DEBUG-SCENARIO-COMPLETE] objectivesCompleted array:', JSON.stringify(objectivesCompletedArr));

      // Calculate total gold and item count from loot
      const totalGold = payload.loot.reduce((sum, p) => sum + p.gold, 0);
      const totalItems = payload.loot.reduce((sum, p) => sum + (p.items?.length || 0), 0);

      const result: ScenarioResult = {
        victory: payload.victory,
        scenarioName: gameState.gameData?.scenarioName || 'Unknown Scenario',
        roundsCompleted: gameState.currentRound || 0,
        lootCollected: totalItems, // Count of items collected (not gold)
        experienceGained: payload.experience,
        goldEarned: totalGold, // Total gold from loot + narrative rewards + victory bonus
        objectivesCompleted: objectivesCompletedArr,
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

  // Issue #411: Heal targeting highlighting (cyan hexes for ally targets)
  useEffect(() => {
    if (hexGridReady) {
      if (gameState.cardActionTargetingMode === 'heal' && gameState.validHealHexes.length > 0) {
        showHealRange(gameState.validHealHexes);
      } else {
        clearHealRange();
      }
    }
  }, [gameState.cardActionTargetingMode, gameState.validHealHexes, hexGridReady, showHealRange, clearHealRange]);

  // Issue #411: Summon placement highlighting (purple hexes for empty placement)
  useEffect(() => {
    if (hexGridReady) {
      if (gameState.cardActionTargetingMode === 'summon' && gameState.validSummonHexes.length > 0) {
        showSummonPlacementRange(gameState.validSummonHexes);
      } else {
        clearSummonPlacementRange();
      }
    }
  }, [gameState.cardActionTargetingMode, gameState.validSummonHexes, hexGridReady, showSummonPlacementRange, clearSummonPlacementRange]);

  // Track whether the board has been initialized to prevent re-initialization on every state change
  const boardInitializedRef = useRef(false);

  // Reset boardInitializedRef when HexGrid is destroyed (hexGridReady becomes false)
  // This ensures we re-initialize when the grid is recreated (e.g., after fullscreen toggle)
  useEffect(() => {
    if (!hexGridReady) {
      boardInitializedRef.current = false;
    }
  }, [hexGridReady]);

  // Initialize board AND background once when HexGrid is ready and game data is available
  // This effect should only run once per game session, not on every state update
  useEffect(() => {
    if (!hexGridReady || !gameState.gameData || boardInitializedRef.current) {
      return;
    }

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
    boardInitializedRef.current = true;

    // Spawn any existing loot tokens (for rejoin)
    if (gameState.gameData.lootTokens && gameState.gameData.lootTokens.length > 0) {
      for (const token of gameState.gameData.lootTokens) {
        spawnLootToken({
          id: token.id,
          coordinates: token.coordinates,
          value: token.value,
        });
      }
      console.log(`[GameBoard] Spawned ${gameState.gameData.lootTokens.length} loot tokens on rejoin`);
    }

    // Load background image immediately after board initialization
    const { backgroundImageUrl, backgroundOpacity = 1 } = gameState.gameData;

    if (backgroundImageUrl) {
      setBackgroundImage(backgroundImageUrl, backgroundOpacity)
        .catch((error) => {
          console.error('[GameBoard] Failed to load background image:', error);
        });
    }
  }, [hexGridReady, gameState.gameData, initializeBoard, setBackgroundImage, spawnLootToken]);

  const handleBackToLobby = () => {
    // User clicked leave game button - exit and navigate
    navigateToGamesHub();
  };

  const handleReturnToLobby = useCallback(async () => {
    if (!roomCode) return;

    // Emit leave_game event
    websocketService.emit('leave_game', { roomCode });

    // Clean up game state
    gameSessionCoordinator.switchGame();

    // Navigate to games hub
    navigate('/games');
  }, [roomCode, navigate]);

  const handlePlayAgain = useCallback(() => {
    // Future enhancement: restart scenario
    // For now, just close the modal
    setScenarioResult(null);
  }, []);

  // Issue #318 - Handle return to campaign after game completion
  const handleReturnToCampaign = useCallback(async () => {
    if (!roomCode || !gameState.campaignId) return;

    try {
      // Emit leave_game event
      websocketService.emit('leave_game', { roomCode });

      // Clean up game state
      gameSessionCoordinator.switchGame();

      // Navigate to campaign details page
      navigate(`/campaigns/${gameState.campaignId}`);
    } catch (error) {
      console.error('Failed to return to campaign:', error);
      // Fallback: still attempt navigation even if cleanup fails
      navigate(`/campaigns/${gameState.campaignId}`);
    }
  }, [roomCode, navigate, gameState.campaignId]);

  // Get my character's card pile counts
  const myCharacter = gameState.myCharacterId
    ? gameState.gameData?.characters.find(c => c.id === gameState.myCharacterId)
    : null;
  const handCount = myCharacter?.hand?.length || 0;
  const discardCount = myCharacter?.discardPile?.length || 0;
  const lostCount = myCharacter?.lostPile?.length || 0;

  // Handle card pile clicks - unified handler for all piles
  const handlePileClick = (pile: PileType) => {
    // Guard against click-through after closing the panel
    if (closingRef.current) {
      return;
    }

    // Toggle selection - if clicking the same pile, close it
    if (selectedPile === pile) {
      setSelectedPile(null);
      setPileViewCards([]);
      return;
    }

    // Select the new pile
    setSelectedPile(pile);

    // For card piles, load the cards
    if (pile === 'hand' || pile === 'discard' || pile === 'lost') {
      if (!myCharacter) {
        setPileViewCards([]);
        return;
      }

      let cardIds: string[] = [];
      switch (pile) {
        case 'hand':
          cardIds = myCharacter.hand || [];
          break;
        case 'discard':
          cardIds = myCharacter.discardPile || [];
          break;
        case 'lost':
          cardIds = myCharacter.lostPile || [];
          break;
      }

      // Convert card IDs to full card objects using abilityDeck (master copy of all cards)
      // playerHand only contains cards currently in hand, not discard/lost
      const cardObjects = cardIds
        .map(id => gameState.abilityDeck.find(card => card.id === id))
        .filter((card): card is AbilityCard => card !== undefined);

      setPileViewCards(cardObjects);
    } else {
      // For active/inventory, clear pile view cards
      setPileViewCards([]);
    }
  };

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

  // Get my characters from game data
  const myCharacters = gameState.gameData?.characters.filter(
    c => gameState.myCharacterIds.includes(c.id)
  ) || [];

  const handleSwitchCharacter = (index: number) => {
    gameStateManager.switchActiveCharacter(index);
  };

  const handleMonsterClick = (monster: Monster) => {
    // Toggle - if clicking same monster, close overlay
    setSelectedMonster(prev => prev?.id === monster.id ? null : monster);
  };

  return (
    <div className={styles.gameBoardPage}>
      {/* Game Panel - Left/Top: Hex Map */}
      <GamePanel ref={containerRef} />

      {/* Entity Chips Panel - Floating on left side */}
      {gameState.gameData && (
        <EntityChipsPanel
          myCharacters={myCharacters as Character[]}
          activeCharacterIndex={gameState.activeCharacterIndex}
          monsters={(gameState.gameData.monsters || []) as Monster[]}
          currentTurnEntityId={gameState.currentTurnEntityId}
          onSwitchCharacter={handleSwitchCharacter}
          onMonsterClick={handleMonsterClick}
        />
      )}

      {/* Monster Ability Overlay */}
      {selectedMonster && (
        <MonsterAbilityOverlay
          monster={selectedMonster}
          onClose={() => setSelectedMonster(null)}
        />
      )}

      {/* Info Panel - Right/Bottom: TurnStatus + GameLog + CardPileBar + BottomSheet */}
      <InfoPanel
        turnStatus={
          <TurnStatus
            turnOrder={turnOrderWithHealth}
            currentTurnEntityId={gameState.currentTurnEntityId}
            currentRound={gameState.currentRound}
            characters={(gameState.gameData?.characters || []) as Character[]}
            monsters={(gameState.gameData?.monsters || []) as Monster[]}
            connectionStatus={gameState.connectionStatus}
            isMyTurn={gameState.isMyTurn}
            onEndTurn={() => gameStateManager.endTurn()}
            onBackToLobby={handleBackToLobby}
            onShortRest={() => gameStateManager.executeRest('short')}
            canShortRest={
              gameState.myCharacterId && gameState.isMyTurn
                ? ((gameState.gameData?.characters.find(c => c.id === gameState.myCharacterId)?.discardPile || []).length) >= 2
                : false
            }
            objectivesSlot={<ObjectiveTracker objectives={objectives} progress={objectiveProgress} />}
            turnActionState={gameState.turnActionState}
          />
        }
        gameLog={<GameLog logs={gameState.logs} />}
        cardPileBar={
          <CardPileIndicator
            handCount={handCount}
            discardCount={discardCount}
            lostCount={lostCount}
            onPileClick={handlePileClick}
            selectedPile={selectedPile}
            inventoryCount={ownedItems.length}
          />
        }
        isSheetOpen={
          // Sheet is open during card selection, or when a pile is selected
          gameState.showCardSelection || selectedPile !== null
        }
        onSheetClose={
          // Allow closing when not in card selection phase
          !gameState.showCardSelection ? () => {
            closingRef.current = true;
            setTimeout(() => { closingRef.current = false; }, 300);
            setSelectedPile(null);
            setPileViewCards([]);
          } : undefined
        }
        sheetTitle={
          selectedPile === 'hand' ? `Hand (${pileViewCards.length})` :
          selectedPile === 'discard' ? `Discard Pile (${pileViewCards.length})` :
          selectedPile === 'lost' ? `Lost Cards (${pileViewCards.length})` :
          selectedPile === 'active' ? `Select Action (${
            (gameState.turnActionState?.firstAction ? 1 : 0) +
            (gameState.turnActionState?.secondAction ? 1 : 0)
          }/2)` :
          selectedPile === 'inventory' ? 'Inventory' :
          gameState.showCardSelection ? 'Select Cards' :
          undefined
        }
        sheetContent={
          // Priority: Card selection phase > Active pile content > Other pile content
          gameState.showCardSelection ? (
            <CardSelectionPanel
              cards={gameState.playerHand}
              onCardSelect={(card) => gameStateManager.selectCard(card)}
              onClearSelection={() => gameStateManager.clearCardSelection()}
              onConfirmSelection={() => gameStateManager.confirmCardSelection()}
              onLongRest={() => gameStateManager.executeRest('long')}
              selectedTopAction={gameState.selectedTopAction}
              selectedBottomAction={gameState.selectedBottomAction}
              waiting={gameState.waitingForRoundStart}
              canLongRest={
                gameState.myCharacterId
                  ? ((gameState.gameData?.characters.find(c => c.id === gameState.myCharacterId)?.discardPile || []).length) >= 2
                  : false
              }
              discardPileCount={
                gameState.myCharacterId
                  ? (gameState.gameData?.characters.find(c => c.id === gameState.myCharacterId)?.discardPile || []).length
                  : 0
              }
              activeCharacterName={
                gameState.myCharacterId
                  ? gameState.gameData?.characters.find(c => c.id === gameState.myCharacterId)?.classType
                  : undefined
              }
              totalCharacters={gameState.myCharacterIds.length}
              charactersWithSelections={gameStateManager.getCharactersWithSelectionsCount()}
            />
          ) : selectedPile === 'active' && gameState.isMyTurn && gameState.turnActionState && gameState.selectedTurnCards ? (
            <TurnActionPanel
              card1={gameState.selectedTurnCards.card1}
              card2={gameState.selectedTurnCards.card2}
              turnActionState={gameState.turnActionState}
              onActionSelect={(cardId, position) => gameStateManager.selectCardAction(cardId, position)}
              onActionConfirm={() => gameStateManager.confirmCardAction()}
              targetingMode={gameState.cardActionTargetingMode}
              onCancelTargeting={() => gameStateManager.cancelCardActionTargeting()}
            />
          ) : selectedPile === 'inventory' ? (
            <InventoryTabContent
              ownedItems={ownedItems}
              equippedItems={equippedItems}
              itemStates={itemStates}
              characterLevel={typeof myCharacter?.level === 'number' ? myCharacter.level : 1}
              onUseItem={useItem}
              onEquipItem={equipItem}
              onUnequipItem={unequipItem}
              disabled={!gameState.isMyTurn}
              loading={inventoryLoading}
              error={inventoryError || undefined}
            />
          ) : (selectedPile === 'hand' || selectedPile === 'discard' || selectedPile === 'lost') ? (
            <PileView
              cards={pileViewCards}
              emptyMessage={
                selectedPile === 'hand' ? 'No cards in hand' :
                selectedPile === 'discard' ? 'Discard pile is empty' :
                'No lost cards'
              }
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
          campaignId={gameState.campaignId}
          onReturnToCampaign={handleReturnToCampaign}
        />
      )}

      {/* Rest Modal */}
      <RestModal
        restState={gameState.restState}
        onAccept={() => gameStateManager.handleRestAction('accept')}
        onReroll={() => gameStateManager.handleRestAction('reroll')}
        onConfirmLongRest={(cardId) => gameStateManager.confirmLongRest(cardId)}
        onClose={() => {
          // Clear rest state (auto-closes when rest completes)
        }}
      />

      {/* Exhaustion Modal */}
      {gameState.exhaustionState && (
        <ExhaustionModal
          visible={true}
          characterName={gameState.exhaustionState.characterName}
          reason={gameState.exhaustionState.reason}
          onAcknowledge={() => gameStateManager.acknowledgeExhaustion()}
        />
      )}

      {/* Narrative Overlay - Campaign narrative system */}
      {isNarrativeDisplaying && activeNarrative && (
        <NarrativeOverlay
          narrative={activeNarrative}
          acknowledgments={narrativeAcknowledgments}
          myPlayerId={myPlayerId}
          myAcknowledgment={narrativeMyAcknowledgment}
          onAcknowledge={acknowledgeNarrative}
        />
      )}
    </div>
  );
}
