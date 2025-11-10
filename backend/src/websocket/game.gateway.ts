/**
 * Game Gateway (US1 - T051)
 *
 * WebSocket gateway for real-time game communication using Socket.io.
 * Handles room management, character selection, game start, and player actions.
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { roomService } from '../services/room.service';
import { playerService } from '../services/player.service';
import { characterService } from '../services/character.service';
import type {
  JoinRoomPayload,
  SelectCharacterPayload,
  StartGamePayload,
  MoveCharacterPayload,
  RoomJoinedPayload,
  PlayerJoinedPayload,
  CharacterSelectedPayload,
  GameStartedPayload,
  CharacterMovedPayload,
  ErrorPayload,
} from '../../../shared/types/events';
import {
  ConnectionStatus,
  RoomStatus,
  type CharacterClass,
} from '../../../shared/types/entities';

@WebSocketGateway({
  cors: {
    origin: '*', // Configure based on environment
    credentials: true,
  },
  namespace: '/game',
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(GameGateway.name);
  private readonly socketToPlayer = new Map<string, string>(); // socketId -> playerUUID
  private readonly playerToSocket = new Map<string, string>(); // playerUUID -> socketId

  /**
   * Handle client connection
   */
  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket): void {
    const playerUUID = this.socketToPlayer.get(client.id);
    if (playerUUID) {
      this.logger.log(`Player disconnected: ${playerUUID}`);

      // Update player connection status
      try {
        playerService.updateConnectionStatus(
          playerUUID,
          ConnectionStatus.DISCONNECTED,
        );

        // Find player's room and broadcast disconnection
        const room = roomService.getRoomByPlayerId(playerUUID);
        if (room) {
          this.server.to(room.roomCode).emit('player_disconnected', {
            playerId: playerUUID,
            nickname: room.getPlayer(playerUUID)?.nickname || 'Unknown',
          });
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

    this.logger.log(`Client disconnected: ${client.id}`);
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
      this.logger.log(`Join room request: ${JSON.stringify(payload)}`);

      const { roomCode, playerUUID, nickname } = payload;

      // Get or create player
      let player = playerService.getPlayerByUuid(playerUUID);
      if (!player) {
        player = playerService.createPlayer(playerUUID, nickname);
      }

      // Join room
      const room = roomService.joinRoom(roomCode, player);

      // Associate socket with player
      this.socketToPlayer.set(client.id, playerUUID);
      this.playerToSocket.set(playerUUID, client.id);

      // Join Socket.io room
      await client.join(roomCode);

      // Send success response to joining player
      const roomJoinedPayload: RoomJoinedPayload = {
        roomId: room.id,
        roomCode: room.roomCode,
        players: room.players.map((p) => ({
          id: p.uuid,
          nickname: p.nickname,
          isHost: p.isHost,
          characterClass: p.characterClass || undefined,
        })),
        scenarioId: room.scenarioId || undefined,
      };

      client.emit('room_joined', roomJoinedPayload);

      // Broadcast to other players in room
      const playerJoinedPayload: PlayerJoinedPayload = {
        playerId: player.uuid,
        nickname: player.nickname,
        isHost: player.isHost,
      };

      client.to(roomCode).emit('player_joined', playerJoinedPayload);

      this.logger.log(`Player ${nickname} joined room ${roomCode}`);
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
   * Select character class
   */
  @SubscribeMessage('select_character')
  handleSelectCharacter(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SelectCharacterPayload,
  ): void {
    try {
      const playerUUID = this.socketToPlayer.get(client.id);
      if (!playerUUID) {
        throw new Error('Player not authenticated');
      }

      this.logger.log(
        `Select character request from ${playerUUID}: ${payload.characterClass}`,
      );

      const player = playerService.getPlayerByUuid(playerUUID);
      if (!player) {
        throw new Error('Player not found');
      }

      // Find player's room
      const room = roomService.getRoomByPlayerId(playerUUID);
      if (!room) {
        throw new Error('Player not in a room');
      }

      // Validate room status
      if (room.status !== RoomStatus.LOBBY) {
        throw new Error('Game has already started');
      }

      // Check if character class is already taken
      const characterTaken = room.players.some(
        (p) =>
          p.characterClass === payload.characterClass && p.uuid !== playerUUID,
      );

      if (characterTaken) {
        throw new Error('Character class already selected by another player');
      }

      // Select character
      player.selectCharacter(payload.characterClass);

      // Broadcast to all players in room
      const characterSelectedPayload: CharacterSelectedPayload = {
        playerId: player.uuid,
        characterClass: payload.characterClass,
      };

      this.server
        .to(room.roomCode)
        .emit('character_selected', characterSelectedPayload);

      this.logger.log(
        `Player ${player.nickname} selected ${payload.characterClass}`,
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
  handleStartGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: StartGamePayload,
  ): void {
    try {
      const playerUUID = this.socketToPlayer.get(client.id);
      if (!playerUUID) {
        throw new Error('Player not authenticated');
      }

      this.logger.log(`Start game request from ${playerUUID}`);

      const player = playerService.getPlayerByUuid(playerUUID);
      if (!player) {
        throw new Error('Player not found');
      }

      // Find player's room
      const room = roomService.getRoomByPlayerId(playerUUID);
      if (!room) {
        throw new Error('Player not in a room');
      }

      // Verify player is host
      if (!player.isHost) {
        throw new Error('Only the host can start the game');
      }

      // Start the game
      roomService.startGame(room.roomCode, payload.scenarioId, playerUUID);

      // Create characters for all players at starting positions
      // TODO: Load scenario data to get starting positions
      const startingPosition = { q: 0, r: 0 }; // Default position

      const characters = room.players
        .filter((p) => p.characterClass)
        .map((p) => {
          return characterService.selectCharacter(
            p.uuid,
            p.characterClass as CharacterClass,
            startingPosition,
          );
        });

      // Broadcast game started to all players
      const gameStartedPayload: GameStartedPayload = {
        scenarioId: payload.scenarioId,
        scenarioName: 'Scenario Name', // TODO: Load from scenario data
        mapLayout: [], // TODO: Load from scenario data
        monsters: [], // TODO: Load from scenario data
        characters: characters.map((c) => c.toJSON()),
      };

      this.server.to(room.roomCode).emit('game_started', gameStartedPayload);

      this.logger.log(`Game started in room ${room.roomCode}`);
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

      this.logger.log(`Move character request from ${playerUUID}`);

      // Get player's character
      const character = characterService.getCharacterByPlayerId(playerUUID);
      if (!character) {
        throw new Error('Character not found');
      }

      // Find player's room
      const room = roomService.getRoomByPlayerId(playerUUID);
      if (!room) {
        throw new Error('Player not in a room');
      }

      // Validate game is active
      if (room.status !== RoomStatus.ACTIVE) {
        throw new Error('Game is not active');
      }

      // TODO: Add validation for:
      // - Is it player's turn?
      // - Is target hex within movement range?
      // - Is target hex occupied?
      // - Is target hex an obstacle?

      // Store previous position
      const fromHex = character.position;

      // Move character
      characterService.moveCharacter(character.id, payload.targetHex);

      // Broadcast character moved to all players
      const characterMovedPayload: CharacterMovedPayload = {
        characterId: character.id,
        fromHex,
        toHex: payload.targetHex,
        movementPath: [fromHex, payload.targetHex], // TODO: Calculate actual path
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
}
