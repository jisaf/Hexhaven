/**
 * Game History Controller (186 - Phase 9)
 * REST API endpoints for viewing match history and game statistics
 */

import {
  Controller,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { GameResultService } from '../services/game-result.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { prisma } from '../db/client';
import type {
  HistoryFiltersDto,
  GameHistoryResponse,
  GameHistoryItem,
  UserStatisticsResponse,
  GameResultDetailResponse,
} from '../types/game-history.dto';

@Controller('api/games/history')
@UseGuards(JwtAuthGuard)
export class GameHistoryController {
  private gameResultService: GameResultService;

  constructor() {
    this.gameResultService = new GameResultService(prisma);
  }

  /**
   * Get player's game history
   * GET /api/games/history/:userId
   */
  @Get(':userId')
  @HttpCode(HttpStatus.OK)
  async getPlayerHistory(
    @Param('userId') userId: string,
    @Query() filters: HistoryFiltersDto,
  ): Promise<GameHistoryResponse> {
    // Validate and parse query parameters
    const limit = filters.limit ? parseInt(String(filters.limit), 10) : 20;
    const offset = filters.offset ? parseInt(String(filters.offset), 10) : 0;

    if (isNaN(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    if (isNaN(offset) || offset < 0) {
      throw new BadRequestException('Offset must be non-negative');
    }

    // Parse victory filter
    let victory: boolean | undefined;
    if (filters.victory !== undefined) {
      const victoryValue = String(filters.victory);
      if (victoryValue === 'true') {
        victory = true;
      } else if (victoryValue === 'false') {
        victory = false;
      }
    }

    // Parse date filters
    let fromDate: Date | undefined;
    let toDate: Date | undefined;

    if (filters.fromDate) {
      fromDate = new Date(filters.fromDate);
      if (isNaN(fromDate.getTime())) {
        throw new BadRequestException('Invalid fromDate format');
      }
    }

    if (filters.toDate) {
      toDate = new Date(filters.toDate);
      if (isNaN(toDate.getTime())) {
        throw new BadRequestException('Invalid toDate format');
      }
    }

    // Fetch game history
    const results = await this.gameResultService.getGameHistory(userId, {
      victory,
      scenarioId: filters.scenarioId,
      fromDate,
      toDate,
      limit,
      offset,
    });

    // Transform results into response format
    const games: GameHistoryItem[] = results.map((result) => {
      // Find the requesting player's result
      const playerResult = result.playerResults.find(
        (pr) => pr.userId === userId,
      );

      if (!playerResult) {
        throw new Error(`Player result not found for user ${userId}`);
      }

      // Get other players
      const otherPlayers = result.playerResults
        .filter((pr) => pr.userId !== userId)
        .map((pr) => ({
          characterClass: pr.characterClass,
          characterName: pr.characterName,
          survived: pr.survived,
        }));

      return {
        id: result.id,
        roomCode: result.roomCode,
        scenarioName: result.scenarioName,
        scenarioId: result.scenarioId,
        victory: result.victory,
        completedAt: result.completedAt.toISOString(),
        roundsCompleted: result.roundsCompleted,
        playerResult: {
          characterClass: playerResult.characterClass,
          characterName: playerResult.characterName,
          damageDealt: playerResult.damageDealt,
          experienceGained: playerResult.experienceGained,
          goldGained: playerResult.goldGained,
          monstersKilled: playerResult.monstersKilled,
          survived: playerResult.survived,
        },
        otherPlayers,
      };
    });

    // For total count, we need to get the count without limit/offset
    // This is a simplified version - in production you might want a separate count query
    const totalResults = await this.gameResultService.getGameHistory(userId, {
      victory,
      scenarioId: filters.scenarioId,
      fromDate,
      toDate,
    });

    return {
      total: totalResults.length,
      games,
    };
  }

  /**
   * Get detailed game result
   * GET /api/games/history/result/:gameResultId
   */
  @Get('result/:gameResultId')
  @HttpCode(HttpStatus.OK)
  async getGameResult(
    @Param('gameResultId') gameResultId: string,
  ): Promise<GameResultDetailResponse> {
    const result = await this.gameResultService.getGameById(gameResultId);

    if (!result) {
      throw new NotFoundException('Game result not found');
    }

    // Parse JSON fields
    const objectivesCompletedList = Array.isArray(
      result.objectivesCompletedList,
    )
      ? (result.objectivesCompletedList as string[])
      : [];

    const objectiveProgress =
      typeof result.objectiveProgress === 'object' &&
      result.objectiveProgress !== null
        ? (result.objectiveProgress as Record<
            string,
            {
              current: number;
              target: number;
              completed: boolean;
            }
          >)
        : {};

    return {
      id: result.id,
      gameId: result.gameId,
      roomCode: result.roomCode,
      scenarioId: result.scenarioId,
      scenarioName: result.scenarioName,
      victory: result.victory,
      roundsCompleted: result.roundsCompleted,
      completionTimeMs: result.completionTimeMs,
      completedAt: result.completedAt.toISOString(),
      primaryObjectiveCompleted: result.primaryObjectiveCompleted,
      secondaryObjectiveCompleted: result.secondaryObjectiveCompleted,
      objectivesCompletedList,
      objectiveProgress,
      totalLootCollected: result.totalLootCollected,
      totalExperience: result.totalExperience,
      totalGold: result.totalGold,
      playerResults: result.playerResults.map((pr) => ({
        userId: pr.userId,
        characterId: pr.characterId,
        characterClass: pr.characterClass,
        characterName: pr.characterName,
        survived: pr.survived,
        wasExhausted: pr.wasExhausted,
        damageDealt: pr.damageDealt,
        damageTaken: pr.damageTaken,
        monstersKilled: pr.monstersKilled,
        lootCollected: pr.lootCollected,
        cardsLost: pr.cardsLost,
        experienceGained: pr.experienceGained,
        goldGained: pr.goldGained,
      })),
    };
  }

  /**
   * Get user statistics
   * GET /api/games/history/stats/:userId
   */
  @Get('stats/:userId')
  @HttpCode(HttpStatus.OK)
  async getUserStatistics(
    @Param('userId') userId: string,
  ): Promise<UserStatisticsResponse> {
    const stats = await this.gameResultService.getUserStatistics(userId);

    return {
      totalGames: stats.totalGames,
      victories: stats.victories,
      defeats: stats.defeats,
      winRate: stats.winRate,
      totalExperience: stats.totalExperience,
      totalGold: stats.totalGold,
      totalMonstersKilled: stats.totalMonstersKilled,
      favoriteClass: stats.favoriteClass,
    };
  }
}
