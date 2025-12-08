/**
 * Game Result Service (186 - Game Completion Phase 1)
 * Manages completed game results and player statistics for match history
 */

import {
  PrismaClient,
  GameResult,
  PlayerGameResult,
  Prisma,
} from '@prisma/client';
import { NotFoundError, ValidationError, ConflictError } from '../types/errors';

// ========== TYPE DEFINITIONS ==========

/**
 * Input data for saving a player's game result
 */
export interface PlayerGameResultInput {
  userId: string;
  characterId: string;
  characterClass: string;
  characterName: string;
  survived?: boolean;
  wasExhausted?: boolean;
  damageDealt?: number;
  damageTaken?: number;
  monstersKilled?: number;
  lootCollected?: number;
  cardsLost?: number;
  experienceGained?: number;
  goldGained?: number;
}

/**
 * Input data for saving a completed game result
 */
export interface GameResultData {
  gameId: string;
  roomCode: string;
  scenarioId?: string;
  scenarioName?: string;
  victory: boolean;
  roundsCompleted: number;
  completionTimeMs?: number;

  // Objective tracking
  primaryObjectiveCompleted?: boolean;
  secondaryObjectiveCompleted?: boolean;
  objectivesCompletedList?: string[];
  objectiveProgress?: Record<string, ObjectiveProgressEntry>;

  // Aggregate stats
  totalLootCollected?: number;
  totalExperience?: number;
  totalGold?: number;

  // Player results
  playerResults: PlayerGameResultInput[];
}

/**
 * Progress entry for an individual objective
 */
export interface ObjectiveProgressEntry {
  current: number;
  target: number;
  completed: boolean;
}

/**
 * Filters for querying game history
 */
export interface HistoryFilters {
  victory?: boolean;
  scenarioId?: string;
  characterId?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Game result with player results included
 */
export type GameResultWithPlayers = GameResult & {
  playerResults: PlayerGameResult[];
};

// ========== SERVICE CLASS ==========

export class GameResultService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Save a completed game result with all player statistics
   * @param data - The game result data to save
   * @returns The created game result with player results
   */
  async saveGameResult(data: GameResultData): Promise<GameResultWithPlayers> {
    // Validate required fields
    if (!data.gameId) {
      throw new ValidationError('Game ID is required');
    }
    if (!data.roomCode) {
      throw new ValidationError('Room code is required');
    }
    if (data.roundsCompleted < 0) {
      throw new ValidationError('Rounds completed cannot be negative');
    }
    if (!data.playerResults || data.playerResults.length === 0) {
      throw new ValidationError('At least one player result is required');
    }

    // Check if game result already exists
    const existingResult = await this.prisma.gameResult.findUnique({
      where: { gameId: data.gameId },
    });

    if (existingResult) {
      throw new ConflictError('Game result already exists for this game');
    }

    // Verify the game exists
    const game = await this.prisma.game.findUnique({
      where: { id: data.gameId },
    });

    if (!game) {
      throw new NotFoundError('Game not found', 'Game');
    }

    // Create the game result with player results in a transaction
    const gameResult = await this.prisma.$transaction(async (tx) => {
      // Create the game result
      const result = await tx.gameResult.create({
        data: {
          gameId: data.gameId,
          roomCode: data.roomCode,
          scenarioId: data.scenarioId ?? null,
          scenarioName: data.scenarioName ?? null,
          victory: data.victory,
          roundsCompleted: data.roundsCompleted,
          completionTimeMs: data.completionTimeMs ?? null,
          primaryObjectiveCompleted: data.primaryObjectiveCompleted ?? false,
          secondaryObjectiveCompleted:
            data.secondaryObjectiveCompleted ?? false,
          objectivesCompletedList: (data.objectivesCompletedList ??
            []) as unknown as Prisma.InputJsonValue,
          objectiveProgress: (data.objectiveProgress ??
            {}) as unknown as Prisma.InputJsonValue,
          totalLootCollected: data.totalLootCollected ?? 0,
          totalExperience: data.totalExperience ?? 0,
          totalGold: data.totalGold ?? 0,
        },
      });

      // Create player results
      await tx.playerGameResult.createMany({
        data: data.playerResults.map((player) => ({
          gameResultId: result.id,
          userId: player.userId,
          characterId: player.characterId,
          characterClass: player.characterClass,
          characterName: player.characterName,
          survived: player.survived ?? true,
          wasExhausted: player.wasExhausted ?? false,
          damageDealt: player.damageDealt ?? 0,
          damageTaken: player.damageTaken ?? 0,
          monstersKilled: player.monstersKilled ?? 0,
          lootCollected: player.lootCollected ?? 0,
          cardsLost: player.cardsLost ?? 0,
          experienceGained: player.experienceGained ?? 0,
          goldGained: player.goldGained ?? 0,
        })),
      });

      // Return result with player results
      return tx.gameResult.findUnique({
        where: { id: result.id },
        include: { playerResults: true },
      });
    });

    if (!gameResult) {
      throw new Error('Failed to create game result');
    }

    return gameResult;
  }

