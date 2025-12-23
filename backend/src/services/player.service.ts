/**
 * Player Service (US1 - T049)
 *
 * Manages player lifecycle: creation, validation, lookup, and state management.
 * Provides in-memory storage for MVP (will be replaced with database later).
 */

import { Player } from '../models/player.model';
import { NotFoundError, ValidationError } from '../types/errors';
import { ConnectionStatus } from '../../../shared/types/entities';

export class PlayerService {
  private players: Map<string, Player> = new Map(); // userId (database) -> Player
  private playerIds: Map<string, string> = new Map(); // room instance id -> userId

  /**
   * Create a new player with validated nickname
   * @param userId - Database user ID (from JWT authentication)
   * @param nickname - Display name for the player
   */
  createPlayer(userId: string, nickname: string): Player {
    // Check if player already exists with this userId
    const existing = this.players.get(userId);
    if (existing) {
      throw new ValidationError('Player with this user ID already exists');
    }

    // Validate nickname format
    const validation = Player.validateNickname(nickname, []);
    if (!validation.valid) {
      throw new ValidationError(validation.error || 'Invalid nickname');
    }

    // Create player
    const player = Player.create(userId, nickname);

    // Store player
    this.players.set(userId, player);
    this.playerIds.set(player.id, userId);

    return player;
  }

  /**
   * Get player by user ID (database user ID)
   */
  getPlayerByUserId(userId: string): Player | null {
    return this.players.get(userId) || null;
  }

  /**
   * @deprecated Use getPlayerByUserId instead
   */
  getPlayerByUuid(uuid: string): Player | null {
    return this.getPlayerByUserId(uuid);
  }

  /**
   * Get player by room instance ID
   */
  getPlayerById(id: string): Player | null {
    const userId = this.playerIds.get(id);
    if (!userId) {
      return null;
    }
    return this.players.get(userId) || null;
  }

  /**
   * Get or create player (for reconnection scenarios)
   * @param userId - Database user ID (from JWT authentication)
   * @param nickname - Display name for the player
   */
  getOrCreatePlayer(userId: string, nickname: string): Player {
    const existing = this.players.get(userId);
    if (existing) {
      return existing;
    }
    return this.createPlayer(userId, nickname);
  }

  /**
   * Validate nickname against existing players
   */
  validateNickname(
    nickname: string,
    existingPlayers: Player[] = [],
  ): { valid: boolean; error?: string } {
    return Player.validateNickname(nickname, existingPlayers);
  }

  /**
   * Update player connection status
   * @param userId - Database user ID
   */
  updateConnectionStatus(userId: string, status: ConnectionStatus): Player {
    const player = this.players.get(userId);
    if (!player) {
      throw new NotFoundError('Player not found');
    }

    player.updateConnectionStatus(status);
    return player;
  }

  /**
   * Update player nickname
   * @param userId - Database user ID
   */
  updateNickname(userId: string, nickname: string): Player {
    const player = this.players.get(userId);
    if (!player) {
      throw new NotFoundError('Player not found');
    }

    // Validate new nickname
    const validation = Player.validateNickname(nickname, []);
    if (!validation.valid) {
      throw new ValidationError(validation.error || 'Invalid nickname');
    }

    player.updateNickname(nickname);
    return player;
  }

  /**
   * Remove player from registry
   * @param userId - Database user ID
   */
  removePlayer(userId: string): boolean {
    const player = this.players.get(userId);
    if (!player) {
      return false;
    }

    this.playerIds.delete(player.id);
    this.players.delete(userId);
    return true;
  }

  /**
   * Get all players (for debugging/admin)
   */
  getAllPlayers(): Player[] {
    return Array.from(this.players.values());
  }

  /**
   * Clear all players (for testing)
   */
  clearAllPlayers(): void {
    this.players.clear();
    this.playerIds.clear();
  }

  /**
   * Get player count
   */
  getPlayerCount(): number {
    return this.players.size;
  }
}

// Singleton instance
export const playerService = new PlayerService();
