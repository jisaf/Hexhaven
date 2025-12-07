/**
 * Objective System Type Definitions for Hexhaven Multiplayer
 * Phase 2 of Game Completion System (Issue #186)
 *
 * Provides comprehensive types for:
 * - Template-based objectives (kill_all_monsters, survive_rounds, etc.)
 * - Custom JavaScript function evaluation
 * - State exposure API for objective evaluations
 * - Progress tracking for objectives
 */

import type { AxialCoordinates, Condition, ElementState } from './entities';

// ========== OBJECTIVE TEMPLATE TYPES ==========

/**
 * Supported objective template types
 * Each template has predefined evaluation logic
 */
export type ObjectiveTemplateType =
  | 'kill_all_monsters' // All monsters must be dead
  | 'kill_monster_type' // Kill all monsters of a specific type
  | 'kill_boss' // Kill a specific boss monster
  | 'survive_rounds' // Survive for N rounds
  | 'collect_loot' // Collect N loot tokens
  | 'reach_location' // Any/all character(s) reach a hex position
  | 'protect_npc' // NPC survives for N rounds (future NPCs)
  | 'time_limit' // Complete within N rounds
  | 'no_damage' // All characters at full health (no one takes damage)
  | 'minimum_health' // All characters above a health threshold
  | 'collect_treasure' // Collect specific treasure(s)
  | 'escape' // All living characters reach exit location(s)
  | 'custom'; // Custom JavaScript function evaluation

/**
 * Parameters for template-based objectives
 * Different templates require different parameters
 */
export interface ObjectiveParams {
  // For kill_monster_type, kill_boss
  monsterType?: string;
  monsterTypes?: string[]; // For killing multiple specific types

  // For survive_rounds, time_limit, protect_npc
  rounds?: number;

  // For collect_loot, collect_treasure
  target?: number; // Number to collect
  treasureIds?: string[]; // Specific treasure IDs

  // For reach_location, escape
  location?: AxialCoordinates;
  locations?: AxialCoordinates[]; // Multiple valid locations
  requireAll?: boolean; // Do all characters need to reach, or just one?

  // For minimum_health
  healthPercent?: number; // 0-100, percentage of max health

  // For protect_npc
  npcId?: string;

  // For custom objectives - additional context
  customData?: Record<string, unknown>;
}

/**
 * Milestone configuration for progress tracking
 * Milestones trigger at specific progress percentages
 */
export interface ObjectiveMilestone {
  percent: number; // 0-100
  message?: string; // Optional message to display
  reward?: ObjectiveReward; // Optional intermediate reward
}

/**
 * Reward granted upon objective completion or milestone
 */
export interface ObjectiveReward {
  experience?: number;
  gold?: number;
  items?: string[]; // Item IDs
  unlocks?: string[]; // Scenario or character unlocks
}

/**
 * Complete objective definition
 * Used in scenario JSON to define objectives
 */
export interface ObjectiveDefinition {
  /** Unique identifier for this objective */
  id: string;

  /** Template type or 'custom' for custom function */
  type: ObjectiveTemplateType;

  /** Human-readable description shown to players */
  description: string;

  /** Parameters for template-based objectives */
  params?: ObjectiveParams;

  /**
   * Custom JavaScript function body for evaluation
   * Only used when type is 'custom'
   * Function receives ObjectiveEvaluationContext as 'context'
   * Must return boolean or ObjectiveResult
   *
   * Example: "return context.monsters.filter(m => m.type === 'Boss' && m.isDead).length >= 1;"
   */
  customFunction?: string;

  /** Whether to track and display progress (e.g., "3/5 monsters killed") */
  trackProgress?: boolean;

  /** Milestone percentages for intermediate notifications */
  milestones?: number[] | ObjectiveMilestone[];

  /** Rewards granted upon completion */
  rewards?: ObjectiveReward;

  /** Whether this objective is hidden until certain conditions are met */
  hidden?: boolean;

