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
import { PrismaService } from './prisma.service';
import type { NarrativeRewards } from '../../../shared/types/narrative';

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
}

interface PlayerInfo {
  id: string;
  userId: string;
  characterId: string | null;
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
    const distribution = rewards.distribution ?? 'everyone';
    const allPlayers = players.filter((p) => p.characterId);
    const rewardedPlayers: RewardedPlayer[] = [];

    // Determine which players get rewards based on distribution mode
    let targetPlayers: typeof allPlayers;
    if (distribution === 'triggerer' && triggeredBy) {
      targetPlayers = allPlayers.filter((p) => p.userId === triggeredBy);
    } else {
      targetPlayers = allPlayers;
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

    // Collect all database update promises
    const updatePromises: Promise<void>[] = [];

    for (const player of targetPlayers) {
      if (!player.characterId) continue;

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
        const characterId = player.characterId;

        // Create promise for this update
        const updatePromise = this.prisma.character
          .update({
            where: { id: characterId },
            data: updates,
          })
          .then(() => {
            this.logger.log(
              `Applied rewards to character ${characterId}: gold=${goldPerPlayer}, xp=${xpPerPlayer} (distribution: ${distribution})`,
            );
          });

        updatePromises.push(updatePromise);

        rewardedPlayers.push({
          playerId: player.id,
          characterId,
          gold: goldPerPlayer,
          xp: xpPerPlayer,
        });

        // Track rewards for victory summary
        this.trackReward(roomCode, player.userId, goldPerPlayer, xpPerPlayer);
      }
    }

    // Wait for all database updates to complete
    if (updatePromises.length > 0) {
      try {
        await Promise.all(updatePromises);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Failed to apply narrative rewards in room ${roomCode}: ${errorMessage}`,
        );
        return {
          success: false,
          rewardedPlayers: [],
          distribution,
          error:
            'Failed to save rewards to database. Please contact support if rewards are missing.',
        };
      }
    }

    this.logger.log(
      `Granted narrative rewards to ${rewardedPlayers.length} players in room ${roomCode} (distribution: ${distribution})`,
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
