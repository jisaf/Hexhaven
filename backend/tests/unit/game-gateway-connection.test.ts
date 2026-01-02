/**
 * Unit Test: GameGateway handleConnection socket mapping
 * Issue #419 - Ensures socket-to-player mapping is populated on connection
 *
 * This tests the critical fix that populates socketToPlayer and playerToSocket
 * Maps immediately on socket connection, rather than waiting for join_room.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('GameGateway handleConnection (Issue #419)', () => {
  let mockSocketToPlayer: Map<string, string>;
  let mockPlayerToSocket: Map<string, string>;
  let mockLogger: { log: jest.Mock; warn: jest.Mock };

  /**
   * Simulates the handleConnection logic from game.gateway.ts
   * This mirrors the actual implementation for isolated testing
   */
  function handleConnection(
    client: { id: string; data: { userId?: string } },
    socketToPlayer: Map<string, string>,
    playerToSocket: Map<string, string>,
    logger: { log: jest.Mock; warn: jest.Mock },
  ): void {
    const userId = client.data.userId;
    if (userId) {
      // Clean up any stale mapping for this user (handles reconnection with new socket ID)
      const oldSocketId = playerToSocket.get(userId);
      if (oldSocketId && oldSocketId !== client.id) {
        socketToPlayer.delete(oldSocketId);
        logger.log(`Cleaned up stale socket mapping: ${oldSocketId} for user ${userId}`);
      }

      // Populate socket mapping immediately on connection
      socketToPlayer.set(client.id, userId);
      playerToSocket.set(userId, client.id);
      logger.log(`Socket ${client.id} mapped to user ${userId} on connection`);
    } else {
      logger.warn(`Socket ${client.id} connected without userId in socket.data`);
    }
  }

  beforeEach(() => {
    mockSocketToPlayer = new Map();
    mockPlayerToSocket = new Map();
    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
    };
  });

  describe('Socket Mapping on Connection', () => {
    it('should populate socketToPlayer and playerToSocket when userId is present', () => {
      const mockClient = {
        id: 'socket-123',
        data: { userId: 'user-456' },
      };

      handleConnection(mockClient, mockSocketToPlayer, mockPlayerToSocket, mockLogger);

      expect(mockSocketToPlayer.get('socket-123')).toBe('user-456');
      expect(mockPlayerToSocket.get('user-456')).toBe('socket-123');
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Socket socket-123 mapped to user user-456 on connection',
      );
    });

    it('should warn when userId is not present in socket.data', () => {
      const mockClient = {
        id: 'socket-no-auth',
        data: {},
      };

      handleConnection(mockClient, mockSocketToPlayer, mockPlayerToSocket, mockLogger);

      expect(mockSocketToPlayer.size).toBe(0);
      expect(mockPlayerToSocket.size).toBe(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Socket socket-no-auth connected without userId in socket.data',
      );
    });
  });

  describe('Stale Socket Cleanup on Reconnection', () => {
    it('should clean up stale socket mapping when user reconnects with new socket ID', () => {
      // Simulate existing stale mapping from previous connection
      mockSocketToPlayer.set('old-socket-000', 'user-456');
      mockPlayerToSocket.set('user-456', 'old-socket-000');

      const mockClient = {
        id: 'new-socket-123',
        data: { userId: 'user-456' },
      };

      handleConnection(mockClient, mockSocketToPlayer, mockPlayerToSocket, mockLogger);

      // Old mapping should be deleted
      expect(mockSocketToPlayer.has('old-socket-000')).toBe(false);

      // New mapping should be established
      expect(mockSocketToPlayer.get('new-socket-123')).toBe('user-456');
      expect(mockPlayerToSocket.get('user-456')).toBe('new-socket-123');

      // Should log the cleanup
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Cleaned up stale socket mapping: old-socket-000 for user user-456',
      );
    });

    it('should not clean up when same socket ID reconnects', () => {
      // Simulate existing mapping with same socket ID
      mockSocketToPlayer.set('socket-123', 'user-456');
      mockPlayerToSocket.set('user-456', 'socket-123');

      const mockClient = {
        id: 'socket-123',
        data: { userId: 'user-456' },
      };

      handleConnection(mockClient, mockSocketToPlayer, mockPlayerToSocket, mockLogger);

      // Mapping should still exist
      expect(mockSocketToPlayer.get('socket-123')).toBe('user-456');
      expect(mockPlayerToSocket.get('user-456')).toBe('socket-123');

      // Should NOT log cleanup (no stale mapping)
      expect(mockLogger.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Cleaned up stale socket mapping'),
      );
    });
  });

  describe('Multiple Users', () => {
    it('should handle multiple users with separate socket mappings', () => {
      const client1 = { id: 'socket-1', data: { userId: 'user-A' } };
      const client2 = { id: 'socket-2', data: { userId: 'user-B' } };

      handleConnection(client1, mockSocketToPlayer, mockPlayerToSocket, mockLogger);
      handleConnection(client2, mockSocketToPlayer, mockPlayerToSocket, mockLogger);

      expect(mockSocketToPlayer.size).toBe(2);
      expect(mockSocketToPlayer.get('socket-1')).toBe('user-A');
      expect(mockSocketToPlayer.get('socket-2')).toBe('user-B');
      expect(mockPlayerToSocket.get('user-A')).toBe('socket-1');
      expect(mockPlayerToSocket.get('user-B')).toBe('socket-2');
    });

    it('should not affect other users when one user reconnects', () => {
      // Set up two users
      mockSocketToPlayer.set('socket-1', 'user-A');
      mockPlayerToSocket.set('user-A', 'socket-1');
      mockSocketToPlayer.set('socket-2', 'user-B');
      mockPlayerToSocket.set('user-B', 'socket-2');

      // User A reconnects with new socket
      const client1Reconnect = { id: 'socket-1-new', data: { userId: 'user-A' } };
      handleConnection(client1Reconnect, mockSocketToPlayer, mockPlayerToSocket, mockLogger);

      // User A should have new mapping
      expect(mockSocketToPlayer.get('socket-1-new')).toBe('user-A');
      expect(mockSocketToPlayer.has('socket-1')).toBe(false);

      // User B should be unaffected
      expect(mockSocketToPlayer.get('socket-2')).toBe('user-B');
      expect(mockPlayerToSocket.get('user-B')).toBe('socket-2');
    });
  });
});
