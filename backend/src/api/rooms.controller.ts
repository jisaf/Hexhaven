/**
 * Rooms Controller (US1 - T052, T053)
 *
 * REST API endpoints for game room creation and retrieval.
 * Non-real-time operations; real-time operations use WebSocket (game.gateway.ts).
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { roomService } from '../services/room.service';
import { playerService } from '../services/player.service';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from '../utils/error-handler';
import { RoomStatus } from '../../../shared/types/entities';

interface CreateRoomRequest {
  uuid: string;
  nickname: string;
}

interface CreateRoomResponse {
  room: {
    id: string;
    roomCode: string;
    status: string;
    createdAt: string;
    expiresAt: string;
  };
  player: {
    id: string;
    uuid: string;
    nickname: string;
    isHost: boolean;
    connectionStatus: string;
  };
}

interface GetRoomResponse {
  room: {
    id: string;
    roomCode: string;
    status: string;
    scenarioId?: string;
    createdAt: string;
    updatedAt: string;
    expiresAt: string;
    playerCount: number;
  };
  players: {
    id: string;
    uuid: string;
    nickname: string;
    isHost: boolean;
    characterClass?: string;
    connectionStatus: string;
  }[];
}

interface ListRoomsResponse {
  rooms: {
    roomCode: string;
    status: string;
    playerCount: number;
    maxPlayers: number;
    hostNickname: string;
    createdAt: string;
  }[];
}

@Controller('api/rooms')
export class RoomsController {
  /**
   * POST /api/rooms
   * Create a new game room
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createRoom(@Body() body: CreateRoomRequest): CreateRoomResponse {
    try {
      const { uuid, nickname } = body;

      // Validate input
      if (!uuid || !nickname) {
        throw new ValidationError('UUID and nickname are required');
      }

      // Validate nickname format
      const trimmedNickname = nickname.trim();
      if (trimmedNickname.length === 0 || trimmedNickname.length > 50) {
        throw new ValidationError(
          'Nickname must be between 1 and 50 characters',
        );
      }

      // Check if player already exists
      let player = playerService.getPlayerByUuid(uuid);

      // Create or get player
      // Note: Players can now create multiple rooms
      if (!player) {
        player = playerService.createPlayer(uuid, trimmedNickname);
      }

      // Create a new player instance for this room
      // Each room has its own Player instance to track room-specific state
      const roomPlayer = playerService.createPlayer(uuid, trimmedNickname);

      // Create room with player as host
      const room = roomService.createRoom(roomPlayer);

      return {
        room: {
          id: room.id,
          roomCode: room.roomCode,
          status: room.status,
          createdAt: room.createdAt.toISOString(),
          expiresAt: room.expiresAt.toISOString(),
        },
        player: {
          id: roomPlayer.id,
          uuid: roomPlayer.uuid,
          nickname: roomPlayer.nickname,
          isHost: roomPlayer.isHost,
          connectionStatus: roomPlayer.connectionStatus,
        },
      };
    } catch (error: any) {
      if (error instanceof ValidationError) {
        throw new HttpException(
          {
            error: 'VALIDATION_ERROR',
            message: error.message,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (error instanceof ConflictError) {
        throw new HttpException(
          {
            error: 'ALREADY_IN_ROOM',
            message: error.message,
          },
          HttpStatus.CONFLICT,
        );
      }

      throw new HttpException(
        {
          error: 'INTERNAL_ERROR',
          message: 'Failed to create room',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/rooms/my-rooms/:playerUuid
   * Get all rooms for a player by their UUID (multi-room support)
   */
  @Get('my-rooms/:playerUuid')
  getMyRooms(@Param('playerUuid') playerUuid: string): {
    rooms: GetRoomResponse[];
  } {
    try {
      // Find all rooms by player UUID
      const rooms = roomService.getRoomsByPlayerId(playerUuid);

      return {
        rooms: rooms.map((room) => ({
          room: {
            id: room.id,
            roomCode: room.roomCode,
            status: room.status,
            scenarioId: room.scenarioId || undefined,
            createdAt: room.createdAt.toISOString(),
            updatedAt: room.updatedAt.toISOString(),
            expiresAt: room.expiresAt.toISOString(),
            playerCount: room.playerCount,
          },
          players: room.players.map((player) => ({
            id: player.id,
            uuid: player.uuid,
            nickname: player.nickname,
            isHost: player.isHost,
            characterClass: player.characterClass || undefined,
            connectionStatus: player.connectionStatus,
          })),
        })),
      };
    } catch {
      throw new HttpException(
        {
          error: 'INTERNAL_ERROR',
          message: 'Failed to retrieve player rooms',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/rooms/my-room/:playerUuid
   * Get the current room for a player by their UUID
   * @deprecated Use my-rooms endpoint for multi-room support
   */
  @Get('my-room/:playerUuid')
  getMyRoom(
    @Param('playerUuid') playerUuid: string,
  ): GetRoomResponse | { room: null } {
    try {
      // Find room by player UUID
      const room = roomService.getRoomByPlayerId(playerUuid);

      if (!room) {
        return { room: null };
      }

      return {
        room: {
          id: room.id,
          roomCode: room.roomCode,
          status: room.status,
          scenarioId: room.scenarioId || undefined,
          createdAt: room.createdAt.toISOString(),
          updatedAt: room.updatedAt.toISOString(),
          expiresAt: room.expiresAt.toISOString(),
          playerCount: room.playerCount,
        },
        players: room.players.map((player) => ({
          id: player.id,
          uuid: player.uuid,
          nickname: player.nickname,
          isHost: player.isHost,
          characterClass: player.characterClass || undefined,
          connectionStatus: player.connectionStatus,
        })),
      };
    } catch {
      throw new HttpException(
        {
          error: 'INTERNAL_ERROR',
          message: 'Failed to retrieve player room',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/rooms/:roomCode
   * Get game room details by room code
   * NOTE: This must come BEFORE the @Get() route due to NestJS route matching order
   */
  @Get(':roomCode')
  getRoomByCode(@Param('roomCode') roomCode: string): GetRoomResponse {
    try {
      // Validate room code format
      if (!roomCode || roomCode.length !== 6) {
        throw new ValidationError('Invalid room code format');
      }

      const upperRoomCode = roomCode.toUpperCase();

      // Get room
      const room = roomService.getRoom(upperRoomCode);

      if (!room) {
        throw new NotFoundError(
          `Game room with code ${upperRoomCode} not found`,
        );
      }

      return {
        room: {
          id: room.id,
          roomCode: room.roomCode,
          status: room.status,
          scenarioId: room.scenarioId || undefined,
          createdAt: room.createdAt.toISOString(),
          updatedAt: room.updatedAt.toISOString(),
          expiresAt: room.expiresAt.toISOString(),
          playerCount: room.playerCount,
        },
        players: room.players.map((player) => ({
          id: player.id,
          uuid: player.uuid,
          nickname: player.nickname,
          isHost: player.isHost,
          characterClass: player.characterClass || undefined,
          connectionStatus: player.connectionStatus,
        })),
      };
    } catch (error: any) {
      if (error instanceof ValidationError) {
        throw new HttpException(
          {
            error: 'VALIDATION_ERROR',
            message: error.message,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (error instanceof NotFoundError) {
        throw new HttpException(
          {
            error: 'ROOM_NOT_FOUND',
            message: error.message,
          },
          HttpStatus.NOT_FOUND,
        );
      }

      throw new HttpException(
        {
          error: 'INTERNAL_ERROR',
          message: 'Failed to retrieve room',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/rooms
   * List all active/joinable game rooms
   * NOTE: This must come AFTER the @Get(':roomCode') route due to NestJS route matching order
   */
  @Get()
  listRooms(): ListRoomsResponse {
    try {
      const allRooms = roomService.getAllRooms();

      // Filter for joinable rooms (in lobby status and not full)
      const joinableRooms = allRooms
        .filter((room) => room.status === RoomStatus.LOBBY && !room.isFull)
        .map((room) => ({
          roomCode: room.roomCode,
          status: room.status,
          playerCount: room.playerCount,
          maxPlayers: 4, // Max players constant
          hostNickname: room.hostPlayer?.nickname || 'Unknown',
          createdAt: room.createdAt.toISOString(),
        }))
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ); // Sort by newest first

      return {
        rooms: joinableRooms,
      };
    } catch {
      throw new HttpException(
        {
          error: 'INTERNAL_ERROR',
          message: 'Failed to list rooms',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
