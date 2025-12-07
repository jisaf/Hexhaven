/**
 * Game History DTOs (186 - Phase 9)
 * Data Transfer Objects for game history API endpoints
 */

/**
 * Query parameters for filtering game history
 */
export interface HistoryFiltersDto {
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
export interface UserStatisticsResponse {
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
export interface GameResultDetailResponse {
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
  objectiveProgress: Record<
    string,
    {
      current: number;
      target: number;
      completed: boolean;
    }
  >;

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
