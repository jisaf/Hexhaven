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
        throw new ValidationError('Nickname must be between 1 and 50 characters');
      }

      // Check if player already exists
      let player = playerService.getPlayerByUuid(uuid);

      // Check if player is already in a room
      if (player && player.roomId) {
        const existingRoom = roomService.getRoomById(player.roomId);
        if (existingRoom && (existingRoom.status === 'lobby' || existingRoom.status === 'active')) {
          throw new ConflictError('Player is already in an active game room');
        }
      }

      // Create or get player
      if (!player) {
        player = playerService.createPlayer(uuid, trimmedNickname);
      }

      // Create room with player as host
      const room = roomService.createRoom(player);

      return {
        room: {
          id: room.id,
          roomCode: room.roomCode,
          status: room.status,
          createdAt: room.createdAt.toISOString(),
          expiresAt: room.expiresAt.toISOString(),
        },
        player: {
          id: player.id,
          uuid: player.uuid,
          nickname: player.nickname,
          isHost: player.isHost,
          connectionStatus: player.connectionStatus,
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
   * GET /api/rooms/:roomCode
   * Get game room details by room code
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
        throw new NotFoundError(`Game room with code ${upperRoomCode} not found`);
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
}
