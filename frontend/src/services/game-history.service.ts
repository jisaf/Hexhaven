/**
 * Game History Service (186 - Phase 9)
 * Handles API calls for match history and game statistics
 */

import { authService } from './auth.service';
import { getApiUrl } from '../config/api';

// ========== TYPE DEFINITIONS ==========

/**
 * Query parameters for filtering game history
 */
export interface HistoryFilters {
  limit?: number;
  offset?: number;
  characterClass?: string;
  scenarioId?: string;
  victory?: boolean;
  fromDate?: string; // ISO date string
  toDate?: string; // ISO date string
}

/**
 * Single game in history list
 */
export interface GameHistoryItem {
  id: string;
  roomCode: string;
  scenarioName: string | null;
  scenarioId: string | null;
  victory: boolean;
  completedAt: string; // ISO date
  roundsCompleted: number;

  // Player-specific result (the requesting player)
  playerResult: {
    characterClass: string;
    characterName: string;
    damageDealt: number;
    experienceGained: number;
    goldGained: number;
    monstersKilled: number;
    survived: boolean;
  };

  // Other players in the game
  otherPlayers: Array<{
    characterClass: string;
    characterName: string;
    survived: boolean;
  }>;
}

/**
 * Response for game history endpoint
 */
export interface GameHistoryResponse {
  total: number;
  games: GameHistoryItem[];
}

/**
 * User statistics response
 */
export interface UserStatistics {
  totalGames: number;
  victories: number;
  defeats: number;
  winRate: number;
  totalExperience: number;
  totalGold: number;
  totalMonstersKilled: number;
  favoriteClass: string | null;
}

/**
 * Detailed game result response
 */
export interface GameResultDetail {
  id: string;
  gameId: string;
  roomCode: string;
  scenarioId: string | null;
  scenarioName: string | null;
  victory: boolean;
  roundsCompleted: number;
  completionTimeMs: number | null;
  completedAt: string; // ISO date

  // Objectives
  primaryObjectiveCompleted: boolean;
  secondaryObjectiveCompleted: boolean;
  objectivesCompletedList: string[];
  objectiveProgress: Record<string, {
    current: number;
    target: number;
    completed: boolean;
  }>;

  // Aggregate stats
  totalLootCollected: number;
  totalExperience: number;
  totalGold: number;

  // All player results
  playerResults: Array<{
    userId: string;
    characterId: string;
    characterClass: string;
    characterName: string;
    survived: boolean;
    wasExhausted: boolean;
    damageDealt: number;
    damageTaken: number;
    monstersKilled: number;
    lootCollected: number;
    cardsLost: number;
    experienceGained: number;
    goldGained: number;
  }>;
}

// ========== SERVICE CLASS ==========

class GameHistoryService {
  /**
   * Get player's game history
   */
  async getHistory(userId: string, filters?: HistoryFilters): Promise<GameHistoryResponse> {
    const params = new URLSearchParams();

    if (filters?.limit !== undefined) {
      params.append('limit', filters.limit.toString());
    }
    if (filters?.offset !== undefined) {
      params.append('offset', filters.offset.toString());
    }
    if (filters?.characterClass) {
      params.append('characterClass', filters.characterClass);
    }
    if (filters?.scenarioId) {
      params.append('scenarioId', filters.scenarioId);
    }
    if (filters?.victory !== undefined) {
      params.append('victory', filters.victory.toString());
    }
    if (filters?.fromDate) {
      params.append('fromDate', filters.fromDate);
    }
    if (filters?.toDate) {
      params.append('toDate', filters.toDate);
    }

    const url = `${getApiUrl()}/games/history/${userId}${params.toString() ? '?' + params.toString() : ''}`;

    const response = await authService.authenticatedFetch(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch game history');
    }

    return await response.json();
  }

  /**
   * Get detailed game result
   */
  async getGameResult(gameResultId: string): Promise<GameResultDetail> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/games/history/result/${gameResultId}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch game result details');
    }

    return await response.json();
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<UserStatistics> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/games/history/stats/${userId}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch user statistics');
    }

    return await response.json();
  }
}

export const gameHistoryService = new GameHistoryService();
