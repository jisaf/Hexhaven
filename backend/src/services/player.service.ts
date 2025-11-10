/**
 * Player Service (US1 - T049)
 *
 * Manages player lifecycle: creation, validation, lookup, and state management.
 * Provides in-memory storage for MVP (will be replaced with database later).
 */

import { Player } from '../models/player.model';
import { NotFoundError, ValidationError } from '../utils/error-handler';
import { ConnectionStatus } from '../../../shared/types/entities';

export class PlayerService {
  private players: Map<string, Player> = new Map(); // uuid -> Player
  private playerIds: Map<string, string> = new Map(); // id -> uuid

  /**
   * Create a new player with validated nickname
   */
  createPlayer(uuid: string, nickname: string): Player {
    // Check if player already exists with this UUID
    const existing = this.players.get(uuid);
    if (existing) {
      throw new ValidationError('Player with this UUID already exists');
    }

    // Validate nickname format
    const validation = Player.validateNickname(nickname, []);
    if (!validation.valid) {
      throw new ValidationError(validation.error || 'Invalid nickname');
    }

    // Create player
    const player = Player.create(uuid, nickname);

    // Store player
    this.players.set(uuid, player);
    this.playerIds.set(player.id, uuid);

    return player;
  }

  /**
   * Get player by UUID
   */
  getPlayerByUuid(uuid: string): Player | null {
    return this.players.get(uuid) || null;
  }

  /**
   * Get player by ID
   */
  getPlayerById(id: string): Player | null {
    const uuid = this.playerIds.get(id);
    if (!uuid) {
      return null;
    }
    return this.players.get(uuid) || null;
  }

  /**
   * Get or create player (for reconnection scenarios)
   */
  getOrCreatePlayer(uuid: string, nickname: string): Player {
    const existing = this.players.get(uuid);
    if (existing) {
      return existing;
    }
    return this.createPlayer(uuid, nickname);
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
   */
  updateConnectionStatus(
    uuid: string,
    status: ConnectionStatus,
  ): Player {
    const player = this.players.get(uuid);
    if (!player) {
      throw new NotFoundError('Player not found');
    }

    player.updateConnectionStatus(status);
    return player;
  }

  /**
   * Update player nickname
   */
  updateNickname(uuid: string, nickname: string): Player {
    const player = this.players.get(uuid);
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
   */
  removePlayer(uuid: string): boolean {
    const player = this.players.get(uuid);
    if (!player) {
      return false;
    }

    this.playerIds.delete(player.id);
    this.players.delete(uuid);
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