  /**
   * Get a user's game history with optional filters
   * @param userId - The user's ID
   * @param filters - Optional filters for the query
   * @returns Array of game results with player results
   */
  async getGameHistory(
    userId: string,
    filters?: HistoryFilters,
  ): Promise<GameResultWithPlayers[]> {
    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    // Build the where clause for filtering
    const whereClause: Record<string, unknown> = {
      playerResults: {
        some: { userId },
      },
    };

    // Apply filters
    if (filters?.victory !== undefined) {
      whereClause.victory = filters.victory;
    }

    if (filters?.scenarioId) {
      whereClause.scenarioId = filters.scenarioId;
    }

    if (filters?.characterId) {
      whereClause.playerResults = {
        some: {
          userId,
          characterId: filters.characterId,
        },
      };
    }

    // Date range filtering
    if (filters?.fromDate || filters?.toDate) {
      whereClause.completedAt = {};
      if (filters.fromDate) {
        (whereClause.completedAt as Record<string, Date>).gte =
          filters.fromDate;
      }
      if (filters.toDate) {
        (whereClause.completedAt as Record<string, Date>).lte = filters.toDate;
      }
    }

    // Execute query with pagination
    const results = await this.prisma.gameResult.findMany({
      where: whereClause,
      include: {
        playerResults: true,
      },
      orderBy: { completedAt: 'desc' },
      take: filters?.limit ?? 50,
      skip: filters?.offset ?? 0,
    });

    return results;
  }

  /**
   * Get a single game result by ID
   * @param gameResultId - The game result ID
   * @returns The game result with player results, or null if not found
   */
  async getGameById(
    gameResultId: string,
  ): Promise<GameResultWithPlayers | null> {
    if (!gameResultId) {
      throw new ValidationError('Game result ID is required');
    }

    const result = await this.prisma.gameResult.findUnique({
      where: { id: gameResultId },
      include: { playerResults: true },
    });

    return result;
  }

  /**
   * Get a game result by the original game ID
   * @param gameId - The original game ID
   * @returns The game result with player results, or null if not found
   */
  async getGameResultByGameId(
    gameId: string,
  ): Promise<GameResultWithPlayers | null> {
    if (!gameId) {
      throw new ValidationError('Game ID is required');
    }

    const result = await this.prisma.gameResult.findUnique({
      where: { gameId },
      include: { playerResults: true },
    });

    return result;
  }

  /**
   * Get aggregate statistics for a user
   * @param userId - The user's ID
   * @returns User's aggregate game statistics
   */
  async getUserStatistics(userId: string): Promise<{
    totalGames: number;
    victories: number;
    defeats: number;
    winRate: number;
    totalExperience: number;
    totalGold: number;
    totalMonstersKilled: number;
    favoriteClass: string | null;
  }> {
    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    // Get all player results for this user
    const playerResults = await this.prisma.playerGameResult.findMany({
      where: { userId },
      include: { gameResult: true },
    });

    if (playerResults.length === 0) {
      return {
        totalGames: 0,
        victories: 0,
        defeats: 0,
        winRate: 0,
        totalExperience: 0,
        totalGold: 0,
        totalMonstersKilled: 0,
        favoriteClass: null,
      };
    }

    // Calculate aggregate stats
    const totalGames = playerResults.length;
    const victories = playerResults.filter((r) => r.gameResult.victory).length;
    const defeats = totalGames - victories;
    const winRate = totalGames > 0 ? (victories / totalGames) * 100 : 0;

    const totalExperience = playerResults.reduce(
      (sum, r) => sum + r.experienceGained,
      0,
    );
    const totalGold = playerResults.reduce((sum, r) => sum + r.goldGained, 0);
    const totalMonstersKilled = playerResults.reduce(
      (sum, r) => sum + r.monstersKilled,
      0,
    );

    // Find most played class
    const classCounts = playerResults.reduce(
      (acc, r) => {
        acc[r.characterClass] = (acc[r.characterClass] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const favoriteClass =
      Object.entries(classCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

    return {
      totalGames,
      victories,
      defeats,
      winRate: Math.round(winRate * 100) / 100, // Round to 2 decimal places
      totalExperience,
      totalGold,
      totalMonstersKilled,
      favoriteClass,
    };
  }

  /**
   * Get leaderboard data for a scenario
   * @param scenarioId - The scenario ID
   * @param limit - Maximum number of results to return
   * @returns Array of top game results for the scenario
   */
  async getScenarioLeaderboard(
    scenarioId: string,
    limit: number = 10,
  ): Promise<GameResultWithPlayers[]> {
    if (!scenarioId) {
      throw new ValidationError('Scenario ID is required');
    }

    const results = await this.prisma.gameResult.findMany({
      where: {
        scenarioId,
        victory: true,
      },
      include: { playerResults: true },
      orderBy: [
        { roundsCompleted: 'asc' }, // Fewer rounds = better
        { completionTimeMs: 'asc' }, // Faster = better
      ],
      take: limit,
    });

    return results;
  }
}