  /** Condition for revealing a hidden objective */
  revealCondition?: string; // Custom function body that returns boolean

  /** Order in which objectives should be displayed */
  displayOrder?: number;
}

/**
 * Container for scenario objectives
 * A scenario has one primary objective and optional secondary objectives
 */
export interface ScenarioObjectives {
  /** Main objective required for scenario victory */
  primary: ObjectiveDefinition;

  /** Optional secondary objectives for bonus rewards */
  secondary?: ObjectiveDefinition[];

  /** Optional failure conditions (if any become true, scenario is lost) */
  failureConditions?: ObjectiveDefinition[];

  /** Global time limit in rounds (if any) */
  globalTimeLimit?: number;
}

// ========== EVALUATION CONTEXT ==========

/**
 * Clean character data exposed to objective evaluators
 * Sanitized to only include what's needed for evaluation
 */
export interface EvaluationCharacter {
  id: string;
  playerId: string;
  classType: string;
  health: number;
  maxHealth: number;
  position: AxialCoordinates;
  conditions: Condition[];
  inventory: {
    gold: number;
    items: string[];
  };
  isExhausted: boolean;
  isDead: boolean;
}

/**
 * Clean monster data exposed to objective evaluators
 */
export interface EvaluationMonster {
  id: string;
  type: string;
  health: number;
  maxHealth: number;
  position: AxialCoordinates;
  isDead: boolean;
  isElite: boolean;
  conditions: Condition[];
}

/**
 * Clean NPC data exposed to objective evaluators (future feature)
 */
export interface EvaluationNPC {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  position: AxialCoordinates;
  isDead: boolean;
}

/**
 * Board state exposed to objective evaluators
 */
export interface EvaluationBoard {
  /** Loot tokens on the board */
  lootTokens: {
    id: string;
    position: AxialCoordinates;
    value: number;
    isCollected: boolean;
    collectedBy: string | null;
  }[];

  /** Treasure locations and collection status */
  treasures: {
    id: string;
    position: AxialCoordinates;
    isCollected: boolean;
    collectedBy: string | null;
  }[];

  /** Special locations (exits, objectives, etc.) */
  specialLocations: {
    type: string;
    position: AxialCoordinates;
    data?: Record<string, unknown>;
  }[];

  /** Map dimensions for boundary checking */
  bounds: {
    minQ: number;
    maxQ: number;
    minR: number;
    maxR: number;
  };
}

/**
 * Game state exposed to objective evaluators
 */
export interface EvaluationGame {
  /** Current round number (1-based) */
  currentRound: number;

  /** Total turns taken in the scenario */
  turnCount: number;

  /** Active elemental infusions */
  elementsActive: {
    fire: ElementState;
    ice: ElementState;
    air: ElementState;
    earth: ElementState;
    light: ElementState;
    dark: ElementState;
  };

  /** Scenario difficulty level */
  difficulty: number;

  /** Scenario ID */
  scenarioId: string;

  /** Room/game ID */
  roomId: string;
}

/**
 * Progress tracking data for an objective
 */
export interface ObjectiveProgressData {
  /** Current progress value */
  current: number;

  /** Target value for completion */
  target: number;

  /** Progress as percentage (0-100) */
  percent: number;

  /** Milestones that have been reached */
  milestonesReached: number[];

  /** Additional progress details */
  details?: Record<string, unknown>;
}

/**
 * Complete context provided to objective evaluators
 * This is the 'context' object available in custom functions
 */
export interface ObjectiveEvaluationContext {
  /** All characters in the game */
  characters: EvaluationCharacter[];

  /** All monsters in the game (including dead ones) */
  monsters: EvaluationMonster[];

  /** NPCs in the game (future feature) */
  npcs: EvaluationNPC[];

  /** Board state (loot, treasures, special locations) */
  board: EvaluationBoard;

  /** Current game state */
  game: EvaluationGame;

  /** Progress data for each objective (keyed by objective ID) */
  progress: Record<string, ObjectiveProgressData>;

