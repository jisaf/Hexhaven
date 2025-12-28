/**
 * Narrative Reward Service
 *
 * Handles reward calculation and persistence for the narrative system.
 * Extracted from GameGateway to follow Single Responsibility Principle.
 *
 * Responsibilities:
 * - Calculate per-player reward amounts based on distribution mode
 * - Persist rewards to database with proper error handling
 * - Track accumulated rewards for victory summary
 * - TTL-based cleanup to prevent memory leaks from abandoned rooms
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from './prisma.service';
import type { NarrativeRewards } from '../../../shared/types/narrative';

/** Maximum number of retry attempts for transient database failures */
const MAX_RETRY_ATTEMPTS = 3;
/** Base delay between retries in milliseconds (doubles with each attempt) */
const RETRY_BASE_DELAY_MS = 100;

/**
 * TTL-based cleanup configuration.
 * Rooms that haven't been accessed within the TTL will have their
 * accumulated rewards data cleaned up to prevent memory leaks.
 */
/** Time-to-live for room reward data in milliseconds (2 hours) */
const ROOM_REWARDS_TTL_MS = 2 * 60 * 60 * 1000;
/** Interval for running cleanup checks in milliseconds (15 minutes) */
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;
/** Maximum number of rooms to track. When exceeded, LRU rooms are evicted. */
const MAX_TRACKED_ROOMS = 1000;

export interface RewardedPlayer {
  playerId: string;
  characterId: string;
  gold?: number;
  xp?: number;
}

export interface RewardApplicationResult {
  success: boolean;
  rewardedPlayers: RewardedPlayer[];
  distribution: string;
  error?: string;
  /** Correlation ID for tracking errors - provide to users for support requests */
  correlationId?: string;
}

interface PlayerInfo {
  id: string;
  userId: string;
  characterId: string | null;
}

/** Player with guaranteed non-null characterId, ready for reward processing */
interface EligiblePlayer {
  id: string;
  userId: string;
  characterId: string;
}

@Injectable()
export class NarrativeRewardService implements OnModuleDestroy {
  private readonly logger = new Logger(NarrativeRewardService.name);

  // Track accumulated rewards per room for victory summary
  private readonly roomNarrativeRewards = new Map<
    string,
    Map<string, { gold: number; xp: number }>
  >();

  // Track last access time per room for TTL-based cleanup
  private readonly roomLastAccessTime = new Map<string, number>();

