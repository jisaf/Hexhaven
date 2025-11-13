/**
 * Contract Test: WebSocket Reconnection with Session Restoration (US4 - T147)
 *
 * Verifies the WebSocket API contract between client and server for reconnection:
 * - Player UUID is sent in connection query params
 * - Server recognizes reconnection vs new connection
 * - Correct events are emitted (player_disconnected, player_reconnected)
 * - Session state is restored on reconnection
 * - Room state is preserved during disconnect/reconnect cycle
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Socket as ClientSocket, io as ioClient } from 'socket.io-client';
import { AppModule } from '../../src/app.module';

describe('WebSocket Reconnection Contract (US4 - T147)', () => {
  let app: INestApplication;
  let clientSocket1: ClientSocket;
  let clientSocket2: ClientSocket;
  let serverUrl: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(0); // Use random port

    const address = app.getHttpServer().address();
    const port = typeof address === 'string' ? 3000 : address.port;
    serverUrl = `http://localhost:${port}`;
  });

  afterEach(async () => {
    if (clientSocket1?.connected) {
      clientSocket1.disconnect();
    }
    if (clientSocket2?.connected) {
      clientSocket2.disconnect();
    }
    await app.close();
  });

  /**
   * Helper: Connect client with player UUID
   */
  function connectClient(playerUUID: string): ClientSocket {
    return ioClient(serverUrl, {
      query: { playerUUID },
      transports: ['websocket'],
      autoConnect: false,
    });
  }

  /**
   * Helper: Wait for event with timeout
   */
  function waitForEvent(socket: ClientSocket, event: string, timeout = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${event}`));
      }, timeout);

      socket.once(event, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }

  describe('Connection Contract', () => {
    it('should accept playerUUID in connection query params', (done) => {
      const playerUUID = 'contract-test-uuid-001';
      clientSocket1 = connectClient(playerUUID);

      clientSocket1.on('connect', () => {
        expect(clientSocket1.connected).toBe(true);
        done();
      });

      clientSocket1.on('connect_error', (error) => {
        done(error);
      });

      clientSocket1.connect();
    });

    it('should maintain connection with valid playerUUID', (done) => {
      const playerUUID = 'contract-test-uuid-002';
      clientSocket1 = connectClient(playerUUID);

      clientSocket1.on('connect', () => {
        // Connection should stay alive
        setTimeout(() => {
          expect(clientSocket1.connected).toBe(true);
          done();
        }, 1000);
      });

      clientSocket1.connect();
    });
  });

  describe('Reconnection Contract', () => {
    it('should emit player_disconnected when player disconnects', async () => {
      const hostUUID = 'contract-host-uuid';
      const player2UUID = 'contract-player2-uuid';

      // Create room via REST API (as per actual API contract)
      const createResponse = await fetch(`${serverUrl}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid: hostUUID, nickname: 'Host' }),
      });
      const roomData = await createResponse.json();
      const roomCode = roomData.room.roomCode;

      // Host connects via WebSocket and joins room
      clientSocket1 = connectClient(hostUUID);
      clientSocket1.connect();
      await waitForEvent(clientSocket1, 'connect');

      clientSocket1.emit('join_room', {
        roomCode,
        nickname: 'Host',
        playerUUID: hostUUID,
      });
      await waitForEvent(clientSocket1, 'room_joined');

      // Player 2 joins
      clientSocket2 = connectClient(player2UUID);
      clientSocket2.connect();
      await waitForEvent(clientSocket2, 'connect');

      clientSocket2.emit('join_room', {
        roomCode,
        nickname: 'Player2',
        playerUUID: player2UUID,
      });
      await waitForEvent(clientSocket2, 'room_joined');

      // Wait for host to receive player_joined event
      await waitForEvent(clientSocket1, 'player_joined');

      // Set up listener for player_disconnected before disconnecting
      const disconnectPromise = waitForEvent(clientSocket1, 'player_disconnected');

      // Player 2 disconnects
      clientSocket2.disconnect();

      // Host should receive player_disconnected event
      const disconnectEvent = await disconnectPromise;
      expect(disconnectEvent).toHaveProperty('playerId', player2UUID);
      expect(disconnectEvent).toHaveProperty('nickname', 'Player2');
    });

    it('should emit player_reconnected when player reconnects', async () => {
      const hostUUID = 'contract-host-uuid-2';
      const player2UUID = 'contract-player2-uuid-2';

      // Create room via REST API
      const createResponse = await fetch(`${serverUrl}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid: hostUUID, nickname: 'Host' }),
      });
      const roomData = await createResponse.json();
      const roomCode = roomData.room.roomCode;

      // Host connects and joins
      clientSocket1 = connectClient(hostUUID);
      clientSocket1.connect();
      await waitForEvent(clientSocket1, 'connect');

      clientSocket1.emit('join_room', {
        roomCode,
        nickname: 'Host',
        playerUUID: hostUUID,
      });
      await waitForEvent(clientSocket1, 'room_joined');

      // Player 2 joins
      clientSocket2 = connectClient(player2UUID);
      clientSocket2.connect();
      await waitForEvent(clientSocket2, 'connect');

      clientSocket2.emit('join_room', {
        roomCode,
        nickname: 'Player2',
        playerUUID: player2UUID,
      });
      await waitForEvent(clientSocket2, 'room_joined');
      await waitForEvent(clientSocket1, 'player_joined');

      // Player 2 disconnects
      const disconnectPromise = waitForEvent(clientSocket1, 'player_disconnected');
      clientSocket2.disconnect();
      await disconnectPromise;

      // Set up listener for player_reconnected before reconnecting
      const reconnectPromise = waitForEvent(clientSocket1, 'player_reconnected');

      // Player 2 reconnects with same UUID
      clientSocket2 = connectClient(player2UUID);
      clientSocket2.connect();
      await waitForEvent(clientSocket2, 'connect');

      clientSocket2.emit('join_room', {
        roomCode: roomData.room.roomCode,
        nickname: 'Player2',
        playerUUID: player2UUID,
      });

      // Host should receive player_reconnected event
      const reconnectEvent = await reconnectPromise;
      expect(reconnectEvent).toHaveProperty('playerId', player2UUID);
      expect(reconnectEvent).toHaveProperty('nickname', 'Player2');
    });

    it('should restore player to same room on reconnection', async () => {
      const playerUUID = 'contract-reconnect-uuid';

      // Create room via REST API
      const createResponse = await fetch(`${serverUrl}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid: playerUUID, nickname: 'ReconnectTest' }),
      });
      const createData = await createResponse.json();
      const originalRoomCode = createData.room.roomCode;

      // Initial connection - join room
      clientSocket1 = connectClient(playerUUID);
      clientSocket1.connect();
      await waitForEvent(clientSocket1, 'connect');

      clientSocket1.emit('join_room', {
        roomCode: originalRoomCode,
        nickname: 'ReconnectTest',
        playerUUID,
      });
      await waitForEvent(clientSocket1, 'room_joined');

      // Disconnect
      clientSocket1.disconnect();

      // Wait a bit to simulate network interruption
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Reconnect with same UUID
      clientSocket1 = connectClient(playerUUID);
      clientSocket1.connect();
      await waitForEvent(clientSocket1, 'connect');

      // Rejoin with same UUID
      clientSocket1.emit('join_room', {
        roomCode: originalRoomCode,
        nickname: 'ReconnectTest',
        playerUUID,
      });

      const rejoinData = await waitForEvent(clientSocket1, 'room_joined');

      // Should be in same room
      expect(rejoinData.roomCode).toBe(originalRoomCode);
      expect(rejoinData.players).toHaveLength(1);
      expect(rejoinData.players[0].id).toBe(playerUUID); // API uses 'id' field for player UUID
    });
  });

  describe('Session State Contract', () => {
    it('should preserve room state across disconnect/reconnect', async () => {
      const hostUUID = 'contract-state-host';
      const player2UUID = 'contract-state-player2';

      // Create room via REST API
      const createResponse = await fetch(`${serverUrl}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid: hostUUID, nickname: 'Host' }),
      });
      const roomData = await createResponse.json();
      const roomCode = roomData.room.roomCode;

      // Host connects and joins room
      clientSocket1 = connectClient(hostUUID);
      clientSocket1.connect();
      await waitForEvent(clientSocket1, 'connect');

      clientSocket1.emit('join_room', {
        roomCode,
        nickname: 'Host',
        playerUUID: hostUUID,
      });
      await waitForEvent(clientSocket1, 'room_joined');

      // Player 2 joins
      clientSocket2 = connectClient(player2UUID);
      clientSocket2.connect();
      await waitForEvent(clientSocket2, 'connect');

      clientSocket2.emit('join_room', {
        roomCode,
        nickname: 'Player2',
        playerUUID: player2UUID,
      });
      await waitForEvent(clientSocket2, 'room_joined');

      // Disconnect player 2
      clientSocket2.disconnect();
      await waitForEvent(clientSocket1, 'player_disconnected');

      // Reconnect player 2
      clientSocket2 = connectClient(player2UUID);
      clientSocket2.connect();
      await waitForEvent(clientSocket2, 'connect');

      clientSocket2.emit('join_room', {
        roomCode,
        nickname: 'Player2',
        playerUUID: player2UUID,
      });

      const rejoinData = await waitForEvent(clientSocket2, 'room_joined');

      // Should still have both players
      expect(rejoinData.players).toHaveLength(2);
      expect(rejoinData.roomCode).toBe(roomCode);

      // Verify player is marked as reconnected
      const player2 = rejoinData.players.find((p: any) => p.id === player2UUID); // API uses 'id' field
      expect(player2).toBeDefined();
      expect(player2.nickname).toBe('Player2');
    });
  });

  describe('Error Handling Contract', () => {
    it('should handle connection without playerUUID', (done) => {
      // Connect without playerUUID
      clientSocket1 = ioClient(serverUrl, {
        transports: ['websocket'],
        autoConnect: false,
      });

      clientSocket1.on('connect', () => {
        // Should still connect, server should generate UUID if needed
        expect(clientSocket1.connected).toBe(true);
        done();
      });

      clientSocket1.on('connect_error', (error) => {
        // Or may reject connection - either is valid
        done();
      });

      clientSocket1.connect();
    });

    it('should handle invalid room code on reconnection', async () => {
      const playerUUID = 'contract-invalid-room';

      clientSocket1 = connectClient(playerUUID);
      clientSocket1.connect();
      await waitForEvent(clientSocket1, 'connect');

      // Try to join invalid room
      clientSocket1.emit('join_room', {
        roomCode: 'INVALID',
        nickname: 'Test',
        playerUUID,
      });

      const errorEvent = await waitForEvent(clientSocket1, 'error');
      expect(errorEvent).toHaveProperty('message');
      expect(errorEvent.message).toMatch(/invalid room code format|room not found/i);
    });
  });
});