  /** Accumulated data across rounds (for tracking kills, damage, etc.) */
  accumulated: {
    totalMonstersKilled: number;
    totalDamageDealt: number;
    totalDamageTaken: number;
    totalLootCollected: number;
    totalGoldCollected: number;
    roundsCompleted: number;
    charactersExhausted: number;
    characterDeaths: number;
  };
}

// ========== EVALUATION RESULTS ==========

/**
 * Result of evaluating a single objective
 */
export interface ObjectiveResult {
  /** Whether the objective is complete */
  complete: boolean;

  /** Progress information (if trackProgress is enabled) */
  progress: ObjectiveProgressData | null;

  /** Error message if evaluation failed */
  error?: string;

  /** Whether this is a failure condition that was triggered */
  failed?: boolean;
}

/**
 * Result of evaluating all objectives for a scenario
 */
export interface ScenarioObjectiveResults {
  /** Primary objective result */
  primary: ObjectiveResult;

  /** Secondary objective results (keyed by objective ID) */
  secondary: Record<string, ObjectiveResult>;

  /** Failure condition results (keyed by objective ID) */
  failureConditions: Record<string, ObjectiveResult>;

  /** Overall scenario status */
  scenarioStatus: 'in_progress' | 'victory' | 'defeat';

  /** Reason for victory/defeat */
  reason?: string;

  /** Timestamp of evaluation */
  evaluatedAt: string;
}

/**
 * Progress entry stored per objective per room
 */
export interface ObjectiveProgressEntry {
  /** Objective ID */
  objectiveId: string;

  /** Current progress data */
  progress: ObjectiveProgressData;

  /** Last evaluation result */
  lastResult: ObjectiveResult;

  /** Milestones that have been notified to players */
  notifiedMilestones: number[];

  /** Timestamp of last update */
  updatedAt: string;
}

// ========== TEMPLATE FUNCTION SIGNATURES ==========

/**
 * Signature for template evaluation functions
 */
export type ObjectiveTemplateFunction = (
  params: ObjectiveParams,
  context: ObjectiveEvaluationContext,
) => ObjectiveResult;

/**
 * Map of template types to their evaluation functions
 */
export type ObjectiveTemplateMap = Record<
  Exclude<ObjectiveTemplateType, 'custom'>,
  ObjectiveTemplateFunction
>;

/**
 * Signature for progress calculation functions
 */
export type ProgressCalculationFunction = (
  params: ObjectiveParams,
  context: ObjectiveEvaluationContext,
) => ObjectiveProgressData;

/**
 * Map of template types to their progress calculation functions
 */
export type ProgressCalculationMap = Partial<
  Record<Exclude<ObjectiveTemplateType, 'custom'>, ProgressCalculationFunction>
>;

// ========== WEBSOCKET EVENTS ==========

/**
 * Payload for objective progress update event
 */
export interface ObjectiveProgressPayload {
  objectiveId: string;
  objectiveType: 'primary' | 'secondary' | 'failure';
  progress: ObjectiveProgressData;
  milestoneReached?: number;
  milestoneMessage?: string;
}

/**
 * Payload for objective completed event
 */
export interface ObjectiveCompletedPayload {
  objectiveId: string;
  objectiveType: 'primary' | 'secondary';
  rewards?: ObjectiveReward;
}

/**
 * Payload for scenario failed event (failure condition triggered)
 */
export interface ScenarioFailedPayload {
  failureConditionId: string;
  reason: string;
}

// ========== SECURITY TYPES ==========

/**
 * Result of validating a custom function
 */
export interface CustomFunctionValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Configuration for custom function security
 */
export interface CustomFunctionSecurityConfig {
  /** Maximum execution time in milliseconds */
  maxExecutionTime: number;

  /** Forbidden patterns that indicate dangerous code */
  forbiddenPatterns: string[];

  /** Whether to log rejected functions */
  logRejections: boolean;
}
