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
