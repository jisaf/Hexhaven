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
  ) {
    // Initialization logging removed for performance
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
  private readonly socketToPlayer = new Map<string, string>(); // socketId -> playerUUID
  private readonly playerToSocket = new Map<string, string>(); // playerUUID -> socketId

  // Game state: per-room state
  private readonly modifierDecks = new Map<string, any[]>(); // roomCode -> modifier deck
  private readonly roomMonsters = new Map<string, any[]>(); // roomCode -> monsters array
  private readonly roomTurnOrder = new Map<string, any[]>(); // roomCode -> turn order
  private readonly currentTurnIndex = new Map<string, number>(); // roomCode -> current turn index
  private readonly currentRound = new Map<string, number>(); // roomCode -> current round
  private readonly roomMaps = new Map<string, Map<string, any>>(); // roomCode -> hex map
  private readonly roomLootTokens = new Map<string, any[]>(); // roomCode -> loot tokens
  private readonly roomMonsterInitiatives = new Map<
    string,
    Map<string, number>
  >(); // roomCode -> (monsterType -> initiative)

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

    // Load ability decks for all characters
    const charactersWithDecks = characters.map((c: any) => {
      const charData = c.toJSON();
      const abilityDeck = this.abilityCardService.getCardsByClass(
        charData.characterClass,
      );
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

    // Build game state payload
    const gameStartedPayload: GameStartedPayload = {
      scenarioId: room.scenarioId || 'scenario-1',
      scenarioName: 'Black Barrow', // TODO: Get from scenario
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
    };

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
      roomService.leaveRoom(roomCode, playerUUID);

      // Leave socket room
      client.leave(roomCode);

      // Remove from socket mapping
      this.socketToPlayer.delete(client.id);

      // Notify other players in the room
      if (player) {
        client.to(roomCode).emit('player_left', {
          playerId: playerUUID,
          nickname: player.nickname,
        });
      }

      // Clean up game state if needed
      const updatedRoom = roomService.getRoom(roomCode);
      if (!updatedRoom || updatedRoom.players.length === 0) {
        // Room is empty, clean up all game state
        this.roomMaps.delete(roomCode);
        this.roomMonsters.delete(roomCode);
        this.roomTurnOrder.delete(roomCode);
        this.currentTurnIndex.delete(roomCode);
        this.roomLootTokens.delete(roomCode);
        this.logger.log(`Room ${roomCode} is empty, cleaning up`);

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

      // Initialize empty loot tokens array for this room
      this.roomLootTokens.set(room.roomCode, []);

      // Initialize round counter
      this.currentRound.set(room.roomCode, 0);

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

      // Gloomhaven rule: You can move before OR after attacking, but you cannot split your movement
      // Once you've used your move action, you cannot move again (even if you have movement left)
      if (character.hasMovedThisTurn) {
        throw new Error(
          'Character has already used their move action this turn. You cannot split movement.',
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
        if (targetDead) {
          target.isDead = true;

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

          // Remove monster from game state after it dies
          const updatedMonsters = monsters.filter(
            (m: any) => m.id !== target.id,
          );
          this.roomMonsters.set(room.roomCode, updatedMonsters);
          this.logger.log(`Monster ${target.id} removed from game state.`);
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

      // Add all other monster positions (excluding current monster)
      monsters.forEach((m: any) => {
        if (m.id !== monsterId && m.currentHex) {
          occupiedHexes.push(m.currentHex);
        }
      });

      this.emitDebugLog(
        roomCode,
        'info',
        `Found ${occupiedHexes.length} occupied hexes (characters + other monsters)`,
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
          // In real implementation, would handle character death/exhaustion
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
   * TODO (Should-Have - Week 7-8): Add scenario objective checking at end of round
   * - Check win/loss conditions (e.g., all monsters defeated, treasure looted, turns elapsed)
   * - Emit scenario_completed event if objectives met
   * - Reference: PRD Advanced Features (Week 7-8)
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

    // TODO (Should-Have - Week 7-8): Check scenario objectives before emitting round_ended
    // Example objective checks:
    // - All monsters defeated → emit scenario_completed with victory: true
    // - All characters exhausted → emit scenario_completed with victory: false
    // - Specific treasure looted → check loot tokens collected
    // - Turn limit exceeded → check currentRoundNumber vs scenario.maxRounds
    // this.checkScenarioObjectives(roomCode);

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

  /**
   * Check scenario completion and broadcast if complete (US2 - T100)
   */
  private checkScenarioCompletion(roomCode: string): void {
    try {
      // Get room state
      const room = roomService.getRoom(roomCode);
      if (!room) {
        return;
      }

      // Get all characters in room
      // Note: CharacterService returns Character class, but ScenarioService expects Character interface
      // For now, we cast to any to bypass type checking
      const characters = room.players
        .map((p: any) => characterService.getCharacterByPlayerId(p.uuid))
        .filter((c) => c !== null) as any[];

      // Get all monsters in room
      const monsters = this.roomMonsters.get(roomCode) || [];

      // Use ScenarioService to check completion
      // Note: We don't have the actual scenario object here, so we pass null
      // In full implementation, would store scenario per room
      const completion = this.scenarioService.checkScenarioCompletion(
        characters,
        monsters,
        null as any, // Placeholder for scenario
      );

      // If scenario is complete, broadcast result
      if (completion.isComplete) {
        const scenarioCompletedPayload: ScenarioCompletedPayload = {
          victory: completion.victory,
          experience: completion.victory ? 10 : 0,
          loot: [], // Would calculate from collected loot tokens
          completionTime: 0, // Would calculate from start time
        };

        this.server
          .to(roomCode)
          .emit('scenario_completed', scenarioCompletedPayload);

        this.logger.log(
          `Scenario completed in room ${roomCode}: ${completion.reason}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Check scenario completion error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
