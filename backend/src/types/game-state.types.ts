/**
 * Game State Types (002 - Phase 6)
 * Event sourcing types for game state management
 */

export enum GameStatus {
  LOBBY = 'LOBBY',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED',
}

export enum GameEventType {
  GAME_STARTED = 'GAME_STARTED',
  PLAYER_JOINED = 'PLAYER_JOINED',
  PLAYER_LEFT = 'PLAYER_LEFT',
  TURN_STARTED = 'TURN_STARTED',
  CARD_PLAYED = 'CARD_PLAYED',
  ATTACK_EXECUTED = 'ATTACK_EXECUTED',
  DAMAGE_DEALT = 'DAMAGE_DEALT',
  MONSTER_DEFEATED = 'MONSTER_DEFEATED',
  LOOT_COLLECTED = 'LOOT_COLLECTED',
  ROUND_ENDED = 'ROUND_ENDED',
  SCENARIO_COMPLETED = 'SCENARIO_COMPLETED',
  GAME_COMPLETED = 'GAME_COMPLETED',
}

export interface GameEventData {
  eventType: GameEventType;
  timestamp: Date;
  data: any;
}

export interface CreateGameDto {
  roomCode: string;
  scenarioId: string;
  difficulty: number;
  hostCharacterId: string;
  campaignId?: string; // Optional: Campaign this game belongs to (Issue #244)
}

export interface JoinGameDto {
  characterId: string;
}

export interface GameWithCharacters {
  id: string;
  roomCode: string;
  scenarioId: string | null;
  campaignId: string | null; // Campaign this game belongs to (Issue #244)
  difficulty: number;
  status: GameStatus;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  characters: Array<{
    id: string;
    name: string;
    className: string;
    level: number;
    userId: string;
  }>;
}

export interface GameCompletionResult {
  victory: boolean;
  experienceGained: number;
  goldGained: number;
  itemsUnlocked: string[];
  charactersUpdated: string[];
}

export interface GameSnapshot {
  id: string;
  gameId: string;
  sequenceNum: number;
  stateData: any;
  createdAt: Date;
}

export interface GameEventRecord {
  id: string;
  gameId: string;
  sequenceNum: number;
  eventType: string;
  eventData: any;
  createdAt: Date;
}

/**
 * Options for scenario completion check
 *
 * Used by GameGateway.checkScenarioCompletion to control when victory is evaluated.
 * This enables deferred victory checks (at round end) while still checking defeats immediately.
 *
 * @see game.gateway.ts checkScenarioCompletion method
 * @see docs/game-completion-system.md for architecture details
 */
export interface ScenarioCompletionCheckOptions {
  /**
   * If false, only checks sub-objectives, defeat conditions, and narrative triggers (used during attack/turns)
   * If true, also checks primary objective completion for victory (used at round end)
   * @default true
   */
  checkPrimaryObjective?: boolean;
}
