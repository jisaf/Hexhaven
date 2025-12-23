/**
 * Session Service (US4 - T149, T150)
 *
 * Manages game session persistence and restoration for reconnection support.
 * Saves game state to enable players to reconnect after disconnection.
 */

import { GameRoom } from '../models/game-room.model';
import { Logger } from '@nestjs/common';

interface SerializedGameState {
  roomId: string;
  roomCode: string;
  status: string;
  scenarioId: string | null;
  currentRound: number | null;
  currentTurnIndex: number | null;
  players: any[];
  // TODO: Add full game state (characters, monsters, board, turnOrder, elementalState)
  lastUpdated: Date;
}

/**
 * In-memory session storage (MVP)
 * TODO: Replace with database persistence in production
 */
class SessionService {
  private sessions: Map<string, SerializedGameState> = new Map();
  private readonly SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly logger = new Logger('SessionService');

  /**
   * Save game state to session storage
   * Called after every game action to enable reconnection
   */
  saveSession(room: GameRoom): void {
    try {
      const state: SerializedGameState = {
        roomId: room.id,
        roomCode: room.roomCode,
        status: room.status,
        scenarioId: room.scenarioId,
        currentRound: room.currentRound,
        currentTurnIndex: room.currentTurnIndex,
        players: room.players.map((p) => ({
          id: p.id,
          uuid: p.userId, // Store userId in 'uuid' field for session lookup compatibility
          userId: p.userId, // Also store as userId for clarity
          nickname: p.nickname,
          roomId: p.roomId,
          characterClass: p.characterClass,
          isHost: p.isHost,
          connectionStatus: p.connectionStatus,
          lastSeenAt: p.lastSeenAt,
        })),
        lastUpdated: new Date(),
      };

      this.sessions.set(room.id, state);
      // Removed verbose logging - only log errors
    } catch (error: any) {
      this.logger.error(
        `Failed to save session for room ${room.id}: ${error.message}`,
      );
    }
  }

  /**
   * Restore game state from session storage by room ID
   * Used when player reconnects
   */
  restoreSession(roomId: string): SerializedGameState | null {
    const session = this.sessions.get(roomId);

    if (!session) {
      this.logger.warn(`No session found for room ${roomId}`);
      return null;
    }

    // Check if session has expired (24 hours)
    const age = Date.now() - session.lastUpdated.getTime();
    if (age > this.SESSION_TTL_MS) {
      this.logger.warn(
        `Session expired for room ${roomId} (age: ${Math.round(age / 1000 / 60)} minutes)`,
      );
      this.sessions.delete(roomId);
      return null;
    }

    // Removed verbose logging - session restore is normal operation
    return session;
  }

  /**
   * Find session by user ID (database user ID from JWT)
   * Used to restore player's active game on reconnection
   * @param userId - Database user ID (from JWT authentication)
   */
  findSessionByUserId(userId: string): SerializedGameState | null {
    for (const session of this.sessions.values()) {
      const player = session.players.find((p) => p.uuid === userId);
      if (player) {
        // Check expiration
        const age = Date.now() - session.lastUpdated.getTime();
        if (age > this.SESSION_TTL_MS) {
          this.sessions.delete(session.roomId);
          return null;
        }
        return session;
      }
    }
    return null;
  }

  /**
   * Delete session (called when game completes or is abandoned)
   */
  deleteSession(roomId: string): void {
    this.sessions.delete(roomId);
    // Removed verbose logging - deletion is normal cleanup
  }

  /**
   * Cleanup expired sessions (run periodically)
   * Called by scheduler every hour
   */
  cleanupExpiredSessions(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [roomId, session] of this.sessions.entries()) {
      const age = now - session.lastUpdated.getTime();
      if (age > this.SESSION_TTL_MS) {
        this.sessions.delete(roomId);
        cleaned++;
        // Removed verbose logging - cleanup is routine maintenance
      }
    }

    // Only log if significant cleanup occurred
    if (cleaned > 10) {
      this.logger.log(`Cleaned ${cleaned} expired session(s)`);
    }

    return cleaned;
  }

  /**
   * Get all active sessions (for monitoring)
   */
  getActiveSessions(): number {
    return this.sessions.size;
  }

  /**
   * Clear all sessions (for testing only)
   */
  clearAllSessions(): void {
    this.sessions.clear();
    // Removed verbose logging - only used in tests
  }

  /**
   * Start automatic cleanup scheduler
   * Called on server startup, not in tests
   */
  startCleanupScheduler(): void {
    if (this.cleanupInterval) {
      return; // Already running
    }
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupExpiredSessions();
      },
      60 * 60 * 1000,
    ); // 1 hour
    // Removed verbose logging - scheduler start is initialization
  }

  /**
   * Stop cleanup scheduler (for testing)
   */
  stopCleanupScheduler(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      // Removed verbose logging - only used in tests
    }
  }

  /**
   * Set session timestamp (for testing expiration)
   * @internal - Test helper only
   */
  _setSessionTimestamp(roomId: string, timestamp: Date): void {
    const session = this.sessions.get(roomId);
    if (session) {
      session.lastUpdated = timestamp;
    }
  }
}

// Singleton instance
export const sessionService = new SessionService();

// Start cleanup scheduler in production (not in test environment)
if (process.env.NODE_ENV !== 'test') {
  sessionService.startCleanupScheduler();
}
