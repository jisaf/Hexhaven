/**
 * Session Service (US4 - T149, T150)
 *
 * Manages game session persistence and restoration for reconnection support.
 * Saves game state to enable players to reconnect after disconnection.
 */

import { Injectable } from '@nestjs/common';
import { GameRoom } from '../models/game-room.model';
import { LoggingService } from './logging.service';

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
@Injectable()
export class SessionService {
  private sessions: Map<string, SerializedGameState> = new Map();
  private readonly SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private readonly logger: LoggingService) {}

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
        players: room.players.map(p => ({
          id: p.id,
          uuid: p.uuid,
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
      this.logger.log(
        'State',
        `Session saved for room ${room.roomCode} (${room.id})`,
      );
    } catch (error: any) {
      this.logger.error(
        'State',
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
      this.logger.warn('State', `No session found for room ${roomId}`);
      return null;
    }

    // Check if session has expired (24 hours)
    const age = Date.now() - session.lastUpdated.getTime();
    if (age > this.SESSION_TTL_MS) {
      this.logger.warn(
        'State',
        `Session expired for room ${roomId} (age: ${Math.round(
          age / 1000 / 60,
        )} minutes)`,
      );
      this.sessions.delete(roomId);
      return null;
    }

    this.logger.log(
      'State',
      `Session restored for room ${session.roomCode} (${roomId})`,
    );
    return session;
  }

  /**
   * Find session by player UUID
   * Used to restore player's active game on reconnection
   */
  findSessionByPlayerUuid(playerUuid: string): SerializedGameState | null {
    for (const session of this.sessions.values()) {
      const player = session.players.find(p => p.uuid === playerUuid);
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
    const deleted = this.sessions.delete(roomId);
    if (deleted) {
      this.logger.log('State', `Session deleted for room ${roomId}`);
    }
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
        this.logger.log(
          'State',
          `Expired session cleaned: room ${session.roomCode} (${roomId})`,
        );
      }
    }

    if (cleaned > 0) {
      this.logger.log('State', `Cleaned ${cleaned} expired session(s)`);
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
    this.logger.log('State', 'All sessions cleared');
  }

  /**
   * Start automatic cleanup scheduler
   * Called on server startup, not in tests
   */
  startCleanupScheduler(): void {
    if (this.cleanupInterval) {
      return; // Already running
    }
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60 * 60 * 1000); // 1 hour
    this.logger.log('State', 'Session cleanup scheduler started');
  }

  /**
   * Stop cleanup scheduler (for testing)
   */
  stopCleanupScheduler(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      this.logger.log('State', 'Session cleanup scheduler stopped');
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
