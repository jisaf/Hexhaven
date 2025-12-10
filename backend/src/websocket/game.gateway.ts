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
import type { AccumulatedStats } from '../services/objective-context-builder.service';
import type {
  ScenarioObjectives,
  ObjectiveProgressEntry,
} from '../../../shared/types/objectives';
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
} from '../../../shared/types/events';
import {
  ConnectionStatus,
  RoomStatus,
  type CharacterClass,
} from '../../../shared/types/entities';

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
  ) {
    // Initialization logging removed for performance
    this.gameResultService = new GameResultService(this.prisma);
  }

  afterInit(_server: Server) {
    // Initialization logging removed for performance
  }
  private readonly abilityCardService = new AbilityCardService();
  private readonly turnOrderService = new TurnOrderService();
  private readonly damageService = new DamageCalculationService();
  private readonly modifierDeckService = new ModifierDeckService();
  private readonly pathfindingService = new PathfindingService();
  private readonly monsterAIService = new MonsterAIService();
  private readonly objectiveEvaluatorService = new ObjectiveEvaluatorService();
  private readonly objectiveContextBuilderService =
    new ObjectiveContextBuilderService();
  private readonly gameResultService: GameResultService;
  private readonly socketToPlayer = new Map<string, string>(); // socketId -> playerUUID
  private readonly playerToSocket = new Map<string, string>(); // playerUUID -> socketId

  // Game state: per-room state
  private readonly modifierDecks = new Map<string, any[]>(); // roomCode -> modifier deck
  private readonly roomMonsters = new Map<string, any[]>(); // roomCode -> monsters array
  private readonly roomTurnOrder = new Map<string, any[]>(); // roomCode -> turn order
  private readonly currentTurnIndex = new Map<string, number>(); // roomCode -> current turn index
  private readonly currentRound = new Map<string, number>(); // roomCode -> current round
  private readonly roomMaps = new Map<string, Map<string, any>>(); // roomCode -> hex map
  private readonly roomScenarios = new Map<string, any>(); // roomCode -> scenario data (Issue #191)
  private readonly roomLootTokens = new Map<string, any[]>(); // roomCode -> loot tokens
  private readonly roomMonsterInitiatives = new Map<
    string,
    Map<string, number>
  >(); // roomCode -> (monsterType -> initiative)

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
   * Build game state payload for an active game
   * Helper method to construct GameStartedPayload with current game state
   */
  private buildGameStatePayload(
    room: any,
    roomCode: string,
  ): GameStartedPayload {
    // Get current scenario and game state
    const monsters = this.roomMonsters.get(roomCode) || [];
    const characters = room.players
      .map((p: any) => characterService.getCharacterByPlayerId(p.uuid))
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
    const charactersWithDecks = characters.map((c: any) => {
      const charData = c.toJSON();

      // Get all cards for this class using CardTemplateCache (efficient)
      const classCards = this.abilityCardService.getCardsByClass(
        charData.characterClass,
      );
      const abilityDeckIds = classCards.map((card) => card.id);

      // Initialize deck piles (all cards start in hand at game start)
      // TODO: Load from database when persistence is implemented
      const hand = abilityDeckIds; // All cards start in hand
      const discardPile: string[] = [];
      const lostPile: string[] = [];

      return {
        id: charData.id,
        playerId: charData.playerId,
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
    });

    // Build game state payload
    // Get objectives for this room
    const objectives = this.roomObjectives.get(roomCode);

    // Get scenario data for background fields (Issue #191)
    const scenario = this.roomScenarios.get(roomCode);

    const gameStartedPayload: GameStartedPayload = {
      scenarioId: room.scenarioId || 'scenario-1',
      scenarioName: scenario?.name || 'Black Barrow',
      mapLayout,
      monsters: monsters.map((m: any) => ({
        id: m.id,
        monsterType: m.monsterType,
        isElite: m.isElite,
        currentHex: m.currentHex,
        health: m.health,
        maxHealth: m.maxHealth,
        conditions: m.conditions,
      })),
      characters: charactersWithDecks,
      objectives: objectives
        ? {
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
            failureConditions: (objectives.failureConditions || []).map(
              (fc) => ({
                id: fc.id,
                description: fc.description,
              }),
            ),
          }
        : undefined,
      // Background image configuration (Issue #191)
      backgroundImageUrl: scenario?.backgroundImageUrl,
      backgroundOpacity: scenario?.backgroundOpacity,
      backgroundOffsetX: scenario?.backgroundOffsetX,
      backgroundOffsetY: scenario?.backgroundOffsetY,
      backgroundScale: scenario?.backgroundScale,
    };

    // Debug logging for background issue
    if (scenario?.backgroundImageUrl) {
      this.logger.log(`🖼️ Background configured: ${scenario.backgroundImageUrl}`);
    } else {
      this.logger.log(`🖼️ No background image for scenario`);
    }

    return gameStartedPayload;
  }

  /**
   * Handle client connection
   */
  handleConnection(_client: Socket): void {
    // Verbose connection log removed
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket): void {
    const playerUUID = this.socketToPlayer.get(client.id);
    if (playerUUID) {
      // Player disconnect handled via events

      // Update player connection status
      try {
        playerService.updateConnectionStatus(
          playerUUID,
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
              playerId: playerUUID,
              nickname: room.getPlayer(playerUUID)?.nickname || 'Unknown',
              willReconnect: true, // Player can reconnect within 10 minutes
            });

            this.logger.log(
              `Session saved for disconnected player ${playerUUID} in room ${room.roomCode}`,
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
      this.playerToSocket.delete(playerUUID);
    }

    // Verbose disconnection log removed
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

      const { roomCode, playerUUID, nickname } = payload;

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

      const isAlreadyInRoom = targetRoom.getPlayer(playerUUID) !== null;
      let room = targetRoom;

      // Check reconnection status
      const roomPlayer = isAlreadyInRoom ? room.getPlayer(playerUUID) : null;
      const isReconnecting =
        roomPlayer &&
        roomPlayer.connectionStatus === ConnectionStatus.DISCONNECTED &&
        isAlreadyInRoom;

      if (!isAlreadyInRoom) {
        // Register player globally if not exists (for user management)
        let globalPlayer = playerService.getPlayerByUuid(playerUUID);
        if (!globalPlayer) {
          globalPlayer = playerService.createPlayer(playerUUID, nickname);
        }

        // Create a new player instance for this room
        // Each room has its own Player instance to track room-specific state
        const newRoomPlayer = Player.create(playerUUID, nickname);

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

      // Associate socket with player
      this.socketToPlayer.set(client.id, playerUUID);
      this.playerToSocket.set(playerUUID, client.id);

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
          id: p.uuid,
          nickname: p.nickname,
          isHost: p.isHost,
          characterClass: p.characterClass || undefined,
        })),
        scenarioId: room.scenarioId || undefined,
      };

      client.emit('room_joined', roomJoinedPayload);

      // Broadcast based on join type (US4 - T153)
      if (isReconnecting && roomPlayer) {
        // Broadcast reconnection to other players
        client.to(roomCode).emit('player_reconnected', {
          playerId: roomPlayer.uuid,
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
          const gameStartedPayload = this.buildGameStatePayload(room, roomCode);

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

          // Also send current turn info if turn order exists
          const turnOrder = this.roomTurnOrder.get(roomCode);
          const currentTurnIdx = this.currentTurnIndex.get(roomCode) || 0;
          if (turnOrder && turnOrder.length > 0) {
            const roundNumber = this.currentRound.get(roomCode) || 1;
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
            this.logger.log(`Sent current turn info to ${nickname}`);
          }

          // Objectives are now sent as part of game_started payload in buildGameStatePayload
          const objectives = this.roomObjectives.get(roomCode);
          if (objectives) {
            this.logger.log(
              `Objectives included in game state for ${nickname} in active room`,
            );
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
        const newlyJoinedPlayer = room.getPlayer(playerUUID);
        if (newlyJoinedPlayer) {
          // Only broadcast new join to other players
          const playerJoinedPayload: PlayerJoinedPayload = {
            playerId: newlyJoinedPlayer.uuid,
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
      const playerUUID = this.socketToPlayer.get(client.id);
      if (!playerUUID) {
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
            `Player ${playerUUID} tried to leave room ${roomCode} but room not found`,
          );
          return;
        }
      } else {
        const roomData = this.getRoomFromSocket(client);
        if (!roomData) {
          this.logger.warn(
            `Player ${playerUUID} tried to leave but is not in any room`,
          );
          return;
        }
        room = roomData.room;
        roomCode = roomData.roomCode;
      }

      // Verbose leaving log removed

      // Remove player from room
      const player = room.players.find((p: Player) => p.uuid === playerUUID);
      const playerName = player?.nickname || 'Unknown';

      roomService.leaveRoom(roomCode, playerUUID);

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
          playerId: playerUUID,
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
        this.roomLootTokens.delete(roomCode);
        this.modifierDecks.delete(roomCode);
        this.roomMonsterInitiatives.delete(roomCode);
        // Phase 2/3: Clean up objective system state
        this.roomObjectives.delete(roomCode);
        this.roomObjectiveProgress.delete(roomCode);
        this.roomAccumulatedStats.delete(roomCode);
        this.roomGameStartTime.delete(roomCode);
        this.roomPlayerStats.delete(roomCode);
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
      const playerUUID = this.socketToPlayer.get(client.id);
      if (!playerUUID) {
        throw new Error('Player not authenticated');
      }

      // Verbose select character log removed

      // Multi-room detection: Check if client is in multiple rooms
      const clientRooms = Array.from(client.rooms).filter(
        (r) => r !== client.id,
      );
      if (clientRooms.length > 1) {
        this.logger.warn(
          `⚠️ Client ${client.id} (player ${playerUUID}) is in multiple rooms: ${clientRooms.join(', ')}. This may cause character selection issues.`,
        );
      }

      // Get room from client's current Socket.IO room (multi-room support)
      const roomData = this.getRoomFromSocket(client);
      if (!roomData) {
        throw new Error('Player not in any room or room not found');
      }

      const { room } = roomData;

      // Get player from room (not global registry)
      const player = room.getPlayer(playerUUID);
      if (!player) {
        throw new Error('Player not found in room');
      }

      // Validate room status
      if (room.status !== RoomStatus.LOBBY) {
        throw new Error('Game has already started');
      }

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
          `Player ${player.nickname} selected persistent character: ${character.name} (${characterClass})`,
        );
      } else if (payload.characterClass) {
        // Legacy: Direct character class selection
        characterClass = payload.characterClass;
        this.logger.log(
          `Player ${player.nickname} selected legacy character class: ${characterClass}`,
        );
      } else {
        throw new Error('Must provide either characterId or characterClass');
      }

      // Check if character class is already taken by another player
      const characterTaken = room.players.some(
        (p: Player) =>
          p.characterClass === characterClass && p.uuid !== playerUUID,
      );

      if (characterTaken) {
        throw new Error('Character class already selected by another player');
      }

      // Select character (store both class and ID)
      player.selectCharacter(characterClass, characterId);

      // Broadcast to all players in room
      const characterSelectedPayload: CharacterSelectedPayload = {
        playerId: player.uuid,
        characterClass: characterClass,
      };

      this.server
        .to(room.roomCode)
        .emit('character_selected', characterSelectedPayload);

      this.logger.log(
        `Player ${player.nickname} successfully selected ${characterClass}${characterId ? ` (ID: ${characterId})` : ''}`,
      );
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
   * Start the game
   */
  @SubscribeMessage('start_game')
  async handleStartGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: StartGamePayload,
  ): Promise<void> {
    try {
      const playerUUID = this.socketToPlayer.get(client.id);
      if (!playerUUID) {
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
      const player = room.getPlayer(playerUUID);
      if (!player) {
        throw new Error('Player not found in room');
      }

      // Verify player is host
      if (!player.isHost) {
        throw new Error('Only the host can start the game');
      }

      // Load scenario data
      const scenario = await this.scenarioService.loadScenario(
        payload.scenarioId,
      );
      if (!scenario) {
        throw new Error(`Scenario not found: ${payload.scenarioId}`);
      }

      // Validate scenario
      const validation = this.scenarioService.validateScenario(scenario);
      if (!validation.valid) {
        throw new Error(`Invalid scenario: ${validation.errors.join(', ')}`);
      }

      // Start the game
      roomService.startGame(room.roomCode, payload.scenarioId, playerUUID);

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
      const playerCount = room.players.filter(
        (p: Player) => p.characterClass,
      ).length;
      const startingPositions = scenario.playerStartPositions[playerCount];
      if (!startingPositions || startingPositions.length < playerCount) {
        throw new Error(`Scenario does not support ${playerCount} players`);
      }

      // Create characters for all players at starting positions
      this.logger.log(
        `🎭 Creating characters for ${room.players.length} players`,
      );
      room.players.forEach((p: Player, idx: number) => {
        this.logger.log(
          `   Player ${idx}: ${p.nickname} - characterClass: ${p.characterClass}`,
        );
      });

      const characters = room.players
        .filter((p: Player) => p.characterClass)
        .map((p: Player, index: number) => {
          const startingPosition = startingPositions[index];
          this.logger.log(`🎭 Creating character for player ${p.nickname}:`, {
            uuid: p.uuid,
            characterClass: p.characterClass,
            startingPosition,
          });
          return characterService.selectCharacter(
            p.uuid,
            p.characterClass as CharacterClass,
            startingPosition,
          );
        });

      this.logger.log(`✅ Created ${characters.length} characters`);

      // Spawn monsters
      const monsters = this.scenarioService.spawnMonsters(
        scenario,
        room.roomCode,
        scenario.difficulty,
      );

      // Initialize attack modifier deck for this room
      const modifierDeck = this.modifierDeckService.initializeStandardDeck();
      this.modifierDecks.set(room.roomCode, modifierDeck);

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

      // Initialize round counter
      this.currentRound.set(room.roomCode, 0);

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
        playerStatsMap.set(p.uuid, {
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
      const charactersWithDecks = characters.map((c: any) => {
        const charData = c.toJSON();
        this.logger.log(`🃏 Loading ability deck for character:`, {
          id: charData.id,
          playerId: charData.playerId,
          characterClass: charData.characterClass,
        });

        // Get ability deck for this character class
        const abilityDeck = this.abilityCardService.getCardsByClass(
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
          classType: charData.characterClass,
          health: charData.currentHealth,
          maxHealth: charData.stats.maxHealth,
          currentHex: charData.position,
          conditions: charData.conditions,
          isExhausted: charData.exhausted,
          abilityDeck, // Include ability deck for card selection
        };
      });

      // Broadcast game started to all players
      // Get objectives that were initialized above
      const objectives = this.roomObjectives.get(room.roomCode);

      const gameStartedPayload: GameStartedPayload = {
        scenarioId: payload.scenarioId,
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
        objectives: objectives
          ? {
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
              failureConditions: (objectives.failureConditions || []).map(
                (fc) => ({
                  id: fc.id,
                  description: fc.description,
                }),
              ),
            }
          : undefined,
        // Background image configuration (Issue #191)
        backgroundImageUrl: scenario.backgroundImageUrl,
        backgroundOpacity: scenario.backgroundOpacity,
        backgroundOffsetX: scenario.backgroundOffsetX,
        backgroundOffsetY: scenario.backgroundOffsetY,
        backgroundScale: scenario.backgroundScale,
      };

      // Send game_started individually to each connected client
      // This ensures all clients (including the host who is already in the room) receive the event
      const roomSockets = await this.server.in(room.roomCode).fetchSockets();
      this.logger.log(
        `Sending game_started to ${roomSockets.length} clients in room ${room.roomCode}`,
      );

      for (const roomSocket of roomSockets) {
        const playerUUID = this.socketToPlayer.get(roomSocket.id);
        const player = room.players.find((p: Player) => p.uuid === playerUUID);
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
      const playerUUID = this.socketToPlayer.get(client.id);
      if (!playerUUID) {
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

      // Get player's character
      const character = characterService.getCharacterByPlayerId(playerUUID);
      if (!character) {
        throw new Error('Character not found');
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

      // Calculate path using pathfinding service
      const path = this.pathfindingService.findPath(
        fromHex,
        payload.targetHex,
        hexMap,
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

      // Get reachable hexes within remaining movement range
      const reachableHexes = this.pathfindingService.getReachableHexes(
        fromHex,
        remainingMovement,
        hexMap,
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

      // Check if target hex is occupied by a monster
      const monsters = this.roomMonsters.get(room.roomCode) || [];
      const isOccupiedByMonster = monsters.some(
        (m: any) =>
          m.currentHex.q === payload.targetHex.q &&
          m.currentHex.r === payload.targetHex.r &&
          !m.isDead,
      );

      if (isOccupiedByMonster) {
        throw new Error('Target hex is occupied by a monster');
      }

      // Check if target hex is occupied by another character
      const allCharacters = room.players
        .map((p: Player) => characterService.getCharacterByPlayerId(p.uuid))
        .filter((c: any) => c !== null && c.id !== character.id && !c.isDead);

      const isOccupiedByCharacter = allCharacters.some(
        (c: any) =>
          c.position.q === payload.targetHex.q &&
          c.position.r === payload.targetHex.r,
      );

      if (isOccupiedByCharacter) {
        throw new Error('Target hex is occupied by another character');
      }

      // Move character
      characterService.moveCharacter(character.id, payload.targetHex);

      // Track cumulative movement distance used this turn
      character.addMovementUsed(moveDistance);

      // Broadcast character moved to all players with calculated path
      const characterMovedPayload: CharacterMovedPayload = {
        characterId: character.id,
        characterName: character.characterClass,
        fromHex,
        toHex: payload.targetHex,
        movementPath: path,
        distance: moveDistance,
      };

      this.server
        .to(room.roomCode)
        .emit('character_moved', characterMovedPayload);

      this.logger.log(
        `Character ${character.id} moved to (${payload.targetHex.q}, ${payload.targetHex.r})`,
      );
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
   */
  @SubscribeMessage('select_cards')
  handleSelectCards(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SelectCardsPayload,
  ): void {
    try {
      const playerUUID = this.socketToPlayer.get(client.id);
      if (!playerUUID) {
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

      // Get player's character
      const character = characterService.getCharacterByPlayerId(playerUUID);
      if (!character) {
        throw new Error('Character not found');
      }

      // Validate cards are in player's hand (belong to character class)
      const validation = this.abilityCardService.validateCardSelection(
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
      if (topCard.topAction?.type === 'attack' && topCard.topAction.value) {
        attackValue = topCard.topAction.value;
        attackRange = topCard.topAction.range ?? 0;
      } else if (
        bottomCard.bottomAction?.type === 'attack' &&
        bottomCard.bottomAction.value
      ) {
        attackValue = bottomCard.bottomAction.value;
        attackRange = bottomCard.bottomAction.range ?? 0;
      } else if (
        topCard.bottomAction?.type === 'attack' &&
        topCard.bottomAction.value
      ) {
        attackValue = topCard.bottomAction.value;
        attackRange = topCard.bottomAction.range ?? 0;
      } else if (
        bottomCard.topAction?.type === 'attack' &&
        bottomCard.topAction.value
      ) {
        attackValue = bottomCard.topAction.value;
        attackRange = bottomCard.topAction.range ?? 0;
      }

      // Set the effective values for this turn
      character.setEffectiveMovement(movementValue);
      character.setEffectiveAttack(attackValue, attackRange);

      this.logger.log(
        `Player ${playerUUID} effective stats for this turn - Movement: ${movementValue}, Attack: ${attackValue}, Range: ${attackRange}`,
      );

      // Broadcast cards selected (hide actual card IDs, only show initiative)
      const cardsSelectedPayload: CardsSelectedPayload = {
        playerId: playerUUID,
        topCardInitiative,
        bottomCardInitiative,
      };

      this.server
        .to(room.roomCode)
        .emit('cards_selected', cardsSelectedPayload);

      this.logger.log(
        `Player ${playerUUID} selected cards (initiative: ${initiative})`,
      );

      // Check if all players have selected cards
      const allCharacters = room.players
        .map((p: Player) => characterService.getCharacterByPlayerId(p.uuid))
        .filter((c: any): c is any => Boolean(c && !c.exhausted));

      const allSelected = allCharacters.every((c: any): c is any =>
        Boolean(c && c.selectedCards !== undefined),
      );

      // If all players selected, determine turn order and broadcast
      if (allSelected) {
        this.startNewRound(room.roomCode);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Select cards error: ${errorMessage}`);
      const errorPayload: ErrorPayload = {
        code: 'SELECT_CARDS_ERROR',
        message: errorMessage,
      };
      client.emit('error', errorPayload);
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

    // Get all characters and monsters
    const characters = room.players
      .map((p: any) => characterService.getCharacterByPlayerId(p.uuid))
      .filter((c: any) => c && !c.exhausted && c.selectedCards);

    // Get monsters from room state
    const monsters = this.roomMonsters.get(roomCode) || [];

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
    ];

    // Determine turn order
    const turnOrder =
      this.turnOrderService.determineTurnOrder(turnOrderEntries);

    // Store turn order and reset turn index
    this.roomTurnOrder.set(roomCode, turnOrder);
    this.currentTurnIndex.set(roomCode, 0);

    // Increment round number
    const roundNumber = (this.currentRound.get(roomCode) || 0) + 1;
    this.currentRound.set(roomCode, roundNumber);

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

      // Also send turn_started for the first entity
      const firstEntity = turnOrder[0];
      const turnStartedPayload: TurnStartedPayload = {
        entityId: firstEntity.entityId,
        entityType: firstEntity.entityType,
        turnIndex: 0,
      };
      this.server.to(roomCode).emit('turn_started', turnStartedPayload);

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
      const playerUUID = this.socketToPlayer.get(client.id);
      if (!playerUUID) {
        throw new Error('Player not authenticated');
      }

      this.logger.log(
        `Attack target request from ${playerUUID} -> ${payload.targetId}`,
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

      // Get attacker's character
      const attacker = characterService.getCharacterByPlayerId(playerUUID);
      if (!attacker) {
        throw new Error('Character not found');
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
        // Try to find as character
        const targetPlayer = room.players.find((p: any) => {
          const char = characterService.getCharacterByPlayerId(p.uuid);
          return char && char.id === payload.targetId;
        });
        if (targetPlayer) {
          target = characterService.getCharacterByPlayerId(targetPlayer.uuid);
        }
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
      const baseAttack = attacker.effectiveAttackThisTurn;

      // Draw attack modifier card
      let modifierDeck = this.modifierDecks.get(room.roomCode);
      if (!modifierDeck || modifierDeck.length === 0) {
        // Reinitialize if empty
        modifierDeck = this.modifierDeckService.initializeStandardDeck();
        this.modifierDecks.set(room.roomCode, modifierDeck);
      }

      const { card: modifierCard, remainingDeck } =
        this.modifierDeckService.drawCard(modifierDeck);
      this.modifierDecks.set(room.roomCode, remainingDeck);

      // Check if reshuffle needed (x2 or null triggers reshuffle)
      if (this.modifierDeckService.checkReshuffle(modifierCard)) {
        const reshuffled = this.modifierDeckService.reshuffleDeck(
          remainingDeck,
          [],
        );
        this.modifierDecks.set(room.roomCode, reshuffled);
      }

      // Calculate damage
      const damage = this.damageService.calculateDamage(
        baseAttack,
        modifierCard,
      );

      // Apply damage to target
      let targetHealth: number;
      let targetDead = false;

      if (isMonsterTarget) {
        target.health = Math.max(0, target.health - damage);
        targetHealth = target.health;
        targetDead = target.health === 0;

        // Phase 3: Track player damage dealt and accumulated stats
        const playerStats = this.roomPlayerStats.get(room.roomCode);
        if (playerStats) {
          const stats = playerStats.get(playerUUID);
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
            const stats = playerStats.get(playerUUID);
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
        }
      } else {
        // Apply damage to character target
        target.takeDamage(damage);
        targetHealth = target.currentHealth;
        targetDead = target.isDead;
      }

      const targetName = isMonsterTarget
        ? target.monsterType
        : target.characterClass;

      // Mark character as having attacked this turn
      attacker.markAttackedThisTurn();

      // Broadcast attack resolution
      const attackResolvedPayload: AttackResolvedPayload = {
        attackerId: attacker.id,
        attackerName: attacker.characterClass,
        targetId: payload.targetId,
        targetName,
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

      this.logger.log(
        `Attack resolved: ${attacker.id} -> ${payload.targetId}, damage: ${damage}, modifier: ${modifierCard.modifier}`,
      );

      // Check scenario completion after attack (in case last monster died)
      if (targetDead && isMonsterTarget) {
        this.checkScenarioCompletion(room.roomCode);
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
      const playerUUID = this.socketToPlayer.get(client.id);
      if (!playerUUID) {
        throw new Error('Player not authenticated');
      }

      this.logger.log(
        `Collect loot request from ${playerUUID} at (${payload.hexCoordinates.q}, ${payload.hexCoordinates.r})`,
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

      // Get player's character
      const character = characterService.getCharacterByPlayerId(playerUUID);
      if (!character) {
        throw new Error('Character not found');
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
        token.collect(playerUUID);
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
        playerId: playerUUID,
        lootTokenId: lootAtPosition[0].id, // Frontend expects single ID
        hexCoordinates: payload.hexCoordinates,
        goldValue: totalGold,
      };

      this.server
        .to(room.roomCode)
        .emit('loot_collected', lootCollectedPayload);

      this.logger.log(
        `Manual collected ${lootAtPosition.length} loot token(s) by ${playerUUID} at (${payload.hexCoordinates.q}, ${payload.hexCoordinates.r}), total value: ${totalGold} gold`,
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
   * End current entity's turn (US2 - T097)
   */
  @SubscribeMessage('end_turn')
  async handleEndTurn(
    @ConnectedSocket() client: Socket,
    @MessageBody() _payload: EndTurnPayload,
  ): Promise<void> {
    try {
      const playerUUID = this.socketToPlayer.get(client.id);
      if (!playerUUID) {
        throw new Error('Player not authenticated');
      }

      this.logger.log(`End turn request from ${playerUUID}`);

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

      // Get player's character
      const character = characterService.getCharacterByPlayerId(playerUUID);
      if (!character) {
        throw new Error('Character not found');
      }

      // Get turn order for this room
      const turnOrder = this.roomTurnOrder.get(room.roomCode);
      if (!turnOrder || turnOrder.length === 0) {
        throw new Error('Turn order not initialized');
      }

      const currentIndex = this.currentTurnIndex.get(room.roomCode) || 0;
      const currentEntity = turnOrder[currentIndex];

      // Verify it's this player's turn
      if (
        currentEntity.entityType === 'character' &&
        currentEntity.entityId !== character.id
      ) {
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
          token.collect(playerUUID);
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
          playerId: playerUUID,
          lootTokenId: collectedTokenIds[0], // Frontend expects single ID, use first
          hexCoordinates: characterPos,
          goldValue: totalGold,
        };

        this.server
          .to(room.roomCode)
          .emit('loot_collected', lootCollectedPayload);

        this.logger.log(
          `Auto-collected ${lootAtPosition.length} loot token(s) by ${playerUUID} at end of turn (${characterPos.q}, ${characterPos.r}), total value: ${totalGold} gold`,
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
      const roundComplete = nextIndex === 0 && currentIndex !== 0;

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
        this.checkScenarioCompletion(room.roomCode);
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
      const playerUUID = this.socketToPlayer.get(client.id);
      if (!playerUUID) {
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

      // Get player's character
      const character = characterService.getCharacterByPlayerId(playerUUID);
      if (!character) {
        throw new Error('Character not found');
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

          // Check if all players have selected cards (or rested), then start round
          const allCharacters = room.players
            .map((p: Player) => characterService.getCharacterByPlayerId(p.uuid))
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
      const playerUUID = this.socketToPlayer.get(client.id);
      if (!playerUUID) {
        throw new Error('Player not authenticated');
      }

      // Get room from client's current Socket.IO room
      const roomData = this.getRoomFromSocket(client);
      if (!roomData) {
        throw new Error('Player not in any room or room not found');
      }

      const { room: _room, roomCode } = roomData;

      // Get player's character
      const character = characterService.getCharacterByPlayerId(playerUUID);
      if (!character) {
        throw new Error('Character not found');
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
  // eslint-disable-next-line @typescript-eslint/require-await
  private async activateMonster(
    monsterId: string,
    roomCode: string,
  ): Promise<void> {
    try {
      this.logger.log(
        `🤖 [MonsterAI] Activating monster ${monsterId} in room ${roomCode}`,
      );

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

      // Get all characters in room and map to expected format
      const characterModels = room.players
        .map((p: any) => characterService.getCharacterByPlayerId(p.uuid))
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

      // Use MonsterAIService to determine focus target
      const focusTargetId = this.monsterAIService.selectFocusTarget(
        monster,
        characters as any,
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

      const focusTargetMapped = characters.find(
        (c: any) => c.id === focusTargetId,
      );
      if (!focusTargetMapped) {
        this.emitDebugLog(
          roomCode,
          'error',
          `Focus target ${focusTargetId} not found in character list`,
          'MonsterAI',
        );
        this.advanceTurnAfterMonsterActivation(roomCode);
        return;
      }

      // Get the original Character model instance for method calls
      const focusTarget = characterModels.find(
        (c: any) => c.id === focusTargetId,
      );
      if (!focusTarget) {
        this.emitDebugLog(
          roomCode,
          'error',
          `Focus target model ${focusTargetId} not found`,
          'MonsterAI',
        );
        this.advanceTurnAfterMonsterActivation(roomCode);
        return;
      }

      this.emitDebugLog(
        roomCode,
        'info',
        `Focus target found: ${focusTargetMapped.classType} at (${focusTargetMapped.currentHex.q}, ${focusTargetMapped.currentHex.r})`,
        'MonsterAI',
      );

      // Get hex map and obstacles for movement calculation
      const hexMap = this.roomMaps.get(roomCode);
      const obstacles: any[] = [];
      if (hexMap) {
        hexMap.forEach((tile: any) => {
          if (tile.terrain === 'obstacle') {
            obstacles.push(tile.coordinates);
          }
        });
      }

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
      const movementHex = this.monsterAIService.determineMovement(
        monster,
        focusTargetMapped as any,
        obstacles,
        occupiedHexes,
      );

      let movementDistance = 0;
      // Apply movement if determined
      if (movementHex && hexMap) {
        const path = this.pathfindingService.findPath(
          originalHex,
          movementHex,
          hexMap,
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

        // Draw attack modifier card
        const modifierDeck = this.modifierDecks.get(roomCode);
        if (!modifierDeck) {
          this.emitDebugLog(
            roomCode,
            'error',
            `Modifier deck not found for room ${roomCode}`,
            'MonsterAI',
          );
          throw new Error(`Modifier deck not found for room ${roomCode}`);
        }

        const modifierDrawResult =
          this.modifierDeckService.drawCard(modifierDeck);
        const modifierCard = modifierDrawResult.card;

        // Update deck after draw
        this.modifierDecks.set(roomCode, modifierDrawResult.remainingDeck);

        // Calculate damage
        const baseDamage = monster.attack;
        const finalDamage = this.damageService.calculateDamage(
          baseDamage,
          modifierCard,
        );

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
          this.emitDebugLog(
            roomCode,
            'warn',
            `Character ${focusTarget.characterClass} was killed`,
            'MonsterAI',
          );
          // Phase 3: Handle character exhaustion from health reaching 0
          this.handleCharacterExhaustion(roomCode, focusTarget, 'health');
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
      const monsterActivatedPayload: MonsterActivatedPayload = {
        monsterId,
        monsterName,
        focusTarget: focusTargetId,
        focusTargetName: focusTarget.characterClass,
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
    const roundComplete = nextIndex === 0 && currentIndex !== 0;

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
    this.checkScenarioCompletion(roomCode);

    // If game completed, don't proceed with new round setup
    if (room.status === RoomStatus.COMPLETED) {
      this.logger.log(
        `Scenario completed at end of round ${currentRoundNumber}, not starting new round`,
      );
      return;
    }

    // Clear selected cards and reset action flags for all characters for new round
    room.players.forEach((p: any) => {
      const char = characterService.getCharacterByPlayerId(p.uuid);
      if (char) {
        char.selectedCards = undefined;
        char.resetActionFlags();
      }
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

    // Notify all players that round ended and to select new cards
    // The next round will start automatically when all players have selected cards (in handleSelectCards)
    this.server.to(roomCode).emit('round_ended', {
      roundNumber: currentRoundNumber,
    });
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
    // Check if scenario has objectives defined
    if (scenario.objectives && scenario.objectives.primary) {
      return scenario.objectives as ScenarioObjectives;
    }

    // Default objectives based on scenario data
    // Primary: Kill all monsters (standard Gloomhaven objective)
    const primaryObjective = {
      id: 'primary-kill-all',
      type: 'kill_all_monsters' as const,
      description: scenario.objectivePrimary || 'Defeat all enemies',
      trackProgress: true,
      milestones: [25, 50, 75, 100],
    };

    // Check for secondary objectives from scenario data
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
      // Mark character as exhausted in the database
      const characterModel = characterService.getCharacterByPlayerId(
        character.playerId,
      );
      if (characterModel) {
        characterModel.exhaust();
        this.logger.log(
          `Character ${character.id} marked as exhausted in database`,
        );
      } else {
        this.logger.error(
          `Could not find character model for player ${character.playerId}`,
        );
      }

      // Emit character exhausted event
      const payload: CharacterExhaustedPayload = {
        characterId: character.id,
        characterName: character.characterClass || character.classType,
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
      this.checkScenarioCompletion(roomCode);
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
  private async checkScenarioCompletion(roomCode: string): Promise<void> {
    try {
      // Get room state
      const room = roomService.getRoom(roomCode);
      if (!room) {
        return;
      }

      // Get all characters in room
      const characters = room.players
        .map((p: any) => characterService.getCharacterByPlayerId(p.uuid))
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

      if (objectives?.primary) {
        primaryResult = this.objectiveEvaluatorService.evaluateObjective(
          objectives.primary,
          context,
        );
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
      } else {
        // Fallback: no objectives defined, use legacy check (all monsters dead)
        const allMonstersDead = monsters.every((m: any) => m.isDead);
        primaryComplete = allMonstersDead && monsters.length > 0;
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
      const isVictory = primaryComplete && !isDefeat;
      const isComplete = isDefeat || isVictory;

      if (!isComplete) {
        // Scenario still in progress
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
        const stats = playerStatsMap?.get(p.uuid);
        return {
          playerId: p.uuid,
          damageDealt: stats?.damageDealt || 0,
          damageTaken: stats?.damageTaken || 0,
          monstersKilled: stats?.monstersKilled || 0,
          cardsLost: stats?.cardsLost || 0,
        };
      });

      // Build scenario completed payload
      const scenarioCompletedPayload: ScenarioCompletedPayload = {
        victory: isVictory,
        experience: totalExperience,
        loot: Array.from(lootByPlayer.entries()).map(([playerId, data]) => ({
          playerId,
          gold: data.gold,
          items: data.items,
        })),
        completionTime,
        primaryObjectiveCompleted: primaryComplete,
        secondaryObjectivesCompleted: completedSecondaryIds,
        objectiveProgress,
        playerStats,
      };

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

      // Phase 4-5: Save game result to database
      try {
        // Calculate total loot and gold
        const totalLootCollected = lootTokens.filter(
          (t: any) => t.isCollected,
        ).length;
        const totalGold = Array.from(lootByPlayer.values()).reduce(
          (sum, data) => sum + data.gold,
          0,
        );

        // Build player results for database
        const playerResults = room.players.map((p: any) => {
          const stats = playerStatsMap?.get(p.uuid);
          const loot = lootByPlayer.get(p.uuid);
          const character = characterService.getCharacterByPlayerId(p.uuid);

          // Calculate experience for this player
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

          return {
            userId: p.uuid,
            characterId: character?.id || p.uuid,
            characterClass: p.characterClass || 'Unknown',
            characterName: p.nickname,
            survived: !character?.exhausted,
            wasExhausted: character?.exhausted || false,
            damageDealt: stats?.damageDealt || 0,
            damageTaken: stats?.damageTaken || 0,
            monstersKilled: stats?.monstersKilled || 0,
            lootCollected: loot
              ? lootTokens.filter((t: any) => t.collectedBy === p.uuid).length
              : 0,
            cardsLost: stats?.cardsLost || 0,
            experienceGained: Math.floor(playerExperience),
            goldGained: loot?.gold || 0,
          };
        });

        // Save to database
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
        // Don't throw - game completion should still succeed even if DB save fails
      }
    } catch (error) {
      this.logger.error(
        `Check scenario completion error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
