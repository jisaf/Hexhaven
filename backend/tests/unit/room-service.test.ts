/**
 * Unit Test: Room Service (US1 - T043)
 *
 * Tests room code generation and room management:
 * - Room code generation (unique 6-character alphanumeric)
 * - Room creation with host player
 * - Room code uniqueness enforcement
 * - Room capacity validation (4 players max)
 * - Room state management
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { RoomService } from '../../src/services/room.service';
import { Player } from '../../src/models/player.model';
import { GameRoom } from '../../src/models/game-room.model';
import { RoomStatus, ConnectionStatus, CharacterClass } from '../../../shared/types/entities';

describe('RoomService', () => {
  let roomService: RoomService;

  beforeEach(() => {
    roomService = new RoomService();
  });

  afterEach(() => {
    // Clean up all rooms after each test
    roomService.clearAllRooms();
  });

  // Helper to create a test player
  function createTestPlayer(uuid: string, nickname: string): Player {
    return Player.create(uuid, nickname);
  }

  describe('generateRoomCode', () => {
    it('should generate a 6-character alphanumeric code', () => {
      const roomCode = GameRoom.generateRoomCode();

      expect(roomCode).toHaveLength(6);
      expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('should generate unique room codes', () => {
      const codes = new Set<string>();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const code = GameRoom.generateRoomCode();
        codes.add(code);
      }

      // Most codes should be unique (allowing for rare collisions)
      expect(codes.size).toBeGreaterThan(iterations * 0.99);
    });

    it('should only use uppercase letters and numbers', () => {
      const roomCode = GameRoom.generateRoomCode();

      // Should not contain lowercase letters
      expect(roomCode).not.toMatch(/[a-z]/);

      // Should not contain special characters
      expect(roomCode).not.toMatch(/[^A-Z0-9]/);
    });

    it('should avoid ambiguous characters (0/O, 1/I)', () => {
      // Generate multiple codes and verify none contain ambiguous chars
      const ambiguousChars = ['0', 'O', '1', 'I'];
      const codes: string[] = [];

      for (let i = 0; i < 100; i++) {
        codes.push(GameRoom.generateRoomCode());
      }

      codes.forEach((code) => {
        ambiguousChars.forEach((char) => {
          expect(code).not.toContain(char);
        });
      });
    });
  });

  describe('createRoom', () => {
    it('should create a room with generated code', () => {
      const hostPlayer = createTestPlayer('host-uuid', 'Host Player');
      const room = roomService.createRoom(hostPlayer);

      expect(room).toHaveProperty('id');
      expect(room).toHaveProperty('roomCode');
      expect(room.roomCode).toMatch(/^[A-Z0-9]{6}$/);
      expect(room.status).toBe(RoomStatus.LOBBY);
      expect(room.players).toHaveLength(1);
      expect(room.players[0].isHost).toBe(true);
    });

    it('should set host player as first player', () => {
      const hostPlayer = createTestPlayer('host-uuid', 'Host');
      const room = roomService.createRoom(hostPlayer);

      expect(room.players[0].uuid).toBe(hostPlayer.uuid);
      expect(room.players[0].nickname).toBe(hostPlayer.nickname);
      expect(room.players[0].isHost).toBe(true);
    });

    it('should initialize room in lobby status', () => {
      const hostPlayer = createTestPlayer('host-uuid', 'Host');
      const room = roomService.createRoom(hostPlayer);

      expect(room.status).toBe(RoomStatus.LOBBY);
      expect(room.scenarioId).toBeNull();
      expect(room.currentRound).toBeNull();
      expect(room.currentTurnIndex).toBeNull();
    });

    it('should persist room to in-memory storage', () => {
      const hostPlayer = createTestPlayer('host-uuid', 'Host');
      const room = roomService.createRoom(hostPlayer);

      // Verify room can be retrieved
      const retrievedRoom = roomService.getRoom(room.roomCode);
      expect(retrievedRoom).toBeDefined();
      expect(retrievedRoom?.roomCode).toBe(room.roomCode);
      expect(retrievedRoom?.id).toBe(room.id);
    });

    it('should generate unique room codes for multiple rooms', () => {
      const player1 = createTestPlayer('uuid1', 'Player1');
      const player2 = createTestPlayer('uuid2', 'Player2');
      const player3 = createTestPlayer('uuid3', 'Player3');

      const room1 = roomService.createRoom(player1);
      const room2 = roomService.createRoom(player2);
      const room3 = roomService.createRoom(player3);

      expect(room1.roomCode).not.toBe(room2.roomCode);
      expect(room1.roomCode).not.toBe(room3.roomCode);
      expect(room2.roomCode).not.toBe(room3.roomCode);
    });
  });

  describe('getRoom', () => {
    it('should return room by room code', () => {
      const hostPlayer = createTestPlayer('host-uuid', 'Host');
      const created = roomService.createRoom(hostPlayer);
      const retrieved = roomService.getRoom(created.roomCode);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.roomCode).toBe(created.roomCode);
    });

    it('should return null for non-existent room code', () => {
      const room = roomService.getRoom('ABC123');
      expect(room).toBeNull();
    });

    it('should throw ValidationError for invalid room code format', () => {
      expect(() => roomService.getRoom('invalid')).toThrow('Invalid room code format');
      expect(() => roomService.getRoom('abc123')).toThrow('Invalid room code format'); // lowercase
      expect(() => roomService.getRoom('12345')).toThrow('Invalid room code format'); // too short
    });

    it('should return room with all players', () => {
      const hostPlayer = createTestPlayer('host', 'Host');
      const created = roomService.createRoom(hostPlayer);

      const player2 = createTestPlayer('player2', 'Player 2');
      roomService.joinRoom(created.roomCode, player2);

      const retrieved = roomService.getRoom(created.roomCode);
      expect(retrieved?.players).toHaveLength(2);
    });
  });

  describe('joinRoom', () => {
    it('should add player to existing room', () => {
      const hostPlayer = createTestPlayer('host', 'Host');
      const room = roomService.createRoom(hostPlayer);

      const joiningPlayer = createTestPlayer('player2', 'Player 2');
      const updatedRoom = roomService.joinRoom(room.roomCode, joiningPlayer);

      expect(updatedRoom.players).toHaveLength(2);
      expect(updatedRoom.players[1].uuid).toBe(joiningPlayer.uuid);
      expect(updatedRoom.players[1].isHost).toBe(false);
    });

    it('should throw error when room is full (4 players)', () => {
      const hostPlayer = createTestPlayer('host', 'Host');
      const room = roomService.createRoom(hostPlayer);

      // Add 3 more players (total 4)
      roomService.joinRoom(room.roomCode, createTestPlayer('p2', 'P2'));
      roomService.joinRoom(room.roomCode, createTestPlayer('p3', 'P3'));
      roomService.joinRoom(room.roomCode, createTestPlayer('p4', 'P4'));

      // Try to add 5th player
      expect(() => {
        roomService.joinRoom(room.roomCode, createTestPlayer('p5', 'P5'));
      }).toThrow('Room is full');
    });

    it('should throw error for non-existent room', () => {
      const player = createTestPlayer('player', 'Player');

      expect(() => {
        roomService.joinRoom('NOROOM', player);
      }).toThrow('Room not found');
    });

    it('should prevent duplicate nicknames in same room', () => {
      const hostPlayer = createTestPlayer('host-uuid', 'Host');
      const room = roomService.createRoom(hostPlayer);

      const duplicateNickname = createTestPlayer('different-uuid', 'Host');

      expect(() => {
        roomService.joinRoom(room.roomCode, duplicateNickname);
      }).toThrow('Nickname already taken in this room');
    });

    it('should prevent joining game that has already started', () => {
      const hostPlayer = createTestPlayer('host', 'Host');
      hostPlayer.selectCharacter(CharacterClass.BRUTE);

      const room = roomService.createRoom(hostPlayer);

      const player2 = createTestPlayer('p2', 'Player2');
      player2.selectCharacter(CharacterClass.TINKERER);
      roomService.joinRoom(room.roomCode, player2);

      // Start game
      roomService.startGame(room.roomCode, 'scenario-id', hostPlayer.uuid);

      // Try to join
      expect(() => {
        roomService.joinRoom(room.roomCode, createTestPlayer('late', 'Late'));
      }).toThrow('Game has already started');
    });

    it('should allow case-insensitive nickname matching', () => {
      const hostPlayer = createTestPlayer('host', 'Host');
      const room = roomService.createRoom(hostPlayer);

      // Try to join with same nickname in different case
      const duplicateNickname = createTestPlayer('uuid2', 'host'); // lowercase

      expect(() => {
        roomService.joinRoom(room.roomCode, duplicateNickname);
      }).toThrow('Nickname already taken in this room');
    });
  });

  describe('leaveRoom', () => {
    it('should remove player from room', () => {
      const hostPlayer = createTestPlayer('host', 'Host');
      const room = roomService.createRoom(hostPlayer);

      const player = createTestPlayer('player2', 'Player 2');
      roomService.joinRoom(room.roomCode, player);

      roomService.leaveRoom(room.roomCode, player.uuid);

      const updatedRoom = roomService.getRoom(room.roomCode);
      expect(updatedRoom?.players).toHaveLength(1);
      expect(updatedRoom?.getPlayer(player.uuid)).toBeNull();
    });

    it('should delete room when last player leaves', () => {
      const hostPlayer = createTestPlayer('host', 'Host');
      const room = roomService.createRoom(hostPlayer);

      const result = roomService.leaveRoom(room.roomCode, hostPlayer.uuid);
      expect(result).toBeNull();

      const deletedRoom = roomService.getRoom(room.roomCode);
      expect(deletedRoom).toBeNull();
    });

    it('should transfer host when host leaves', () => {
      const hostPlayer = createTestPlayer('host', 'Host');
      const room = roomService.createRoom(hostPlayer);

      const player2 = createTestPlayer('player2', 'Player 2');
      roomService.joinRoom(room.roomCode, player2);

      roomService.leaveRoom(room.roomCode, hostPlayer.uuid);

      const updatedRoom = roomService.getRoom(room.roomCode);
      expect(updatedRoom?.players[0].uuid).toBe(player2.uuid);
      expect(updatedRoom?.players[0].isHost).toBe(true);
    });

    it('should throw error for non-existent room', () => {
      expect(() => {
        roomService.leaveRoom('NOROOM', 'player-uuid');
      }).toThrow('Room not found');
    });

    it('should return room if players remain after someone leaves', () => {
      const hostPlayer = createTestPlayer('host', 'Host');
      const room = roomService.createRoom(hostPlayer);

      const player2 = createTestPlayer('p2', 'Player2');
      const player3 = createTestPlayer('p3', 'Player3');

      roomService.joinRoom(room.roomCode, player2);
      roomService.joinRoom(room.roomCode, player3);

      const result = roomService.leaveRoom(room.roomCode, player2.uuid);

      expect(result).not.toBeNull();
      expect(result?.players).toHaveLength(2);
    });
  });

  describe('getRoomByPlayerId', () => {
    it('should find room containing specific player', () => {
      const hostPlayer = createTestPlayer('host', 'Host');
      const room = roomService.createRoom(hostPlayer);

      const foundRoom = roomService.getRoomByPlayerId(hostPlayer.uuid);

      expect(foundRoom).toBeDefined();
      expect(foundRoom?.id).toBe(room.id);
    });

    it('should return null if player not in any room', () => {
      const room = roomService.getRoomByPlayerId('non-existent-player');
      expect(room).toBeNull();
    });

    it('should find correct room when multiple rooms exist', () => {
      const player1 = createTestPlayer('p1', 'Player1');
      const player2 = createTestPlayer('p2', 'Player2');
      const player3 = createTestPlayer('p3', 'Player3');

      const room1 = roomService.createRoom(player1);
      const room2 = roomService.createRoom(player2);

      roomService.joinRoom(room1.roomCode, player3);

      const foundRoom = roomService.getRoomByPlayerId(player3.uuid);
      expect(foundRoom?.id).toBe(room1.id);
    });
  });

  describe('startGame', () => {
    it('should start game when host requests and all players ready', () => {
      const hostPlayer = createTestPlayer('host', 'Host');
      hostPlayer.selectCharacter(CharacterClass.BRUTE);

      const room = roomService.createRoom(hostPlayer);

      const player2 = createTestPlayer('p2', 'Player2');
      player2.selectCharacter(CharacterClass.TINKERER);
      roomService.joinRoom(room.roomCode, player2);

      const updatedRoom = roomService.startGame(room.roomCode, 'scenario-1', hostPlayer.uuid);

      expect(updatedRoom.status).toBe(RoomStatus.ACTIVE);
      expect(updatedRoom.scenarioId).toBe('scenario-1');
      expect(updatedRoom.currentRound).toBe(1);
    });

    it('should throw error if non-host tries to start game', () => {
      const hostPlayer = createTestPlayer('host', 'Host');
      hostPlayer.selectCharacter(CharacterClass.BRUTE);

      const room = roomService.createRoom(hostPlayer);

      const player2 = createTestPlayer('p2', 'Player2');
      player2.selectCharacter(CharacterClass.TINKERER);
      roomService.joinRoom(room.roomCode, player2);

      expect(() => {
        roomService.startGame(room.roomCode, 'scenario-1', player2.uuid);
      }).toThrow('Only the host can start the game');
    });

    it('should throw error if not all players have selected characters', () => {
      const hostPlayer = createTestPlayer('host', 'Host');
      hostPlayer.selectCharacter(CharacterClass.BRUTE);

      const room = roomService.createRoom(hostPlayer);

      const player2 = createTestPlayer('p2', 'Player2');
      // Player2 doesn't select character
      roomService.joinRoom(room.roomCode, player2);

      expect(() => {
        roomService.startGame(room.roomCode, 'scenario-1', hostPlayer.uuid);
      }).toThrow('All players must select characters before starting');
    });

    it('should throw error for non-existent room', () => {
      expect(() => {
        roomService.startGame('NOROOM', 'scenario-1', 'host-uuid');
      }).toThrow('Room not found');
    });
  });

  describe('getAllRooms', () => {
    it('should return all active rooms', () => {
      const player1 = createTestPlayer('p1', 'Player1');
      const player2 = createTestPlayer('p2', 'Player2');
      const player3 = createTestPlayer('p3', 'Player3');

      roomService.createRoom(player1);
      roomService.createRoom(player2);
      roomService.createRoom(player3);

      const rooms = roomService.getAllRooms();
      expect(rooms).toHaveLength(3);
    });

    it('should return empty array when no rooms exist', () => {
      const rooms = roomService.getAllRooms();
      expect(rooms).toHaveLength(0);
    });
  });

  describe('deleteRoom', () => {
    it('should delete room by room code', () => {
      const hostPlayer = createTestPlayer('host', 'Host');
      const room = roomService.createRoom(hostPlayer);

      roomService.deleteRoom(room.roomCode);

      const deletedRoom = roomService.getRoom(room.roomCode);
      expect(deletedRoom).toBeNull();
    });

    it('should handle deleting non-existent room gracefully', () => {
      expect(() => {
        roomService.deleteRoom('NOROOM');
      }).not.toThrow();
    });
  });

  describe('clearAllRooms', () => {
    it('should remove all rooms', () => {
      const player1 = createTestPlayer('p1', 'Player1');
      const player2 = createTestPlayer('p2', 'Player2');

      roomService.createRoom(player1);
      roomService.createRoom(player2);

      roomService.clearAllRooms();

      const rooms = roomService.getAllRooms();
      expect(rooms).toHaveLength(0);
    });
  });
});
