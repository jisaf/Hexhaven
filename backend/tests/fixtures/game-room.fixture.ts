/**
 * Test Fixtures for GameRoom Entity
 *
 * Provides reusable test data and factory functions for creating
 * GameRoom instances in tests
 */

import { RoomStatus } from '../../../shared/types/entities';

/**
 * Generate a random 6-character alphanumeric room code
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous characters
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create a test GameRoom object (not persisted to DB)
 */
export function createTestGameRoom(overrides: Partial<TestGameRoom> = {}): TestGameRoom {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

  return {
    id: overrides.id || `test-room-${Date.now()}-${Math.random()}`,
    roomCode: overrides.roomCode || generateRoomCode(),
    status: overrides.status || RoomStatus.LOBBY,
    scenarioId: overrides.scenarioId || null,
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
    expiresAt: overrides.expiresAt || expiresAt,
    ...overrides
  };
}

/**
 * Create multiple test GameRoom objects
 */
export function createTestGameRooms(count: number): TestGameRoom[] {
  return Array.from({ length: count }, (_, i) =>
    createTestGameRoom({ roomCode: `TEST${i.toString().padStart(2, '0')}` })
  );
}

/**
 * Test GameRoom type (matches Prisma schema)
 */
export interface TestGameRoom {
  id: string;
  roomCode: string;
  status: RoomStatus;
  scenarioId: string | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

/**
 * Create a GameRoom in lobby status (default)
 */
export function createLobbyRoom(overrides: Partial<TestGameRoom> = {}): TestGameRoom {
  return createTestGameRoom({
    status: RoomStatus.LOBBY,
    scenarioId: null,
    ...overrides
  });
}

/**
 * Create a GameRoom in active status (game in progress)
 */
export function createActiveRoom(overrides: Partial<TestGameRoom> = {}): TestGameRoom {
  return createTestGameRoom({
    status: RoomStatus.ACTIVE,
    scenarioId: overrides.scenarioId || 'test-scenario-1',
    ...overrides
  });
}

/**
 * Create a GameRoom in completed status
 */
export function createCompletedRoom(overrides: Partial<TestGameRoom> = {}): TestGameRoom {
  return createTestGameRoom({
    status: RoomStatus.COMPLETED,
    scenarioId: overrides.scenarioId || 'test-scenario-1',
    ...overrides
  });
}

/**
 * Create a GameRoom in abandoned status
 */
export function createAbandonedRoom(overrides: Partial<TestGameRoom> = {}): TestGameRoom {
  return createTestGameRoom({
    status: RoomStatus.ABANDONED,
    ...overrides
  });
}

/**
 * Create an expired GameRoom
 */
export function createExpiredRoom(overrides: Partial<TestGameRoom> = {}): TestGameRoom {
  const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
  return createTestGameRoom({
    expiresAt: yesterday,
    ...overrides
  });
}

/**
 * Mock Prisma GameRoom data for database tests
 */
export const MOCK_GAME_ROOMS = {
  lobby: createLobbyRoom({ roomCode: 'LOBBY1' }),
  active: createActiveRoom({ roomCode: 'ACTIVE' }),
  completed: createCompletedRoom({ roomCode: 'DONE01' }),
  abandoned: createAbandonedRoom({ roomCode: 'GONE01' }),
  expired: createExpiredRoom({ roomCode: 'OLD001' })
};

/**
 * Assertions helpers for GameRoom tests
 */
export const GAME_ROOM_ASSERTIONS = {
  /**
   * Assert that a room code is valid format (6 alphanumeric characters)
   */
  isValidRoomCode(code: string): boolean {
    return /^[A-HJ-NP-Z2-9]{6}$/.test(code);
  },

  /**
   * Assert that a room is in lobby status
   */
  isLobby(room: TestGameRoom): boolean {
    return room.status === RoomStatus.LOBBY && room.scenarioId === null;
  },

  /**
   * Assert that a room is active
   */
  isActive(room: TestGameRoom): boolean {
    return room.status === RoomStatus.ACTIVE && room.scenarioId !== null;
  },

  /**
   * Assert that a room is expired
   */
  isExpired(room: TestGameRoom): boolean {
    return room.expiresAt < new Date();
  }
};
