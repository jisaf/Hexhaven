/**
 * Integration Test: 24-Hour Session Persistence (US4 - T146)
 *
 * Tests the full session persistence flow across game room lifecycle.
 * Note: Most session persistence logic is covered by unit tests in
 * backend/tests/unit/session.test.ts. This integration test focuses on
 * the end-to-end flow across multiple services.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { RoomService } from '../../src/services/room.service';
import { PlayerService } from '../../src/services/player.service';
import { sessionService } from '../../src/services/session.service';
import { RoomStatus, ConnectionStatus } from '../../../shared/types/entities';

describe('Session Persistence Integration (US4 - T146)', () => {
  let roomService: RoomService;
  let playerService: PlayerService;

  beforeEach(() => {
    roomService = new RoomService();
    playerService = new PlayerService();
    sessionService.clearAllSessions();
    roomService.clearAllRooms();
  });

  afterEach(() => {
    sessionService.clearAllSessions();
    roomService.clearAllRooms();
  });

  it('should persist and restore full game session across disconnect/reconnect cycle', () => {
    // Create room with 2 players
    const host = playerService.createPlayer('uuid-host', 'HostPlayer');
    const room = roomService.createRoom(host);
    const player2 = playerService.createPlayer('uuid-player2', 'Player2');
    roomService.joinRoom(room.roomCode, player2);

    // Initial state
    expect(room.players).toHaveLength(2);
    expect(room.status).toBe(RoomStatus.LOBBY);

    // Save session
    sessionService.saveSession(room);

    // Verify session saved
    let savedSession = sessionService.restoreSession(room.id);
    expect(savedSession).not.toBeNull();
    expect(savedSession?.players).toHaveLength(2);
    expect(savedSession?.roomCode).toBe(room.roomCode);

    // Simulate player 2 disconnect
    playerService.updateConnectionStatus('uuid-player2', ConnectionStatus.DISCONNECTED);
    sessionService.saveSession(room);

    // Verify disconnected player in session
    savedSession = sessionService.restoreSession(room.id);
    expect(savedSession?.players.find((p) => p.uuid === 'uuid-player2')?.connectionStatus).toBe(ConnectionStatus.DISCONNECTED);

    // Should be able to find session by disconnected player's UUID
    const foundSession = sessionService.findSessionByPlayerUuid('uuid-player2');
    expect(foundSession).not.toBeNull();
    expect(foundSession?.roomCode).toBe(room.roomCode);

    // Simulate player 2 reconnect
    playerService.updateConnectionStatus('uuid-player2', ConnectionStatus.CONNECTED);
    sessionService.saveSession(room);

    // Verify reconnected player in session
    savedSession = sessionService.restoreSession(room.id);
    expect(savedSession?.players.find((p) => p.uuid === 'uuid-player2')?.connectionStatus).toBe(ConnectionStatus.CONNECTED);
  });

  it('should maintain session for 24 hours and clean up expired sessions', () => {
    // Create 3 rooms
    const room1 = roomService.createRoom(playerService.createPlayer('uuid1', 'Player1'));
    const room2 = roomService.createRoom(playerService.createPlayer('uuid2', 'Player2'));
    const room3 = roomService.createRoom(playerService.createPlayer('uuid3', 'Player3'));

    // Save all sessions
    sessionService.saveSession(room1);
    sessionService.saveSession(room2);
    sessionService.saveSession(room3);

    expect(sessionService.getActiveSessions()).toBe(3);

    // Expire rooms 1 and 2 (25 hours ago)
    const expired = new Date(Date.now() - 25 * 60 * 60 * 1000);
    sessionService._setSessionTimestamp(room1.id, expired);
    sessionService._setSessionTimestamp(room2.id, expired);

    // Room 3 is fresh (1 hour ago)
    const recent = new Date(Date.now() - 1 * 60 * 60 * 1000);
    sessionService._setSessionTimestamp(room3.id, recent);

    // Cleanup expired sessions
    const cleanedCount = sessionService.cleanupExpiredSessions();

    expect(cleanedCount).toBe(2);
    expect(sessionService.getActiveSessions()).toBe(1);

    // Verify room 3 still exists
    const room3Session = sessionService.restoreSession(room3.id);
    expect(room3Session).not.toBeNull();
    expect(room3Session?.roomCode).toBe(room3.roomCode);
  });
});
