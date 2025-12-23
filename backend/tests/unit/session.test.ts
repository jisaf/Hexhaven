/**
 * Session Service Unit Tests (US4 - T148)
 *
 * Tests session persistence, restoration, and expiration logic
 */

import { sessionService } from '../../src/services/session.service';
import { roomService } from '../../src/services/room.service';
import { playerService } from '../../src/services/player.service';
import { RoomStatus, ConnectionStatus } from '../../../shared/types/entities';

describe('SessionService', () => {
  beforeEach(() => {
    // Clear all state before each test
    sessionService.clearAllSessions();
    roomService.clearAllRooms();
    playerService.clearAllPlayers();
  });

  describe('saveSession', () => {
    it('should save game room session', () => {
      const player = playerService.createPlayer(
        'uuid-player1',
        'TestPlayer',
      );
      const room = roomService.createRoom(player);

      sessionService.saveSession(room);

      const restored = sessionService.restoreSession(room.id);
      expect(restored).not.toBeNull();
      expect(restored?.roomCode).toBe(room.roomCode);
      expect(restored?.status).toBe(room.status);
    });

    it('should save player data in session', () => {
      const player = playerService.createPlayer(
        'uuid-player1',
        'TestPlayer',
      );
      const room = roomService.createRoom(player);

      sessionService.saveSession(room);

      const restored = sessionService.restoreSession(room.id);
      expect(restored?.players).toHaveLength(1);
      expect(restored?.players[0].uuid).toBe('uuid-player1');
      expect(restored?.players[0].nickname).toBe('TestPlayer');
    });

    it('should update session on subsequent saves', () => {
      const player = playerService.createPlayer(
        'uuid-player1',
        'TestPlayer',
      );
      const room = roomService.createRoom(player);

      sessionService.saveSession(room);
      const firstSave = sessionService.restoreSession(room.id);

      // Simulate time passing
      setTimeout(() => {
        sessionService.saveSession(room);
        const secondSave = sessionService.restoreSession(room.id);

        expect(secondSave?.lastUpdated.getTime()).toBeGreaterThanOrEqual(
          firstSave?.lastUpdated.getTime() || 0,
        );
      }, 10);
    });
  });

  describe('restoreSession', () => {
    it('should restore saved session by room ID', () => {
      const player = playerService.createPlayer(
        'uuid-player1',
        'TestPlayer',
      );
      const room = roomService.createRoom(player);

      sessionService.saveSession(room);
      const restored = sessionService.restoreSession(room.id);

      expect(restored).not.toBeNull();
      expect(restored?.roomId).toBe(room.id);
      expect(restored?.roomCode).toBe(room.roomCode);
    });

    it('should return null for non-existent session', () => {
      const restored = sessionService.restoreSession('non-existent-id');
      expect(restored).toBeNull();
    });

    it('should return null for expired session (24-hour TTL)', () => {
      const player = playerService.createPlayer(
        'uuid-player1',
        'TestPlayer',
      );
      const room = roomService.createRoom(player);

      sessionService.saveSession(room);

      // Set session to 25 hours ago using test helper
      sessionService._setSessionTimestamp(
        room.id,
        new Date(Date.now() - 25 * 60 * 60 * 1000),
      );

      const restored = sessionService.restoreSession(room.id);
      expect(restored).toBeNull();
    });
  });

  describe('findSessionByUserId', () => {
    it('should find session containing user ID', () => {
      const player = playerService.createPlayer(
        'user-id-1',
        'TestPlayer',
      );
      const room = roomService.createRoom(player);

      sessionService.saveSession(room);

      const found = sessionService.findSessionByUserId('user-id-1');
      expect(found).not.toBeNull();
      expect(found?.roomCode).toBe(room.roomCode);
    });

    it('should return null if user not in any session', () => {
      const found = sessionService.findSessionByUserId('non-existent-user-id');
      expect(found).toBeNull();
    });

    it('should return null if user session expired', () => {
      const player = playerService.createPlayer(
        'user-id-1',
        'TestPlayer',
      );
      const room = roomService.createRoom(player);

      sessionService.saveSession(room);

      // Set session to 25 hours ago using test helper
      sessionService._setSessionTimestamp(
        room.id,
        new Date(Date.now() - 25 * 60 * 60 * 1000),
      );

      const found = sessionService.findSessionByUserId('user-id-1');
      expect(found).toBeNull();
    });
  });

  describe('deleteSession', () => {
    it('should delete session by room ID', () => {
      const player = playerService.createPlayer(
        'uuid-player1',
        'TestPlayer',
      );
      const room = roomService.createRoom(player);

      sessionService.saveSession(room);
      sessionService.deleteSession(room.id);

      const restored = sessionService.restoreSession(room.id);
      expect(restored).toBeNull();
    });

    it('should handle deleting non-existent session gracefully', () => {
      expect(() => {
        sessionService.deleteSession('non-existent-id');
      }).not.toThrow();
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should remove sessions older than 24 hours', () => {
      const player = playerService.createPlayer(
        'uuid-player1',
        'TestPlayer',
      );
      const room = roomService.createRoom(player);

      sessionService.saveSession(room);

      // Set session to 25 hours ago using test helper
      sessionService._setSessionTimestamp(
        room.id,
        new Date(Date.now() - 25 * 60 * 60 * 1000),
      );

      const cleaned = sessionService.cleanupExpiredSessions();
      expect(cleaned).toBe(1);

      const restored = sessionService.restoreSession(room.id);
      expect(restored).toBeNull();
    });

    it('should not remove sessions within 24 hours', () => {
      const player = playerService.createPlayer(
        'uuid-player1',
        'TestPlayer',
      );
      const room = roomService.createRoom(player);

      sessionService.saveSession(room);

      const cleaned = sessionService.cleanupExpiredSessions();
      expect(cleaned).toBe(0);

      const restored = sessionService.restoreSession(room.id);
      expect(restored).not.toBeNull();
    });

    it('should return count of cleaned sessions', () => {
      // Create multiple expired sessions
      const rooms: string[] = [];
      for (let i = 0; i < 3; i++) {
        const player = playerService.createPlayer(
          `uuid-player${i}`,
          `Player${i}`,
        );
        const room = roomService.createRoom(player);
        sessionService.saveSession(room);
        rooms.push(room.id);
      }

      // Expire all sessions using test helper
      rooms.forEach((roomId) => {
        sessionService._setSessionTimestamp(
          roomId,
          new Date(Date.now() - 25 * 60 * 60 * 1000),
        );
      });

      const cleaned = sessionService.cleanupExpiredSessions();
      expect(cleaned).toBe(3);
    });
  });

  describe('getActiveSessions', () => {
    it('should return count of active sessions', () => {
      expect(sessionService.getActiveSessions()).toBe(0);

      const player1 = playerService.createPlayer(
        'uuid-player1',
        'Player1',
      );
      const room1 = roomService.createRoom(player1);
      sessionService.saveSession(room1);

      expect(sessionService.getActiveSessions()).toBe(1);

      const player2 = playerService.createPlayer(
        'uuid-player2',
        'Player2',
      );
      const room2 = roomService.createRoom(player2);
      sessionService.saveSession(room2);

      expect(sessionService.getActiveSessions()).toBe(2);
    });
  });

  describe('clearAllSessions', () => {
    it('should remove all sessions', () => {
      const player = playerService.createPlayer(
        'uuid-player1',
        'TestPlayer',
      );
      const room = roomService.createRoom(player);

      sessionService.saveSession(room);
      expect(sessionService.getActiveSessions()).toBe(1);

      sessionService.clearAllSessions();
      expect(sessionService.getActiveSessions()).toBe(0);
    });
  });

  describe('Session Persistence Integration', () => {
    it('should persist session across room updates', () => {
      const player = playerService.createPlayer(
        'uuid-player1',
        'TestPlayer',
      );
      const room = roomService.createRoom(player);

      // Save initial state
      sessionService.saveSession(room);

      // Simulate room update (add player)
      const player2 = playerService.createPlayer(
        'uuid-player2',
        'Player2',
      );
      roomService.joinRoom(room.roomCode, player2);

      // Save updated state
      sessionService.saveSession(room);

      // Restore and verify
      const restored = sessionService.restoreSession(room.id);
      expect(restored?.players).toHaveLength(2);
    });

    it('should enable reconnection after player disconnect', () => {
      const player = playerService.createPlayer(
        'user-id-1',
        'TestPlayer',
      );
      const room = roomService.createRoom(player);

      // Save session
      sessionService.saveSession(room);

      // Simulate player disconnect (would happen in gateway)
      playerService.updateConnectionStatus('user-id-1', ConnectionStatus.DISCONNECTED);
      sessionService.saveSession(room);

      // Restore session for reconnection
      const restored = sessionService.findSessionByUserId('user-id-1');
      expect(restored).not.toBeNull();
      expect(restored?.players[0].connectionStatus).toBe('disconnected');
    });
  });
});
