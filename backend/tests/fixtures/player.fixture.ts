/**
 * Test Fixtures for Player Entity
 *
 * Provides reusable test data and factory functions for creating
 * Player instances in tests
 */

import { ConnectionStatus } from '../../../shared/types/entities';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a test player UUID
 */
export function generatePlayerUuid(): string {
  return uuidv4();
}

/**
 * Generate a test nickname
 */
export function generateNickname(index?: number): string {
  const adjectives = ['Quick', 'Brave', 'Sneaky', 'Mighty', 'Clever', 'Bold'];
  const nouns = ['Fox', 'Bear', 'Wolf', 'Eagle', 'Lion', 'Dragon'];

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];

  return index !== undefined ? `${adj}${noun}${index}` : `${adj}${noun}`;
}

/**
 * Create a test Player object (not persisted to DB)
 */
export function createTestPlayer(overrides: Partial<TestPlayer> = {}): TestPlayer {
  const now = new Date();

  return {
    id: overrides.id || `test-player-${Date.now()}-${Math.random()}`,
    uuid: overrides.uuid || generatePlayerUuid(),
    nickname: overrides.nickname || generateNickname(),
    roomId: overrides.roomId || null,
    isHost: overrides.isHost ?? false,
    connectionStatus: overrides.connectionStatus || ConnectionStatus.CONNECTED,
    lastSeenAt: overrides.lastSeenAt || now,
    createdAt: overrides.createdAt || now,
    ...overrides
  };
}

/**
 * Create multiple test Player objects
 */
export function createTestPlayers(count: number): TestPlayer[] {
  return Array.from({ length: count }, (_, i) =>
    createTestPlayer({ nickname: generateNickname(i + 1) })
  );
}

/**
 * Test Player type (matches Prisma schema)
 */
export interface TestPlayer {
  id: string;
  uuid: string;
  nickname: string;
  roomId: string | null;
  isHost: boolean;
  connectionStatus: ConnectionStatus;
  lastSeenAt: Date;
  createdAt: Date;
}

/**
 * Create a host player
 */
export function createHostPlayer(overrides: Partial<TestPlayer> = {}): TestPlayer {
  return createTestPlayer({
    isHost: true,
    ...overrides
  });
}

/**
 * Create a connected player
 */
export function createConnectedPlayer(overrides: Partial<TestPlayer> = {}): TestPlayer {
  return createTestPlayer({
    connectionStatus: ConnectionStatus.CONNECTED,
    lastSeenAt: new Date(),
    ...overrides
  });
}

/**
 * Create a disconnected player
 */
export function createDisconnectedPlayer(overrides: Partial<TestPlayer> = {}): TestPlayer {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return createTestPlayer({
    connectionStatus: ConnectionStatus.DISCONNECTED,
    lastSeenAt: fiveMinutesAgo,
    ...overrides
  });
}

/**
 * Create a reconnecting player
 */
export function createReconnectingPlayer(overrides: Partial<TestPlayer> = {}): TestPlayer {
  return createTestPlayer({
    connectionStatus: ConnectionStatus.RECONNECTING,
    ...overrides
  });
}

/**
 * Create a player in a specific room
 */
export function createPlayerInRoom(
  roomId: string,
  overrides: Partial<TestPlayer> = {}
): TestPlayer {
  return createTestPlayer({
    roomId,
    ...overrides
  });
}

/**
 * Create a full room of players (host + 3 players)
 */
export function createRoomPlayers(roomId: string): TestPlayer[] {
  return [
    createHostPlayer({ roomId, nickname: 'Host' }),
    createPlayerInRoom(roomId, { nickname: 'Player2' }),
    createPlayerInRoom(roomId, { nickname: 'Player3' }),
    createPlayerInRoom(roomId, { nickname: 'Player4' })
  ];
}

/**
 * Mock Prisma Player data for database tests
 */
export const MOCK_PLAYERS = {
  host: createHostPlayer({ nickname: 'GameHost' }),
  player1: createConnectedPlayer({ nickname: 'Player1' }),
  player2: createConnectedPlayer({ nickname: 'Player2' }),
  player3: createConnectedPlayer({ nickname: 'Player3' }),
  disconnected: createDisconnectedPlayer({ nickname: 'AFKPlayer' }),
  reconnecting: createReconnectingPlayer({ nickname: 'ReconnectingPlayer' })
};

/**
 * Assertion helpers for Player tests
 */
export const PLAYER_ASSERTIONS = {
  /**
   * Assert that a UUID is valid format
   */
  isValidUuid(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  },

  /**
   * Assert that a nickname meets requirements (1-50 characters)
   */
  isValidNickname(nickname: string): boolean {
    return nickname.length >= 1 && nickname.length <= 50;
  },

  /**
   * Assert that a player is the host
   */
  isHost(player: TestPlayer): boolean {
    return player.isHost === true;
  },

  /**
   * Assert that a player is connected
   */
  isConnected(player: TestPlayer): boolean {
    return player.connectionStatus === ConnectionStatus.CONNECTED;
  },

  /**
   * Assert that a player is in a room
   */
  isInRoom(player: TestPlayer): boolean {
    return player.roomId !== null;
  },

  /**
   * Assert that a player has been seen recently (within last minute)
   */
  isRecentlyActive(player: TestPlayer): boolean {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    return player.lastSeenAt > oneMinuteAgo;
  }
};
