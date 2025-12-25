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
import { Player } from '../models/player.model';
import { NotFoundError, ValidationError, ConflictError } from '../types/errors';
import { RoomStatus } from '../../../shared/types/entities';

interface CreateRoomRequest {
  userId: string; // Database user ID from JWT
  nickname: string;
  campaignId?: string;
  scenarioId?: string;
}

interface CreateRoomResponse {
  room: {
    id: string;
    roomCode: string;
    status: string;
    campaignId?: string;
    scenarioId?: string;
    createdAt: string;
    expiresAt: string;
  };
  player: {
    id: string;
    userId: string; // Database user ID
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
    campaignId?: string; // Issue #318 - Campaign context
    scenarioId?: string;
    createdAt: string;
    updatedAt: string;
    expiresAt: string;
    playerCount: number;
  };
  players: {
    id: string;
    userId: string; // Database user ID
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
      const { userId, nickname, campaignId, scenarioId } = body;

      // Validate input
      if (!userId || !nickname) {
        throw new ValidationError('User ID and nickname are required');
      }

      // Validate nickname format
      const trimmedNickname = nickname.trim();
      if (trimmedNickname.length === 0 || trimmedNickname.length > 50) {
        throw new ValidationError(
          'Nickname must be between 1 and 50 characters',
        );
      }

      // Check if player already exists in global registry
      let player = playerService.getPlayerByUserId(userId);

      // Register player globally if not exists (for user management)
      if (!player) {
        player = playerService.createPlayer(userId, trimmedNickname);
      }

      // Create a new player instance for this room
      // Each room has its own Player instance to track room-specific state
      // Use Player.create() directly to avoid global registry conflicts
      const roomPlayer = Player.create(userId, trimmedNickname);

      // Create room with player as host (with optional campaign context)
      const room = roomService.createRoom(roomPlayer, {
        campaignId,
        scenarioId,
      });

      return {
        room: {
          id: room.id,
          roomCode: room.roomCode,
          status: room.status,
          campaignId: room.campaignId || undefined,
          scenarioId: room.scenarioId || undefined,
          createdAt: room.createdAt.toISOString(),
          expiresAt: room.expiresAt.toISOString(),
        },
        player: {
          id: roomPlayer.id,
          userId: roomPlayer.userId,
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
   * GET /api/rooms/my-rooms/:userId
   * Get all rooms for a player by their database user ID (multi-room support)
   * @param userId - Database user ID (from JWT authentication)
   */
  @Get('my-rooms/:userId')
  getMyRooms(@Param('userId') userId: string): {
    rooms: GetRoomResponse[];
  } {
    try {
      // Find all rooms by user ID
      const rooms = roomService.getRoomsByPlayerId(userId);

      return {
        rooms: rooms.map((room) => ({
          room: {
            id: room.id,
            roomCode: room.roomCode,
            status: room.status,
            campaignId: room.campaignId || undefined,
            scenarioId: room.scenarioId || undefined,
            createdAt: room.createdAt.toISOString(),
            updatedAt: room.updatedAt.toISOString(),
            expiresAt: room.expiresAt.toISOString(),
            playerCount: room.playerCount,
          },
          players: room.players.map((player) => ({
            id: player.id,
            userId: player.userId,
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
   * GET /api/rooms/my-room/:userId
   * Get the current room for a player by their database user ID
   * @deprecated Since v1.0.0 - Use /my-rooms/:userId endpoint for multi-room support.
   *             This endpoint will be removed in v2.0.0.
   * @param userId - Database user ID (from JWT authentication)
   */
  @Get('my-room/:userId')
  getMyRoom(@Param('userId') userId: string): GetRoomResponse | { room: null } {
    try {
      // Find room by user ID
      const room = roomService.getRoomByPlayerId(userId);

      if (!room) {
        return { room: null };
      }

      return {
        room: {
          id: room.id,
          roomCode: room.roomCode,
          status: room.status,
          campaignId: room.campaignId || undefined,
          scenarioId: room.scenarioId || undefined,
          createdAt: room.createdAt.toISOString(),
          updatedAt: room.updatedAt.toISOString(),
          expiresAt: room.expiresAt.toISOString(),
          playerCount: room.playerCount,
        },
        players: room.players.map((player) => ({
          id: player.id,
          userId: player.userId,
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
          campaignId: room.campaignId || undefined,
          scenarioId: room.scenarioId || undefined,
          createdAt: room.createdAt.toISOString(),
          updatedAt: room.updatedAt.toISOString(),
          expiresAt: room.expiresAt.toISOString(),
          playerCount: room.playerCount,
        },
        players: room.players.map((player) => ({
          id: player.id,
          userId: player.userId,
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
