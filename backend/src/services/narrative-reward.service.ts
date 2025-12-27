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
 */

import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from './prisma.service';
import type { NarrativeRewards } from '../../../shared/types/narrative';

/** Maximum number of retry attempts for transient database failures */
const MAX_RETRY_ATTEMPTS = 3;
/** Base delay between retries in milliseconds (doubles with each attempt) */
const RETRY_BASE_DELAY_MS = 100;

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
export class NarrativeRewardService {
  private readonly logger = new Logger(NarrativeRewardService.name);

  // Track accumulated rewards per room for victory summary
  private readonly roomNarrativeRewards = new Map<
    string,
    Map<string, { gold: number; xp: number }>
  >();

  constructor(private readonly prisma: PrismaService) {}

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

    throw lastError;
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

    // Calculate per-player amounts based on distribution mode
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
   */
  getAccumulatedRewards(
    roomCode: string,
  ): Map<string, { gold: number; xp: number }> {
    return (
      this.roomNarrativeRewards.get(roomCode) ||
      new Map<string, { gold: number; xp: number }>()
    );
  }

  /**
   * Clear accumulated rewards for a room (e.g., when game ends)
   */
  clearAccumulatedRewards(roomCode: string): void {
    this.roomNarrativeRewards.delete(roomCode);
  }
}