  // Cleanup timer reference for proper shutdown
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly prisma: PrismaService) {
    // Start periodic cleanup timer to prevent memory leaks from abandoned rooms
    this.startCleanupTimer();
  }

  /**
   * Cleanup on module destroy (NestJS lifecycle hook)
   */
  onModuleDestroy(): void {
    this.stopCleanupTimer();
  }

  /**
   * Start the periodic cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) return;

    this.cleanupTimer = setInterval(() => {
      this.runCleanup();
    }, CLEANUP_INTERVAL_MS);

    this.logger.log(
      `Started TTL-based cleanup timer (interval: ${CLEANUP_INTERVAL_MS}ms, TTL: ${ROOM_REWARDS_TTL_MS}ms)`,
    );
  }

  /**
   * Stop the cleanup timer (for testing or shutdown)
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      this.logger.log('Stopped TTL-based cleanup timer');
    }
  }

  /**
   * Check if cleanup timer is active (for testing)
   */
  isCleanupTimerActive(): boolean {
    return this.cleanupTimer !== null;
  }

  /**
   * Run cleanup of stale room data.
   * Removes reward data for rooms that haven't been accessed within the TTL.
   */
  runCleanup(): void {
    const now = Date.now();
    const staleRooms: string[] = [];

    for (const [roomCode, lastAccess] of this.roomLastAccessTime.entries()) {
      if (now - lastAccess > ROOM_REWARDS_TTL_MS) {
        staleRooms.push(roomCode);
      }
    }

    if (staleRooms.length > 0) {
      for (const roomCode of staleRooms) {
        this.roomNarrativeRewards.delete(roomCode);
        this.roomLastAccessTime.delete(roomCode);
      }

      this.logger.log(
        `TTL cleanup: Removed stale reward data for ${staleRooms.length} room(s): ${staleRooms.join(', ')}`,
      );
    }
  }

  /**
   * Update the last access time for a room (refreshes TTL).
   * Also enforces MAX_TRACKED_ROOMS by evicting least recently used rooms.
   */
  private touchRoom(roomCode: string): void {
    const isNewRoom = !this.roomLastAccessTime.has(roomCode);
    this.roomLastAccessTime.set(roomCode, Date.now());

    // If we're adding a new room and at capacity, evict LRU room
    if (isNewRoom && this.roomLastAccessTime.size > MAX_TRACKED_ROOMS) {
      this.evictLRURoom();
    }
  }

  /**
   * Evict the least recently used room to enforce memory bounds.
   */
  private evictLRURoom(): void {
    let oldestRoom: string | null = null;
    let oldestTime = Infinity;

    for (const [roomCode, lastAccess] of this.roomLastAccessTime.entries()) {
      if (lastAccess < oldestTime) {
        oldestTime = lastAccess;
        oldestRoom = roomCode;
      }
    }

    if (oldestRoom) {
      this.roomNarrativeRewards.delete(oldestRoom);
      this.roomLastAccessTime.delete(oldestRoom);
      this.logger.debug(
        `LRU eviction: Removed room ${oldestRoom} to enforce max room limit`,
      );
    }
  }

  /**
   * Check if room has any tracked data
   */
  hasRoomData(roomCode: string): boolean {
    return (
      this.roomNarrativeRewards.has(roomCode) ||
      this.roomLastAccessTime.has(roomCode)
    );
  }

  /**
   * Retry a database operation with exponential backoff
   * @param operation - Async operation to retry
   * @param correlationId - ID for logging
   * @returns Result of operation or throws after max retries
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    correlationId: string,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        return await operation();
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        // Don't retry on non-transient errors (e.g., record not found)
        if (this.isNonTransientError(lastError)) {
          throw lastError;
        }

        if (attempt < MAX_RETRY_ATTEMPTS) {
          const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
          this.logger.warn(
            `[${correlationId}] Retry attempt ${attempt}/${MAX_RETRY_ATTEMPTS} after ${delay}ms: ${lastError.message}`,
          );
          await this.sleep(delay);
        }
      }
    }

    // TypeScript requires explicit Error type for throw
    // lastError will always be set after the loop since we only reach here if all attempts failed
    throw lastError ?? new Error('Unknown error after retries exhausted');
  }

  /** Check if an error is non-transient (should not be retried) */
  private isNonTransientError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('record not found') ||
      message.includes('unique constraint') ||
      message.includes('foreign key constraint')
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Apply rewards from a narrative trigger based on distribution mode
   * @param roomCode - Room identifier
   * @param rewards - Reward configuration
   * @param players - All players eligible for rewards
   * @param triggeredBy - User ID of player who triggered (for 'triggerer' distribution)
   * @returns Result indicating success/failure and rewarded players
   */
  async applyRewards(
    roomCode: string,
    rewards: NarrativeRewards,
    players: PlayerInfo[],
    triggeredBy?: string,
  ): Promise<RewardApplicationResult> {
    const correlationId = randomUUID().slice(0, 8);
    const distribution = rewards.distribution ?? 'everyone';

    // Filter to players with characters (type-safe: guarantees characterId is non-null)
    const eligiblePlayers: EligiblePlayer[] = players
      .filter(
        (p): p is PlayerInfo & { characterId: string } =>
          p.characterId !== null,
      )
      .map((p) => ({ id: p.id, userId: p.userId, characterId: p.characterId }));

    const rewardedPlayers: RewardedPlayer[] = [];

    // Determine which players get rewards based on distribution mode
    let targetPlayers: EligiblePlayer[];
    if (distribution === 'triggerer' && triggeredBy) {
      targetPlayers = eligiblePlayers.filter((p) => p.userId === triggeredBy);
    } else {
      targetPlayers = eligiblePlayers;
    }

    if (targetPlayers.length === 0) {
      return { success: true, rewardedPlayers: [], distribution };
    }

    // Calculate per-player amounts based on distribution mode:
    // - 'everyone': Each player receives the full reward amount
    // - 'triggerer': Only the triggering player receives the full reward
    // - 'collective': Total reward is split equally among all target players
    const playerCount =
      distribution === 'collective' ? targetPlayers.length : 1;
    const goldPerPlayer = rewards.gold
      ? Math.floor(rewards.gold / playerCount)
      : 0;
    const xpPerPlayer = rewards.xp ? Math.floor(rewards.xp / playerCount) : 0;

    // Collect all database update promises and tracking data
    const updatePromises: Promise<void>[] = [];
    // Store tracking data to apply after DB updates succeed
    const pendingTrackings: { userId: string; gold: number; xp: number }[] = [];

    for (const player of targetPlayers) {
      // player.characterId is guaranteed non-null by EligiblePlayer type
      const { characterId } = player;

      const updates: {
        gold?: { increment: number };
        experience?: { increment: number };
      } = {};

      if (goldPerPlayer > 0) {
        updates.gold = { increment: goldPerPlayer };
      }
      if (xpPerPlayer > 0) {
        updates.experience = { increment: xpPerPlayer };
      }

      if (Object.keys(updates).length > 0) {
        // Create promise with retry logic for transient failures
        const updatePromise = this.withRetry(
          () =>
            this.prisma.character
              .update({
                where: { id: characterId },
                data: updates,
              })
              .then(() => {
                this.logger.log(
                  `[${correlationId}] Applied rewards to character ${characterId}: gold=${goldPerPlayer}, xp=${xpPerPlayer} (distribution: ${distribution})`,
                );
              }),
          correlationId,
        );

        updatePromises.push(updatePromise);

        rewardedPlayers.push({
          playerId: player.id,
          characterId,
          gold: goldPerPlayer,
          xp: xpPerPlayer,
        });

        // Queue tracking data - will be applied after DB updates succeed
        pendingTrackings.push({
          userId: player.userId,
          gold: goldPerPlayer,
          xp: xpPerPlayer,
        });
      }
    }

    // Wait for all database updates to complete before tracking
    if (updatePromises.length > 0) {
      try {
        await Promise.all(updatePromises);

        // Only track rewards after DB updates succeed to prevent
        // showing rewards in victory summary that weren't persisted
        for (const tracking of pendingTrackings) {
          this.trackReward(
            roomCode,
            tracking.userId,
            tracking.gold,
            tracking.xp,
          );
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `[${correlationId}] Failed to apply narrative rewards in room ${roomCode}: ${errorMessage}`,
        );
        return {
          success: false,
          rewardedPlayers: [],
          distribution,
          correlationId,
          error: `Failed to save rewards to database. Reference ID: ${correlationId}`,
        };
      }
    }

    this.logger.log(
      `[${correlationId}] Granted narrative rewards to ${rewardedPlayers.length} players in room ${roomCode} (distribution: ${distribution})`,
    );

    return { success: true, rewardedPlayers, distribution };
  }

  /**
   * Track accumulated reward for a player in a room
   */
  private trackReward(
    roomCode: string,
    userId: string,
    gold: number,
    xp: number,
  ): void {
    // Refresh TTL when tracking rewards
    this.touchRoom(roomCode);

    let playerRewards = this.roomNarrativeRewards.get(roomCode);
    if (!playerRewards) {
      playerRewards = new Map();
      this.roomNarrativeRewards.set(roomCode, playerRewards);
    }
    const existing = playerRewards.get(userId) || { gold: 0, xp: 0 };
    playerRewards.set(userId, {
      gold: existing.gold + gold,
      xp: existing.xp + xp,
    });
  }

  /**
   * Get accumulated rewards for all players in a room
   * @param roomCode - Room identifier
   * @param refreshTTL - If true, refresh the room's TTL (default: false for backward compatibility)
   */
  getAccumulatedRewards(
    roomCode: string,
    refreshTTL: boolean = false,
  ): Map<string, { gold: number; xp: number }> {
    if (refreshTTL && this.roomNarrativeRewards.has(roomCode)) {
      this.touchRoom(roomCode);
    }
    return (
      this.roomNarrativeRewards.get(roomCode) ||
      new Map<string, { gold: number; xp: number }>()
    );
  }

  /**
   * Clear accumulated rewards for a room (e.g., when game ends)
   * Also removes the room from TTL tracking.
   */
  clearAccumulatedRewards(roomCode: string): void {
    this.roomNarrativeRewards.delete(roomCode);
    this.roomLastAccessTime.delete(roomCode);
  }
}
