/**
 * Game Gateway (US1 - T051)
 *
 * WebSocket gateway for real-time game communication using Socket.io.
 * Handles room management, character selection, game start, and player actions.
 */

import {
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { roomService } from '../services/room.service';
import { playerService } from '../services/player.service';
import { characterService } from '../services/character.service';
import { Character } from '../models/character.model';
import { sessionService } from '../services/session.service';
import { PrismaService } from '../services/prisma.service';
import { Player } from '../models/player.model';
import { LootToken } from '../models/loot-token.model';
import { ScenarioService } from '../services/scenario.service';
import { AbilityCardService } from '../services/ability-card.service';
import { TurnOrderService } from '../services/turn-order.service';
import { DamageCalculationService } from '../services/damage-calculation.service';
import { ModifierDeckService } from '../services/modifier-deck.service';
import { PathfindingService } from '../services/pathfinding.service';
import { MonsterAIService } from '../services/monster-ai.service';
import { ObjectiveEvaluatorService } from '../services/objective-evaluator.service';
import { ObjectiveContextBuilderService } from '../services/objective-context-builder.service';
import { GameResultService } from '../services/game-result.service';
import { DeckManagementService } from '../services/deck-management.service';
import { SummonService } from '../services/summon.service';
import { SummonAIService } from '../services/summon-ai.service';
import { Summon } from '../models/summon.model';
import type { AccumulatedStats } from '../services/objective-context-builder.service';
import type {
  ScenarioObjectives,
  ObjectiveProgressEntry,
} from '../../../shared/types/objectives';
import type { ActionResponse } from '../../../shared/types/action-protocol';
import type {
  JoinRoomPayload,
  SelectCharacterPayload,
  StartGamePayload,
  MoveCharacterPayload,
  SelectCardsPayload,
  AttackTargetPayload,
  EndTurnPayload,
  CollectLootPayload,
  RoomJoinedPayload,
  PlayerJoinedPayload,
  CharacterSelectedPayload,
  GameStartedPayload,
  CharacterMovedPayload,
  CardsSelectedPayload,
  TurnStartedPayload,
  AttackResolvedPayload,
  MonsterActivatedPayload,
  LootCollectedPayload,
  ScenarioCompletedPayload,
  ErrorPayload,
  DebugLogPayload,
  ObjectiveProgressUpdatePayload,
  CharacterExhaustedPayload,
  UseItemPayload,
  EquipItemPayload,
  UnequipItemPayload,
  ItemUsedPayload,
  ItemEquippedPayload,
  ItemUnequippedPayload,
  ItemsRefreshedPayload,
  CharacterInventoryPayload,
  SummonCreatedPayload,
  SummonDiedPayload,
} from '../../../shared/types/events';
import { InventoryService } from '../services/inventory.service';
import { ActionDispatcherService } from '../services/action-dispatcher.service';
import { ConditionService } from '../services/condition.service';
import { ForcedMovementService } from '../services/forced-movement.service';
import { CampaignService } from '../services/campaign.service';
import { NarrativeService } from '../services/narrative.service';
import { NarrativeRewardService } from '../services/narrative-reward.service';
import type {
  NarrativeDisplayPayload,
  NarrativeAcknowledgedPayload,
  NarrativeDismissedPayload,
  AcknowledgeNarrativePayload,
} from '../../../shared/types/events';
import type {
  ScenarioNarrativeDef,
  NarrativeGameContext,
} from '../../../shared/types/narrative';
import {
  getPush,
  getPull,
  getConditions,
  getInfuseModifiers,
  getConsumeModifiers,
  getPierce,
  getXPValue,
} from '../../../shared/types/modifiers';
import type {
  Modifier,
  CardAction,
  SummonDefinition,
} from '../../../shared/types/modifiers';
import { ElementalStateService } from '../services/elemental-state.service';
import type {
  ElementalInfusion,
  AttackModifierCard,
} from '../../../shared/types/entities';
import {
  ConnectionStatus,
  RoomStatus,
  getRange,
  type AxialCoordinates,
  type CharacterClass,
  type Monster,
} from '../../../shared/types/entities';
import type { ScenarioCompletionCheckOptions } from '../types/game-state.types';

// @WebSocketGateway decorator removed - using manual Socket.IO initialization in main.ts
// See main.ts lines 48-113 for manual wiring
@Injectable()
export class GameGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  // Server is injected manually in main.ts instead of using @WebSocketServer decorator
  server!: Server;

  private readonly logger = new Logger(GameGateway.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scenarioService: ScenarioService,
    private readonly deckManagement: DeckManagementService,
    private readonly inventoryService: InventoryService,
    private readonly actionDispatcher: ActionDispatcherService,
    private readonly conditionService: ConditionService,
    private readonly forcedMovementService: ForcedMovementService,
    private readonly elementalStateService: ElementalStateService,
    private readonly campaignService: CampaignService, // Issue #244 - Campaign Mode
    private readonly narrativeService: NarrativeService, // Campaign narrative system
    private readonly narrativeRewardService: NarrativeRewardService, // Narrative reward calculation (extracted)
    private readonly summonService: SummonService, // Issue #228 - Summons
    private readonly summonAIService: SummonAIService, // Issue #228 - Summon AI
    private readonly abilityCardService: AbilityCardService, // DB-driven ability cards
  ) {
    // Initialization logging removed for performance
    this.gameResultService = new GameResultService(this.prisma);
  }

  /**
   * Cached scenario narratives per room
   * Key: roomCode
   */
  private readonly roomNarratives = new Map<
    string,
    ScenarioNarrativeDef | null
  >();

  afterInit(_server: Server) {
    // Initialization logging removed for performance
  }

  /**
   * Helper function to get player nickname from character
   * Falls back to character class if player not found
   */
  private getPlayerNickname(
    roomCode: string,
    playerId: string,
    fallback: string,
  ): string {
    const room = roomService.getRoom(roomCode);
    return room?.getPlayer(playerId)?.nickname || fallback;
  }

  // Note: abilityCardService is now injected via constructor (DB-driven)
  private readonly turnOrderService = new TurnOrderService();
  private readonly damageService = new DamageCalculationService();
  private readonly modifierDeckService = new ModifierDeckService();
  private readonly pathfindingService = new PathfindingService();
  private readonly monsterAIService = new MonsterAIService();
  private readonly objectiveEvaluatorService = new ObjectiveEvaluatorService();
  private readonly objectiveContextBuilderService =
    new ObjectiveContextBuilderService();
  private readonly gameResultService: GameResultService;
  private readonly socketToPlayer = new Map<string, string>(); // socketId -> userId (database)
  private readonly playerToSocket = new Map<string, string>(); // userId (database) -> socketId

  // Game state: per-room state
  // Per-character modifier decks: roomCode -> characterId -> deck
  private readonly characterModifierDecks = new Map<
    string,
    Map<string, AttackModifierCard[]>
  >();
  // Shared monster deck: roomCode -> deck
  private readonly monsterModifierDeck = new Map<
    string,
    AttackModifierCard[]
  >();
  // Shared ally deck for non-owned summons: roomCode -> deck
  private readonly allyModifierDeck = new Map<string, AttackModifierCard[]>();
  private readonly roomMonsters = new Map<string, Monster[]>(); // roomCode -> monsters array
  private readonly roomTurnOrder = new Map<string, any[]>(); // roomCode -> turn order
  private readonly currentTurnIndex = new Map<string, number>(); // roomCode -> current turn index
  private readonly currentRound = new Map<string, number>(); // roomCode -> current round
  private readonly roomGamePhase = new Map<
    string,
    'card_selection' | 'active_turn'
  >(); // roomCode -> game phase
  private readonly monstersActedThisTurn = new Map<string, Set<string>>(); // roomCode -> Set of monster IDs that have acted
  private readonly roomGameLogs = new Map<
    string,
    Array<{
      id: string;
      parts: Array<{ text: string; color?: string; isBold?: boolean }>;
      timestamp: number;
    }>
  >(); // roomCode -> game log entries
  private readonly roomMaps = new Map<string, Map<string, any>>(); // roomCode -> hex map
  private readonly roomScenarios = new Map<string, any>(); // roomCode -> scenario data (Issue #191)
  private readonly roomLootTokens = new Map<string, any[]>(); // roomCode -> loot tokens
  private readonly roomMonsterInitiatives = new Map<
    string,
    Map<string, number>
  >(); // roomCode -> (monsterType -> initiative)

  // Issue #220: Elemental state tracking per room
  private readonly roomElementalState = new Map<string, ElementalInfusion>(); // roomCode -> elemental state

  // Phase 2: Objective System state
  private readonly roomObjectives = new Map<string, ScenarioObjectives>(); // roomCode -> scenario objectives
  private readonly roomObjectiveProgress = new Map<
    string,
    Map<string, ObjectiveProgressEntry>
  >(); // roomCode -> (objectiveId -> progress entry)
  private readonly roomAccumulatedStats = new Map<string, AccumulatedStats>(); // roomCode -> accumulated stats
  private readonly roomGameStartTime = new Map<string, number>(); // roomCode -> game start timestamp (ms)
  private readonly roomPlayerStats = new Map<
    string,
    Map<
      string,
      {
        damageDealt: number;
        damageTaken: number;
        monstersKilled: number;
        cardsLost: number;
      }
    >
  >(); // roomCode -> (playerId -> stats)

  // Issue #228: Summon state tracking per room
  private readonly roomSummons = new Map<string, Summon[]>(); // roomCode -> summons array
  private readonly summonsActedThisTurn = new Map<string, Set<string>>(); // roomCode -> Set of summon IDs that have acted

  // Narrative system: Track game state for condition evaluation
  private readonly roomOpenedDoors = new Map<string, AxialCoordinates[]>(); // roomCode -> opened door hexes
  private readonly roomCollectedTreasures = new Map<string, string[]>(); // roomCode -> collected treasure IDs
  private readonly roomCollectedLootHexes = new Map<
    string,
    AxialCoordinates[]
  >(); // roomCode -> loot collection hexes

  /**
   * Get the room that a Socket.IO client is currently in
   * Multi-room support: Uses Socket.IO rooms to determine which game room the client is active in
   */
  private getRoomFromSocket(
    client: Socket,
  ): { room: any; roomCode: string } | null {
    // Get all Socket.IO rooms the client is in
    const clientRooms = Array.from(client.rooms);
    // Filter out the socket ID (always first room)
    const roomCodes = clientRooms.filter((r) => r !== client.id);

    if (roomCodes.length === 0) {
      return null;
    }

    // Get the first game room (should only be one active at a time per socket)
    const roomCode = roomCodes[0];
    const room = roomService.getRoom(roomCode);

    if (!room) {
      return null;
    }

    return { room, roomCode };
  }

  /**
   * Collect all occupied hex positions for a room.
   * Used by summon placement validation and summon AI movement.
   *
   * @param roomCode - The room to collect occupied hexes for
   * @param excludeSummonId - Optional summon ID to exclude from the list (for self-movement)
   * @returns Array of occupied hex coordinates
   */
  private collectOccupiedHexes(
    roomCode: string,
    excludeSummonId?: string,
  ): AxialCoordinates[] {
    const occupiedHexes: AxialCoordinates[] = [];

    // Add character positions
    const room = roomService.getRoom(roomCode);
    if (room) {
      room.players
        .flatMap((p: any) => characterService.getCharactersByPlayerId(p.userId))
        .filter((c: any) => c && c.position)
        .forEach((c: any) => occupiedHexes.push(c.position));
    }

    // Add monster positions
    const monsters = this.roomMonsters.get(roomCode) || [];
    monsters
      .filter((m) => !m.isDead && m.currentHex)
      .forEach((m) => occupiedHexes.push(m.currentHex));

    // Add summon positions (optionally excluding a specific summon)
    const summons = this.roomSummons.get(roomCode) || [];
    summons
      .filter(
        (s) =>
          !s.isDead &&
          s.position &&
          (excludeSummonId === undefined || s.id !== excludeSummonId),
      )
      .forEach((s) => occupiedHexes.push(s.position));

    return occupiedHexes;
  }

  /**
   * Get the attack action from a character's selected cards
   * Returns the attack action (could be from top or bottom of either card)
   */
  private async getAttackActionFromSelectedCards(
    character: any,
  ): Promise<CardAction | null> {
    if (!character.selectedCards) {
      return null;
    }

    const { topCardId, bottomCardId } = character.selectedCards;
    const topCard = await this.abilityCardService.getCardById(topCardId);
    const bottomCard = await this.abilityCardService.getCardById(bottomCardId);

    // Check for attack action in order of preference
    if (topCard?.topAction?.type === 'attack') {
      return topCard.topAction;
    }
    if (bottomCard?.bottomAction?.type === 'attack') {
      return bottomCard.bottomAction;
    }
    if (topCard?.bottomAction?.type === 'attack') {
      return topCard.bottomAction;
    }
    if (bottomCard?.topAction?.type === 'attack') {
      return bottomCard.topAction;
    }

    return null;
  }

  /**
   * Process element infusion modifiers (generate elements)
   * Issue #220: Elements are generated when an action with infuse completes
   */
  private processInfuseModifiers(
    roomCode: string,
    modifiers: Modifier[],
  ): void {
    const infuseModifiers = getInfuseModifiers(modifiers);
    if (infuseModifiers.length === 0) return;

    let elementalState = this.roomElementalState.get(roomCode);
    if (!elementalState) {
      elementalState = this.elementalStateService.initializeElementalState();
      this.roomElementalState.set(roomCode, elementalState);
    }

    for (const infuse of infuseModifiers) {
      // 'generate' infuses immediately, 'generate-after' would be handled at turn end
      if (infuse.state === 'generate') {
        elementalState = this.elementalStateService.generateElement(
          elementalState,
          infuse.element,
        );
        this.logger.log(`Element infused: ${infuse.element} is now STRONG`);
      }
    }

    this.roomElementalState.set(roomCode, elementalState);

    // Emit elemental state update to all clients
    this.server.to(roomCode).emit('elemental_state_updated', {
      elementalState,
    });
  }

  /**
   * Process element consumption modifiers (consume elements for bonuses)
   * Issue #220: Elements must be strong or waning to be consumed
   * Returns the total bonus value if element was successfully consumed
   */
  private processConsumeModifiers(
    roomCode: string,
    modifiers: Modifier[],
  ): { bonuses: Map<string, number>; consumed: boolean } {
    const consumeModifiers = getConsumeModifiers(modifiers);
    const bonuses = new Map<string, number>();
    let anyConsumed = false;

    if (consumeModifiers.length === 0) {
      return { bonuses, consumed: false };
    }

    let elementalState = this.roomElementalState.get(roomCode);
    if (!elementalState) {
      return { bonuses, consumed: false };
    }

    for (const consume of consumeModifiers) {
      if (
        this.elementalStateService.canConsumeElement(
          elementalState,
          consume.element,
        )
      ) {
        elementalState = this.elementalStateService.consumeElement(
          elementalState,
          consume.element,
        );
        anyConsumed = true;

        // Track the bonus by effect type
        const currentBonus = bonuses.get(consume.bonus.effect) || 0;
        bonuses.set(consume.bonus.effect, currentBonus + consume.bonus.value);

        this.logger.log(
          `Element consumed: ${consume.element} for +${consume.bonus.value} ${consume.bonus.effect}`,
        );
      } else {
        this.logger.log(
          `Element ${consume.element} not available for consumption (inert)`,
        );
      }
    }

    if (anyConsumed) {
      this.roomElementalState.set(roomCode, elementalState);

      // Emit elemental state update to all clients
      this.server.to(roomCode).emit('elemental_state_updated', {
        elementalState,
      });
    }

    return { bonuses, consumed: anyConsumed };
  }

  /**
   * Decay all elements at end of round
   * Issue #220: strong -> waning -> inert
   */
  private decayRoomElements(roomCode: string): void {
    let elementalState = this.roomElementalState.get(roomCode);
    if (!elementalState) return;

    elementalState = this.elementalStateService.decayElements(elementalState);
    this.roomElementalState.set(roomCode, elementalState);

    // Emit elemental state update to all clients
    this.server.to(roomCode).emit('elemental_state_updated', {
      elementalState,
    });
  }

  /**
   * Emit debug log to room for DebugConsole display
   */
  private emitDebugLog(
    roomCode: string,
    level: 'log' | 'error' | 'warn' | 'info',
    message: string,
    category?: string,
    data?: any,
  ): void {
    const payload: DebugLogPayload = {
      level,
      message,
      category,
      data,
    };
    this.server.to(roomCode).emit('debug_log', payload);
    // Also log to server console
    const logMessage = `[${category || 'Debug'}] ${message}`;
    switch (level) {
      case 'error':
        this.logger.error(logMessage);
        break;
      case 'warn':
        this.logger.warn(logMessage);
        break;
      case 'info':
      case 'log':
      default:
        // Debug console logging only - server log removed
        break;
    }
  }

  /**
   * Add a log entry to the game log for a room
   * Used to persist game log for rejoin
   */
  private addGameLogEntry(
    roomCode: string,
    parts: Array<{ text: string; color?: string; isBold?: boolean }>,
  ): void {
    let logs = this.roomGameLogs.get(roomCode);
    if (!logs) {
      logs = [];
      this.roomGameLogs.set(roomCode, logs);
    }
    logs.push({
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      parts,
      timestamp: Date.now(),
    });
    // Keep only last 100 log entries to prevent memory bloat
    if (logs.length > 100) {
      logs.shift();
    }
  }

  /**
   * Sanitize objectives for client payload
   * Strips internal fields (type, milestones) and returns only client-safe fields
   * Single source of truth for objective sanitization - DRY principle
   */
  private sanitizeObjectivesForPayload(
    objectives: ScenarioObjectives | undefined,
  ): GameStartedPayload['objectives'] {
    if (!objectives) return undefined;

    return {
      primary: {
        id: objectives.primary.id,
        description: objectives.primary.description,
        trackProgress: objectives.primary.trackProgress ?? true,
      },
      secondary: (objectives.secondary || []).map((obj) => ({
        id: obj.id,
        description: obj.description,
        trackProgress: obj.trackProgress ?? true,
        optional: true,
      })),
      failureConditions: (objectives.failureConditions || []).map((fc) => ({
        id: fc.id,
        description: fc.description,
      })),
    };
  }

  /**
   * Build game state payload for an active game
   * Helper method to construct GameStartedPayload with current game state
   */
  private async buildGameStatePayload(
    room: any,
    roomCode: string,
  ): Promise<GameStartedPayload> {
    // Get current scenario and game state (including all characters for multi-character players)
    const monsters = this.roomMonsters.get(roomCode) || [];
    const characters = room.players
      .flatMap((p: any) => characterService.getCharactersByPlayerId(p.userId))
      .filter((c: any) => c !== null);

    // Get map from room state
    const hexMap = this.roomMaps.get(roomCode);
    const mapLayout: any[] = [];
    if (hexMap) {
      hexMap.forEach((tile: any) => {
        mapLayout.push(tile);
      });
    }

    // Load ability decks for all characters (using hybrid approach)
    const charactersWithDecks = await Promise.all(
      characters.map(async (c: any) => {
        const charData = c.toJSON();

        // Get all cards for this class from database
        const classCards = await this.abilityCardService.getCardsByClass(
          charData.characterClass,
        );
        const abilityDeckIds = classCards.map((card) => card.id);

        // Use current card pile state from character (for rejoin), or initialize if new game
        // charData contains the actual current state of hand/discard/lost piles
        // Only fallback to full deck if this is a NEW game (no cards in any pile)
        const discardPile = charData.discardPile || [];
        const lostPile = charData.lostPile || [];
        const isNewGame =
          discardPile.length === 0 &&
          lostPile.length === 0 &&
          (!charData.hand || charData.hand.length === 0);
        const hand = isNewGame ? abilityDeckIds : charData.hand || [];

        // Get database character ID from player (Issue #205)
        const player = room.players.find(
          (p: any) => p.userId === charData.playerId,
        );
        const userCharacterId = player?.characterId || undefined;

        return {
          id: charData.id,
          playerId: charData.playerId,
          userCharacterId, // Database character ID for inventory API
          classType: charData.characterClass,
          health: charData.currentHealth,
          maxHealth: charData.stats.maxHealth,
          currentHex: charData.position,
          conditions: charData.conditions,
          isExhausted: charData.exhausted,

          // Deck management fields (hybrid approach: store IDs, hydrate on demand)
          abilityDeck: classCards, // Full card objects for initial hand selection
          hand, // Card IDs in hand
          discardPile, // Card IDs in discard pile
          lostPile, // Card IDs in lost pile
          activeCards: null, // Currently selected card pair
          activeEffects: [], // Cards with persistent effects
          isResting: false,
          restType: 'none' as const,
          shortRestState: null,
          exhaustionReason: null,

          // Include selected cards and action state for game rejoin
          selectedCards: c.selectedCards, // { topCardId, bottomCardId, initiative }
          effectiveMovement: c.effectiveMovementThisTurn,
          effectiveAttack: c.effectiveAttackThisTurn,
          effectiveRange: c.effectiveRangeThisTurn,
          hasAttackedThisTurn: c.hasAttackedThisTurn,
          movementUsedThisTurn: c.movementUsedThisTurn,
        };
      }),
    );

    // Build game state payload
    // Get objectives for this room
    const objectives = this.roomObjectives.get(roomCode);

    // Get scenario data for background fields (Issue #191)
    const scenario = this.roomScenarios.get(roomCode);

    const gameStartedPayload: GameStartedPayload = {
      scenarioId: room.scenarioId || 'scenario-1',
      scenarioName: scenario?.name || 'Black Barrow',
      mapLayout,
      // Filter out dead monsters before sending to client (they're kept for objective tracking)
      monsters: monsters
        .filter((m: any) => !m.isDead)
        .map((m: any) => ({
          id: m.id,
          monsterType: m.monsterType,
          isElite: m.isElite,
          currentHex: m.currentHex,
          health: m.health,
          maxHealth: m.maxHealth,
          conditions: m.conditions,
        })),
      characters: charactersWithDecks,
      objectives: this.sanitizeObjectivesForPayload(objectives),
    };

    // DEBUG: Log what objectives are being sent
    this.logger.log(
      `[DEBUG-OBJECTIVES] Sanitized objectives being sent: ${JSON.stringify(gameStartedPayload.objectives?.primary)}`,
    );

    Object.assign(gameStartedPayload, {
      // Issue #318 - Campaign context for return navigation
      campaignId: room.campaignId || null,
      // Background image configuration (Issue #191)
      backgroundImageUrl: scenario?.backgroundImageUrl,
      backgroundOpacity: scenario?.backgroundOpacity,
      backgroundOffsetX: scenario?.backgroundOffsetX,
      backgroundOffsetY: scenario?.backgroundOffsetY,
      backgroundScale: scenario?.backgroundScale,
      // Current game state for rejoin
      currentRound: this.currentRound.get(roomCode) || 1,
      // Game log for rejoin
      gameLog: this.roomGameLogs.get(roomCode) || [],
      // Loot tokens for rejoin (filter to uncollected only)
      lootTokens: (this.roomLootTokens.get(roomCode) || [])
        .filter((t: any) => !t.isCollected)
        .map((t: any) => ({
          id: t.id,
          coordinates: t.coordinates,
          value: t.value,
          isCollected: t.isCollected,
        })),
    });

    // Debug logging for background issue
    if (scenario?.backgroundImageUrl) {
      this.logger.log(
        `🖼️ Background configured: ${scenario.backgroundImageUrl}`,
      );
    } else {
      this.logger.log(`🖼️ No background image for scenario`);
    }

    return gameStartedPayload;
  }

  /**
   * Handle client connection
   * Issue #419: Populate socketToPlayer mapping immediately on connection
   * This ensures game events can identify the user even before join_room is called
   */
  handleConnection(client: Socket): void {
    const userId = client.data.userId;
    if (userId) {
      // Clean up any stale mapping for this user (handles reconnection with new socket ID)
      const oldSocketId = this.playerToSocket.get(userId);
      if (oldSocketId && oldSocketId !== client.id) {
        this.socketToPlayer.delete(oldSocketId);
        this.logger.log(
          `Cleaned up stale socket mapping: ${oldSocketId} for user ${userId}`,
        );
      }

      // Populate socket mapping immediately on connection
      this.socketToPlayer.set(client.id, userId);
      this.playerToSocket.set(userId, client.id);
      this.logger.log(
        `Socket ${client.id} mapped to user ${userId} on connection`,
      );
    } else {
      // This should not happen as main.ts rejects connections without valid JWT
      this.logger.warn(
        `Socket ${client.id} connected without userId in socket.data`,
      );
    }
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket): void {
    const userId = this.socketToPlayer.get(client.id);
    if (userId) {
      // Player disconnect handled via events

      // Update player connection status
      try {
        playerService.updateConnectionStatus(
          userId,
          ConnectionStatus.DISCONNECTED,
        );

        // Find ALL rooms this player is in (multi-room support)
        // Socket.IO stores room names in client.rooms (Set of room IDs)
        const clientRooms = Array.from(client.rooms);
        // Filter out the client's own socket ID (which is also in rooms)
        const roomCodes = clientRooms.filter((r) => r !== client.id);

        // Process each room the player is in
        for (const roomCode of roomCodes) {
          const room = roomService.getRoom(roomCode);
          if (room) {
            // Save session to enable reconnection (US4 - T154)
            sessionService.saveSession(room);

            this.server.to(room.roomCode).emit('player_disconnected', {
              playerId: userId,
              nickname: room.getPlayer(userId)?.nickname || 'Unknown',
              willReconnect: true, // Player can reconnect within 10 minutes
            });

            // Track disconnected player for narrative timeout handling
            this.narrativeService.markPlayerDisconnected(room.roomCode, userId);

            this.logger.log(
              `Session saved for disconnected player ${userId} in room ${room.roomCode}`,
            );
          }
        }
      } catch (error) {
        this.logger.error(
          `Error handling disconnect: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      // Clean up mappings
      this.socketToPlayer.delete(client.id);
      this.playerToSocket.delete(userId);
    }

    // Verbose disconnection log removed
  }

  /**
   * Issue #419: Ping handler for connection verification
   * Frontend sends ping when tab becomes visible to verify connection is alive
   * Returns acknowledgment so frontend knows the connection is working
   */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() _client: Socket): {
    pong: boolean;
    timestamp: number;
  } {
    return { pong: true, timestamp: Date.now() };
  }

  /**
   * Join a game room
   */
  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomPayload,
  ): Promise<void> {
    try {
      // Verbose payload logging removed
      this.logger.log(
        `📍 Join intent: ${payload.intent || 'unknown'} | Room: ${payload.roomCode} | Player: ${payload.nickname}`,
      );

      const { roomCode, nickname } = payload;
      // Get userId from socket.data (set during JWT verification in main.ts)
      const userId = client.data.userId as string;

      if (!userId) {
        this.server.to(client.id).emit('error', {
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
        } as ErrorPayload);
        return;
      }

      // Check if player is already in THIS SPECIFIC room
      // Note: Player may be in other rooms (multi-room support), so we check the target room
      const targetRoom = roomService.getRoom(roomCode);
      if (!targetRoom) {
        this.server.to(client.id).emit('error', {
          message: `Room ${roomCode} not found`,
          code: 'ROOM_NOT_FOUND',
        } as ErrorPayload);
        return;
      }

      const isAlreadyInRoom = targetRoom.getPlayer(userId) !== null;
      let room = targetRoom;

      // Check reconnection status
      const roomPlayer = isAlreadyInRoom ? room.getPlayer(userId) : null;
      const isReconnecting =
        roomPlayer &&
        roomPlayer.connectionStatus === ConnectionStatus.DISCONNECTED &&
        isAlreadyInRoom;

      if (!isAlreadyInRoom) {
        // Register player globally if not exists (for user management)
        let globalPlayer = playerService.getPlayerByUserId(userId);
        if (!globalPlayer) {
          globalPlayer = playerService.createPlayer(userId, nickname);
        }

        // Create a new player instance for this room
        // Each room has its own Player instance to track room-specific state
        const newRoomPlayer = Player.create(userId, nickname);

        // Join room (adds player to room state)
        room = roomService.joinRoom(roomCode, newRoomPlayer);
      } else {
        // Player is already in this specific room
        this.logger.log(
          `Player ${nickname} is ${isReconnecting ? 'reconnecting to' : 'already in'} room ${roomCode}`,
        );
      }

      // Update connection status to connected (US4 - T153)
      if (isReconnecting && roomPlayer) {
        roomPlayer.updateConnectionStatus(ConnectionStatus.CONNECTED);
      }

      // Associate socket with player (using database userId)
      // Issue #419: Only update mapping if not already set (handleConnection may have set it)
      // This prevents overwriting mappings unnecessarily and maintains DRY principle
      if (!this.socketToPlayer.has(client.id)) {
        this.socketToPlayer.set(client.id, userId);
        this.playerToSocket.set(userId, client.id);
      }

      // IMPORTANT: Leave all other game rooms before joining the new one
      // This ensures getRoomFromSocket() always returns the correct current room
      const currentRooms = Array.from(client.rooms).filter(
        (r) => r !== client.id,
      );
      for (const oldRoomCode of currentRooms) {
        if (oldRoomCode !== roomCode) {
          this.logger.log(
            `Player ${nickname} leaving old Socket.IO room ${oldRoomCode} before joining ${roomCode}`,
          );
          await client.leave(oldRoomCode);
        }
      }

      // Join Socket.io room
      await client.join(roomCode);

      // Send success response to joining player
      const roomJoinedPayload: RoomJoinedPayload = {
        roomId: room.id,
        roomCode: room.roomCode,
        roomStatus: room.status,
        players: room.players.map((p) => ({
          id: p.userId,
          nickname: p.nickname,
          isHost: p.isHost,
          characterClass: p.characterClass || undefined, // Backward compatibility
          characterClasses: p.characterClasses, // Multi-character support
          characterIds: p.characterIds.filter((id: string) => id !== ''),
        })),
        scenarioId: room.scenarioId || undefined,
      };

      client.emit('room_joined', roomJoinedPayload);

      // Broadcast based on join type (US4 - T153)
      if (isReconnecting && roomPlayer) {
        // Broadcast reconnection to other players
        client.to(roomCode).emit('player_reconnected', {
          playerId: roomPlayer.userId,
          nickname: roomPlayer.nickname,
        });
        this.logger.log(`Player ${nickname} reconnected to room ${roomCode}`);
      }

      // If game is active, send current game state to player (whether reconnecting or just navigating)
      if (room.status === RoomStatus.ACTIVE && isAlreadyInRoom) {
        try {
          this.logger.log(
            `Sending game state to ${nickname} in active room ${roomCode}`,
          );

          // Build game state payload using helper method
          const gameStartedPayload = await this.buildGameStatePayload(
            room,
            roomCode,
          );

          // Send game_started event with acknowledgment pattern
          client.emit(
            'game_started',
            gameStartedPayload,
            (acknowledged: boolean) => {
              if (acknowledged) {
                // Acknowledgment logging removed
              } else {
                this.logger.warn(
                  `⚠️  Game state NOT acknowledged by ${nickname}, retrying in 500ms...`,
                );
                // Retry once after 500ms
                setTimeout(() => {
                  // Retry logging removed (error logged elsewhere)
                  client.emit('game_started', gameStartedPayload);
                }, 500);
              }
            },
          );

          // Send current game phase and turn state based on game phase
          const gamePhase =
            this.roomGamePhase.get(roomCode) || 'card_selection';
          const roundNumber = this.currentRound.get(roomCode) || 1;

          this.logger.log(
            `🔄 Rejoin state for ${nickname}: phase=${gamePhase}, round=${roundNumber}, hasPhaseEntry=${this.roomGamePhase.has(roomCode)}, hasRoundEntry=${this.currentRound.has(roomCode)}`,
          );

          if (gamePhase === 'card_selection') {
            // Game is in card selection phase - send round_ended to show card selection UI
            this.logger.log(
              `📋 Sending round_ended to ${nickname} for card selection (round ${roundNumber})`,
            );
            client.emit('round_ended', {
              roundNumber: roundNumber,
            });
            this.logger.log(`✅ round_ended event emitted to ${nickname}`);
          } else if (gamePhase === 'active_turn') {
            // Game is in active turn phase - send turn order and current turn
            const turnOrder = this.roomTurnOrder.get(roomCode);
            const currentTurnIdx = this.currentTurnIndex.get(roomCode) || 0;

            if (turnOrder && turnOrder.length > 0) {
              const roundStartedPayload: any = {
                roundNumber,
                turnOrder: turnOrder.map(
                  ({ entityId, name, entityType, initiative }) => ({
                    entityId,
                    name,
                    entityType,
                    initiative,
                  }),
                ),
              };
              client.emit('round_started', roundStartedPayload);

              const currentEntity = turnOrder[currentTurnIdx];
              const turnStartedPayload: TurnStartedPayload = {
                entityId: currentEntity.entityId,
                entityType: currentEntity.entityType,
                turnIndex: currentTurnIdx,
              };
              client.emit('turn_started', turnStartedPayload);
              this.logger.log(
                `Sent current turn info to ${nickname} (round ${roundNumber}, turn ${currentTurnIdx})`,
              );

              // If it's a monster's turn, re-trigger monster activation
              // The monster may have already acted, but activateMonster handles dead/acted monsters gracefully
              if (currentEntity.entityType === 'monster') {
                this.logger.log(
                  `Current turn is monster (${currentEntity.entityId}), re-triggering activation after rejoin`,
                );
                setTimeout(() => {
                  this.activateMonster(currentEntity.entityId, roomCode);
                }, 200);
              }
            }
          }

          // Objectives are now sent as part of game_started payload in buildGameStatePayload
          const objectives = this.roomObjectives.get(roomCode);
          if (objectives) {
            this.logger.log(
              `Objectives included in game state for ${nickname} in active room`,
            );
          }

          // If there's an active narrative, send it to the reconnecting player
          const activeNarrative =
            this.narrativeService.getActiveNarrative(roomCode);
          if (activeNarrative) {
            this.logger.log(
              `Sending active narrative to ${nickname} in room ${roomCode}`,
            );
            const narrativePayload: NarrativeDisplayPayload = {
              narrativeId: activeNarrative.id,
              type: activeNarrative.type,
              triggerId: activeNarrative.triggerId,
              content: activeNarrative.content,
              rewards: activeNarrative.rewards,
              gameEffects: activeNarrative.gameEffects,
              acknowledgments: activeNarrative.acknowledgments.map((a) => ({
                playerId: a.playerId,
                playerName: a.playerName,
                acknowledged: a.acknowledged,
              })),
            };
            client.emit('narrative_display', narrativePayload);
          }
        } catch (activeGameError) {
          this.logger.error(
            `Error sending game state to ${nickname}:`,
            activeGameError,
          );
        }
      }

      // Save session with updated connection status
      if (isReconnecting) {
        sessionService.saveSession(room);
      }

      if (!isAlreadyInRoom) {
        // Get the newly joined player from the room
        const newlyJoinedPlayer = room.getPlayer(userId);
        if (newlyJoinedPlayer) {
          // Only broadcast new join to other players
          const playerJoinedPayload: PlayerJoinedPayload = {
            playerId: newlyJoinedPlayer.userId,
            nickname: newlyJoinedPlayer.nickname,
            isHost: newlyJoinedPlayer.isHost,
          };

          client.to(roomCode).emit('player_joined', playerJoinedPayload);
          this.logger.log(`Player ${nickname} joined room ${roomCode}`);
        }
      } else {
        this.logger.log(
          `Player ${nickname} connected socket to room ${roomCode}`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Join room error: ${errorMessage}`);
      const errorPayload: ErrorPayload = {
        code: 'JOIN_ROOM_ERROR',
        message: errorMessage,
      };
      client.emit('error', errorPayload);
    }
  }

  /**
   * Leave room (player voluntarily leaves)
   * Accepts optional roomCode to leave a specific room (for multi-room scenarios)
   */
  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload?: { roomCode?: string },
  ): void {
    try {
      const userId = this.socketToPlayer.get(client.id);
      if (!userId) {
        this.logger.warn('Leave room request from unknown player');
        return;
      }

      // If roomCode is provided, leave that specific room
      // Otherwise, get room from client's current Socket.IO room (backward compatibility)
      let roomCode: string;
      let room: any;

      if (payload?.roomCode) {
        roomCode = payload.roomCode;
        room = roomService.getRoom(roomCode);
        if (!room) {
          this.logger.warn(
            `Player ${userId} tried to leave room ${roomCode} but room not found`,
          );
          return;
        }
      } else {
        const roomData = this.getRoomFromSocket(client);
        if (!roomData) {
          this.logger.warn(
            `Player ${userId} tried to leave but is not in any room`,
          );
          return;
        }
        room = roomData.room;
        roomCode = roomData.roomCode;
      }

      // Verbose leaving log removed

      // Remove player from room
      const player = room.players.find((p: Player) => p.userId === userId);
      const playerName = player?.nickname || 'Unknown';

      roomService.leaveRoom(roomCode, userId);

      // Leave socket room
      client.leave(roomCode);

      // Remove from socket mapping
      this.socketToPlayer.delete(client.id);

      // Get updated room to determine players remaining
      const updatedRoom = roomService.getRoom(roomCode);
      const playersRemaining = updatedRoom ? updatedRoom.players.length : 0;

      // Notify other players in the room (Phase 5: Enhanced with playersRemaining)
      if (player) {
        client.to(roomCode).emit('player_left', {
          playerId: userId,
          nickname: playerName,
          playersRemaining,
        });
      }

      // Clean up game state if needed (Phase 5: Last player cleanup)
      if (!updatedRoom || playersRemaining === 0) {
        // Room is empty, clean up all game state
        this.roomMaps.delete(roomCode);
        this.roomScenarios.delete(roomCode); // Issue #191
        this.roomMonsters.delete(roomCode);
        this.roomTurnOrder.delete(roomCode);
        this.currentTurnIndex.delete(roomCode);
        this.currentRound.delete(roomCode);
        this.roomGamePhase.delete(roomCode);
        this.monstersActedThisTurn.delete(roomCode);
        this.roomGameLogs.delete(roomCode);
        this.roomLootTokens.delete(roomCode);
        // Per-character, monster, and ally modifier decks cleanup
        this.characterModifierDecks.delete(roomCode);
        this.monsterModifierDeck.delete(roomCode);
        this.allyModifierDeck.delete(roomCode);
        this.roomMonsterInitiatives.delete(roomCode);
        // Phase 2/3: Clean up objective system state
        this.roomObjectives.delete(roomCode);
        this.roomObjectiveProgress.delete(roomCode);
        this.roomAccumulatedStats.delete(roomCode);
        this.roomGameStartTime.delete(roomCode);
        this.roomPlayerStats.delete(roomCode);
        // Narrative system cleanup
        this.narrativeService.cleanupRoomState(roomCode);
        this.narrativeRewardService.clearAccumulatedRewards(roomCode);
        this.roomNarratives.delete(roomCode);
        this.roomOpenedDoors.delete(roomCode);
        this.roomCollectedTreasures.delete(roomCode);
        this.roomCollectedLootHexes.delete(roomCode);
        // Issue #228: Summon state cleanup
        this.roomSummons.delete(roomCode);
        this.summonsActedThisTurn.delete(roomCode);
        this.logger.log(`Room ${roomCode} is empty, all state cleaned up`);

        // Delete the room
        if (updatedRoom) {
          roomService.deleteRoom(roomCode);
        }
      } else {
        // Room still has players, save updated session
        sessionService.saveSession(updatedRoom);
      }

      // Verbose left log removed
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Leave room error: ${errorMessage}`);
      const errorPayload: ErrorPayload = {
        code: 'LEAVE_ROOM_ERROR',
        message: errorMessage,
      };
      client.emit('error', errorPayload);
    }
  }

  /**
   * Select character (002 - Updated for persistent characters)
   */
  @SubscribeMessage('select_character')
  async handleSelectCharacter(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SelectCharacterPayload,
  ): Promise<void> {
    try {
      const userId = this.socketToPlayer.get(client.id);
      if (!userId) {
        throw new Error('Player not authenticated');
      }

      // Verbose select character log removed

      // Multi-room detection: Check if client is in multiple rooms
      const clientRooms = Array.from(client.rooms).filter(
        (r) => r !== client.id,
      );
      if (clientRooms.length > 1) {
        this.logger.warn(
          `⚠️ Client ${client.id} (player ${userId}) is in multiple rooms: ${clientRooms.join(', ')}. This may cause character selection issues.`,
        );
      }

      // Get room from client's current Socket.IO room (multi-room support)
      const roomData = this.getRoomFromSocket(client);
      if (!roomData) {
        throw new Error('Player not in any room or room not found');
      }

      const { room } = roomData;

      // Get player from room (not global registry)
      const player = room.getPlayer(userId);
      if (!player) {
        throw new Error('Player not found in room');
      }

      // Validate room status
      if (room.status !== RoomStatus.LOBBY) {
        throw new Error('Game has already started');
      }

      // Determine action type (default to 'add' for backward compatibility)
      const action = payload.action || 'add';

      // Handle 'remove' action
      if (action === 'remove') {
        let index: number;

        // Preferred: ID-based removal
        if (payload.targetCharacterId) {
          // Find index by character ID first
          index = player.characterIds.indexOf(payload.targetCharacterId);
          // Fallback: try finding by class name (for anonymous users)
          if (index === -1) {
            index = player.characterClasses.indexOf(
              payload.targetCharacterId as CharacterClass,
            );
          }
          if (index === -1) {
            throw new Error('Character not found for removal');
          }
        }
        // Deprecated: Index-based removal (backward compatibility)
        else if (payload.index !== undefined) {
          this.logger.warn(
            `[DEPRECATED] Index-based character removal used by player ${player.nickname}. Use targetCharacterId instead.`,
          );
          index = payload.index;
        } else {
          throw new Error(
            'Must provide targetCharacterId or index for removal',
          );
        }

        if (index < 0 || index >= player.characterClasses.length) {
          throw new Error('Invalid character index for removal');
        }
        player.removeCharacter(index);
        this.logger.log(
          `Player ${player.nickname} removed character at index ${index}`,
        );
      }
      // Handle 'set_active' action
      else if (action === 'set_active') {
        let index: number;

        // Preferred: ID-based set_active
        if (payload.targetCharacterId) {
          // Find index by character ID first
          index = player.characterIds.indexOf(payload.targetCharacterId);
          // Fallback: try finding by class name (for anonymous users)
          if (index === -1) {
            index = player.characterClasses.indexOf(
              payload.targetCharacterId as CharacterClass,
            );
          }
          if (index === -1) {
            throw new Error('Character not found for set_active');
          }
        }
        // Deprecated: Index-based set_active (backward compatibility)
        else if (payload.index !== undefined) {
          this.logger.warn(
            `[DEPRECATED] Index-based set_active used by player ${player.nickname}. Use targetCharacterId instead.`,
          );
          index = payload.index;
        } else {
          throw new Error(
            'Must provide targetCharacterId or index for set_active',
          );
        }

        if (index < 0 || index >= player.characterClasses.length) {
          throw new Error('Invalid character index for set_active');
        }
        player.setActiveCharacter(index);
        this.logger.log(
          `Player ${player.nickname} set active character to index ${index}`,
        );
      }
      // Handle 'add' action (default)
      else {
        let characterClass: CharacterClass;
        let characterId: string | undefined;

        // Handle persistent character selection (002)
        if (payload.characterId) {
          // Look up character from database
          const character = await this.prisma.character.findUnique({
            where: { id: payload.characterId },
            include: { class: true },
          });

          if (!character) {
            throw new Error('Character not found');
          }

          // Check if character is already in a game
          if (character.currentGameId) {
            throw new Error('Character is already in an active game');
          }

          // Extract character class name
          characterClass = character.class.name as CharacterClass;
          characterId = character.id;

          this.logger.log(
            `Player ${player.nickname} adding persistent character: ${character.name} (${characterClass})`,
          );
        } else if (payload.characterClass) {
          // Legacy: Direct character class selection
          characterClass = payload.characterClass;
          this.logger.log(
            `Player ${player.nickname} adding character class: ${characterClass}`,
          );
        } else {
          throw new Error('Must provide either characterId or characterClass');
        }

        // Check if campaign requires unique character classes
        let requireUniqueClasses = true; // Default: require unique for non-campaign games
        if (room.campaignId) {
          requireUniqueClasses =
            await this.campaignService.getRequireUniqueClasses(room.campaignId);
        }

        if (requireUniqueClasses) {
          // Check if character class is already taken by another player
          const characterTakenByOther = room.players.some(
            (p: Player) =>
              p.characterClasses.includes(characterClass) &&
              p.userId !== userId,
          );

          if (characterTakenByOther) {
            throw new Error(
              'Character class already selected by another player',
            );
          }

          // Check if player already has this character class
          if (player.characterClasses.includes(characterClass)) {
            throw new Error('You have already selected this character class');
          }
        }

        // Add character (will validate max limit)
        player.addCharacter(characterClass, characterId);

        this.logger.log(
          `Player ${player.nickname} successfully added ${characterClass}${characterId ? ` (ID: ${characterId})` : ''} (total: ${player.characterClasses.length})`,
        );

        // Send inventory data for persistent characters (Issue #205 - Phase 4.5)
        if (characterId) {
          try {
            // Fetch equipped items with details
            const equippedItems =
              await this.inventoryService.getEquippedItemsWithDetails(
                characterId,
              );
            const bonuses =
              await this.inventoryService.getEquippedBonuses(characterId);

            const inventoryPayload: CharacterInventoryPayload = {
              characterId,
              equippedItems: equippedItems.map((eq) => ({
                slot: eq.slot,
                itemId: eq.item.id,
                itemName: eq.item.name,
              })),
              bonuses,
            };

            // Send to the specific client who selected the character
            client.emit('character_inventory', inventoryPayload);

            this.logger.log(
              `Sent inventory data to player ${player.nickname}: ${equippedItems.length} items equipped`,
            );
          } catch (inventoryError) {
            this.logger.warn(
              `Failed to send inventory for character ${characterId}: ${inventoryError instanceof Error ? inventoryError.message : String(inventoryError)}`,
            );
            // Don't fail character selection if inventory fetch fails
          }
        }
      }

      // Broadcast updated character list to all players in room
      const characterSelectedPayload: CharacterSelectedPayload = {
        playerId: player.userId,
        characterClass: player.characterClass || undefined, // Backward compatibility
        characterClasses: player.characterClasses,
        characterIds: player.characterIds.filter((id: string) => id !== ''),
        activeIndex: player.activeCharacterIndex,
      };

      this.server
        .to(room.roomCode)
        .emit('character_selected', characterSelectedPayload);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Select character error: ${errorMessage}`);
      const errorPayload: ErrorPayload = {
        code: 'SELECT_CHARACTER_ERROR',
        message: errorMessage,
      };
      client.emit('error', errorPayload);
    }
  }

  /**
   * Select scenario for the room (host only, before game start)
   */
  @SubscribeMessage('select_scenario')
  handleSelectScenario(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { scenarioId: string },
  ): void {
    try {
      const userId = this.socketToPlayer.get(client.id);
      if (!userId) {
        throw new Error('Player not authenticated');
      }

      // Get room from client's current Socket.IO room
      const roomData = this.getRoomFromSocket(client);
      if (!roomData) {
        throw new Error('Player not in any room or room not found');
      }

      const { room } = roomData;

      // Use room service to select scenario (validates host permission)
      roomService.selectScenario(room.roomCode, payload.scenarioId, userId);

      this.logger.log(
        `Scenario selected in room ${room.roomCode}: ${payload.scenarioId}`,
      );

      // Broadcast scenario selection to all players in room
      this.server.to(room.roomCode).emit('scenario_selected', {
        scenarioId: payload.scenarioId,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Select scenario error: ${errorMessage}`);
      const errorPayload: ErrorPayload = {
        code: 'SELECT_SCENARIO_ERROR',
        message: errorMessage,
      };
      client.emit('error', errorPayload);
    }
  }

  /**
   * Start the game
   */
  @SubscribeMessage('start_game')
  async handleStartGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() _payload: StartGamePayload,
  ): Promise<void> {
    try {
      const userId = this.socketToPlayer.get(client.id);
      if (!userId) {
        throw new Error('Player not authenticated');
      }

      // Verbose start game request log removed

      // Get room from client's current Socket.IO room (multi-room support)
      const roomData = this.getRoomFromSocket(client);
      if (!roomData) {
        throw new Error('Player not in any room or room not found');
      }

      const { room, roomCode: _roomCode } = roomData;
      // Game start event sufficient

      // Get player from room (not global registry)
      const player = room.getPlayer(userId);
      if (!player) {
        throw new Error('Player not found in room');
      }

      // Verify player is host
      if (!player.isHost) {
        throw new Error('Only the host can start the game');
      }

      // Issue #419: Room state is the single source of truth for scenarioId
      // It's set during room creation or via select_scenario event
      const scenarioId = room.scenarioId;
      if (!scenarioId) {
        throw new Error(
          'No scenario selected. Please select a scenario before starting the game.',
        );
      }

      // Load scenario data
      const scenario = await this.scenarioService.loadScenario(scenarioId);
      if (!scenario) {
        throw new Error(`Scenario not found: ${scenarioId}`);
      }

      // Validate scenario
      const validation = this.scenarioService.validateScenario(scenario);
      if (!validation.valid) {
        throw new Error(`Invalid scenario: ${validation.errors.join(', ')}`);
      }

      // Start the game (Issue #244 - Campaign Mode support)
      // Use room.campaignId (set during room creation) as the server authority
      // instead of relying on frontend to pass it back
      this.logger.log(
        `[Campaign Debug] Before startGame: room.campaignId=${room.campaignId}, scenarioId=${scenarioId}`,
      );
      roomService.startGame(
        room.roomCode,
        scenarioId,
        userId,
        room.campaignId || undefined,
      );
      this.logger.log(
        `[Campaign Debug] After startGame: room.campaignId=${room.campaignId}, room.scenarioId=${room.scenarioId}`,
      );

      // Create Game record in database (required for GameResult foreign key)
      // Uses room.id (UUID) to ensure consistency between in-memory and database
      try {
        await this.prisma.game.create({
          data: {
            id: room.id,
            roomCode: room.roomCode,
            scenarioId: scenarioId,
            campaignId: room.campaignId || null,
            difficulty: 1,
            status: 'ACTIVE',
            startedAt: new Date(),
          },
        });
        this.logger.log(
          `[Campaign Debug] Created Game record in DB with id=${room.id}`,
        );
      } catch (dbError: any) {
        // Log but don't fail - game can still proceed, just won't persist results
        this.logger.error(`Failed to create Game record: ${dbError.message}`);
      }

      // TODO: Simplify playerStartPositions structure and allow player selection
      // Current implementation uses Record<number, AxialCoordinates[]> keyed by player count,
      // which is complex and inflexible. Consider:
      // 1. Change to simple array of valid starting hex coordinates in scenario data
      // 2. Add a "select_starting_position" event before game start
      // 3. Let each player click on an available starting hex to claim it
      // 4. Validate selections (hex must be in scenario's starting zones, not already taken)
      // 5. Auto-assign any remaining positions when game starts
      // This would improve UX and remove the need for player-count-specific position arrays

      // Get player starting positions from scenario
      // Count total characters (multi-character support)
      const totalCharacters = room.players.reduce(
        (sum: number, p: Player) => sum + p.characterClasses.length,
        0,
      );
      const startingPositions = scenario.playerStartPositions[totalCharacters];
      if (!startingPositions || startingPositions.length < totalCharacters) {
        throw new Error(
          `Scenario does not support ${totalCharacters} characters`,
        );
      }

      // Create characters for all players at starting positions (multi-character support)
      this.logger.log(
        `🎭 Creating ${totalCharacters} characters for ${room.players.length} players`,
      );
      room.players.forEach((p: Player, idx: number) => {
        this.logger.log(
          `   Player ${idx}: ${p.nickname} - characters: ${p.characterClasses.join(', ') || 'none'}`,
        );
      });

      // Clear all existing characters for players in this room (prevent duplicates from previous games)
      const playerIds = (room.players as Player[]).map((p) => p.userId);
      const removedCount = characterService.prepareForNewGame(playerIds);
      if (removedCount > 0) {
        this.logger.log(
          `🧹 Cleared ${removedCount} old characters for ${room.players.length} players`,
        );
      }

      // Flatten all characters across all players
      let positionIndex = 0;
      const characters: Character[] = [];

      for (const p of room.players as Player[]) {
        for (let charIdx = 0; charIdx < p.characterClasses.length; charIdx++) {
          const characterClass = p.characterClasses[charIdx];
          const characterId = p.characterIds[charIdx];
          const startingPosition = startingPositions[positionIndex];

          this.logger.log(`🎭 Creating character for player ${p.nickname}:`, {
            uuid: p.userId,
            characterClass,
            characterId: characterId || 'none',
            startingPosition,
            positionIndex,
          });

          // Use addCharacterForPlayer to support multiple characters per player
          const character = characterService.addCharacterForPlayer(
            p.userId,
            characterClass,
            startingPosition,
          );

          // Update character's hand with correct card IDs from ability card service
          // (Character.create uses deprecated getStarterDeck with random IDs)
          const classCards =
            await this.abilityCardService.getCardsByClass(characterClass);
          const starterCardIds = classCards
            .filter((card) => card.level === 1)
            .map((card) => card.id);
          character.hand = starterCardIds;

          // Store persistent character ID if available
          if (characterId) {
            character.setUserCharacterId(characterId);
          }

          characters.push(character);
          positionIndex++;
        }
      }

      this.logger.log(`✅ Created ${characters.length} characters`);

      // Spawn monsters
      const monsters = this.scenarioService.spawnMonsters(
        scenario,
        room.roomCode,
        scenario.difficulty,
      );

      // Initialize monster modifier deck (shared by all monsters)
      const monsterDeck = this.modifierDeckService.initializeStandardDeck();
      this.monsterModifierDeck.set(room.roomCode, monsterDeck);

      // Initialize ally modifier deck (for non-owned summons like scenario allies)
      const allyDeck = this.modifierDeckService.initializeStandardDeck();
      this.allyModifierDeck.set(room.roomCode, allyDeck);

      // Initialize per-character modifier decks
      const characterDecks = new Map<string, AttackModifierCard[]>();
      for (const player of room.players) {
        const characters = characterService.getCharactersByPlayerId(
          player.userId,
        );
        for (const char of characters) {
          if (char) {
            const charDeck = this.modifierDeckService.initializeStandardDeck();
            characterDecks.set(char.id, charDeck);
          }
        }
      }
      this.characterModifierDecks.set(room.roomCode, characterDecks);

      // Store monsters for this room
      this.roomMonsters.set(room.roomCode, monsters);

      // Initialize monster initiatives (one per monster type)
      this.drawMonsterInitiatives(room.roomCode, monsters);

      // Create hex map from scenario map layout for pathfinding
      const hexMap = new Map<string, any>();
      scenario.mapLayout.forEach((tile) => {
        const key = `${tile.coordinates.q},${tile.coordinates.r}`;
        hexMap.set(key, tile);
      });
      this.roomMaps.set(room.roomCode, hexMap);

      // Store scenario data for background fields (Issue #191)
      this.roomScenarios.set(room.roomCode, scenario);

      // Initialize empty loot tokens array for this room
      this.roomLootTokens.set(room.roomCode, []);

      // Initialize round counter and game phase
      this.currentRound.set(room.roomCode, 0);
      this.roomGamePhase.set(room.roomCode, 'card_selection'); // Game starts with card selection

      // Issue #220: Initialize elemental state for this room
      this.roomElementalState.set(
        room.roomCode,
        this.elementalStateService.initializeElementalState(),
      );

      // Phase 3: Initialize objective system state
      this.roomGameStartTime.set(room.roomCode, Date.now());
      this.initializeObjectiveSystem(room.roomCode, scenario);

      // Initialize player stats for each player
      const playerStatsMap = new Map<
        string,
        {
          damageDealt: number;
          damageTaken: number;
          monstersKilled: number;
          cardsLost: number;
        }
      >();
      room.players.forEach((p: Player) => {
        playerStatsMap.set(p.userId, {
          damageDealt: 0,
          damageTaken: 0,
          monstersKilled: 0,
          cardsLost: 0,
        });
      });
      this.roomPlayerStats.set(room.roomCode, playerStatsMap);

      // Note: Game is already started by roomService.startGame() on line 533
      this.logger.log(
        `Room ${room.roomCode} game started, status set to ACTIVE`,
      );

      // Load ability cards for each character
      const charactersWithDecks = await Promise.all(
        characters.map(async (c: any) => {
          const charData = c.toJSON();
          this.logger.log(`🃏 Loading ability deck for character:`, {
            id: charData.id,
            playerId: charData.playerId,
            characterClass: charData.characterClass,
          });

          // Get ability deck for this character class from database
          const abilityDeck = await this.abilityCardService.getCardsByClass(
            charData.characterClass,
          );

          this.logger.log(`🃏 Ability deck loaded:`, {
            characterClass: charData.characterClass,
            deckSize: abilityDeck.length,
            firstCard: abilityDeck[0]?.name || 'NO CARDS',
          });

          return {
            id: charData.id,
            playerId: charData.playerId,
            userCharacterId: charData.userCharacterId, // Database character ID for inventory API
            classType: charData.characterClass,
            health: charData.currentHealth,
            maxHealth: charData.stats.maxHealth,
            currentHex: charData.position,
            conditions: charData.conditions,
            isExhausted: charData.exhausted,
            hand: charData.hand || [],
            discardPile: charData.discardPile || [],
            lostPile: charData.lostPile || [],
            abilityDeck, // Include ability deck for card selection
          };
        }),
      );

      // Broadcast game started to all players
      // Get objectives that were initialized above
      const objectives = this.roomObjectives.get(room.roomCode);

      const gameStartedPayload: GameStartedPayload = {
        scenarioId: scenarioId,
        scenarioName: scenario.name,
        mapLayout: scenario.mapLayout,
        monsters: monsters.map((m) => ({
          id: m.id,
          monsterType: m.monsterType,
          isElite: m.isElite,
          currentHex: m.currentHex,
          health: m.health,
          maxHealth: m.maxHealth,
          conditions: m.conditions,
        })),
        characters: charactersWithDecks,
        objectives: this.sanitizeObjectivesForPayload(objectives),
      };

      // DEBUG: Log what objectives are being sent (handleStartGame path)
      this.logger.log(
        `[DEBUG-OBJECTIVES-START] Sanitized objectives: ${JSON.stringify(gameStartedPayload.objectives?.primary)}`,
      );

      Object.assign(gameStartedPayload, {
        // Issue #318 - Campaign context for return navigation
        campaignId: room.campaignId || null,
        // Background image configuration (Issue #191)
        backgroundImageUrl: scenario.backgroundImageUrl,
        backgroundOpacity: scenario.backgroundOpacity,
        backgroundOffsetX: scenario.backgroundOffsetX,
        backgroundOffsetY: scenario.backgroundOffsetY,
        backgroundScale: scenario.backgroundScale,
      });

      // Debug: Log background URL being sent
      this.logger.log(
        `🖼️ Background for game_started: scenarioId=${scenario.id}, backgroundImageUrl=${scenario.backgroundImageUrl || 'NONE'}, opacity=${scenario.backgroundOpacity}, scale=${scenario.backgroundScale}`,
      );

      // Initialize game log with scenario start entry
      this.roomGameLogs.set(room.roomCode, []);
      this.addGameLogEntry(room.roomCode, [
        { text: `Scenario started: ${scenario.name}` },
      ]);

      // Load and cache narrative definitions for this scenario
      const narrativeDef = await this.narrativeService.loadScenarioNarrative(
        scenario.id,
      );
      this.roomNarratives.set(room.roomCode, narrativeDef);
      if (narrativeDef) {
        this.logger.log(
          `Loaded narrative for scenario ${scenario.id}: intro=${!!narrativeDef.intro}, triggers=${narrativeDef.triggers?.length ?? 0}`,
        );
      }

      // Initialize narrative state for this room
      this.narrativeService.initializeRoomState(room.roomCode);
      this.roomOpenedDoors.set(room.roomCode, []);
      this.roomCollectedTreasures.set(room.roomCode, []);
      this.roomCollectedLootHexes.set(room.roomCode, []);

      // Send game_started individually to each connected client
      // This ensures all clients (including the host who is already in the room) receive the event
      const roomSockets = await this.server.in(room.roomCode).fetchSockets();
      this.logger.log(
        `Sending game_started to ${roomSockets.length} clients in room ${room.roomCode}`,
      );

      for (const roomSocket of roomSockets) {
        const userId = this.socketToPlayer.get(roomSocket.id);
        const player = room.players.find((p: Player) => p.userId === userId);
        const nickname = player?.nickname || 'Unknown';

        roomSocket.emit(
          'game_started',
          gameStartedPayload,
          (acknowledged: boolean) => {
            if (acknowledged) {
              // Acknowledgment logging removed
            } else {
              this.logger.warn(
                `⚠️  Game start NOT acknowledged by ${nickname}, retrying in 500ms...`,
              );
              // Retry once after 500ms
              setTimeout(() => {
                // Retry logging removed (error logged elsewhere)
                roomSocket.emit('game_started', gameStartedPayload);
              }, 500);
            }
          },
        );
      }

      // Display intro narrative if one exists for this scenario
      if (narrativeDef?.intro) {
        const players = room.players.map((p: Player) => ({
          id: p.userId,
          name: p.nickname,
        }));
        const introNarrative = this.narrativeService.createIntroNarrative(
          narrativeDef.intro,
          players,
        );
        this.narrativeService.setActiveNarrative(room.roomCode, introNarrative);
        this.emitNarrativeDisplay(room.roomCode, introNarrative);
        this.logger.log(
          `Displaying intro narrative for scenario ${scenario.id}`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Start game error: ${errorMessage}`);
      const errorPayload: ErrorPayload = {
        code: 'START_GAME_ERROR',
        message: errorMessage,
      };
      client.emit('error', errorPayload);
    }
  }

  /**
   * Move character to a hex
   */
  @SubscribeMessage('move_character')
  handleMoveCharacter(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: MoveCharacterPayload,
  ): void {
    try {
      const userId = this.socketToPlayer.get(client.id);
      if (!userId) {
        throw new Error('Player not authenticated');
      }

      // Verbose movement log removed

      // Get room from client's current Socket.IO room (multi-room support)
      const roomData = this.getRoomFromSocket(client);
      if (!roomData) {
        throw new Error('Player not in any room or room not found');
      }

      const { room } = roomData;

      // Validate game is active
      if (room.status !== RoomStatus.ACTIVE) {
        throw new Error('Game is not active');
      }

      // Get character by ID from payload (multi-character support)
      const character = characterService.getCharacterById(payload.characterId);
      if (!character) {
        throw new Error('Character not found');
      }

      // Verify this character belongs to the player
      if (character.playerId !== userId) {
        throw new Error('Character does not belong to this player');
      }

      // Verify it's this character's turn
      const turnOrder = this.roomTurnOrder.get(room.roomCode);
      const currentIndex = this.currentTurnIndex.get(room.roomCode) || 0;
      if (turnOrder && turnOrder.length > 0) {
        const currentEntity = turnOrder[currentIndex];
        if (
          currentEntity.entityType === 'character' &&
          currentEntity.entityId !== character.id
        ) {
          throw new Error("It is not this character's turn");
        }
      }

      // Check if character is immobilized
      if (character.isImmobilized) {
        throw new Error('Character is immobilized and cannot move');
      }

      // Gloomhaven rule: You can move before OR after attacking, but you cannot split your movement around an attack
      // You CAN continue moving in multiple steps (e.g., move 2, then move 2 more)
      // You CANNOT move, attack, then move again (that would split movement around the attack)
      if (character.hasMovedThisTurn && character.hasAttackedThisTurn) {
        throw new Error(
          'Character has already moved and attacked this turn. You cannot split movement around an attack.',
        );
      }

      // Store previous position
      const fromHex = character.position;

      // Get hex map for pathfinding
      const hexMap = this.roomMaps.get(room.roomCode);
      if (!hexMap) {
        throw new Error('Map not initialized for this room');
      }

      // Build set of occupied hexes (monsters block player movement)
      const monsters = this.roomMonsters.get(room.roomCode) || [];
      const occupiedHexes = new Set<string>();
      for (const monster of monsters) {
        if (!monster.isDead && monster.currentHex) {
          occupiedHexes.add(`${monster.currentHex.q},${monster.currentHex.r}`);
        }
      }

      // Calculate path using pathfinding service (monsters block movement)
      const path = this.pathfindingService.findPath(
        fromHex,
        payload.targetHex,
        hexMap,
        false, // canFly
        occupiedHexes,
      );

      if (!path) {
        throw new Error('No valid path to target hex (blocked by obstacles)');
      }

      // Calculate movement distance for this move (path length - 1, since path includes starting hex)
      const moveDistance = path.length > 0 ? path.length - 1 : 0;

      // Check if character has enough remaining movement for this move
      const remainingMovement = character.movementRemainingThisTurn;
      if (moveDistance > remainingMovement) {
        throw new Error(
          `Not enough movement remaining. Distance: ${moveDistance}, Remaining: ${remainingMovement}/${character.movement}`,
        );
      }

      // Get reachable hexes within remaining movement range (monsters block movement)
      const reachableHexes = this.pathfindingService.getReachableHexes(
        fromHex,
        remainingMovement,
        hexMap,
        false, // canFly
        occupiedHexes,
      );

      // Check if target is within remaining movement range
      const targetKey = `${payload.targetHex.q},${payload.targetHex.r}`;
      const isReachable = reachableHexes.some(
        (hex) => `${hex.q},${hex.r}` === targetKey,
      );

      if (!isReachable) {
        throw new Error(
          `Target hex is not reachable within remaining movement range of ${remainingMovement}`,
        );
      }

      // Check if target hex is occupied by a monster (destination check - monsters already block path)
      const isOccupiedByMonster = monsters.some(
        (m: any) =>
          m.currentHex.q === payload.targetHex.q &&
          m.currentHex.r === payload.targetHex.r &&
          !m.isDead,
      );

      if (isOccupiedByMonster) {
        throw new Error('Target hex is occupied by a monster');
      }

      // Check if target hex is occupied by another character (including all multi-character players' characters)
      const allCharacters = room.players
        .flatMap((p: Player) =>
          characterService.getCharactersByPlayerId(p.userId),
        )
        .filter((c: any) => c !== null && c.id !== character.id && !c.isDead);

      const isOccupiedByCharacter = allCharacters.some(
        (c: any) =>
          c.position.q === payload.targetHex.q &&
          c.position.r === payload.targetHex.r,
      );

      if (isOccupiedByCharacter) {
        throw new Error('Target hex is occupied by another character');
      }

      // Check for narrative triggers at each hex along the path
      // If a trigger fires, interrupt movement at that hex
      let actualTargetHex = payload.targetHex;
      let actualPath = path;
      let triggerToFire:
        | import('../../../shared/types/narrative').NarrativeTriggerDef
        | null = null;

      // Check each hex in the path (excluding the starting hex which is index 0)
      for (let i = 1; i < path.length; i++) {
        const hex = path[i];
        const trigger = this.checkTriggerAtPosition(
          room.roomCode,
          character.id,
          hex,
        );
        if (trigger) {
          // Interrupt movement at this hex
          actualTargetHex = hex;
          actualPath = path.slice(0, i + 1); // Include up to and including this hex
          triggerToFire = trigger;
          this.logger.log(
            `Movement interrupted at (${hex.q}, ${hex.r}) by trigger ${trigger.triggerId}`,
          );
          break;
        }
      }

      // Calculate actual movement distance
      const actualMoveDistance =
        actualPath.length > 0 ? actualPath.length - 1 : 0;

      // Move character to actual target (may be interrupted position)
      characterService.moveCharacter(character.id, actualTargetHex);

      // Track cumulative movement distance used this turn
      character.addMovementUsed(actualMoveDistance);

      // Broadcast character moved to all players with calculated path
      const characterMovedPayload: CharacterMovedPayload = {
        characterId: character.id,
        characterName: this.getPlayerNickname(
          room.roomCode,
          character.playerId,
          character.characterClass,
        ),
        fromHex,
        toHex: actualTargetHex,
        movementPath: actualPath,
        distance: actualMoveDistance,
      };

      this.server
        .to(room.roomCode)
        .emit('character_moved', characterMovedPayload);

      // Add log entry for character movement
      this.addGameLogEntry(room.roomCode, [
        { text: character.characterClass, color: 'lightblue' },
        { text: ` moved ` },
        { text: `${actualMoveDistance}`, color: 'cyan' },
        { text: ` hexes.` },
      ]);

      this.logger.log(
        `Character ${character.id} moved to (${actualTargetHex.q}, ${actualTargetHex.r})`,
      );

      // Fire the trigger that interrupted movement (if any)
      // Wrap in try-catch to prevent trigger failures from affecting the completed movement
      // Movement is already complete and valid - trigger failure should not roll it back
      if (triggerToFire) {
        try {
          this.fireNarrativeTrigger(room.roomCode, triggerToFire, userId);
        } catch (triggerError) {
          const triggerErrorMessage =
            triggerError instanceof Error
              ? triggerError.message
              : 'Unknown trigger error';
          this.logger.error(
            `Failed to fire narrative trigger ${triggerToFire.triggerId} after movement: ${triggerErrorMessage}`,
          );
          // Emit a non-fatal error to clients - movement succeeded but trigger failed
          this.server.to(room.roomCode).emit('narrative_trigger_error', {
            triggerId: triggerToFire.triggerId,
            message: `Narrative trigger failed to fire: ${triggerErrorMessage}`,
          });
        }
      } else {
        // Check for any other triggers that might fire at the final position
        // Also wrap in try-catch for consistency
        try {
          this.checkNarrativeTriggers(room.roomCode);
        } catch (triggerError) {
          const triggerErrorMessage =
            triggerError instanceof Error
              ? triggerError.message
              : 'Unknown trigger error';
          this.logger.error(
            `Failed to check narrative triggers after movement: ${triggerErrorMessage}`,
          );
          // Non-fatal - movement is still valid
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Move character error: ${errorMessage}`);
      const errorPayload: ErrorPayload = {
        code: 'MOVE_CHARACTER_ERROR',
        message: errorMessage,
      };
      client.emit('error', errorPayload);
    }
  }

  /**
   * Select two ability cards for the round (US2 - T097)
   * Issue #419: Returns acknowledgment for reliable card selection
   */
  @SubscribeMessage('select_cards')
  async handleSelectCards(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SelectCardsPayload,
  ): Promise<ActionResponse> {
    const requestId = (payload as any).requestId || 'unknown';
    try {
      const userId = this.socketToPlayer.get(client.id);
      if (!userId) {
        throw new Error('Player not authenticated');
      }

      // Verbose card select log removed

      // Get room from client's current Socket.IO room (multi-room support)
      const roomData = this.getRoomFromSocket(client);
      if (!roomData) {
        throw new Error('Player not in any room or room not found');
      }

      const { room } = roomData;

      // Validate game is active
      if (room.status !== RoomStatus.ACTIVE) {
        throw new Error('Game is not active');
      }

      // Get player's character by ID from payload (multi-character support - characterId required)
      if (!payload.characterId) {
        throw new Error('characterId is required');
      }
      const character = characterService.getCharacterById(payload.characterId);
      if (!character) {
        throw new Error('Character not found');
      }
      // Verify this character belongs to the player
      if (character.playerId !== userId) {
        throw new Error('Character does not belong to this player');
      }

      // Validate cards are in player's hand (belong to character class)
      const validation = await this.abilityCardService.validateCardSelection(
        payload.topCardId,
        payload.bottomCardId,
        character.characterClass,
      );

      if (!validation.valid) {
        throw new Error(
          `Invalid card selection: ${validation.errors.join(', ')}`,
        );
      }

      // Calculate initiative from selected cards
      const topCardInitiative = validation.topCard!.initiative;
      const bottomCardInitiative = validation.bottomCard!.initiative;
      const initiative = this.turnOrderService.calculateInitiative(
        topCardInitiative,
        bottomCardInitiative,
      );

      // Store selected cards and initiative on character
      character.selectedCards = {
        topCardId: payload.topCardId,
        bottomCardId: payload.bottomCardId,
        initiative,
      };

      // Extract and set effective movement and attack for this turn from the selected cards
      // In Gloomhaven, you typically use: top action for attack, bottom action for movement
      const topCard = validation.topCard!;
      const bottomCard = validation.bottomCard!;

      let movementValue = 0;
      let attackValue = 0;
      let attackRange = 0;

      // Extract movement - check bottom action first (most common)
      if (
        bottomCard.bottomAction?.type === 'move' &&
        bottomCard.bottomAction.value
      ) {
        movementValue = bottomCard.bottomAction.value;
      } else if (
        topCard.topAction?.type === 'move' &&
        topCard.topAction.value
      ) {
        movementValue = topCard.topAction.value;
      } else if (
        bottomCard.topAction?.type === 'move' &&
        bottomCard.topAction.value
      ) {
        movementValue = bottomCard.topAction.value;
      } else if (
        topCard.bottomAction?.type === 'move' &&
        topCard.bottomAction.value
      ) {
        movementValue = topCard.bottomAction.value;
      }

      // Extract attack and range - check top action first (most common)
      // Range is now in modifiers, use getRange() helper
      if (topCard.topAction?.type === 'attack' && topCard.topAction.value) {
        attackValue = topCard.topAction.value;
        attackRange = getRange(topCard.topAction.modifiers);
      } else if (
        bottomCard.bottomAction?.type === 'attack' &&
        bottomCard.bottomAction.value
      ) {
        attackValue = bottomCard.bottomAction.value;
        attackRange = getRange(bottomCard.bottomAction.modifiers);
      } else if (
        topCard.bottomAction?.type === 'attack' &&
        topCard.bottomAction.value
      ) {
        attackValue = topCard.bottomAction.value;
        attackRange = getRange(topCard.bottomAction.modifiers);
      } else if (
        bottomCard.topAction?.type === 'attack' &&
        bottomCard.topAction.value
      ) {
        attackValue = bottomCard.topAction.value;
        attackRange = getRange(bottomCard.topAction.modifiers);
      }

      // Set the effective values for this turn
      character.setEffectiveMovement(movementValue);
      character.setEffectiveAttack(attackValue, attackRange);

      this.logger.log(
        `Player ${userId} effective stats for this turn - Movement: ${movementValue}, Attack: ${attackValue}, Range: ${attackRange}`,
      );

      // Broadcast cards selected (hide actual card IDs, only show initiative)
      const cardsSelectedPayload: CardsSelectedPayload = {
        playerId: userId,
        topCardInitiative,
        bottomCardInitiative,
      };

      this.server
        .to(room.roomCode)
        .emit('cards_selected', cardsSelectedPayload);

      this.logger.log(
        `Player ${userId} selected cards (initiative: ${initiative})`,
      );

      // Check if all characters have selected cards (including all multi-character players' characters)
      const allCharacters = room.players
        .flatMap((p: Player) =>
          characterService.getCharactersByPlayerId(p.userId),
        )
        .filter((c: any): c is any => Boolean(c && !c.exhausted));

      const allSelected = allCharacters.every((c: any): c is any =>
        Boolean(c && c.selectedCards !== undefined),
      );

      // If all players selected, determine turn order and broadcast
      if (allSelected) {
        this.startNewRound(room.roomCode);
      }

      // Issue #419: Return success acknowledgment
      return {
        requestId,
        success: true,
        serverTimestamp: Date.now(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Select cards error: ${errorMessage}`);
      const errorPayload: ErrorPayload = {
        code: 'SELECT_CARDS_ERROR',
        message: errorMessage,
      };
      client.emit('error', errorPayload);

      // Issue #419: Return error acknowledgment
      return {
        requestId,
        success: false,
        error: {
          code: 'SELECT_CARDS_ERROR',
          message: errorMessage,
        },
        serverTimestamp: Date.now(),
      };
    }
  }

  /**
   * Start a new round with turn order determination
   */
  private startNewRound(roomCode: string): void {
    const room = roomService.getRoom(roomCode);
    if (!room) {
      return;
    }

    // Get all characters and monsters (including all characters for multi-character players)
    const characters = room.players
      .flatMap((p: any) => characterService.getCharactersByPlayerId(p.userId))
      .filter((c: any) => c && !c.exhausted && c.selectedCards);

    // Get monsters from room state
    const monsters = this.roomMonsters.get(roomCode) || [];

    // Issue #228: Get summons from room state
    const summons = this.roomSummons.get(roomCode) || [];

    // Get monster initiatives for this room
    const monsterInitiatives =
      this.roomMonsterInitiatives.get(roomCode) || new Map();

    // Build turn order entries
    const turnOrderEntries = [
      ...characters.map((c: any) => ({
        entityId: c!.id,
        entityType: 'character' as const,
        initiative: c!.selectedCards!.initiative,
        name: c!.characterClass, // Use character class as name
        characterClass: c!.characterClass,
        isDead: false,
        isExhausted: c!.exhausted,
      })),
      ...monsters.map((m) => ({
        entityId: m.id,
        entityType: 'monster' as const,
        initiative: monsterInitiatives.get(m.monsterType) || 50, // Get from monster type initiative
        name: m.monsterType, // Use monster type as name
        characterClass: undefined,
        isDead: m.isDead,
        isExhausted: false,
      })),
      // Issue #228: Add summons to turn order
      ...summons
        .filter((s) => !s.isDead)
        .map((s) => ({
          entityId: s.id,
          entityType: 'summon' as const,
          initiative: s.initiative,
          name: s.name,
          ownerId: s.ownerId,
          isDead: s.isDead,
          isExhausted: false,
        })),
    ];

    // Determine turn order
    const turnOrder =
      this.turnOrderService.determineTurnOrder(turnOrderEntries);

    // Store turn order and reset turn index
    this.roomTurnOrder.set(roomCode, turnOrder);
    this.currentTurnIndex.set(roomCode, 0);
    this.monstersActedThisTurn.set(roomCode, new Set()); // Reset monster action tracking for new round
    this.summonsActedThisTurn.set(roomCode, new Set()); // Issue #228: Reset summon action tracking for new round

    // Increment round number and set phase to active
    const roundNumber = (this.currentRound.get(roomCode) || 0) + 1;
    this.currentRound.set(roomCode, roundNumber);
    this.roomGamePhase.set(roomCode, 'active_turn');

    // Broadcast round started with turn order
    if (turnOrder.length > 0) {
      const roundStartedPayload: any = {
        roundNumber,
        turnOrder: turnOrder.map(
          ({ entityId, name, entityType, initiative }) => ({
            entityId,
            name,
            entityType,
            initiative,
          }),
        ),
      };

      this.server.to(roomCode).emit('round_started', roundStartedPayload);

      // Add log entry for round start
      this.addGameLogEntry(roomCode, [
        { text: `Round ${roundNumber} has started.` },
      ]);

      // Also send turn_started for the first entity
      const firstEntity = turnOrder[0];
      const turnStartedPayload: TurnStartedPayload = {
        entityId: firstEntity.entityId,
        entityType: firstEntity.entityType,
        turnIndex: 0,
      };
      this.server.to(roomCode).emit('turn_started', turnStartedPayload);

      // Add log entry for turn start
      this.addGameLogEntry(roomCode, [{ text: `${firstEntity.name}'s turn.` }]);

      this.logger.log(
        `Round ${roundNumber} started in room ${roomCode}, first turn: ${turnOrder[0].entityId} (initiative: ${turnOrder[0].initiative})`,
      );

      // If the first turn is a monster, activate its AI immediately
      if (firstEntity.entityType === 'monster') {
        this.logger.log(
          `First turn is a monster, activating AI for: ${firstEntity.entityId}`,
        );
        // Use setTimeout to ensure turn_started event is processed first
        setTimeout(() => {
          this.activateMonster(firstEntity.entityId, roomCode);
        }, 100);
      }

      // Issue #228: If the first turn is an AI-controlled summon, activate it immediately
      if (firstEntity.entityType === 'summon') {
        const summon = summons.find((s) => s.id === firstEntity.entityId);
        if (summon && !summon.playerControlled) {
          this.logger.log(
            `First turn is an AI-controlled summon, activating AI for: ${firstEntity.entityId}`,
          );
          setTimeout(() => {
            this.activateSummon(firstEntity.entityId, roomCode);
          }, 100);
        }
      }
    }
  }

  /**
   * Attack a target (monster or character) (US2 - T097)
   */
  @SubscribeMessage('attack_target')
  async handleAttackTarget(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: AttackTargetPayload,
  ): Promise<void> {
    try {
      const userId = this.socketToPlayer.get(client.id);
      if (!userId) {
        throw new Error('Player not authenticated');
      }

      this.logger.log(
        `Attack target request from ${userId} -> ${payload.targetId}`,
      );

      // Get room from client's current Socket.IO room (multi-room support)
      const roomData = this.getRoomFromSocket(client);
      if (!roomData) {
        throw new Error('Player not in any room or room not found');
      }

      const { room } = roomData;

      // Validate game is active
      if (room.status !== RoomStatus.ACTIVE) {
        throw new Error('Game is not active');
      }

      // Get attacker's character by ID from payload (multi-character support)
      if (!payload.characterId) {
        throw new Error('characterId is required');
      }
      const attacker = characterService.getCharacterById(payload.characterId);
      if (!attacker) {
        throw new Error('Character not found');
      }

      // Verify attacker belongs to this player
      if (attacker.playerId !== userId) {
        throw new Error('Character does not belong to this player');
      }

      // Verify it's this character's turn
      const turnOrder = this.roomTurnOrder.get(room.roomCode);
      const currentIndex = this.currentTurnIndex.get(room.roomCode) || 0;
      if (turnOrder && turnOrder.length > 0) {
        const currentEntity = turnOrder[currentIndex];
        if (
          currentEntity.entityType === 'character' &&
          currentEntity.entityId !== attacker.id
        ) {
          throw new Error("It is not this character's turn");
        }
      }

      // Check if attacker is disarmed
      if (attacker.isDisarmed) {
        throw new Error('Attacker is disarmed and cannot attack');
      }

      // Check if character has already attacked this turn (Gloomhaven rule: 1 attack action per turn)
      if (attacker.hasAttackedThisTurn) {
        throw new Error(
          'Character has already attacked this turn. You can only use one attack action per turn.',
        );
      }

      // Get target (check monsters first, then characters)
      const monsters = this.roomMonsters.get(room.roomCode) || [];
      let target: any = monsters.find((m: any) => m.id === payload.targetId);
      const isMonsterTarget = !!target;

      if (!target) {
        // Try to find as character (direct lookup by ID)
        target = characterService.getCharacterById(payload.targetId);
      }

      if (!target) {
        throw new Error('Target not found');
      }

      // Validate target is alive
      if (isMonsterTarget && target.isDead) {
        throw new Error('Target monster is already dead');
      }
      if (!isMonsterTarget && target.isDead) {
        throw new Error('Target character is already dead');
      }

      // Get attack value from attacker's selected card (Gloomhaven: attack comes from cards)
      let baseAttack = attacker.effectiveAttackThisTurn;

      // Apply persistent item bonuses to attack (Issue #205 - Phase 4.1)
      // Only applies if this is a persistent character with equipped items
      if (characterService.isPersistentCharacter(attacker.id)) {
        try {
          const itemBonuses = await this.inventoryService.getEquippedBonuses(
            attacker.id,
          );
          if (itemBonuses.attackBonus !== 0) {
            baseAttack += itemBonuses.attackBonus;
            this.logger.log(
              `Applied item attack bonus: +${itemBonuses.attackBonus} (total base attack: ${baseAttack})`,
            );
          }
        } catch (error) {
          // Don't fail the attack if item bonus lookup fails
          this.logger.warn(
            `Failed to get item bonuses for character ${attacker.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      // Draw attack modifier card from character's personal deck
      const characterDecks = this.characterModifierDecks.get(room.roomCode);
      if (!characterDecks) {
        throw new Error(
          `Character modifier decks not found for room ${room.roomCode}`,
        );
      }
      let modifierDeck = characterDecks.get(attacker.id);
      if (!modifierDeck || modifierDeck.length === 0) {
        // Reinitialize if empty
        modifierDeck = this.modifierDeckService.initializeStandardDeck();
        characterDecks.set(attacker.id, modifierDeck);
      }

      const { card: modifierCard, remainingDeck } =
        this.modifierDeckService.drawCard(modifierDeck);
      characterDecks.set(attacker.id, remainingDeck);

      // Check if reshuffle needed (x2 or null triggers reshuffle)
      if (this.modifierDeckService.checkReshuffle(modifierCard)) {
        const reshuffled = this.modifierDeckService.reshuffleDeck(
          remainingDeck,
          [],
        );
        characterDecks.set(attacker.id, reshuffled);
      }

      // Get attack action modifiers for push/pull/conditions (Issue #220)
      const attackAction =
        await this.getAttackActionFromSelectedCards(attacker);
      const attackModifiers = attackAction?.modifiers || [];

      // Process element consumption for bonuses (Issue #220 - Phase 3)
      // Elements must be consumed BEFORE damage calculation to apply bonuses
      const { bonuses: elementBonuses } = this.processConsumeModifiers(
        room.roomCode,
        attackModifiers,
      );
      const elementDamageBonus = elementBonuses.get('damage') || 0;

      // Calculate damage (with element bonus)
      let damage = this.damageService.calculateDamage(
        baseAttack + elementDamageBonus,
        modifierCard,
      );
      if (elementDamageBonus > 0) {
        this.logger.log(
          `Element damage bonus applied: +${elementDamageBonus} (base: ${baseAttack} -> ${baseAttack + elementDamageBonus})`,
        );
      }

      // Apply shield reduction with pierce (Issue #220 - Phase 3/4)
      const shieldEffect = this.conditionService.getShieldEffect(target.id);
      if (shieldEffect && shieldEffect.value > 0) {
        // Check for pierce modifier - reduces effective shield
        const pierceModifier = getPierce(attackModifiers);
        const pierceValue = pierceModifier?.value || 0;
        const effectiveShield = Math.max(0, shieldEffect.value - pierceValue);

        if (pierceValue > 0) {
          this.logger.log(
            `Pierce ${pierceValue} reduces shield from ${shieldEffect.value} to ${effectiveShield}`,
          );
        }

        const shieldReduction = Math.min(effectiveShield, damage);
        damage = Math.max(0, damage - shieldReduction);
        this.logger.log(
          `Shield absorbed ${shieldReduction} damage (target: ${target.id}, effective shield: ${effectiveShield})`,
        );
      }

      // Apply damage to target
      let targetHealth: number;
      let targetDead = false;

      // Apply defense bonus for character targets (Issue #205 - Phase 4.1)
      if (
        !isMonsterTarget &&
        characterService.isPersistentCharacter(target.id)
      ) {
        try {
          const defenseBonus = await this.inventoryService.getEquippedBonuses(
            target.id,
          );
          if (defenseBonus.defenseBonus > 0) {
            const reducedDamage = Math.max(
              0,
              damage - defenseBonus.defenseBonus,
            );
            this.logger.log(
              `Applied defense bonus: ${defenseBonus.defenseBonus} (damage ${damage} -> ${reducedDamage})`,
            );
            damage = reducedDamage;
          }
        } catch (error) {
          this.logger.warn(
            `Failed to get defense bonus for ${target.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      if (isMonsterTarget) {
        target.health = Math.max(0, target.health - damage);
        targetHealth = target.health;
        targetDead = target.health === 0;

        // Phase 3: Track player damage dealt and accumulated stats
        const playerStats = this.roomPlayerStats.get(room.roomCode);
        if (playerStats) {
          const stats = playerStats.get(userId);
          if (stats) {
            stats.damageDealt += damage;
          }
        }
        const accumulatedStats = this.roomAccumulatedStats.get(room.roomCode);
        if (accumulatedStats) {
          accumulatedStats.totalDamageDealt += damage;
        }

        if (targetDead) {
          target.isDead = true;

          // Phase 3: Track monster kills
          if (playerStats) {
            const stats = playerStats.get(userId);
            if (stats) {
              stats.monstersKilled++;
            }
          }
          if (accumulatedStats) {
            accumulatedStats.totalMonstersKilled++;
          }

          // Spawn loot token when monster dies
          const scenario = await this.scenarioService.loadScenario(
            room.scenarioId,
          );
          if (!scenario) {
            throw new Error(`Scenario not found: ${room.scenarioId}`);
          }
          const lootValue = LootToken.calculateLootValue(scenario.difficulty);
          const lootToken = LootToken.create(
            room.roomCode,
            target.currentHex,
            lootValue,
          );

          const lootTokens = this.roomLootTokens.get(room.roomCode) || [];
          lootTokens.push(lootToken);
          this.roomLootTokens.set(room.roomCode, lootTokens);

          // Count how many uncollected loot tokens are now at this position (for stacking display)
          const tokensAtPosition = lootTokens.filter(
            (t: LootToken) =>
              t.coordinates.q === target.currentHex.q &&
              t.coordinates.r === target.currentHex.r &&
              !t.isCollected,
          );
          const stackCount = tokensAtPosition.length;
          const totalValue = tokensAtPosition.reduce(
            (sum: number, t: LootToken): number => sum + t.value,
            0,
          );

          this.logger.log(
            `Loot spawned at (${target.currentHex.q}, ${target.currentHex.r}) for monster ${target.id} (${stackCount} token(s) stacked, total value: ${totalValue})`,
          );

          this.server.to(room.roomCode).emit('monster_died', {
            monsterId: target.id,
            killerId: attacker.id,
            hexCoordinates: target.currentHex,
          });

          this.server.to(room.roomCode).emit('loot_spawned', {
            id: lootToken.id,
            coordinates: lootToken.coordinates,
            value: lootToken.value,
            stackCount: stackCount, // Number of tokens stacked at this position
            totalValue: totalValue, // Combined value of all stacked tokens
          });

          // DON'T remove monster - keep it in array marked as isDead for objective tracking
          // The monster is already marked as isDead: true on line 1626
          this.logger.log(
            `Monster ${target.id} marked as dead (isDead: true) for objective tracking`,
          );

          // Check narrative triggers after monster kill
          this.checkNarrativeTriggers(room.roomCode);
        }
      } else {
        // Apply damage to character target
        target.takeDamage(damage);
        targetHealth = target.currentHealth;
        targetDead = target.isDead;
      }

      // Mark character as having attacked this turn
      attacker.markAttackedThisTurn();

      // Broadcast attack resolution
      const attackResolvedPayload: AttackResolvedPayload = {
        attackerId: attacker.id,
        attackerName: this.getPlayerNickname(
          room.roomCode,
          attacker.playerId,
          attacker.characterClass,
        ),
        targetId: payload.targetId,
        targetName: isMonsterTarget
          ? target.monsterType
          : this.getPlayerNickname(
              room.roomCode,
              target.playerId,
              target.characterClass,
            ),
        baseDamage: baseAttack,
        damage,
        modifier: modifierCard.modifier,
        effects: modifierCard.effects || [],
        targetHealth,
        targetDead,
      };

      this.server
        .to(room.roomCode)
        .emit('attack_resolved', attackResolvedPayload);

      // Add log entry for attack
      const modifierText =
        typeof modifierCard.modifier === 'number'
          ? modifierCard.modifier >= 0
            ? `+${modifierCard.modifier}`
            : `${modifierCard.modifier}`
          : modifierCard.modifier === 'x2'
            ? 'x2'
            : 'miss';
      this.addGameLogEntry(room.roomCode, [
        { text: attacker.characterClass, color: 'lightblue' },
        { text: ` attacks ` },
        { text: attackResolvedPayload.targetName, color: 'orange' },
        { text: ` for ` },
        { text: `${damage}`, color: 'red' },
        { text: ` damage (${modifierText})` },
        ...(targetDead
          ? [{ text: ` - KILLED!`, color: 'red', isBold: true }]
          : []),
      ]);

      this.logger.log(
        `Attack resolved: ${attacker.id} -> ${payload.targetId}, damage: ${damage}, modifier: ${modifierCard.modifier}`,
      );

      // Apply push/pull modifiers if target is still alive (Issue #220 - Phase 3)
      if (!targetDead && attackModifiers.length > 0) {
        // Check for push modifier
        const pushModifier = getPush(attackModifiers);
        if (pushModifier && pushModifier.distance > 0) {
          try {
            const pushResult = this.forcedMovementService.applyPush(
              attacker,
              target,
              pushModifier.distance,
            );
            if (pushResult.success) {
              this.logger.log(
                `Push applied: ${target.id} moved to (${pushResult.finalPosition.q}, ${pushResult.finalPosition.r})`,
              );
              // Emit position update
              this.server.to(room.roomCode).emit('entity_moved', {
                entityId: target.id,
                entityType: isMonsterTarget ? 'monster' : 'character',
                fromHex: target.currentHex,
                toHex: pushResult.finalPosition,
                movementType: 'push',
              });
            }
          } catch (pushError) {
            this.logger.warn(
              `Push failed: ${pushError instanceof Error ? pushError.message : String(pushError)}`,
            );
          }
        }

        // Check for pull modifier
        const pullModifier = getPull(attackModifiers);
        if (pullModifier && pullModifier.distance > 0) {
          try {
            const pullResult = this.forcedMovementService.applyPull(
              attacker,
              target,
              pullModifier.distance,
            );
            if (pullResult.success) {
              this.logger.log(
                `Pull applied: ${target.id} moved to (${pullResult.finalPosition.q}, ${pullResult.finalPosition.r})`,
              );
              // Emit position update
              this.server.to(room.roomCode).emit('entity_moved', {
                entityId: target.id,
                entityType: isMonsterTarget ? 'monster' : 'character',
                fromHex: target.currentHex,
                toHex: pullResult.finalPosition,
                movementType: 'pull',
              });
            }
          } catch (pullError) {
            this.logger.warn(
              `Pull failed: ${pullError instanceof Error ? pullError.message : String(pullError)}`,
            );
          }
        }

        // Apply conditions from attack modifiers
        const conditionModifiers = getConditions(attackModifiers);
        for (const condMod of conditionModifiers) {
          try {
            this.conditionService.applyCondition(
              target,
              condMod.condition,
              'until-consumed',
            );
            this.logger.log(
              `Condition ${condMod.condition} applied to ${target.id}`,
            );
            this.server.to(room.roomCode).emit('condition_applied', {
              targetId: target.id,
              condition: condMod.condition,
            });
          } catch (condError) {
            this.logger.warn(
              `Condition application failed: ${condError instanceof Error ? condError.message : String(condError)}`,
            );
          }
        }
      }

      // Apply retaliate if target has it and attacker is in range (Issue #220 - Phase 3)
      if (!targetDead && damage > 0) {
        const retaliateEffect = this.conditionService.getRetaliateEffect(
          target.id,
        );
        if (retaliateEffect && retaliateEffect.value > 0) {
          // Check if attacker is in retaliate range
          const distance = Math.max(
            Math.abs(attacker.position.q - target.position.q),
            Math.abs(attacker.position.r - target.position.r),
            Math.abs(
              -attacker.position.q -
                attacker.position.r -
                (-target.position.q - target.position.r),
            ),
          );

          if (distance <= retaliateEffect.range) {
            const retaliateDamage = retaliateEffect.value;
            attacker.takeDamage(retaliateDamage);
            this.logger.log(
              `Retaliate triggered: ${target.id} dealt ${retaliateDamage} damage to ${attacker.id}`,
            );
            this.server.to(room.roomCode).emit('retaliate_triggered', {
              retaliator: target.id,
              attackerId: attacker.id,
              damage: retaliateDamage,
              attackerHealth: attacker.currentHealth,
            });
          }
        }
      }

      // Process element infusion from attack modifiers (Issue #220 - Phase 3)
      // Elements are generated AFTER the action completes
      this.processInfuseModifiers(room.roomCode, attackModifiers);

      // Award XP from attack action (Issue #220 - Phase 4)
      const xpValue = getXPValue(attackModifiers);
      if (xpValue > 0) {
        attacker.addExperience(xpValue);
        this.logger.log(
          `Awarded ${xpValue} XP to ${attacker.id} (total: ${attacker.experience})`,
        );
        this.server.to(room.roomCode).emit('xp_awarded', {
          characterId: attacker.id,
          amount: xpValue,
          total: attacker.experience,
        });
      }

      // Check scenario completion after attack (in case last monster died)
      // Skip primary objective check during attack - victory is only declared at round end
      // This allows other players to take remaining actions and collect loot
      if (targetDead && isMonsterTarget) {
        this.checkScenarioCompletion(room.roomCode, {
          checkPrimaryObjective: false,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Attack target error: ${errorMessage}`);
      const errorPayload: ErrorPayload = {
        code: 'ATTACK_TARGET_ERROR',
        message: errorMessage,
      };
      client.emit('error', errorPayload);
    }
  }

  /**
   * Collect loot token (US2 - T121)
   */
  @SubscribeMessage('collect_loot')
  handleCollectLoot(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: CollectLootPayload,
  ): void {
    try {
      const userId = this.socketToPlayer.get(client.id);
      if (!userId) {
        throw new Error('Player not authenticated');
      }

      this.logger.log(
        `Collect loot request from ${userId} at (${payload.hexCoordinates.q}, ${payload.hexCoordinates.r})`,
      );

      // Get room from client's current Socket.IO room (multi-room support)
      const roomData = this.getRoomFromSocket(client);
      if (!roomData) {
        throw new Error('Player not in any room or room not found');
      }

      const { room } = roomData;

      // Validate game is active
      if (room.status !== RoomStatus.ACTIVE) {
        throw new Error('Game is not active');
      }

      // Get character by ID from payload (multi-character support)
      if (!payload.characterId) {
        throw new Error('characterId is required');
      }
      const character = characterService.getCharacterById(payload.characterId);
      if (!character) {
        throw new Error('Character not found');
      }

      // Verify character belongs to this player
      if (character.playerId !== userId) {
        throw new Error('Character does not belong to this player');
      }

      // Verify it's this character's turn
      const turnOrder = this.roomTurnOrder.get(room.roomCode);
      const currentIndex = this.currentTurnIndex.get(room.roomCode) || 0;
      if (turnOrder && turnOrder.length > 0) {
        const currentEntity = turnOrder[currentIndex];
        if (
          currentEntity.entityType === 'character' &&
          currentEntity.entityId !== character.id
        ) {
          throw new Error("It is not this character's turn");
        }
      }

      // Get loot tokens from room state
      const lootTokens = this.roomLootTokens.get(room.roomCode) || [];

      // Find all uncollected loot tokens at specified coordinates (support stacking)
      const lootAtPosition = lootTokens.filter(
        (token: LootToken) =>
          token.coordinates.q === payload.hexCoordinates.q &&
          token.coordinates.r === payload.hexCoordinates.r &&
          !token.isCollected,
      );

      // Validate loot token exists and is not collected
      if (lootAtPosition.length === 0) {
        throw new Error('No loot token found at specified coordinates');
      }

      // Validate character is adjacent to or on loot token hex
      const charPos = character.position;
      const lootPos = payload.hexCoordinates;

      // Check if on same hex
      const onSameHex = charPos.q === lootPos.q && charPos.r === lootPos.r;

      // Check if adjacent (using pathfinding service)
      const hexMap = this.roomMaps.get(room.roomCode);
      let isAdjacent = false;
      if (hexMap) {
        isAdjacent = this.pathfindingService.isHexAdjacent(charPos, lootPos);
      }

      if (!onSameHex && !isAdjacent) {
        throw new Error(
          'Character must be on or adjacent to loot token to collect it',
        );
      }

      // Calculate total gold from all stacked loot tokens and mark as collected
      let totalGold = 0;
      lootAtPosition.forEach((token: LootToken) => {
        token.collect(userId);
        totalGold += token.value;
      });

      // Phase 3: Track loot collection in accumulated stats
      const accumulatedStats = this.roomAccumulatedStats.get(room.roomCode);
      if (accumulatedStats) {
        accumulatedStats.totalLootCollected += lootAtPosition.length;
        accumulatedStats.totalGoldCollected += totalGold;
      }

      // Broadcast loot collected to all players
      const lootCollectedPayload: LootCollectedPayload = {
        playerId: userId,
        lootTokenId: lootAtPosition[0].id, // Frontend expects single ID
        hexCoordinates: payload.hexCoordinates,
        goldValue: totalGold,
      };

      this.server
        .to(room.roomCode)
        .emit('loot_collected', lootCollectedPayload);

      // Track loot collection for narrative condition evaluation
      this.trackCollectedLoot(room.roomCode, payload.hexCoordinates);

      // Check narrative triggers after loot collection
      this.checkNarrativeTriggers(room.roomCode);

      this.logger.log(
        `Manual collected ${lootAtPosition.length} loot token(s) by ${userId} at (${payload.hexCoordinates.q}, ${payload.hexCoordinates.r}), total value: ${totalGold} gold`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Collect loot error: ${errorMessage}`);
      const errorPayload: ErrorPayload = {
        code: 'COLLECT_LOOT_ERROR',
        message: errorMessage,
      };
      client.emit('error', errorPayload);
    }
  }

  /**
   * Request summon placement (Issue #228 - Phase 6)
   * Called when a player wants to place a summon on the board
   */
  @SubscribeMessage('request_summon_placement')
  handleRequestSummonPlacement(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      roomCode: string;
      summonDefinition: SummonDefinition;
      targetHex: AxialCoordinates;
      characterId: string;
      maxRange?: number;
    },
  ): void {
    try {
      const userId = this.socketToPlayer.get(client.id);
      if (!userId) {
        throw new Error('Player not authenticated');
      }

      const { roomCode, summonDefinition, targetHex, characterId, maxRange } =
        payload;

      this.logger.log(
        `Summon placement request from ${userId} for character ${characterId}`,
      );

      // Get room
      const room = roomService.getRoom(roomCode);
      if (!room) {
        throw new Error(`Room ${roomCode} not found`);
      }

      // Get character and verify ownership
      const character = characterService.getCharacterById(characterId);
      if (!character) {
        throw new Error('Character not found');
      }

      if (character.playerId !== userId) {
        throw new Error('Character does not belong to this player');
      }

      // Get character's current position
      const characterPosition = character.position;
      if (!characterPosition) {
        throw new Error('Character has no position');
      }

      // Get hex map and occupied hexes
      const hexMap = this.roomMaps.get(roomCode);
      if (!hexMap) {
        throw new Error('Hex map not found');
      }

      // Collect occupied hexes using shared helper
      const occupiedHexes = this.collectOccupiedHexes(roomCode);

      // Validate placement
      const placementRange = maxRange ?? 3; // Default range of 3 if not specified
      const isValid = this.summonService.validatePlacement(
        targetHex,
        characterPosition,
        hexMap,
        occupiedHexes,
        placementRange,
      );

      if (!isValid) {
        throw new Error('Invalid summon placement location');
      }

      // Get character's initiative (summons inherit owner's initiative)
      const characterInitiative = character.selectedCards?.initiative ?? 99;

      // Create summon
      const summon = this.summonService.createSummon(
        summonDefinition,
        targetHex,
        roomCode,
        characterId,
        characterInitiative,
      );

      // Add to room summons
      let summons = this.roomSummons.get(roomCode);
      if (!summons) {
        summons = [];
        this.roomSummons.set(roomCode, summons);
      }
      summons.push(summon);

      this.logger.log(
        `Created summon ${summon.name} (${summon.id}) at (${targetHex.q}, ${targetHex.r}) for character ${characterId}`,
      );

      // Rebuild turn order to include new summon
      // Note: Summons are added to current round's turn order, not next round
      const turnOrder = this.roomTurnOrder.get(roomCode);
      if (turnOrder) {
        // Find the right position in turn order (right before owner, with same initiative)
        const ownerIndex = turnOrder.findIndex(
          (e) => e.entityId === characterId,
        );
        const summonEntry = {
          entityId: summon.id,
          entityType: 'summon' as const,
          initiative: summon.initiative,
          name: summon.name,
          ownerId: summon.ownerId,
          isDead: false,
          isExhausted: false,
        };

        if (ownerIndex !== -1) {
          // Insert summon right before owner in turn order
          turnOrder.splice(ownerIndex, 0, summonEntry);
        } else {
          // Owner not in turn order (might be exhausted), add to end
          turnOrder.push(summonEntry);
        }

        this.roomTurnOrder.set(roomCode, turnOrder);
      }

      // Emit summon_created event
      const summonCreatedPayload: SummonCreatedPayload = {
        summonId: summon.id,
        summonName: summon.name,
        ownerCharacterId: summon.ownerId,
        placementHex: summon.position,
        health: summon.currentHealth,
        maxHealth: summon.maxHealth,
        attack: summon.attack,
        move: summon.move,
        range: summon.range,
        typeIcon: summon.typeIcon,
        playerControlled: summon.playerControlled,
        initiative: summon.initiative,
      };

      this.server.to(roomCode).emit('summon_created', summonCreatedPayload);

      // Emit turn_order_updated with new turn order
      if (turnOrder) {
        this.server.to(roomCode).emit('round_started', {
          roundNumber: this.currentRound.get(roomCode) || 1,
          turnOrder: turnOrder.map(
            ({ entityId, name, entityType, initiative, ownerId }) => ({
              entityId,
              name,
              entityType,
              initiative,
              ownerId,
            }),
          ),
        });
      }

      // Add log entry
      this.addGameLogEntry(roomCode, [
        { text: character.characterClass, color: 'lightblue' },
        { text: ` summoned ` },
        { text: summon.name, color: 'lightgreen' },
        { text: `.` },
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Summon placement error: ${errorMessage}`);
      const errorPayload: ErrorPayload = {
        code: 'SUMMON_PLACEMENT_ERROR',
        message: errorMessage,
      };
      client.emit('error', errorPayload);
    }
  }

  /**
   * End current entity's turn (US2 - T097)
   */
  @SubscribeMessage('end_turn')
  async handleEndTurn(
    @ConnectedSocket() client: Socket,
    @MessageBody() _payload: EndTurnPayload,
  ): Promise<void> {
    try {
      const userId = this.socketToPlayer.get(client.id);
      if (!userId) {
        throw new Error('Player not authenticated');
      }

      this.logger.log(`End turn request from ${userId}`);

      // Get room from client's current Socket.IO room (multi-room support)
      const roomData = this.getRoomFromSocket(client);
      if (!roomData) {
        throw new Error('Player not in any room or room not found');
      }

      const { room } = roomData;

      // Validate game is active
      if (room.status !== RoomStatus.ACTIVE) {
        throw new Error('Game is not active');
      }

      // Get turn order for this room
      const turnOrder = this.roomTurnOrder.get(room.roomCode);
      if (!turnOrder || turnOrder.length === 0) {
        throw new Error('Turn order not initialized');
      }

      const currentIndex = this.currentTurnIndex.get(room.roomCode) || 0;
      const currentEntity = turnOrder[currentIndex];

      // If it's not a character's turn, can't end turn this way
      if (currentEntity.entityType !== 'character') {
        throw new Error('It is not a character turn');
      }

      // Get the character whose turn it is
      const character = characterService.getCharacterById(
        currentEntity.entityId,
      );
      if (!character) {
        throw new Error('Character not found');
      }

      // Verify this character belongs to the player requesting end turn
      if (character.playerId !== userId) {
        throw new Error('It is not your turn');
      }

      // Move played cards to discard pile before resetting action flags
      if (character.selectedCards) {
        const topCardId = character.selectedCards.topCardId;
        const bottomCardId = character.selectedCards.bottomCardId;

        // Remove cards from hand and add to discard pile
        character.removeFromHand(topCardId);
        character.addToDiscard(topCardId);

        character.removeFromHand(bottomCardId);
        character.addToDiscard(bottomCardId);

        this.logger.log(
          `Moved played cards to discard: ${topCardId}, ${bottomCardId}. Hand: ${character.hand.length}, Discard: ${character.discardPile.length}`,
        );
      }

      // Reset action flags for this character's turn ending
      character.resetActionFlags();

      // Auto-collect loot if character is ending turn on a loot token
      // In Gloomhaven, if multiple loot tokens are on the same hex, collect all of them
      const characterPos = character.position;
      const lootTokens = this.roomLootTokens.get(room.roomCode) || [];

      this.logger.log(
        `[Loot] Checking for loot at character position (${characterPos.q}, ${characterPos.r}). Total loot tokens in room: ${lootTokens.length}`,
      );

      // Log all loot tokens for debugging
      lootTokens.forEach((token: LootToken, idx: number) => {
        this.logger.log(
          `[Loot] Token ${idx}: position (${token.coordinates.q}, ${token.coordinates.r}), value: ${token.value}, collected: ${token.isCollected}`,
        );
      });

      const lootAtPosition = lootTokens.filter(
        (token: LootToken) =>
          token.coordinates.q === characterPos.q &&
          token.coordinates.r === characterPos.r &&
          !token.isCollected,
      );

      this.logger.log(
        `[Loot] Found ${lootAtPosition.length} uncollected loot token(s) at position (${characterPos.q}, ${characterPos.r})`,
      );

      if (lootAtPosition.length > 0) {
        // Calculate total gold from all stacked loot tokens
        let totalGold = 0;
        const collectedTokenIds: string[] = [];

        // Mark all loot tokens at this position as collected
        lootAtPosition.forEach((token: LootToken) => {
          token.collect(userId);
          totalGold += token.value;
          collectedTokenIds.push(token.id);
        });

        // Phase 3: Track loot collection in accumulated stats
        const accumulatedStats = this.roomAccumulatedStats.get(room.roomCode);
        if (accumulatedStats) {
          accumulatedStats.totalLootCollected += lootAtPosition.length;
          accumulatedStats.totalGoldCollected += totalGold;
        }

        // Broadcast loot collected to all players
        const lootCollectedPayload: LootCollectedPayload = {
          playerId: userId,
          lootTokenId: collectedTokenIds[0], // Frontend expects single ID, use first
          hexCoordinates: characterPos,
          goldValue: totalGold,
        };

        this.server
          .to(room.roomCode)
          .emit('loot_collected', lootCollectedPayload);

        this.logger.log(
          `Auto-collected ${lootAtPosition.length} loot token(s) by ${userId} at end of turn (${characterPos.q}, ${characterPos.r}), total value: ${totalGold} gold`,
        );
      }

      // Execute pending rest at END of turn (Gloomhaven rules)
      const pendingRest = (character as any).pendingRest;
      if (pendingRest && pendingRest.type === 'long') {
        this.logger.log(`Executing long rest at end of ${character.id}'s turn`);

        // Execute the rest (heal, move cards)
        const result = this.deckManagement.executeLongRest(
          character as any,
          pendingRest.cardToLose,
        );

        // Update card piles using setters
        character.hand = result.hand;
        character.discardPile = result.discardPile;
        character.lostPile = result.lostPile;

        // Heal using the Character model's heal method
        const healthBefore = character.currentHealth;
        const healthHealed = character.heal(2);
        const healthAfter = character.currentHealth;

        this.logger.log(
          `Long rest healing: ${healthBefore} HP + ${healthHealed} healed = ${healthAfter} HP`,
        );

        // Clear pending rest
        (character as any).pendingRest = null;

        // Emit rest complete NOW (at end of turn)
        this.server.to(room.roomCode).emit('rest-event', {
          type: 'rest-complete',
          characterId: character.id,
          cardLost: pendingRest.cardToLose,
          cardsInHand: result.hand.length,
          healthHealed: healthHealed,
        });

        // Refresh spent items after long rest (Issue #205)
        await this.refreshItemsAfterRest(character.id, room.roomCode);

        this.logger.log(
          `Long rest complete for ${character.id}: healed ${healthHealed} HP, cards moved`,
        );
      }

      // Get next living entity in turn order
      const nextIndex = this.turnOrderService.getNextLivingEntityIndex(
        currentIndex,
        turnOrder,
      );

      // Check if round is complete (wrapped back to start)
      // Fix for single-entity games: also complete if only 1 LIVING entity in turn order
      // This handles cases where character is at index 0 and all monsters are dead
      const livingEntities = turnOrder.filter(
        (e) => !e.isDead && !e.isExhausted,
      ).length;
      const roundComplete =
        nextIndex === 0 && (currentIndex !== 0 || livingEntities === 1);

      if (roundComplete) {
        // Use shared round completion logic
        this.handleRoundCompletion(room.roomCode);
      } else {
        // Advance to next turn
        this.currentTurnIndex.set(room.roomCode, nextIndex);
        const nextEntity = turnOrder[nextIndex];

        // Broadcast turn started for next entity
        const turnStartedPayload: TurnStartedPayload = {
          entityId: nextEntity.entityId,
          entityType: nextEntity.entityType,
          turnIndex: nextIndex,
        };

        this.server.to(room.roomCode).emit('turn_started', turnStartedPayload);

        // Add log entry for turn start
        this.addGameLogEntry(room.roomCode, [
          { text: `${nextEntity.name}'s turn.` },
        ]);

        this.logger.log(
          `Turn advanced in room ${room.roomCode}: ${nextEntity.entityId} (${nextEntity.entityType})`,
        );

        // If next entity is a monster, activate monster AI
        if (nextEntity.entityType === 'monster') {
          this.logger.log(`Activating monster AI for: ${nextEntity.entityId}`);
          // Activate monster AI - turn will auto-advance after monster acts
          await this.activateMonster(nextEntity.entityId, room.roomCode);
        }

        // Check scenario completion after turn advancement
        // Skip primary objective check - victory is only declared at round end
        this.checkScenarioCompletion(room.roomCode, {
          checkPrimaryObjective: false,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`End turn error: ${errorMessage}`);
      const errorPayload: ErrorPayload = {
        code: 'END_TURN_ERROR',
        message: errorMessage,
      };
      client.emit('error', errorPayload);
    }
  }

  /**
   * Execute rest (short or long)
   * Handles initial rest request from player
   */
  @SubscribeMessage('execute-rest')
  handleExecuteRest(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      gameId: string;
      characterId: string;
      type: 'short' | 'long';
      cardToLose?: string; // Only for long rest
    },
  ): void {
    try {
      const userId = this.socketToPlayer.get(client.id);
      if (!userId) {
        throw new Error('Player not authenticated');
      }

      // Get room from client's current Socket.IO room
      const roomData = this.getRoomFromSocket(client);
      if (!roomData) {
        throw new Error('Player not in any room or room not found');
      }

      const { room, roomCode } = roomData;

      // Validate game is active
      if (room.status !== RoomStatus.ACTIVE) {
        throw new Error('Game is not active');
      }

      // Get character by ID from payload (multi-character support)
      if (!payload.characterId) {
        throw new Error('characterId is required');
      }
      const character = characterService.getCharacterById(payload.characterId);
      if (!character) {
        throw new Error('Character not found');
      }

      // Verify character belongs to this player
      if (character.playerId !== userId) {
        throw new Error('Character does not belong to this player');
      }

      // Validate can rest
      // TODO: Reconcile Character model vs Character interface types
      const validation = this.deckManagement.canRest(
        character as any,
        payload.type,
      );
      if (!validation.valid) {
        this.server.to(roomCode).emit('rest-event', {
          type: 'error',
          characterId: character.id,
          message: validation.reason || 'Cannot rest',
        });
        return;
      }

      // Emit rest started
      this.server.to(roomCode).emit('rest-event', {
        type: 'rest-started',
        characterId: character.id,
        restType: payload.type,
      });

      if (payload.type === 'short') {
        // Execute short rest (server-side randomization)
        // TODO: Reconcile Character model vs Character interface types
        const result = this.deckManagement.executeShortRest(character as any);

        // Update character state (replace with updated character)
        Object.assign(character, result.character);

        // Emit card selected
        this.server.to(roomCode).emit('rest-event', {
          type: 'card-selected',
          characterId: character.id,
          randomCardId: result.randomCard,
          canReroll: !result.character.shortRestState?.hasRerolled,
        });

        // Emit awaiting decision
        this.server.to(roomCode).emit('rest-event', {
          type: 'awaiting-decision',
          characterId: character.id,
          currentHealth: result.character.health,
          rerollCost: 1,
        });
      } else {
        // Long rest - two-step flow
        if (!payload.cardToLose) {
          // Step 1: Show card selection UI to player
          // TODO: Reconcile Character model vs Character interface types
          const discardPile = (character as any).discardPile || [];

          if (discardPile.length === 0) {
            this.server.to(roomCode).emit('rest-event', {
              type: 'error',
              characterId: character.id,
              message: 'No cards in discard pile to lose',
            });
            return;
          }

          // Emit long-selection event with available cards
          // TODO: Reconcile Character model vs Character interface types
          this.server.to(roomCode).emit('rest-event', {
            type: 'long-selection',
            characterId: character.id,
            discardPileCards: discardPile,
            currentHealth: (character as any).health || character.currentHealth,
          });
        } else {
          // Step 2: Mark character as resting with selected card
          // Actual rest execution (heal, move cards) happens at END of turn
          // Store the card to lose in a pending rest state
          (character as any).pendingRest = {
            type: 'long',
            cardToLose: payload.cardToLose,
          };

          // Set initiative to 99 for long rest (goes last in turn order)
          character.selectedCards = {
            topCardId: 'rest',
            bottomCardId: 'rest',
            initiative: 99,
          };

          // Emit rest declared (not complete yet - that happens at end of turn)
          this.server.to(roomCode).emit('rest-event', {
            type: 'rest-declared',
            characterId: character.id,
            cardToLose: payload.cardToLose,
            initiative: 99,
          });

          // Check if all characters have selected cards (or rested), then start round
          const allCharacters = room.players
            .flatMap((p: Player) =>
              characterService.getCharactersByPlayerId(p.userId),
            )
            .filter((c: any): c is any => Boolean(c && !c.exhausted));

          const allSelected = allCharacters.every((c: any): c is any =>
            Boolean(c && c.selectedCards !== undefined),
          );

          if (allSelected) {
            this.startNewRound(roomCode);
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Execute rest error: ${error instanceof Error ? error.message : String(error)}`,
      );

      const roomData = this.getRoomFromSocket(client);
      if (roomData) {
        this.server.to(roomData.roomCode).emit('rest-event', {
          type: 'error',
          message: error instanceof Error ? error.message : 'Rest failed',
        });
      }
    }
  }

  /**
   * Handle rest action (accept or reroll for short rest)
   */
  @SubscribeMessage('rest-action')
  handleRestAction(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      gameId: string;
      characterId: string;
      action: 'accept' | 'reroll';
    },
  ): void {
    try {
      const userId = this.socketToPlayer.get(client.id);
      if (!userId) {
        throw new Error('Player not authenticated');
      }

      // Get room from client's current Socket.IO room
      const roomData = this.getRoomFromSocket(client);
      if (!roomData) {
        throw new Error('Player not in any room or room not found');
      }

      const { room: _room, roomCode } = roomData;

      // Get character by ID from payload (multi-character support)
      if (!payload.characterId) {
        throw new Error('characterId is required');
      }
      const character = characterService.getCharacterById(payload.characterId);
      if (!character) {
        throw new Error('Character not found');
      }

      // Verify character belongs to this player
      if (character.playerId !== userId) {
        throw new Error('Character does not belong to this player');
      }

      if (payload.action === 'reroll') {
        // Reroll short rest
        // TODO: Reconcile Character model vs Character interface types
        const result = this.deckManagement.rerollShortRest(character as any);

        // Update character state
        Object.assign(character, result.character);

        // Emit new card selected
        this.server.to(roomCode).emit('rest-event', {
          type: 'card-selected',
          characterId: character.id,
          randomCardId: result.randomCard,
          canReroll: false, // Can only reroll once
        });

        // Emit damage taken
        this.server.to(roomCode).emit('rest-event', {
          type: 'damage-taken',
          characterId: character.id,
          damage: result.damageTaken || 0,
          currentHealth: result.character.health,
        });

        // Emit awaiting decision again
        this.server.to(roomCode).emit('rest-event', {
          type: 'awaiting-decision',
          characterId: character.id,
          currentHealth: result.character.health,
          rerollCost: 1,
        });
      } else {
        // Accept card
        // TODO: Reconcile Character model vs Character interface types
        const result = this.deckManagement.finalizeShortRest(character as any);

        // Update character state
        Object.assign(character, result);

        // Emit rest complete
        this.server.to(roomCode).emit('rest-event', {
          type: 'rest-complete',
          characterId: character.id,
          cardLost: result.lostPile[result.lostPile.length - 1],
          cardsInHand: result.hand.length,
        });

        // Check for exhaustion after rest
        const exhaustionCheck = this.deckManagement.checkExhaustion(result);
        if (exhaustionCheck.isExhausted) {
          const exhausted = this.deckManagement.executeExhaustion(
            result,
            exhaustionCheck.reason!,
          );
          Object.assign(character, exhausted);

          // Emit exhaustion event
          this.server.to(roomCode).emit('rest-event', {
            type: 'exhaustion',
            characterId: character.id,
            reason: exhaustionCheck.reason!,
            message: exhaustionCheck.message,
          });
        }
      }
    } catch (error) {
      this.logger.error(
        `Rest action error: ${error instanceof Error ? error.message : String(error)}`,
      );

      const roomData = this.getRoomFromSocket(client);
      if (roomData) {
        this.server.to(roomData.roomCode).emit('rest-event', {
          type: 'error',
          message:
            error instanceof Error ? error.message : 'Rest action failed',
        });
      }
    }
  }

  /**
   * Activate monster AI (US2 - T099)
   * Called when it's a monster's turn
   */

  private async activateMonster(
    monsterId: string,
    roomCode: string,
  ): Promise<void> {
    try {
      this.logger.log(
        `🤖 [MonsterAI] Activating monster ${monsterId} in room ${roomCode}`,
      );

      // Check if monster has already acted this turn (prevents duplicate actions on rejoin)
      const actedSet = this.monstersActedThisTurn.get(roomCode);
      if (actedSet && actedSet.has(monsterId)) {
        this.logger.log(
          `🤖 [MonsterAI] Monster ${monsterId} has already acted this turn, advancing turn`,
        );
        this.advanceTurnAfterMonsterActivation(roomCode);
        return;
      }

      // Get monster from room state
      const monsters = this.roomMonsters.get(roomCode) || [];
      this.emitDebugLog(
        roomCode,
        'info',
        `Found ${monsters.length} monsters in room`,
        'MonsterAI',
      );

      const monster = monsters.find((m: any) => m.id === monsterId);
      if (!monster) {
        this.emitDebugLog(
          roomCode,
          'error',
          `Monster ${monsterId} not found in room ${roomCode}`,
          'MonsterAI',
        );
        this.emitDebugLog(
          roomCode,
          'error',
          `Available monsters: ${monsters.map((m: any) => m.id as string).join(', ')}`,
          'MonsterAI',
        );
        throw new Error(`Monster ${monsterId} not found in room ${roomCode}`);
      }

      // Skip dead monsters - they cannot activate
      if (monster.isDead || monster.health <= 0) {
        this.emitDebugLog(
          roomCode,
          'info',
          `Monster ${monsterId} is dead, skipping activation and advancing turn`,
          'MonsterAI',
        );
        this.advanceTurnAfterMonsterActivation(roomCode);
        return;
      }

      this.emitDebugLog(
        roomCode,
        'info',
        `Monster found: ${monster.monsterType} at (${monster.currentHex.q}, ${monster.currentHex.r})`,
        'MonsterAI',
      );
      this.emitDebugLog(
        roomCode,
        'info',
        `Monster stats: attack=${monster.attack}, range=${monster.range}, movement=${monster.movement}`,
        'MonsterAI',
      );

      // Get room and all characters
      const room = roomService.getRoom(roomCode);
      if (!room) {
        this.emitDebugLog(
          roomCode,
          'error',
          `Room ${roomCode} not found`,
          'MonsterAI',
        );
        throw new Error(`Room ${roomCode} not found`);
      }

      this.emitDebugLog(
        roomCode,
        'info',
        `Room has ${room.players.length} players`,
        'MonsterAI',
      );

      // Get all characters in room and map to expected format (including all multi-character players' characters)
      const characterModels = room.players
        .flatMap((p: any) => characterService.getCharactersByPlayerId(p.userId))
        .filter((c: any) => c !== null);

      this.emitDebugLog(
        roomCode,
        'info',
        `Found ${characterModels.length} characters`,
        'MonsterAI',
      );

      // Map Character model properties to match the shared Character interface
      // Character model uses getters and different property names:
      // - 'position' -> 'currentHex'
      // - 'exhausted' (getter) -> 'isExhausted'
      // - 'conditions' (getter) -> 'conditions'
      // - 'characterClass' -> 'classType'
      // - 'currentHealth' -> 'health'
      const characters = characterModels.map((c: any) => ({
        id: c.id,
        playerId: c.playerId,
        classType: c.characterClass,
        health: c.currentHealth,
        maxHealth: c.maxHealth,
        currentHex: c.position,
        conditions: c.conditions, // Getter
        isExhausted: c.exhausted, // Getter
      }));

      characters.forEach((c: any) => {
        this.emitDebugLog(
          roomCode,
          'info',
          `Character ${c.id}: ${c.classType} at (${c.currentHex.q}, ${c.currentHex.r}), exhausted: ${c.isExhausted}`,
          'MonsterAI',
        );
      });

      // Issue #228: Get summons for targeting
      const summons = this.roomSummons.get(roomCode) || [];
      const summonTargets = summons
        .filter((s) => !s.isDead)
        .map((s) => ({
          id: s.id,
          currentHex: s.position,
          isDead: s.isDead,
          conditions: s.conditions,
          ownerId: s.ownerId,
        }));

      this.emitDebugLog(
        roomCode,
        'info',
        `Found ${summonTargets.length} summons as potential targets`,
        'MonsterAI',
      );

      // Use MonsterAIService to determine focus target (includes summons)
      const focusTargetId = this.monsterAIService.selectFocusTarget(
        monster,
        characters as any,
        summonTargets as any,
      );

      if (!focusTargetId) {
        this.emitDebugLog(
          roomCode,
          'info',
          `No valid focus target for monster ${monsterId}`,
          'MonsterAI',
        );
        // No target, skip activation and advance turn
        this.advanceTurnAfterMonsterActivation(roomCode);
        return;
      }

      this.emitDebugLog(
        roomCode,
        'info',
        `Focus target selected: ${focusTargetId}`,
        'MonsterAI',
      );

      // Issue #228: Focus target could be a character or a summon
      let focusTargetMapped = characters.find(
        (c: any) => c.id === focusTargetId,
      );
      let focusTarget: any = null;
      let targetIsSummon = false;

      if (focusTargetMapped) {
        // Target is a character
        focusTarget = characterModels.find((c: any) => c.id === focusTargetId);
      } else {
        // Check if target is a summon
        const targetSummon = summons.find((s) => s.id === focusTargetId);
        if (targetSummon) {
          targetIsSummon = true;
          focusTarget = targetSummon;
          // Map summon properties to match character interface for movement/attack calculations
          focusTargetMapped = {
            id: targetSummon.id,
            playerId: targetSummon.ownerId ?? 'ai', // Summons don't have a playerId, use ownerId
            currentHex: targetSummon.position,
            classType: targetSummon.name,
            health: targetSummon.currentHealth,
            maxHealth: targetSummon.maxHealth,
            conditions: targetSummon.conditions,
            isExhausted: targetSummon.isDead,
          };
        }
      }

      if (!focusTargetMapped || !focusTarget) {
        this.emitDebugLog(
          roomCode,
          'error',
          `Focus target ${focusTargetId} not found in character or summon list`,
          'MonsterAI',
        );
        this.advanceTurnAfterMonsterActivation(roomCode);
        return;
      }

      this.emitDebugLog(
        roomCode,
        'info',
        `Focus target found: ${focusTargetMapped.classType} at (${focusTargetMapped.currentHex.q}, ${focusTargetMapped.currentHex.r})${targetIsSummon ? ' (summon)' : ''}`,
        'MonsterAI',
      );

      // Get hex map for movement calculation - REQUIRED for off-map prevention
      const hexMap = this.roomMaps.get(roomCode);
      if (!hexMap) {
        this.emitDebugLog(
          roomCode,
          'error',
          `Cannot activate monster: hexMap not found for room ${roomCode}`,
          'MonsterAI',
        );
        this.advanceTurnAfterMonsterActivation(roomCode);
        return;
      }

      const obstacles: any[] = [];
      hexMap.forEach((tile: any) => {
        if (tile.terrain === 'obstacle') {
          obstacles.push(tile.coordinates);
        }
      });

      this.emitDebugLog(
        roomCode,
        'info',
        `Found ${obstacles.length} obstacles on map`,
        'MonsterAI',
      );

      // Collect all occupied hexes (from characters and other monsters)
      // Characters/monsters can move through allies but cannot stop on same hex
      const occupiedHexes: any[] = [];

      // Add all character positions (excluding focus target since we might want to move adjacent)
      characters.forEach((c: any) => {
        if (c.currentHex) {
          occupiedHexes.push(c.currentHex);
        }
      });

      // Add all other monster positions (excluding current monster and dead monsters)
      monsters.forEach((m: any) => {
        if (m.id !== monsterId && m.currentHex && !m.isDead) {
          occupiedHexes.push(m.currentHex);
        }
      });

      this.emitDebugLog(
        roomCode,
        'info',
        `Found ${occupiedHexes.length} occupied hexes (characters + alive monsters)`,
        'MonsterAI',
      );

      const originalHex = { ...monster.currentHex };

      // Determine movement (use mapped target for MonsterAI service)
      // hexMap is required to prevent off-map movement
      const movementHex = this.monsterAIService.determineMovement(
        monster,
        focusTargetMapped as any,
        obstacles,
        occupiedHexes,
        hexMap,
      );

      let movementDistance = 0;
      // Apply movement if determined
      if (movementHex) {
        // Convert occupiedHexes array to Set for pathfinding (characters block monster movement)
        const occupiedHexSet = new Set<string>();
        for (const hex of occupiedHexes) {
          occupiedHexSet.add(`${hex.q},${hex.r}`);
        }
        const path = this.pathfindingService.findPath(
          originalHex,
          movementHex,
          hexMap,
          false, // canFly
          occupiedHexSet,
        );
        movementDistance = path && path.length > 0 ? path.length - 1 : 0;
        monster.currentHex = movementHex;
        this.emitDebugLog(
          roomCode,
          'info',
          `Monster moved ${movementDistance} hexes to (${movementHex.q}, ${movementHex.r})`,
          'MonsterAI',
        );
      } else {
        this.emitDebugLog(
          roomCode,
          'info',
          `Monster did not move (already in optimal position or blocked)`,
          'MonsterAI',
        );
      }

      // Check if monster should attack (use mapped target for MonsterAI service)
      const shouldAttack = this.monsterAIService.shouldAttack(
        monster,
        focusTargetMapped as any,
      );

      const currentDistance = this.monsterAIService.calculateHexDistance(
        monster.currentHex,
        focusTargetMapped.currentHex,
      );

      this.emitDebugLog(
        roomCode,
        'info',
        `Distance to target: ${currentDistance}, Attack range: ${monster.range}, Should attack: ${shouldAttack}`,
        'MonsterAI',
      );

      let attackResult = null;
      if (shouldAttack) {
        this.emitDebugLog(
          roomCode,
          'info',
          `Monster is in range, performing attack...`,
          'MonsterAI',
        );

        // Draw attack modifier card from shared monster deck
        let modifierDeck = this.monsterModifierDeck.get(roomCode);
        if (!modifierDeck || modifierDeck.length === 0) {
          // Reinitialize if empty or missing
          modifierDeck = this.modifierDeckService.initializeStandardDeck();
          this.monsterModifierDeck.set(roomCode, modifierDeck);
        }

        const modifierDrawResult =
          this.modifierDeckService.drawCard(modifierDeck);
        const modifierCard = modifierDrawResult.card;

        // Update deck after draw
        this.monsterModifierDeck.set(
          roomCode,
          modifierDrawResult.remainingDeck,
        );

        // Check if reshuffle needed (x2 or null triggers reshuffle)
        if (this.modifierDeckService.checkReshuffle(modifierCard)) {
          const reshuffled = this.modifierDeckService.reshuffleDeck(
            modifierDrawResult.remainingDeck,
            [],
          );
          this.monsterModifierDeck.set(roomCode, reshuffled);
        }

        // Calculate damage
        const baseDamage = monster.attack;
        let finalDamage = this.damageService.calculateDamage(
          baseDamage,
          modifierCard,
        );

        // Apply defense bonus from equipped items (Issue #205 - Phase 4.1)
        if (characterService.isPersistentCharacter(focusTarget.id)) {
          try {
            const itemBonuses = await this.inventoryService.getEquippedBonuses(
              focusTarget.id,
            );
            if (itemBonuses.defenseBonus > 0) {
              const reducedDamage = Math.max(
                0,
                finalDamage - itemBonuses.defenseBonus,
              );
              this.emitDebugLog(
                roomCode,
                'info',
                `Item defense bonus: ${itemBonuses.defenseBonus} (damage ${finalDamage} -> ${reducedDamage})`,
                'MonsterAI',
              );
              finalDamage = reducedDamage;
            }
          } catch (error) {
            this.logger.warn(
              `Failed to get defense bonus for ${focusTarget.id}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }

        this.emitDebugLog(
          roomCode,
          'info',
          `Base damage: ${baseDamage}, Modifier: ${modifierCard.modifier}, Final damage: ${finalDamage}`,
          'MonsterAI',
        );

        // Apply damage to target
        const actualDamage = focusTarget.takeDamage(finalDamage);

        // Phase 3: Track damage taken by the character
        const playerStats = this.roomPlayerStats.get(roomCode);
        if (playerStats) {
          const stats = playerStats.get(focusTarget.playerId);
          if (stats) {
            stats.damageTaken += actualDamage;
          }
        }
        const accumulatedStats = this.roomAccumulatedStats.get(roomCode);
        if (accumulatedStats) {
          accumulatedStats.totalDamageTaken += actualDamage;
        }

        this.emitDebugLog(
          roomCode,
          'info',
          `Monster attacked ${focusTarget.characterClass} for ${actualDamage} damage (HP: ${focusTarget.currentHealth}/${focusTarget.maxHealth})`,
          'MonsterAI',
        );

        attackResult = {
          targetId: focusTargetId,
          baseDamage,
          damage: actualDamage,
          modifier: modifierCard.modifier,
          effects: modifierCard.effects || [],
        };

        // Check if target is dead/exhausted
        if (focusTarget.isDead) {
          if (targetIsSummon) {
            // Issue #228: Handle summon death
            this.emitDebugLog(
              roomCode,
              'warn',
              `Summon ${focusTarget.name} was killed`,
              'MonsterAI',
            );
            // Emit summon_died event
            const summonDiedPayload: SummonDiedPayload = {
              summonId: focusTarget.id,
              summonName: focusTarget.name,
              reason: 'damage',
              hex: focusTarget.position,
            };
            this.server.to(roomCode).emit('summon_died', summonDiedPayload);
          } else {
            this.emitDebugLog(
              roomCode,
              'warn',
              `Character ${focusTarget.characterClass} was killed`,
              'MonsterAI',
            );
            // Phase 3: Handle character exhaustion from health reaching 0
            this.handleCharacterExhaustion(roomCode, focusTarget, 'health');
          }
        }
      } else {
        this.emitDebugLog(
          roomCode,
          'info',
          `Monster is out of range, no attack performed`,
          'MonsterAI',
        );
      }

      const monsterName = monster.isElite
        ? `Elite ${monster.monsterType}`
        : monster.monsterType;

      // Broadcast monster activation
      // Issue #228: Handle summon target names
      const focusTargetName = targetIsSummon
        ? focusTarget.name
        : this.getPlayerNickname(
            roomCode,
            focusTarget.playerId,
            focusTarget.characterClass,
          );

      const monsterActivatedPayload: MonsterActivatedPayload = {
        monsterId,
        monsterName,
        focusTarget: focusTargetId,
        focusTargetName,
        movement: movementHex || monster.currentHex, // Use current hex if no movement
        movementDistance,
        attack: attackResult,
      };

      this.emitDebugLog(
        roomCode,
        'info',
        `Broadcasting monster_activated event to room ${roomCode}`,
        'MonsterAI',
      );

      this.server
        .to(roomCode)
        .emit('monster_activated', monsterActivatedPayload);

      // Add log entries for monster actions
      if (movementDistance > 0) {
        this.addGameLogEntry(roomCode, [
          { text: monsterName, color: 'orange' },
          { text: ` moved ` },
          { text: `${movementDistance}`, color: 'cyan' },
          { text: ` hexes.` },
        ]);
      }

      if (attackResult) {
        const modifierText =
          typeof attackResult.modifier === 'number'
            ? attackResult.modifier >= 0
              ? `+${attackResult.modifier}`
              : `${attackResult.modifier}`
            : attackResult.modifier === 'x2'
              ? 'x2'
              : 'miss';
        const targetDead = focusTarget.isDead;
        // Issue #228: Handle summon target in log entry
        const targetDisplayName = targetIsSummon
          ? focusTarget.name
          : focusTarget.characterClass;
        const targetColor = targetIsSummon ? 'lightgreen' : 'lightblue';
        const deathMessage = targetIsSummon
          ? ` - Summon destroyed!`
          : ` - Player down!`;

        this.addGameLogEntry(roomCode, [
          { text: monsterName, color: 'orange' },
          { text: ` attacks ` },
          { text: targetDisplayName, color: targetColor },
          { text: ` for ` },
          { text: `${attackResult.damage}`, color: 'red' },
          { text: ` damage (${modifierText})` },
          ...(targetDead
            ? [{ text: deathMessage, color: 'red', isBold: true }]
            : []),
        ]);
      }

      // Mark monster as having acted this turn (for rejoin handling)
      this.monstersActedThisTurn.get(roomCode)?.add(monsterId);

      // Automatically advance to next turn
      this.emitDebugLog(
        roomCode,
        'info',
        `Advancing turn after monster activation`,
        'MonsterAI',
      );
      this.advanceTurnAfterMonsterActivation(roomCode);

      this.emitDebugLog(
        roomCode,
        'info',
        `✅ Monster ${monster.monsterType} activation complete`,
        'MonsterAI',
      );
    } catch (error) {
      this.emitDebugLog(
        roomCode,
        'error',
        `❌ Monster activation error: ${error instanceof Error ? error.message : String(error)}`,
        'MonsterAI',
      );
      this.emitDebugLog(
        roomCode,
        'error',
        `Stack trace: ${error instanceof Error ? error.stack : 'No stack trace'}`,
        'MonsterAI',
      );
      // Still advance turn even on error to prevent game from hanging
      this.advanceTurnAfterMonsterActivation(roomCode);
    }
  }

  /**
   * Activate summon AI (Issue #228 - Phase 6)
   * Called when it's an AI-controlled summon's turn
   * Similar to activateMonster but summons target monsters (enemies)
   */
  private activateSummon(summonId: string, roomCode: string): void {
    try {
      this.logger.log(
        `[SummonAI] Activating summon ${summonId} in room ${roomCode}`,
      );

      // Check if summon has already acted this turn
      const actedSet = this.summonsActedThisTurn.get(roomCode);
      if (actedSet && actedSet.has(summonId)) {
        this.logger.log(
          `[SummonAI] Summon ${summonId} has already acted this turn, advancing turn`,
        );
        this.advanceTurnAfterMonsterActivation(roomCode);
        return;
      }

      // Get summon from room state
      const summons = this.roomSummons.get(roomCode) || [];
      const summon = summons.find((s) => s.id === summonId);
      if (!summon) {
        this.logger.error(`Summon ${summonId} not found in room ${roomCode}`);
        this.advanceTurnAfterMonsterActivation(roomCode);
        return;
      }

      // Skip dead or stunned summons
      if (summon.isDead || summon.isStunned) {
        this.logger.log(
          `[SummonAI] Summon ${summonId} is dead or stunned, skipping activation`,
        );
        this.advanceTurnAfterMonsterActivation(roomCode);
        return;
      }

      // Get monsters as targets (summons target enemies)
      const monsters = this.roomMonsters.get(roomCode) || [];
      const aliveMonsters = monsters.filter((m) => !m.isDead);

      if (aliveMonsters.length === 0) {
        this.logger.log(`[SummonAI] No valid targets for summon ${summonId}`);
        this.markSummonActed(roomCode, summonId);
        this.advanceTurnAfterMonsterActivation(roomCode);
        return;
      }

      // Use SummonAIService to select focus target (closest monster)
      const focusTargetId = this.summonAIService.selectFocusTarget(
        summon,
        aliveMonsters,
      );

      if (!focusTargetId) {
        this.logger.log(
          `[SummonAI] No valid focus target for summon ${summonId}`,
        );
        this.markSummonActed(roomCode, summonId);
        this.advanceTurnAfterMonsterActivation(roomCode);
        return;
      }

      const focusTarget = aliveMonsters.find((m) => m.id === focusTargetId);
      if (!focusTarget) {
        this.logger.error(`[SummonAI] Focus target ${focusTargetId} not found`);
        this.advanceTurnAfterMonsterActivation(roomCode);
        return;
      }

      // Get hex map for movement
      const hexMap = this.roomMaps.get(roomCode);
      if (!hexMap) {
        this.logger.error(`[SummonAI] Hex map not found for room ${roomCode}`);
        this.advanceTurnAfterMonsterActivation(roomCode);
        return;
      }

      // Collect obstacles
      const obstacles: AxialCoordinates[] = [];
      hexMap.forEach((tile: any) => {
        if (tile.terrain === 'obstacle') {
          obstacles.push(tile.coordinates);
        }
      });

      // Collect occupied hexes using shared helper (exclude current summon for self-movement)
      const occupiedHexes = this.collectOccupiedHexes(roomCode, summonId);

      // Movement
      const originalHex = { ...summon.position };
      const movementHex = this.summonAIService.determineMovement(
        summon,
        focusTarget,
        obstacles,
        occupiedHexes,
        hexMap,
      );

      let moved = false;
      if (movementHex) {
        summon.moveTo(movementHex);
        moved = true;
        this.logger.log(
          `[SummonAI] Summon ${summon.name} moved from (${originalHex.q},${originalHex.r}) to (${movementHex.q},${movementHex.r})`,
        );
      }

      // Attack
      let attacked = false;
      let damageDealt = 0;
      let targetDied = false;

      if (this.summonAIService.shouldAttack(summon, focusTarget)) {
        // Determine which modifier deck to use for summon attack
        let summonModifierDeck: AttackModifierCard[] | undefined;

        if (summon.ownerId) {
          // Use owner's character deck for player-summoned summons
          const characterDecks = this.characterModifierDecks.get(roomCode);
          if (characterDecks) {
            summonModifierDeck = characterDecks.get(summon.ownerId);
          }
        } else {
          // Non-owned summon (scenario ally) - use shared ally deck
          summonModifierDeck = this.allyModifierDeck.get(roomCode);
        }

        // Fallback: initialize if needed
        if (!summonModifierDeck || summonModifierDeck.length === 0) {
          summonModifierDeck =
            this.modifierDeckService.initializeStandardDeck();
          if (summon.ownerId) {
            const characterDecks =
              this.characterModifierDecks.get(roomCode) || new Map();
            characterDecks.set(summon.ownerId, summonModifierDeck);
            this.characterModifierDecks.set(roomCode, characterDecks);
          } else {
            this.allyModifierDeck.set(roomCode, summonModifierDeck);
          }
        }

        // Draw modifier card
        const { card: summonModifierCard, remainingDeck: summonRemainingDeck } =
          this.modifierDeckService.drawCard(summonModifierDeck);

        // Update the correct deck
        if (summon.ownerId) {
          const characterDecks = this.characterModifierDecks.get(roomCode);
          if (characterDecks) {
            characterDecks.set(summon.ownerId, summonRemainingDeck);
          }
        } else {
          this.allyModifierDeck.set(roomCode, summonRemainingDeck);
        }

        // Handle reshuffle (x2 or null triggers reshuffle)
        if (this.modifierDeckService.checkReshuffle(summonModifierCard)) {
          const reshuffled = this.modifierDeckService.reshuffleDeck(
            summonRemainingDeck,
            [],
          );
          if (summon.ownerId) {
            const characterDecks = this.characterModifierDecks.get(roomCode);
            if (characterDecks) {
              characterDecks.set(summon.ownerId, reshuffled);
            }
          } else {
            this.allyModifierDeck.set(roomCode, reshuffled);
          }
        }

        // Calculate damage using modifier
        const baseDamage = summon.attack;
        damageDealt = this.damageService.calculateDamage(
          baseDamage,
          summonModifierCard,
        );
        // Apply damage to monster (shared Monster interface doesn't have takeDamage method)
        focusTarget.health = Math.max(0, focusTarget.health - damageDealt);
        if (focusTarget.health <= 0) {
          focusTarget.isDead = true;
        }
        attacked = true;
        targetDied = focusTarget.isDead;

        this.logger.log(
          `[SummonAI] Summon ${summon.name} attacked ${focusTarget.monsterType} for ${damageDealt} damage (base: ${baseDamage}, modifier: ${summonModifierCard.modifier})`,
        );

        // Track damage dealt for objectives
        const accumulatedStats = this.roomAccumulatedStats.get(roomCode);
        if (accumulatedStats) {
          accumulatedStats.totalDamageDealt += damageDealt;
        }

        // If monster died, emit monster_died
        if (targetDied) {
          this.logger.log(
            `[SummonAI] Monster ${focusTarget.monsterType} was killed by summon ${summon.name}`,
          );

          // Update kill count for owner
          if (summon.ownerId) {
            const playerStats = this.roomPlayerStats.get(roomCode);
            const ownerChar = characterService.getCharacterById(summon.ownerId);
            if (playerStats && ownerChar) {
              const stats = playerStats.get(ownerChar.playerId);
              if (stats) {
                stats.monstersKilled++;
              }
            }
          }

          // Update accumulated stats
          if (accumulatedStats) {
            accumulatedStats.totalMonstersKilled++;
          }

          // Emit monster_died event
          this.server.to(roomCode).emit('monster_died', {
            monsterId: focusTargetId,
            killerId: summonId,
            hexCoordinates: focusTarget.currentHex,
          });

          // Spawn loot token at monster's position
          const lootToken = LootToken.create(
            roomCode,
            focusTarget.currentHex,
            1,
          );
          let lootTokens = this.roomLootTokens.get(roomCode);
          if (!lootTokens) {
            lootTokens = [];
            this.roomLootTokens.set(roomCode, lootTokens);
          }
          lootTokens.push(lootToken);

          this.server.to(roomCode).emit('loot_spawned', {
            id: lootToken.id,
            coordinates: lootToken.coordinates,
            value: lootToken.value,
          });
        }
      }

      // Mark summon as having acted this turn
      this.markSummonActed(roomCode, summonId);

      // Emit summon_activated event
      this.server.to(roomCode).emit('summon_activated', {
        summonId,
        summonName: summon.name,
        moved,
        fromHex: originalHex,
        toHex: summon.position,
        attacked,
        targetId: attacked ? focusTargetId : undefined,
        targetName: attacked ? focusTarget.monsterType : undefined,
        damageDealt: attacked ? damageDealt : undefined,
        targetDied,
      });

      // Add log entry
      if (moved || attacked) {
        const logParts: Array<{
          text: string;
          color?: string;
          isBold?: boolean;
        }> = [{ text: summon.name, color: 'lightgreen' }];

        if (moved) {
          logParts.push({ text: ` moved` });
        }

        if (attacked) {
          if (moved) logParts.push({ text: ` and` });
          logParts.push(
            { text: ` attacked ` },
            { text: focusTarget.monsterType, color: 'orange' },
            { text: ` for ` },
            { text: `${damageDealt}`, color: 'red' },
            { text: ` damage` },
          );

          if (targetDied) {
            logParts.push({ text: ` - killed!`, color: 'red', isBold: true });
          }
        }

        logParts.push({ text: `.` });
        this.addGameLogEntry(roomCode, logParts);
      }

      // Check scenario completion after potential monster kill
      if (targetDied) {
        this.checkScenarioCompletion(roomCode, {
          checkPrimaryObjective: false,
        });
      }

      // Advance turn
      this.advanceTurnAfterMonsterActivation(roomCode);

      this.logger.log(`[SummonAI] Summon ${summon.name} activation complete`);
    } catch (error) {
      this.logger.error(
        `[SummonAI] Error activating summon ${summonId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Still advance turn even on error to prevent game from hanging
      this.advanceTurnAfterMonsterActivation(roomCode);
    }
  }

  /**
   * Mark a summon as having acted this turn
   */
  private markSummonActed(roomCode: string, summonId: string): void {
    let actedSet = this.summonsActedThisTurn.get(roomCode);
    if (!actedSet) {
      actedSet = new Set();
      this.summonsActedThisTurn.set(roomCode, actedSet);
    }
    actedSet.add(summonId);
  }

  /**
   * Advance turn after monster activation
   */
  private advanceTurnAfterMonsterActivation(roomCode: string): void {
    // Get room
    const room = roomService.getRoom(roomCode);
    if (!room) {
      this.logger.error(`Room not found for code ${roomCode}`);
      return;
    }

    // Get current turn order
    const turnOrder = this.roomTurnOrder.get(roomCode);
    if (!turnOrder) {
      this.logger.error(`Turn order not found for room ${roomCode}`);
      return;
    }

    // Get current turn index
    const currentIndex = this.currentTurnIndex.get(roomCode) || 0;

    // Get next living entity index (skips dead/exhausted entities)
    const nextIndex = this.turnOrderService.getNextLivingEntityIndex(
      currentIndex,
      turnOrder,
    );

    // Check if round is complete (wrapped back to start)
    // Fix: count LIVING entities, not total entities (dead entities remain in turn order)
    const livingEntities = turnOrder.filter(
      (e) => !e.isDead && !e.isExhausted,
    ).length;
    const roundComplete =
      nextIndex === 0 && (currentIndex !== 0 || livingEntities === 1);

    if (roundComplete) {
      // Use shared round completion logic
      this.handleRoundCompletion(roomCode);
    } else {
      // Advance to next turn
      this.currentTurnIndex.set(roomCode, nextIndex);

      // Get next entity
      const nextEntity = turnOrder[nextIndex];

      // Broadcast turn started for next entity
      const turnStartedPayload: TurnStartedPayload = {
        entityId: nextEntity.entityId,
        entityType: nextEntity.entityType,
        turnIndex: nextIndex,
      };

      this.server.to(roomCode).emit('turn_started', turnStartedPayload);

      // Add log entry for turn start
      this.addGameLogEntry(roomCode, [{ text: `${nextEntity.name}'s turn.` }]);

      this.logger.log(
        `Advanced to next turn in room ${roomCode}: ${nextEntity.entityId} (${nextEntity.entityType})`,
      );

      // If next entity is also a monster, activate it automatically
      if (nextEntity.entityType === 'monster') {
        // Use setTimeout to avoid deep recursion
        setTimeout(() => {
          this.activateMonster(nextEntity.entityId, roomCode).catch((error) => {
            this.logger.error(
              `Auto-activation error: ${error instanceof Error ? error.message : String(error)}`,
            );
          });
        }, 100);
      }

      // Issue #228: If next entity is an AI-controlled summon, activate it automatically
      if (nextEntity.entityType === 'summon') {
        const summons = this.roomSummons.get(roomCode) || [];
        const summon = summons.find((s) => s.id === nextEntity.entityId);
        // Only auto-activate AI-controlled summons; player-controlled summons wait for orders
        if (summon && !summon.playerControlled) {
          setTimeout(() => {
            this.activateSummon(nextEntity.entityId, roomCode);
          }, 100);
        }
      }
    }
  }

  /**
   * Handle round completion (shared logic for both player and monster turns)
   * Clears cards, resets flags, draws new initiatives, and notifies clients
   *
   * Phase 3: Now includes objective checking at end of round
   */
  private handleRoundCompletion(roomCode: string): void {
    const room = roomService.getRoom(roomCode);
    if (!room) {
      this.logger.error(
        `Room not found for code ${roomCode} in handleRoundCompletion`,
      );
      return;
    }

    const currentRoundNumber = this.currentRound.get(roomCode) || 1;
    this.logger.log(
      `Round ${currentRoundNumber} complete in room ${roomCode}, waiting for card selection`,
    );

    // Phase 3: Update accumulated stats for rounds completed
    const stats = this.roomAccumulatedStats.get(roomCode);
    if (stats) {
      stats.roundsCompleted = currentRoundNumber;
    }

    // Phase 3: Check scenario completion at round boundary BEFORE starting new round
    // This ensures objectives like "survive N rounds" are properly evaluated
    // Check primary objective completion (which was deferred from attack handlers)
    this.checkScenarioCompletion(roomCode, { checkPrimaryObjective: true });

    // If game completed, don't proceed with new round setup
    if (room.status === RoomStatus.COMPLETED) {
      this.logger.log(
        `Scenario completed at end of round ${currentRoundNumber}, not starting new round`,
      );
      return;
    }

    // Clear selected cards and reset action flags for all characters for new round (including multi-character)
    room.players.forEach((p: any) => {
      const playerChars = characterService.getCharactersByPlayerId(p.userId);
      playerChars.forEach((char) => {
        if (char) {
          char.selectedCards = undefined;
          char.resetActionFlags();
        }
      });
    });

    // TODO (Enhancement): Draw monster ABILITY CARDS (not just initiatives)
    // Currently we only assign random initiatives to monsters each round.
    // In full Gloomhaven rules, each monster type draws an ability card that provides:
    // - Initiative value (already implemented)
    // - Movement value (currently using base stat)
    // - Attack value (currently using base stat)
    // - Special abilities (not implemented)
    // This would require:
    // 1. Monster ability card data structures with stats per card
    // 2. Deck management per monster type
    // 3. Card reshuffle logic when deck exhausted
    // 4. Setting effective movement/attack on monsters like we do for players
    const monsters = this.roomMonsters.get(roomCode) || [];
    if (monsters.length > 0) {
      this.drawMonsterInitiatives(roomCode, monsters);
    }

    // Issue #220: Decay elements at end of round (strong -> waning -> inert)
    this.decayRoomElements(roomCode);

    // Set phase to card_selection for the next round
    this.roomGamePhase.set(roomCode, 'card_selection');

    // Add log entry for round end
    this.addGameLogEntry(roomCode, [
      {
        text: `Round ${currentRoundNumber} has ended. Select cards for next round.`,
      },
    ]);

    // Notify all players that round ended and to select new cards
    // The next round will start automatically when all players have selected cards (in handleSelectCards)
    this.server.to(roomCode).emit('round_ended', {
      roundNumber: currentRoundNumber,
    });

    // Check narrative triggers at end of round (for round_reached conditions)
    this.checkNarrativeTriggers(roomCode);
  }

  /**
   * Draw monster ability card initiatives
   * In Gloomhaven, each monster type draws one ability card per round
   * All monsters of the same type use the same initiative
   */
  private drawMonsterInitiatives(
    roomCode: string,
    monsters: any[],
  ): Map<string, number> {
    // Get unique monster types
    const monsterTypes = new Set(monsters.map((m) => m.monsterType as string));

    // Generate initiative for each type (10-90, typical Gloomhaven range)
    const initiatives = new Map<string, number>();
    monsterTypes.forEach((type) => {
      const initiative = Math.floor(Math.random() * 81) + 10; // 10-90
      initiatives.set(type, initiative);
    });

    // Store for this room
    this.roomMonsterInitiatives.set(roomCode, initiatives);

    this.logger.log(
      `Drew monster initiatives for room ${roomCode}: ${Array.from(
        initiatives.entries(),
      )
        .map(([type, init]) => `${type}=${init}`)
        .join(', ')}`,
    );

    return initiatives;
  }

  // ========== PHASE 3: OBJECTIVE SYSTEM METHODS ==========

  /**
   * Initialize the objective system for a room (Phase 3)
   * Called when game starts to set up objectives, progress tracking, and accumulated stats
   */
  private initializeObjectiveSystem(roomCode: string, scenario: any): void {
    try {
      // Build scenario objectives from scenario data
      // If scenario has objectives defined, use them; otherwise use default "kill all monsters"
      const objectives: ScenarioObjectives =
        this.buildScenarioObjectives(scenario);
      this.roomObjectives.set(roomCode, objectives);

      // Initialize progress tracking for all objectives
      const progressMap = new Map<string, ObjectiveProgressEntry>();

      // Initialize primary objective progress
      progressMap.set(objectives.primary.id, {
        objectiveId: objectives.primary.id,
        progress: { current: 0, target: 1, percent: 0, milestonesReached: [] },
        lastResult: { complete: false, progress: null },
        notifiedMilestones: [],
        updatedAt: new Date().toISOString(),
      });

      // Initialize secondary objective progress
      if (objectives.secondary) {
        for (const secondary of objectives.secondary) {
          progressMap.set(secondary.id, {
            objectiveId: secondary.id,
            progress: {
              current: 0,
              target: 1,
              percent: 0,
              milestonesReached: [],
            },
            lastResult: { complete: false, progress: null },
            notifiedMilestones: [],
            updatedAt: new Date().toISOString(),
          });
        }
      }

      this.roomObjectiveProgress.set(roomCode, progressMap);

      // Initialize accumulated stats
      const initialStats: AccumulatedStats = {
        totalMonstersKilled: 0,
        totalDamageDealt: 0,
        totalDamageTaken: 0,
        totalLootCollected: 0,
        totalGoldCollected: 0,
        roundsCompleted: 0,
        charactersExhausted: 0,
        characterDeaths: 0,
      };
      this.roomAccumulatedStats.set(roomCode, initialStats);

      // Objectives are now sent as part of game_started payload, not as separate event

      this.logger.log(
        `Objective system initialized for room ${roomCode}: primary="${objectives.primary.description}"`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to initialize objective system for room ${roomCode}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Build ScenarioObjectives from scenario data
   * Extracts or generates objectives based on scenario configuration
   */
  private buildScenarioObjectives(scenario: any): ScenarioObjectives {
    // Check if scenario has properly structured objectives (ObjectiveDefinition with 'type' property)
    // Seeded scenarios and properly configured scenarios have this format
    if (
      scenario.objectives &&
      scenario.objectives.primary &&
      typeof scenario.objectives.primary === 'object' &&
      scenario.objectives.primary.type
    ) {
      return scenario.objectives as ScenarioObjectives;
    }

    // Fallback for scenarios created via Scenario Designer (uses objectivePrimary string)
    // Build a default kill_all_monsters objective
    const primaryDescription =
      scenario.objectivePrimary || 'Defeat all enemies';

    const primaryObjective = {
      id: 'primary-kill-all',
      type: 'kill_all_monsters' as const,
      description: primaryDescription,
      trackProgress: true,
      milestones: [25, 50, 75, 100],
    };

    // Check for secondary objective from Scenario Designer
    const secondaryObjectives: any[] = [];
    if (scenario.objectiveSecondary) {
      secondaryObjectives.push({
        id: 'secondary-bonus',
        type: 'custom' as const,
        description: scenario.objectiveSecondary,
        trackProgress: false,
        rewards: { experience: 5 },
      });
    }

    // Default failure condition: all players exhausted
    const failureConditions = [
      {
        id: 'failure-all-exhausted',
        type: 'custom' as const,
        description: 'All characters exhausted',
        trackProgress: false,
      },
    ];

    return {
      primary: primaryObjective,
      secondary:
        secondaryObjectives.length > 0 ? secondaryObjectives : undefined,
      failureConditions,
      globalTimeLimit: scenario.roundLimit,
    };
  }

  /**
   * Update objective progress and emit events (Phase 3)
   * Call this when trackable events occur (monster killed, loot collected, etc.)
   */
  private updateObjectiveProgress(
    roomCode: string,
    objectiveId: string,
    current: number,
    target: number,
    description: string,
  ): void {
    try {
      const progressMap = this.roomObjectiveProgress.get(roomCode);
      if (!progressMap) {
        return;
      }

      const existingProgress = progressMap.get(objectiveId);
      const percentage = target > 0 ? Math.floor((current / target) * 100) : 0;

      // Calculate milestones
      const milestoneThresholds = [25, 50, 75, 100];
      const currentMilestones = milestoneThresholds.filter(
        (m) => percentage >= m,
      );
      const notifiedMilestones = existingProgress?.notifiedMilestones || [];

      // Check for new milestone reached
      const newMilestone = currentMilestones.find(
        (m) => !notifiedMilestones.includes(m),
      );

      // Update progress entry
      const updatedEntry: ObjectiveProgressEntry = {
        objectiveId,
        progress: {
          current,
          target,
          percent: percentage,
          milestonesReached: currentMilestones,
        },
        lastResult: {
          complete: percentage >= 100,
          progress: {
            current,
            target,
            percent: percentage,
            milestonesReached: currentMilestones,
          },
        },
        notifiedMilestones: newMilestone
          ? [...notifiedMilestones, newMilestone]
          : notifiedMilestones,
        updatedAt: new Date().toISOString(),
      };

      progressMap.set(objectiveId, updatedEntry);

      // Emit progress update event
      const progressPayload: ObjectiveProgressUpdatePayload = {
        objectiveId,
        description,
        current,
        target,
        percentage,
        milestone: newMilestone,
      };

      this.server.to(roomCode).emit('objective_progress', progressPayload);

      if (newMilestone) {
        this.logger.log(
          `Objective milestone reached in room ${roomCode}: ${description} - ${newMilestone}%`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to update objective progress: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Update accumulated stats for a room
   */
  private updateAccumulatedStats(
    roomCode: string,
    update: Partial<AccumulatedStats>,
  ): void {
    const stats = this.roomAccumulatedStats.get(roomCode);
    if (stats) {
      Object.assign(stats, update);
    }
  }

  /**
   * Handle character exhaustion (Phase 3)
   * Called when a character becomes exhausted (health reaches 0 or cards depleted)
   */
  private handleCharacterExhaustion(
    roomCode: string,
    character: any,
    reason: 'health' | 'cards' | 'manual',
  ): void {
    try {
      // Mark character as exhausted by ID (multi-character support)
      const characterModel = characterService.getCharacterById(character.id);
      if (characterModel) {
        characterModel.exhaust();
        this.logger.log(`Character ${character.id} marked as exhausted`);
      } else {
        this.logger.error(`Could not find character model for ${character.id}`);
      }

      // Issue #228: Kill all summons owned by this character
      const summons = this.roomSummons.get(roomCode) || [];
      const killedSummons = this.summonService.killSummonsByOwner(
        character.id,
        reason === 'health' ? 'owner_died' : 'owner_exhausted',
        summons,
      );

      // Emit summon_died for each killed summon
      for (const summon of killedSummons) {
        const summonDiedPayload: SummonDiedPayload = {
          summonId: summon.id,
          summonName: summon.name,
          reason: reason === 'health' ? 'owner_died' : 'owner_exhausted',
          hex: summon.position,
        };
        this.server.to(roomCode).emit('summon_died', summonDiedPayload);

        this.addGameLogEntry(roomCode, [
          { text: summon.name, color: 'lightgreen' },
          { text: ` vanished when ` },
          {
            text: character.characterClass || character.classType,
            color: 'lightblue',
          },
          { text: ` was exhausted.` },
        ]);
      }

      if (killedSummons.length > 0) {
        this.logger.log(
          `Killed ${killedSummons.length} summons owned by exhausted character ${character.id}`,
        );

        // Rebuild turn order to remove dead summons
        const turnOrder = this.roomTurnOrder.get(roomCode);
        if (turnOrder) {
          const filteredOrder = turnOrder.filter(
            (entry) =>
              entry.entityType !== 'summon' ||
              !killedSummons.some((s) => s.id === entry.entityId),
          );
          this.roomTurnOrder.set(roomCode, filteredOrder);
        }
      }

      // Emit character exhausted event
      const payload: CharacterExhaustedPayload = {
        characterId: character.id,
        characterName: this.getPlayerNickname(
          roomCode,
          character.playerId,
          character.characterClass || character.classType,
        ),
        playerId: character.playerId,
        reason,
      };

      this.server.to(roomCode).emit('character_exhausted', payload);

      // Update accumulated stats
      const stats = this.roomAccumulatedStats.get(roomCode);
      if (stats) {
        stats.charactersExhausted++;
        if (reason === 'health') {
          stats.characterDeaths++;
        }
      }

      this.logger.log(
        `Character ${character.id} exhausted in room ${roomCode}: ${reason}`,
      );

      // Check if this triggers scenario completion (all players exhausted = defeat)
      // Skip primary objective check - victory is only declared at round end
      this.checkScenarioCompletion(roomCode, { checkPrimaryObjective: false });
    } catch (error) {
      this.logger.error(
        `Failed to handle character exhaustion: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Check scenario completion and broadcast if complete (Phase 3 Enhanced)
   * Uses ObjectiveEvaluator and ObjectiveContextBuilder for proper objective evaluation
   */
  private async checkScenarioCompletion(
    roomCode: string,
    options: ScenarioCompletionCheckOptions = {},
  ): Promise<void> {
    const { checkPrimaryObjective = true } = options;
    try {
      // Get room state
      const room = roomService.getRoom(roomCode);
      if (!room) {
        return;
      }

      // Early return if game is already completed (prevents duplicate processing)
      if (room.status === RoomStatus.COMPLETED) {
        return;
      }

      // Get all characters in room (including all multi-character players' characters)
      const characters = room.players
        .flatMap((p: any) => characterService.getCharactersByPlayerId(p.userId))
        .filter((c) => c !== null);

      // Get all monsters in room
      const monsters = this.roomMonsters.get(roomCode) || [];

      // Get loot tokens
      const lootTokens = this.roomLootTokens.get(roomCode) || [];

      // Get objectives and stats
      const objectives = this.roomObjectives.get(roomCode);
      const accumulatedStats = this.roomAccumulatedStats.get(roomCode);
      const currentRound = this.currentRound.get(roomCode) || 1;
      const gameStartTime = this.roomGameStartTime.get(roomCode) || Date.now();

      // Build evaluation context
      const context = this.objectiveContextBuilderService.buildContext({
        room: room as any,
        characters: characters as any[],
        monsters: monsters,
        lootTokens: lootTokens,
        currentRound,
        difficulty: 1, // Default difficulty
        accumulatedStats: accumulatedStats || undefined,
      });

      // Check for failure conditions first
      // 1. All players exhausted
      const allPlayersExhausted = characters.every(
        (c: any) => c.exhausted || c.isExhausted,
      );

      // 2. Check failure conditions from objectives
      let failureTriggered = false;
      let failureReason = '';

      if (objectives?.failureConditions) {
        for (const failureCondition of objectives.failureConditions) {
          const result = this.objectiveEvaluatorService.evaluateObjective(
            failureCondition,
            context,
          );
          if (result.complete) {
            failureTriggered = true;
            failureReason = failureCondition.description;
            break;
          }
        }
      }

      // 3. Check time limit
      if (
        objectives?.globalTimeLimit &&
        currentRound > objectives.globalTimeLimit
      ) {
        failureTriggered = true;
        failureReason = `Time limit of ${objectives.globalTimeLimit} rounds exceeded`;
      }

      // Check victory: primary objective complete
      let primaryComplete = false;
      let primaryResult: any = { complete: false, progress: null };

      if (!objectives?.primary) {
        this.logger.error(
          `[checkScenarioCompletion] No primary objective defined for room ${roomCode}. ` +
            `This indicates a scenario configuration error.`,
        );
        return;
      }

      primaryResult = this.objectiveEvaluatorService.evaluateObjective(
        objectives.primary,
        context,
      );

      // Log if evaluation returned an error (indicates malformed objective)
      if (primaryResult.error) {
        this.logger.error(
          `[checkScenarioCompletion] Objective evaluation error for room ${roomCode}: ${primaryResult.error}`,
        );
      }

      primaryComplete = primaryResult.complete;

      // Update objective progress
      if (primaryResult.progress) {
        this.updateObjectiveProgress(
          roomCode,
          objectives.primary.id,
          primaryResult.progress.current,
          primaryResult.progress.target,
          objectives.primary.description,
        );
      }

      // Evaluate secondary objectives
      const secondaryResults: Map<string, any> = new Map();
      const completedSecondaryIds: string[] = [];

      if (objectives?.secondary) {
        for (const secondary of objectives.secondary) {
          const result = this.objectiveEvaluatorService.evaluateObjective(
            secondary,
            context,
          );
          secondaryResults.set(secondary.id, result);

          if (result.complete) {
            completedSecondaryIds.push(secondary.id);
          }

          // Update progress
          if (result.progress) {
            this.updateObjectiveProgress(
              roomCode,
              secondary.id,
              result.progress.current,
              result.progress.target,
              secondary.description,
            );
          }
        }
      }

      // Determine outcome
      const isDefeat = allPlayersExhausted || failureTriggered;

      // NEW: Only check for victory if explicitly requested
      // When checkPrimaryObjective=false, we still want to check for defeats
      // but not declare victory (that happens at round end)
      const isVictory = checkPrimaryObjective && primaryComplete && !isDefeat;
      const isComplete = isDefeat || isVictory;

      if (!isComplete) {
        // Scenario still in progress
        // Progress updates already happened above (lines 4657-4693)
        // Just check narrative triggers and return
        this.checkNarrativeTriggers(roomCode);
        return;
      }

      // Calculate completion time
      const completionTime = Date.now() - gameStartTime;

      // Calculate experience
      let totalExperience = isVictory ? 10 : 0;
      if (isVictory && objectives?.secondary) {
        for (const secondary of objectives.secondary) {
          const result = secondaryResults.get(secondary.id);
          if (result?.complete && secondary.rewards?.experience) {
            totalExperience += secondary.rewards.experience;
          }
        }
      }

      // Build loot summary per player
      const lootByPlayer: Map<string, { gold: number; items: string[] }> =
        new Map();
      for (const token of lootTokens) {
        if (token.isCollected && token.collectedBy) {
          const existing = lootByPlayer.get(token.collectedBy) || {
            gold: 0,
            items: [],
          };
          existing.gold += token.value;
          lootByPlayer.set(token.collectedBy, existing);
        }
      }

      // Build objective progress summary
      const objectiveProgress: Record<
        string,
        { current: number; target: number }
      > = {};
      const progressMap = this.roomObjectiveProgress.get(roomCode);
      if (progressMap) {
        progressMap.forEach((entry, id) => {
          objectiveProgress[id] = {
            current: entry.progress.current,
            target: entry.progress.target,
          };
        });
      }

      // Build player stats
      const playerStatsMap = this.roomPlayerStats.get(roomCode);
      const playerStats = room.players.map((p: any) => {
        const stats = playerStatsMap?.get(p.userId);
        return {
          playerId: p.userId,
          damageDealt: stats?.damageDealt || 0,
          damageTaken: stats?.damageTaken || 0,
          monstersKilled: stats?.monstersKilled || 0,
          cardsLost: stats?.cardsLost || 0,
        };
      });

      // Get victory/defeat narrative and its rewards
      const narrativeDef = this.roomNarratives.get(roomCode);
      const narrativeContent = isVictory
        ? narrativeDef?.victory
        : narrativeDef?.defeat;

      // Victory narrative rewards (from scenario definition)
      const outroRewards =
        isVictory && narrativeContent?.rewards
          ? narrativeContent.rewards
          : undefined;

      // CRITICAL FIX: Apply victory/defeat rewards to database BEFORE building the payload
      // Previously, outroRewards were only shown in the payload but never persisted.
      // The rewardsAlreadyApplied=true flag on the narrative prevented re-application,
      // but the rewards were never applied in the first place - causing silent failures.
      if (outroRewards && (outroRewards.gold || outroRewards.xp)) {
        const playersForRewards = room.players.map((p) => ({
          id: p.id,
          userId: p.userId,
          characterId: p.characterId,
        }));

        try {
          const rewardResult = await this.narrativeRewardService.applyRewards(
            roomCode,
            outroRewards,
            playersForRewards,
          );

          if (rewardResult.success) {
            this.logger.log(
              `Applied ${isVictory ? 'victory' : 'defeat'} rewards to ${rewardResult.rewardedPlayers.length} players in room ${roomCode}`,
            );
            // Emit reward event so clients know rewards were granted
            if (rewardResult.rewardedPlayers.length > 0) {
              this.server.to(roomCode).emit('narrative_rewards_granted', {
                rewards: rewardResult.rewardedPlayers,
                distribution: rewardResult.distribution,
                source: isVictory ? 'victory' : 'defeat',
              });
            }
          } else {
            this.logger.error(
              `Failed to apply ${isVictory ? 'victory' : 'defeat'} rewards in room ${roomCode}: ${rewardResult.error}`,
            );
            this.server.to(roomCode).emit('narrative_rewards_failed', {
              error: rewardResult.error,
              source: isVictory ? 'victory' : 'defeat',
            });
          }
        } catch (rewardError) {
          const errorMessage =
            rewardError instanceof Error
              ? rewardError.message
              : 'Unknown error';
          this.logger.error(
            `Exception applying ${isVictory ? 'victory' : 'defeat'} rewards in room ${roomCode}: ${errorMessage}`,
          );
          // Don't throw - scenario completion should still succeed
        }
      }

      // Get accumulated narrative rewards (now includes victory/defeat rewards just applied)
      const accumulatedRewards =
        this.narrativeRewardService.getAccumulatedRewards(roomCode);

      // Build scenario completed payload
      // Victory/defeat rewards are now included in accumulatedRewards (applied above)
      const scenarioCompletedPayload: ScenarioCompletedPayload = {
        victory: isVictory,
        experience: totalExperience,
        loot: Array.from(lootByPlayer.entries()).map(([playerId, data]) => {
          const playerNarrativeRewards = accumulatedRewards.get(playerId) || {
            gold: 0,
            xp: 0,
          };
          return {
            playerId,
            // Total gold = loot tokens + all narrative rewards (including victory/defeat)
            gold: data.gold + playerNarrativeRewards.gold,
            items: data.items,
          };
        }),
        completionTime,
        primaryObjectiveCompleted: primaryComplete,
        secondaryObjectivesCompleted: completedSecondaryIds,
        objectiveProgress,
        playerStats,
      };

      // Add XP from all narrative rewards (mid-game + victory/defeat) to experience total
      if (accumulatedRewards && accumulatedRewards.size > 0) {
        let totalNarrativeXP = 0;
        for (const rewards of accumulatedRewards.values()) {
          totalNarrativeXP += rewards.xp;
        }
        // Average XP per player (narrative XP is already per-player in accumulator)
        scenarioCompletedPayload.experience += Math.floor(
          totalNarrativeXP / accumulatedRewards.size,
        );
      }

      // If no loot was collected but rewards exist, add entries for all players
      if (
        accumulatedRewards &&
        accumulatedRewards.size > 0 &&
        scenarioCompletedPayload.loot.length === 0
      ) {
        for (const player of room.players) {
          const playerNarrativeRewards = accumulatedRewards.get(
            player.userId,
          ) || { gold: 0, xp: 0 };
          scenarioCompletedPayload.loot.push({
            playerId: player.userId,
            gold: playerNarrativeRewards.gold,
            items: [],
          });
        }
      }

      // Display victory/defeat narrative if available
      if (narrativeContent) {
        const players = room.players.map((p: any) => ({
          id: p.userId,
          name: p.nickname || 'Player',
        }));

        // Pass rewards to narrative for display only.
        // Rewards were already applied to the database above (CRITICAL FIX).
        // The createOutroNarrative sets rewardsAlreadyApplied=true to prevent duplicate application
        // when the narrative is acknowledged via handleAllNarrativeAcknowledged.
        const outroNarrative = this.narrativeService.createOutroNarrative(
          isVictory ? 'victory' : 'defeat',
          narrativeContent,
          players,
          outroRewards, // Include rewards for display in narrative overlay
        );

        // Clear any stale narratives/queued triggers - scenario is over
        this.narrativeService.clearActiveNarrative(roomCode);
        this.narrativeService.clearQueue(roomCode);

        this.narrativeService.setActiveNarrative(roomCode, outroNarrative);
        this.emitNarrativeDisplay(roomCode, outroNarrative);

        this.logger.log(
          `Displayed ${isVictory ? 'victory' : 'defeat'} narrative for room ${roomCode}`,
        );
      }

      this.server
        .to(roomCode)
        .emit('scenario_completed', scenarioCompletedPayload);

      // Update room status using proper method
      room.completeGame();

      const reason = isVictory
        ? 'Primary objective completed'
        : allPlayersExhausted
          ? 'All players exhausted'
          : failureReason || 'Failure condition triggered';

      this.logger.log(
        `Scenario completed in room ${roomCode}: victory=${isVictory}, reason="${reason}"`,
      );

      // Phase 4-5: Save game result and record campaign progression
      // Calculate total loot and gold (needed by both game result and campaign recording)
      const totalLootCollected = lootTokens.filter(
        (t: any) => t.isCollected,
      ).length;
      const totalGold = Array.from(lootByPlayer.values()).reduce(
        (sum, data) => sum + data.gold,
        0,
      );

      // Build player results for database (including all characters for multi-character players)
      // Calculated outside try block so it's available for campaign recording even if game result save fails
      const playerResults = room.players.flatMap((p: any) => {
        const stats = playerStatsMap?.get(p.userId);
        const loot = lootByPlayer.get(p.userId);
        const playerCharacters = characterService.getCharactersByPlayerId(
          p.userId,
        );

        // Calculate experience for this player (shared across all their characters)
        let playerExperience = isVictory ? 10 : 0;
        if (isVictory && objectives?.secondary) {
          for (const secondary of objectives.secondary) {
            const result = secondaryResults.get(secondary.id);
            if (result?.complete && secondary.rewards?.experience) {
              playerExperience +=
                secondary.rewards.experience / room.players.length; // Distribute evenly
            }
          }
        }

        // Return results for each character the player controls
        return playerCharacters.map((character) => ({
          userId: p.userId,
          // Use database character UUID for GameResult (required UUID format)
          // Falls back to player UUID for anonymous/guest players
          characterId: character?.userCharacterId || p.userId,
          // Keep persistentCharacterId for campaign tracking (same value)
          persistentCharacterId: character?.userCharacterId || undefined,
          characterClass: character?.characterClass || 'Unknown',
          characterName: p.nickname,
          survived: !character?.exhausted,
          wasExhausted: character?.exhausted || false,
          damageDealt: stats?.damageDealt || 0,
          damageTaken: stats?.damageTaken || 0,
          monstersKilled: stats?.monstersKilled || 0,
          lootCollected: loot
            ? lootTokens.filter((t: any) => t.collectedBy === p.userId).length
            : 0,
          cardsLost: stats?.cardsLost || 0,
          experienceGained: Math.floor(
            playerExperience / playerCharacters.length,
          ), // Split XP across characters
          goldGained: Math.floor((loot?.gold || 0) / playerCharacters.length), // Split gold across characters
        }));
      });

      // Save game result to database (can fail gracefully)
      try {
        await this.gameResultService.saveGameResult({
          gameId: room.id,
          roomCode: room.roomCode,
          scenarioId: room.scenarioId || undefined,
          scenarioName: objectives?.primary?.description || 'Unknown Scenario',
          victory: isVictory,
          roundsCompleted: currentRound,
          completionTimeMs: completionTime,
          primaryObjectiveCompleted: primaryComplete,
          secondaryObjectiveCompleted: completedSecondaryIds.length > 0,
          objectivesCompletedList: completedSecondaryIds,
          objectiveProgress: Object.fromEntries(
            Object.entries(objectiveProgress).map(([id, prog]) => [
              id,
              {
                current: prog.current,
                target: prog.target,
                completed: prog.current >= prog.target,
              },
            ]),
          ),
          totalLootCollected,
          totalExperience: totalExperience,
          totalGold,
          playerResults,
        });
        this.logger.log(`Game result saved to database for room ${roomCode}`);
      } catch (dbError) {
        this.logger.error(
          `Failed to save game result to database: ${dbError instanceof Error ? dbError.message : String(dbError)}`,
        );
        // Continue - campaign recording should still work even if game result save fails
      }

      // Campaign recording (separate from game result, always runs)
      // Persist character gold/experience from scenario completion
      // For campaign games: use campaign service (Issue #244)
      // For non-campaign games: persist directly (Issue #204)
      this.logger.log(
        `[Campaign Debug] room.campaignId=${room.campaignId}, room.scenarioId=${room.scenarioId}, isVictory=${isVictory}`,
      );
      if (room.campaignId) {
        // Issue #244 - Campaign Mode: Record scenario completion in campaign
        try {
          // Get exhausted character IDs for permadeath handling
          const exhaustedCharacterIds = room.players.flatMap((p: any) => {
            const playerChars = characterService.getCharactersByPlayerId(
              p.userId,
            );
            return playerChars
              .filter((c: any) => c?.exhausted)
              .map(
                (c: any): string | undefined =>
                  c?.userCharacterId as string | undefined,
              )
              .filter((id: string | undefined): id is string => !!id);
          });

          // Build character results for campaign tracking (use persistentCharacterId for DB updates)
          const characterResults = playerResults
            .filter((pr: any) => pr.persistentCharacterId)
            .map((pr: any) => ({
              characterId: pr.persistentCharacterId,
              experienceGained: pr.experienceGained || 0,
              goldGained: pr.goldGained || 0,
            }));

          // Record in campaign service
          const campaignResult =
            await this.campaignService.recordScenarioCompletion(
              room.campaignId,
              room.scenarioId || '',
              isVictory,
              exhaustedCharacterIds,
              characterResults,
            );

          // Emit campaign completion events
          this.server.to(roomCode).emit('campaign_scenario_completed', {
            campaignId: room.campaignId,
            scenarioId: room.scenarioId,
            victory: isVictory,
            newlyUnlockedScenarios: campaignResult.newlyUnlockedScenarios,
            healedCharacters: campaignResult.healedCharacters,
            retiredCharacters: campaignResult.retiredCharacters,
            campaignCompleted: campaignResult.campaignCompleted,
            experienceGained: campaignResult.experienceGained,
            goldGained: campaignResult.goldGained,
          });

          this.logger.log(
            `Campaign scenario completed: campaignId=${room.campaignId}, victory=${isVictory}, ` +
              `unlocked=${campaignResult.newlyUnlockedScenarios.length}, ` +
              `retired=${campaignResult.retiredCharacters.length}, ` +
              `campaignCompleted=${campaignResult.campaignCompleted}`,
          );

          // If campaign is completed, emit campaign completed event
          if (campaignResult.campaignCompleted) {
            this.server.to(roomCode).emit('campaign_completed', {
              campaignId: room.campaignId,
              victory:
                isVictory && campaignResult.retiredCharacters.length === 0,
            });
          }
        } catch (campaignError) {
          this.logger.error(
            `Failed to record campaign scenario completion: ${campaignError instanceof Error ? campaignError.message : String(campaignError)}`,
          );
          // Don't throw - game completion should still succeed
        }
      } else {
        // Issue #204 - Non-campaign games: persist gold directly using atomic increment
        for (const playerResult of playerResults) {
          // Skip if no persistent character ID (anonymous/non-persistent characters)
          if (!playerResult.persistentCharacterId) {
            this.logger.log(
              `Skipping gold persistence for non-persistent character ${playerResult.characterId}`,
            );
            continue;
          }

          try {
            // Use atomic increment (same pattern as campaign service)
            await this.prisma.character.update({
              where: { id: playerResult.persistentCharacterId },
              data: { gold: { increment: playerResult.goldGained } },
            });

            this.logger.log(
              `Persisted gold for character ${playerResult.persistentCharacterId}: +${playerResult.goldGained}`,
            );
          } catch (error) {
            this.logger.warn(
              `Could not persist gold for character ${playerResult.persistentCharacterId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
          }
        }
      }

      // Refresh all items for characters after scenario completion (Issue #205 - Phase 4.4)
      // This resets consumed items and refreshes spent items for the next scenario
      for (const player of room.players) {
        const playerCharacters = characterService.getCharactersByPlayerId(
          player.userId,
        );
        for (const character of playerCharacters) {
          if (
            character &&
            characterService.isPersistentCharacter(character.id)
          ) {
            try {
              const refreshResult = await this.inventoryService.refreshAllItems(
                character.id,
              );
              if (refreshResult.refreshedItems.length > 0) {
                const payload: ItemsRefreshedPayload = {
                  characterId: character.id,
                  refreshedItems: refreshResult.refreshedItems,
                  trigger: 'scenario_end',
                };
                this.server.to(roomCode).emit('items_refreshed', payload);
                this.logger.log(
                  `Refreshed ${refreshResult.refreshedItems.length} items for character ${character.id} after scenario`,
                );
              }
            } catch (refreshError) {
              this.logger.warn(
                `Failed to refresh items for character ${character.id}: ${refreshError instanceof Error ? refreshError.message : String(refreshError)}`,
              );
              // Continue with other characters
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Check scenario completion error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // ========== ITEM & INVENTORY EVENTS (Issue #205) ==========

  /**
   * Handle use_item event (Issue #205)
   * Player uses an equipped item during their turn
   */
  @SubscribeMessage('use_item')
  async handleUseItem(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: UseItemPayload,
  ) {
    try {
      const roomData = this.getRoomFromSocket(client);
      if (!roomData) {
        client.emit('error', {
          code: 'NOT_IN_ROOM',
          message: 'You are not in a room',
        } as ErrorPayload);
        return;
      }

      const { roomCode } = roomData;
      const userId = this.socketToPlayer.get(client.id);
      if (!userId) {
        client.emit('error', {
          code: 'PLAYER_NOT_FOUND',
          message: 'Player not found',
        } as ErrorPayload);
        return;
      }

      // Get character by ID from payload (multi-character support)
      if (!payload.characterId) {
        client.emit('error', {
          code: 'MISSING_CHARACTER_ID',
          message: 'characterId is required',
        } as ErrorPayload);
        return;
      }

      const character = characterService.getCharacterById(payload.characterId);
      if (!character) {
        client.emit('error', {
          code: 'NO_CHARACTER',
          message: 'Character not found',
        } as ErrorPayload);
        return;
      }

      // Verify character belongs to this player
      if (character.playerId !== userId) {
        client.emit('error', {
          code: 'UNAUTHORIZED',
          message: 'Character does not belong to this player',
        } as ErrorPayload);
        return;
      }

      // Use the item through inventory service
      const result = await this.inventoryService.useItem(
        character.id,
        payload.itemId,
      );

      // Emit item_used event to all players in room
      const itemUsedPayload: ItemUsedPayload = {
        characterId: character.id,
        characterName: character.characterClass as string,
        itemId: payload.itemId,
        itemName: result.item.name,
        effects: result.effects,
        newState: result.newState.state,
        usesRemaining: result.newState.usesRemaining,
      };

      this.server.to(roomCode).emit('item_used', itemUsedPayload);

      this.logger.log(
        `Item ${result.item.name} used by character ${character.id} in room ${roomCode}`,
      );
    } catch (error) {
      this.logger.error(
        `Use item error: ${error instanceof Error ? error.message : String(error)}`,
      );
      client.emit('error', {
        code: 'USE_ITEM_ERROR',
        message: error instanceof Error ? error.message : 'Failed to use item',
      } as ErrorPayload);
    }
  }

  /**
   * Handle equip_item event (Issue #205)
   * Player equips an item from their inventory
   * Note: Only works outside of active games (lobby/character management)
   */
  @SubscribeMessage('equip_item')
  async handleEquipItem(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: EquipItemPayload,
  ) {
    try {
      const roomData = this.getRoomFromSocket(client);
      if (!roomData) {
        client.emit('error', {
          code: 'NOT_IN_ROOM',
          message: 'You are not in a room',
        } as ErrorPayload);
        return;
      }

      const { roomCode } = roomData;
      const userId = this.socketToPlayer.get(client.id);
      if (!userId) {
        client.emit('error', {
          code: 'PLAYER_NOT_FOUND',
          message: 'Player not found',
        } as ErrorPayload);
        return;
      }

      // Get character by ID from payload (multi-character support)
      if (!payload.characterId) {
        client.emit('error', {
          code: 'MISSING_CHARACTER_ID',
          message: 'characterId is required',
        } as ErrorPayload);
        return;
      }

      const character = characterService.getCharacterById(payload.characterId);
      if (!character) {
        client.emit('error', {
          code: 'NO_CHARACTER',
          message: 'Character not found',
        } as ErrorPayload);
        return;
      }

      // Verify character belongs to this player
      if (character.playerId !== userId) {
        client.emit('error', {
          code: 'UNAUTHORIZED',
          message: 'Character does not belong to this player',
        } as ErrorPayload);
        return;
      }

      // Equip the item through inventory service
      const result = await this.inventoryService.equipItem(
        character.id,
        userId, // userId = userId
        payload.itemId,
      );

      // Get item details for the event
      const item = await this.prisma.item.findUnique({
        where: { id: payload.itemId },
      });

      if (item) {
        // Emit item_equipped event to all players in room
        const itemEquippedPayload: ItemEquippedPayload = {
          characterId: character.id,
          itemId: payload.itemId,
          itemName: item.name,
          slot: item.slot as import('../../../shared/types/entities').ItemSlot,
        };

        this.server.to(roomCode).emit('item_equipped', itemEquippedPayload);

        // Also emit equipment_changed for full state update
        this.server.to(roomCode).emit('equipment_changed', {
          characterId: character.id,
          equipped: result.equippedItems,
        });

        this.logger.log(
          `Item ${item.name} equipped by character ${character.id} in room ${roomCode}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Equip item error: ${error instanceof Error ? error.message : String(error)}`,
      );
      client.emit('error', {
        code: 'EQUIP_ITEM_ERROR',
        message:
          error instanceof Error ? error.message : 'Failed to equip item',
      } as ErrorPayload);
    }
  }

  /**
   * Handle unequip_item event (Issue #205)
   * Player unequips an item from their equipment
   * Note: Only works outside of active games (lobby/character management)
   */
  @SubscribeMessage('unequip_item')
  async handleUnequipItem(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: UnequipItemPayload,
  ) {
    try {
      const roomData = this.getRoomFromSocket(client);
      if (!roomData) {
        client.emit('error', {
          code: 'NOT_IN_ROOM',
          message: 'You are not in a room',
        } as ErrorPayload);
        return;
      }

      const { roomCode } = roomData;
      const userId = this.socketToPlayer.get(client.id);
      if (!userId) {
        client.emit('error', {
          code: 'PLAYER_NOT_FOUND',
          message: 'Player not found',
        } as ErrorPayload);
        return;
      }

      // Get character by ID from payload (multi-character support)
      if (!payload.characterId) {
        client.emit('error', {
          code: 'MISSING_CHARACTER_ID',
          message: 'characterId is required',
        } as ErrorPayload);
        return;
      }

      const character = characterService.getCharacterById(payload.characterId);
      if (!character) {
        client.emit('error', {
          code: 'NO_CHARACTER',
          message: 'Character not found',
        } as ErrorPayload);
        return;
      }

      // Verify character belongs to this player
      if (character.playerId !== userId) {
        client.emit('error', {
          code: 'UNAUTHORIZED',
          message: 'Character does not belong to this player',
        } as ErrorPayload);
        return;
      }

      // Unequip the item through inventory service
      const result = await this.inventoryService.unequipItemById(
        character.id,
        userId, // userId = userId
        payload.itemId,
      );

      // Get item details for the event
      const item = await this.prisma.item.findUnique({
        where: { id: payload.itemId },
      });

      if (item) {
        // Emit item_unequipped event to all players in room
        const itemUnequippedPayload: ItemUnequippedPayload = {
          characterId: character.id,
          itemId: payload.itemId,
          itemName: item.name,
          slot: result.slot as import('../../../shared/types/entities').ItemSlot,
        };

        this.server.to(roomCode).emit('item_unequipped', itemUnequippedPayload);

        // Also emit equipment_changed for full state update
        this.server.to(roomCode).emit('equipment_changed', {
          characterId: character.id,
          equipped: result.equippedItems,
        });

        this.logger.log(
          `Item ${item.name} unequipped by character ${character.id} in room ${roomCode}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Unequip item error: ${error instanceof Error ? error.message : String(error)}`,
      );
      client.emit('error', {
        code: 'UNEQUIP_ITEM_ERROR',
        message:
          error instanceof Error ? error.message : 'Failed to unequip item',
      } as ErrorPayload);
    }
  }

  /**
   * Refresh spent items for a character (called after long rest)
   * Internal method - called from rest-complete handling
   */
  private async refreshItemsAfterRest(
    characterId: string,
    roomCode: string,
  ): Promise<void> {
    try {
      const result = await this.inventoryService.refreshSpentItems(characterId);

      if (result.refreshedItems.length > 0) {
        const payload: ItemsRefreshedPayload = {
          characterId,
          refreshedItems: result.refreshedItems,
          trigger: 'long_rest',
        };

        this.server.to(roomCode).emit('items_refreshed', payload);

        this.logger.log(
          `Refreshed ${result.refreshedItems.length} items for character ${characterId} after long rest`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to refresh items after rest: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Don't throw - item refresh failure shouldn't break rest mechanics
    }
  }

  // ========== NARRATIVE SYSTEM HANDLERS ==========

  /**
   * Handle narrative acknowledgment from a player
   */
  @SubscribeMessage('acknowledge_narrative')
  async handleAcknowledgeNarrative(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: AcknowledgeNarrativePayload,
  ): Promise<void> {
    try {
      const userId = this.socketToPlayer.get(client.id);
      if (!userId) {
        throw new Error('Player not authenticated');
      }

      const roomData = this.getRoomFromSocket(client);
      if (!roomData) {
        throw new Error('Player not in any room');
      }

      const { room, roomCode } = roomData;
      const player = room.getPlayer(userId);
      if (!player) {
        throw new Error('Player not found in room');
      }

      const activeNarrative =
        this.narrativeService.getActiveNarrative(roomCode);
      if (!activeNarrative || activeNarrative.id !== payload.narrativeId) {
        this.logger.warn(
          `Acknowledge for unknown narrative ${payload.narrativeId} in room ${roomCode}`,
        );
        return;
      }

      // Record acknowledgment
      this.logger.debug(
        `[handleAcknowledgeNarrative] Player ${userId} acknowledging narrative ${payload.narrativeId}`,
      );
      const allAcknowledged = this.narrativeService.acknowledgeNarrative(
        roomCode,
        userId,
      );
      this.logger.debug(
        `[handleAcknowledgeNarrative] allAcknowledged: ${allAcknowledged}`,
      );

      // Broadcast acknowledgment to all players
      const ackPayload: NarrativeAcknowledgedPayload = {
        narrativeId: payload.narrativeId,
        playerId: userId,
        playerName: player.nickname,
        allAcknowledged,
      };
      this.server.to(roomCode).emit('narrative_acknowledged', ackPayload);

      // If all acknowledged, proceed (await to ensure rewards persist before response)
      if (allAcknowledged) {
        this.logger.debug(
          `[handleAcknowledgeNarrative] All acknowledged, proceeding to dismiss`,
        );
        await this.handleAllNarrativeAcknowledged(roomCode, activeNarrative);
      }
    } catch (error) {
      this.logger.error(
        `Acknowledge narrative error: ${error instanceof Error ? error.message : String(error)}`,
      );
      client.emit('error', {
        code: 'ACKNOWLEDGE_NARRATIVE_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to acknowledge narrative',
      } as ErrorPayload);
    }
  }

  /**
   * Handle when all players have acknowledged a narrative
   */
  private async handleAllNarrativeAcknowledged(
    roomCode: string,
    narrative: import('../../../shared/types/narrative').ActiveNarrative,
  ): Promise<void> {
    this.logger.debug(
      `[handleAllNarrativeAcknowledged] Processing for room ${roomCode}, narrative type: ${narrative.type}`,
    );

    const room = roomService.getRoom(roomCode);
    if (!room) {
      this.logger.warn(
        `[handleAllNarrativeAcknowledged] Room ${roomCode} not found`,
      );
      return;
    }

    // Apply game effects if any
    if (narrative.gameEffects) {
      this.applyNarrativeGameEffects(roomCode, narrative.gameEffects);
    }

    // Apply rewards if any - await to ensure persistence before proceeding
    // Skip if rewards were already applied elsewhere (e.g., victory/defeat in scenario_completed)
    // Wrap in try-catch to ensure narrative dismissal proceeds even if reward application fails
    if (narrative.rewards && !narrative.rewardsAlreadyApplied) {
      try {
        await this.applyNarrativeRewards(
          roomCode,
          narrative.rewards,
          narrative.triggeredBy,
        );
      } catch (rewardError) {
        // Log the error but don't block narrative dismissal
        const errorMessage =
          rewardError instanceof Error
            ? rewardError.message
            : 'Unknown reward error';
        this.logger.error(
          `[handleAllNarrativeAcknowledged] Failed to apply rewards for narrative ${narrative.id}: ${errorMessage}`,
        );
        // Notify clients of the failure
        this.server.to(roomCode).emit('narrative_rewards_failed', {
          narrativeId: narrative.id,
          error: `Failed to apply rewards: ${errorMessage}`,
        });
      }
    } else if (narrative.rewards && narrative.rewardsAlreadyApplied) {
      this.logger.debug(
        `[handleAllNarrativeAcknowledged] Skipping reward application - already applied for ${narrative.type} narrative`,
      );
    }

    // Clear the narrative - this should always happen even if rewards failed
    this.narrativeService.clearActiveNarrative(roomCode);

    // Emit dismissed event
    const dismissedPayload: NarrativeDismissedPayload = {
      narrativeId: narrative.id,
      type: narrative.type,
      gameEffectsApplied: !!narrative.gameEffects,
    };
    this.logger.debug(
      `[handleAllNarrativeAcknowledged] Emitting narrative_dismissed for ${narrative.type}`,
    );
    this.server.to(roomCode).emit('narrative_dismissed', dismissedPayload);

    // Check for queued narratives
    const nextNarrative = this.narrativeService.dequeueNarrative(roomCode);
    if (nextNarrative) {
      this.logger.debug(
        `[handleAllNarrativeAcknowledged] Found queued narrative, displaying`,
      );
      this.narrativeService.setActiveNarrative(roomCode, nextNarrative);
      this.emitNarrativeDisplay(roomCode, nextNarrative);
    } else {
      this.logger.debug(
        `[handleAllNarrativeAcknowledged] No queued narratives`,
      );
    }
  }

  /**
   * Apply game effects from a narrative trigger
   */
  private applyNarrativeGameEffects(
    roomCode: string,
    effects: import('../../../shared/types/narrative').NarrativeGameEffects,
  ): void {
    const room = roomService.getRoom(roomCode);
    if (!room) return;

    // Get current scenario difficulty for monster scaling
    const scenario = this.roomScenarios.get(roomCode);
    const difficulty = scenario?.difficulty ?? 1;

    // Spawn monsters
    if (effects.spawnMonsters && effects.spawnMonsters.length > 0) {
      const roomMonsters = this.roomMonsters.get(roomCode) || [];

      for (const spawn of effects.spawnMonsters) {
        const monster = this.scenarioService.createMonster(
          room.id,
          spawn.type,
          spawn.hex,
          spawn.isElite ?? false,
          difficulty,
        );

        roomMonsters.push(monster);

        this.logger.log(
          `Spawned ${spawn.isElite ? 'elite ' : ''}${spawn.type} at (${spawn.hex.q}, ${spawn.hex.r}) in room ${roomCode}`,
        );

        // Emit monster spawned event to clients
        this.server.to(roomCode).emit('narrative_monster_spawned', {
          monsterId: monster.id,
          monsterType: monster.monsterType,
          isElite: monster.isElite,
          hex: monster.currentHex,
          health: monster.health,
          maxHealth: monster.maxHealth,
          movement: monster.movement,
          attack: monster.attack,
          range: monster.range,
        });
      }

      this.roomMonsters.set(roomCode, roomMonsters);
    }

    // Unlock doors
    if (effects.unlockDoors && effects.unlockDoors.length > 0) {
      const hexMap = this.roomMaps.get(roomCode);
      if (hexMap) {
        for (const doorHex of effects.unlockDoors) {
          const key = `${doorHex.q},${doorHex.r}`;
          const tile = hexMap.get(key);

          if (tile && tile.features) {
            // Find and open door feature
            for (const feature of tile.features) {
              if (feature.type === 'DOOR' || feature.type === 'door') {
                feature.isOpen = true;
              }
            }
          }

          // Track opened door for narrative condition evaluation
          this.trackOpenedDoor(roomCode, doorHex);

          this.logger.log(
            `Unlocked door at (${doorHex.q}, ${doorHex.r}) in room ${roomCode}`,
          );

          // Emit door unlocked event to clients
          this.server.to(roomCode).emit('narrative_door_unlocked', {
            hex: doorHex,
          });
        }
      }
    }

    // Reveal hexes (for fog of war systems)
    if (effects.revealHexes && effects.revealHexes.length > 0) {
      this.logger.log(
        `Revealing ${effects.revealHexes.length} hexes in room ${roomCode}`,
      );

      // Emit hexes revealed event to clients
      this.server.to(roomCode).emit('narrative_hexes_revealed', {
        hexes: effects.revealHexes,
      });
    }
  }

  /**
   * Apply rewards from a narrative trigger based on distribution mode.
   * Delegates to NarrativeRewardService for calculation and persistence,
   * then emits appropriate WebSocket events.
   */
  private async applyNarrativeRewards(
    roomCode: string,
    rewards: import('../../../shared/types/narrative').NarrativeRewards,
    triggeredBy?: string,
  ): Promise<void> {
    const room = roomService.getRoom(roomCode);
    if (!room) return;

    // Map players to the format expected by the reward service
    const players = room.players.map((p) => ({
      id: p.id,
      userId: p.userId,
      characterId: p.characterId,
    }));

    // Delegate to reward service for calculation and persistence
    const result = await this.narrativeRewardService.applyRewards(
      roomCode,
      rewards,
      players,
      triggeredBy,
    );

    // Emit appropriate WebSocket events based on result
    if (!result.success) {
      this.server.to(roomCode).emit('narrative_rewards_failed', {
        error: result.error,
      });
      return;
    }

    if (result.rewardedPlayers.length > 0) {
      this.server.to(roomCode).emit('narrative_rewards_granted', {
        rewards: result.rewardedPlayers,
        distribution: result.distribution,
      });
    }
  }

  /**
   * Emit narrative display event to all players in a room
   */
  private emitNarrativeDisplay(
    roomCode: string,
    narrative: import('../../../shared/types/narrative').ActiveNarrative,
  ): void {
    const payload: NarrativeDisplayPayload = {
      narrativeId: narrative.id,
      type: narrative.type,
      triggerId: narrative.triggerId,
      content: narrative.content,
      rewards: narrative.rewards,
      gameEffects: narrative.gameEffects,
      acknowledgments: narrative.acknowledgments.map((a) => ({
        playerId: a.playerId,
        playerName: a.playerName,
        acknowledged: a.acknowledged,
      })),
    };
    this.server.to(roomCode).emit('narrative_display', payload);
  }

  /**
   * Build game context for narrative condition evaluation
   * @param roomCode - Room code
   * @param characterPositionOverride - Optional override for a specific character's position (for checking triggers during movement)
   */
  private buildNarrativeContext(
    roomCode: string,
    characterPositionOverride?: { characterId: string; hex: AxialCoordinates },
  ): NarrativeGameContext | null {
    const room = roomService.getRoom(roomCode);
    if (!room) return null;

    // Get characters with positions from all players
    const characters = room.players
      .flatMap((p) => characterService.getCharactersByPlayerId(p.userId))
      .map((char) => ({
        id: char.id,
        characterClass: char.characterClass,
        // Use override position if this is the character being checked
        hex:
          characterPositionOverride &&
          char.id === characterPositionOverride.characterId
            ? characterPositionOverride.hex
            : char.position || { q: 0, r: 0 },
      }));

    // Get monsters from room state
    const roomMonsters = this.roomMonsters.get(roomCode) || [];
    const monsters = roomMonsters.map((monster) => ({
      id: monster.id,
      type: monster.monsterType,
      isAlive: !monster.isDead,
    }));

    // Count killed monsters
    const deadMonsters = roomMonsters.filter((m) => m.isDead);
    const monstersKilledByType: Record<string, number> = {};
    for (const monster of deadMonsters) {
      monstersKilledByType[monster.monsterType] =
        (monstersKilledByType[monster.monsterType] || 0) + 1;
    }

    return {
      currentRound: this.currentRound.get(roomCode) || 1,
      characters,
      monsters,
      monstersKilled: deadMonsters.length,
      monstersKilledByType,
      openedDoors: this.roomOpenedDoors.get(roomCode) || [],
      collectedTreasures: this.roomCollectedTreasures.get(roomCode) || [],
      collectedLootHexes: this.roomCollectedLootHexes.get(roomCode) || [],
    };
  }

  // ========== NARRATIVE STATE TRACKING HELPERS ==========

  /**
   * Track an opened door for narrative condition evaluation
   * Prevents duplicates via coordinate comparison
   */
  private trackOpenedDoor(roomCode: string, hex: AxialCoordinates): void {
    const doors = this.roomOpenedDoors.get(roomCode) || [];
    const alreadyTracked = doors.some((d) => d.q === hex.q && d.r === hex.r);
    if (!alreadyTracked) {
      doors.push(hex);
      this.roomOpenedDoors.set(roomCode, doors);
    }
  }

  /**
   * Track a collected treasure for narrative condition evaluation
   */
  private trackCollectedTreasure(roomCode: string, treasureId: string): void {
    const treasures = this.roomCollectedTreasures.get(roomCode) || [];
    if (!treasures.includes(treasureId)) {
      treasures.push(treasureId);
      this.roomCollectedTreasures.set(roomCode, treasures);
    }
  }

  /**
   * Track loot collection at a hex for narrative condition evaluation
   * Prevents duplicates via coordinate comparison
   */
  private trackCollectedLoot(roomCode: string, hex: AxialCoordinates): void {
    const lootHexes = this.roomCollectedLootHexes.get(roomCode) || [];
    const alreadyTracked = lootHexes.some(
      (h) => h.q === hex.q && h.r === hex.r,
    );
    if (!alreadyTracked) {
      lootHexes.push(hex);
      this.roomCollectedLootHexes.set(roomCode, lootHexes);
    }
  }

  /**
   * Check and fire narrative triggers after a game action
   * Call this after moves, attacks, round ends, etc.
   */
  private checkNarrativeTriggers(roomCode: string): void {
    // Skip if narrative is already active
    if (this.narrativeService.isNarrativeActive(roomCode)) {
      return;
    }

    const narrativeDef = this.roomNarratives.get(roomCode);
    if (!narrativeDef || !narrativeDef.triggers) {
      return;
    }

    const context = this.buildNarrativeContext(roomCode);
    if (!context) {
      return;
    }

    const trigger = this.narrativeService.checkTriggers(
      roomCode,
      narrativeDef,
      context,
    );

    if (trigger) {
      const room = roomService.getRoom(roomCode);
      if (!room) return;

      const players = room.players.map((p) => ({
        id: p.userId,
        name: p.nickname,
      }));

      const narrative = this.narrativeService.createTriggerNarrative(
        trigger,
        players,
      );
      this.narrativeService.setActiveNarrative(roomCode, narrative);
      this.emitNarrativeDisplay(roomCode, narrative);

      this.logger.log(
        `Narrative trigger ${trigger.triggerId} fired in room ${roomCode}`,
      );
    }
  }

  /**
   * Check if moving a character to a specific hex would trigger a narrative
   * Returns the trigger if one would fire, null otherwise
   * Does NOT mark the trigger as fired - use for preview/interrupt detection
   * Note: Still checks triggers even if another narrative is active (for movement interruption)
   */
  private checkTriggerAtPosition(
    roomCode: string,
    characterId: string,
    hex: AxialCoordinates,
  ): import('../../../shared/types/narrative').NarrativeTriggerDef | null {
    const narrativeDef = this.roomNarratives.get(roomCode);
    if (!narrativeDef || !narrativeDef.triggers) {
      return null;
    }

    // Build context with the hypothetical character position
    const context = this.buildNarrativeContext(roomCode, { characterId, hex });
    if (!context) {
      return null;
    }

    this.logger.log(
      `[checkTriggerAtPosition] Checking hex (${hex.q}, ${hex.r}) for character ${characterId}, ` +
        `triggers available: ${narrativeDef.triggers.length}, narrativeActive: ${this.narrativeService.isNarrativeActive(roomCode)}`,
    );

    // Use the public peekTrigger method - check even if narrative is active
    // (we want to interrupt movement regardless, then queue the trigger)
    return this.narrativeService.peekTrigger(roomCode, narrativeDef, context);
  }

  /**
   * Fire a narrative trigger (after confirming it should fire)
   * If another narrative is active, queue this one to display after
   */
  private fireNarrativeTrigger(
    roomCode: string,
    trigger: import('../../../shared/types/narrative').NarrativeTriggerDef,
    triggeredBy?: string,
  ): void {
    const room = roomService.getRoom(roomCode);
    if (!room) return;

    // Mark trigger as fired using the public method
    this.narrativeService.markTriggerFired(roomCode, trigger.triggerId);

    const players = room.players.map((p) => ({
      id: p.userId,
      name: p.nickname,
    }));

    const narrative = this.narrativeService.createTriggerNarrative(
      trigger,
      players,
      triggeredBy,
    );

    // If another narrative is already active, queue this one
    if (this.narrativeService.isNarrativeActive(roomCode)) {
      this.narrativeService.queueNarrative(roomCode, narrative);
      this.logger.log(
        `Narrative trigger ${trigger.triggerId} queued (another narrative active) in room ${roomCode}`,
      );
    } else {
      this.narrativeService.setActiveNarrative(roomCode, narrative);
      this.emitNarrativeDisplay(roomCode, narrative);
      this.logger.log(
        `Narrative trigger ${trigger.triggerId} fired in room ${roomCode}`,
      );
    }
  }
}
