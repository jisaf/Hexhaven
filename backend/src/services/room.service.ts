/**
 * Room Service (US1 - T048)
 *
 * Manages game room lifecycle: creation, joining, leaving, and retrieval.
 * Provides in-memory storage for MVP (will be replaced with database later).
 */

import { GameRoom } from '../models/game-room.model';
import { Player } from '../models/player.model';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from '../utils/error-handler';
import { RoomStatus } from '../../../shared/types/entities';

export class RoomService {
  private rooms: Map<string, GameRoom> = new Map();
  private roomCodeIndex: Map<string, string> = new Map(); // roomCode -> roomId

  /**
   * Create a new game room with a host player
   */
  createRoom(hostPlayer: Player): GameRoom {
    // Generate unique room code
    let roomCode: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      roomCode = GameRoom.generateRoomCode();
      attempts++;

      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique room code');
      }
    } while (this.roomCodeIndex.has(roomCode));

    // Create room with host
    const room = GameRoom.create(hostPlayer);

    // Store room
    this.rooms.set(room.id, room);
    this.roomCodeIndex.set(room.roomCode, room.id);

    return room;
  }

  /**
   * Get room by room code
   */
  getRoom(roomCode: string): GameRoom | null {
    if (!GameRoom.isValidRoomCode(roomCode)) {
      throw new ValidationError('Invalid room code format');
    }

    const roomId = this.roomCodeIndex.get(roomCode);
    if (!roomId) {
      return null;
    }

    return this.rooms.get(roomId) || null;
  }

  /**
   * Get room by ID
   */
  getRoomById(roomId: string): GameRoom | null {
    return this.rooms.get(roomId) || null;
  }

  /**
   * Join an existing room
   */
  joinRoom(roomCode: string, player: Player): GameRoom {
    const room = this.getRoom(roomCode);

    if (!room) {
      throw new NotFoundError('Room not found');
    }

    if (room.isFull) {
      throw new ConflictError('Room is full');
    }

    if (room.status !== RoomStatus.LOBBY) {
      throw new ConflictError('Game has already started');
    }

    // Check for duplicate nickname
    const existingPlayer = room.players.find(
      (p) => p.nickname.toLowerCase() === player.nickname.toLowerCase(),
    );

    if (existingPlayer) {
      throw new ConflictError('Nickname already taken in this room');
    }

    // Add player to room
    player.joinRoom(room.id, false);
    room.addPlayer(player);

    return room;
  }

  /**
   * Remove player from room
   */
  leaveRoom(roomCode: string, playerUuid: string): GameRoom | null {
    const room = this.getRoom(roomCode);

    if (!room) {
      throw new NotFoundError('Room not found');
    }

    const removedPlayer = room.removePlayer(playerUuid);

    if (removedPlayer) {
      removedPlayer.leaveRoom();
    }

    // If room is empty, delete it
    if (room.playerCount === 0) {
      this.rooms.delete(room.id);
      this.roomCodeIndex.delete(room.roomCode);
      return null;
    }

    return room;
  }

  /**
   * Find room containing a specific player
   */
  getRoomByPlayerId(playerUuid: string): GameRoom | null {
    for (const room of this.rooms.values()) {
      if (room.getPlayer(playerUuid)) {
        return room;
      }
    }
    return null;
  }

  /**
   * Start a game in a room
   */
  startGame(
    roomCode: string,
    scenarioId: string,
    requestingPlayerUuid: string,
  ): GameRoom {
    const room = this.getRoom(roomCode);

    if (!room) {
      throw new NotFoundError('Room not found');
    }

    // Verify requester is host
    const requestingPlayer = room.getPlayer(requestingPlayerUuid);
    if (!requestingPlayer || !requestingPlayer.isHost) {
      throw new ValidationError('Only the host can start the game');
    }

    // Verify room is ready
    if (!room.isStartable) {
      throw new ValidationError(
        'All players must select characters before starting',
      );
    }

    room.startGame(scenarioId);

    return room;
  }

  /**
   * Get all active rooms (for debugging/admin)
   */
  getAllRooms(): GameRoom[] {
    return Array.from(this.rooms.values());
  }

  /**
   * Delete a room (for cleanup/admin)
   */
  deleteRoom(roomCode: string): void {
    const roomId = this.roomCodeIndex.get(roomCode);
    if (roomId) {
      this.rooms.delete(roomId);
      this.roomCodeIndex.delete(roomCode);
    }
  }

  /**
   * Clear all rooms (for testing)
   */
  clearAllRooms(): void {
    this.rooms.clear();
    this.roomCodeIndex.clear();
  }
}

// Singleton instance
export const roomService = new RoomService();
