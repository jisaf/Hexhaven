/**
 * Contract Test: WebSocket join_room Event (US1 - T039)
 *
 * Tests the contract for join_room WebSocket event:
 * - Client sends join_room with roomCode, playerUUID, nickname
 * - Server validates payload
 * - Server emits room_joined to client
 * - Server broadcasts player_joined to other clients in room
 * - Server emits error for invalid data
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { io, type Socket as ClientSocket } from 'socket.io-client';
import type { JoinRoomPayload, RoomJoinedPayload, PlayerJoinedPayload, ErrorPayload } from '../../../shared/types/events';

describe('WebSocket Contract: join_room event', () => {
  let clientSocket: ClientSocket;
  let client2Socket: ClientSocket;
  const testPort = 3001; // Use different port for testing
  const serverUrl = `http://localhost:${testPort}`;

  beforeEach((done) => {
    // Create client sockets
    clientSocket = io(serverUrl, {
      autoConnect: false,
      transports: ['websocket'],
    });

    client2Socket = io(serverUrl, {
      autoConnect: false,
      transports: ['websocket'],
    });

    // Connect both clients
    clientSocket.connect();
    client2Socket.connect();

    // Wait for both to connect
    let connectedCount = 0;
    const onConnect = () => {
      connectedCount++;
      if (connectedCount === 2) {
        done();
      }
    };

    clientSocket.on('connect', onConnect);
    client2Socket.on('connect', onConnect);
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
    if (client2Socket.connected) {
      client2Socket.disconnect();
    }
  });

  it('should emit room_joined when joining with valid payload', (done) => {
    const joinPayload: JoinRoomPayload = {
      roomCode: 'TEST01',
      playerUUID: 'player-uuid-001',
      nickname: 'Test Player',
    };

    clientSocket.on('room_joined', (payload: RoomJoinedPayload) => {
      // Verify payload structure
      expect(payload).toHaveProperty('roomId');
      expect(payload).toHaveProperty('roomCode');
      expect(payload).toHaveProperty('players');
      expect(payload).toHaveProperty('scenarioId');

      // Verify payload values
      expect(payload.roomCode).toBe(joinPayload.roomCode);
      expect(Array.isArray(payload.players)).toBe(true);
      expect(payload.players.length).toBeGreaterThan(0);

      // Verify player structure
      const player = payload.players[0];
      expect(player).toHaveProperty('id');
      expect(player).toHaveProperty('nickname');
      expect(player).toHaveProperty('isHost');
      expect(player).toHaveProperty('characterClass');

      expect(player.nickname).toBe(joinPayload.nickname);

      done();
    });

    clientSocket.emit('join_room', joinPayload);
  });

  it('should broadcast player_joined to other clients in room', (done) => {
    const hostPayload: JoinRoomPayload = {
      roomCode: 'TEST02',
      playerUUID: 'host-uuid',
      nickname: 'Host Player',
    };

    const joinPayload: JoinRoomPayload = {
      roomCode: 'TEST02',
      playerUUID: 'player-uuid-002',
      nickname: 'Joining Player',
    };

    // Host joins first
    clientSocket.on('room_joined', () => {
      // Setup listener for player_joined broadcast
      clientSocket.on('player_joined', (payload: PlayerJoinedPayload) => {
        // Verify payload structure
        expect(payload).toHaveProperty('playerId');
        expect(payload).toHaveProperty('nickname');
        expect(payload).toHaveProperty('isHost');

        // Verify payload values
        expect(payload.nickname).toBe(joinPayload.nickname);
        expect(payload.isHost).toBe(false);

        done();
      });

      // Second player joins
      client2Socket.emit('join_room', joinPayload);
    });

    clientSocket.emit('join_room', hostPayload);
  });

  it('should emit error for invalid room code', (done) => {
    const invalidPayload: JoinRoomPayload = {
      roomCode: 'INVALID',
      playerUUID: 'player-uuid-003',
      nickname: 'Test Player',
    };

    clientSocket.on('error', (payload: ErrorPayload) => {
      // Verify error payload structure
      expect(payload).toHaveProperty('code');
      expect(payload).toHaveProperty('message');
      expect(payload).toHaveProperty('details');

      // Verify error values
      expect(payload.code).toBe('ROOM_NOT_FOUND');
      expect(payload.message).toContain('Room not found');

      done();
    });

    clientSocket.emit('join_room', invalidPayload);
  });

  it('should emit error when room is full (4 players max)', (done) => {
    const roomCode = 'FULL01';

    // Helper to create join payload
    const createPayload = (index: number): JoinRoomPayload => ({
      roomCode,
      playerUUID: `player-uuid-${index}`,
      nickname: `Player ${index}`,
    });

    // Create 3 additional clients (total 4 with existing 2)
    const client3Socket = io(serverUrl, { transports: ['websocket'] });
    const client4Socket = io(serverUrl, { transports: ['websocket'] });

    // Join 4 players
    let joinedCount = 0;
    const checkJoined = () => {
      joinedCount++;
      if (joinedCount === 4) {
        // Try to join 5th player
        const fifthSocket = io(serverUrl, { transports: ['websocket'] });

        fifthSocket.on('error', (payload: ErrorPayload) => {
          expect(payload.code).toBe('ROOM_FULL');
          expect(payload.message).toContain('Room is full');

          // Cleanup
          client3Socket.disconnect();
          client4Socket.disconnect();
          fifthSocket.disconnect();

          done();
        });

        fifthSocket.emit('join_room', createPayload(5));
      }
    };

    clientSocket.on('room_joined', checkJoined);
    client2Socket.on('room_joined', checkJoined);
    client3Socket.on('room_joined', checkJoined);
    client4Socket.on('room_joined', checkJoined);

    // Emit joins
    clientSocket.emit('join_room', createPayload(1));
    client2Socket.emit('join_room', createPayload(2));
    client3Socket.emit('join_room', createPayload(3));
    client4Socket.emit('join_room', createPayload(4));
  });

  it('should emit error for duplicate nickname in same room', (done) => {
    const roomCode = 'DUP01';

    const firstPayload: JoinRoomPayload = {
      roomCode,
      playerUUID: 'player-uuid-004',
      nickname: 'Duplicate Name',
    };

    const duplicatePayload: JoinRoomPayload = {
      roomCode,
      playerUUID: 'player-uuid-005',
      nickname: 'Duplicate Name', // Same nickname
    };

    clientSocket.on('room_joined', () => {
      // First player joined successfully, now try duplicate
      client2Socket.on('error', (payload: ErrorPayload) => {
        expect(payload.code).toBe('NICKNAME_TAKEN');
        expect(payload.message).toContain('Nickname already taken');
        done();
      });

      client2Socket.emit('join_room', duplicatePayload);
    });

    clientSocket.emit('join_room', firstPayload);
  });

  it('should emit error for invalid payload structure', (done) => {
    const invalidPayload = {
      roomCode: 'TEST03',
      // Missing playerUUID and nickname
    };

    clientSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('VALIDATION_ERROR');
      expect(payload.message).toContain('Invalid payload');
      done();
    });

    clientSocket.emit('join_room', invalidPayload);
  });

  it('should validate nickname length (1-20 characters)', (done) => {
    const tooLongPayload: JoinRoomPayload = {
      roomCode: 'TEST04',
      playerUUID: 'player-uuid-006',
      nickname: 'ThisNicknameIsWayTooLongAndExceedsTwentyCharacters',
    };

    clientSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('VALIDATION_ERROR');
      expect(payload.message).toContain('Nickname must be between 1 and 20 characters');
      done();
    });

    clientSocket.emit('join_room', tooLongPayload);
  });

  it('should validate room code format (6 alphanumeric characters)', (done) => {
    const invalidFormatPayload: JoinRoomPayload = {
      roomCode: 'ABC', // Too short
      playerUUID: 'player-uuid-007',
      nickname: 'Test Player',
    };

    clientSocket.on('error', (payload: ErrorPayload) => {
      expect(payload.code).toBe('VALIDATION_ERROR');
      expect(payload.message).toContain('Room code must be 6 alphanumeric characters');
      done();
    });

    clientSocket.emit('join_room', invalidFormatPayload);
  });

  it('should include existing players in room_joined payload', (done) => {
    const roomCode = 'EXIST01';

    const firstPayload: JoinRoomPayload = {
      roomCode,
      playerUUID: 'player-uuid-008',
      nickname: 'First Player',
    };

    const secondPayload: JoinRoomPayload = {
      roomCode,
      playerUUID: 'player-uuid-009',
      nickname: 'Second Player',
    };

    clientSocket.on('room_joined', () => {
      // First player joined, now second player joins
      client2Socket.on('room_joined', (payload: RoomJoinedPayload) => {
        // Should see both players
        expect(payload.players.length).toBe(2);

        const nicknames = payload.players.map(p => p.nickname);
        expect(nicknames).toContain('First Player');
        expect(nicknames).toContain('Second Player');

        done();
      });

      client2Socket.emit('join_room', secondPayload);
    });

    clientSocket.emit('join_room', firstPayload);
  });
});
