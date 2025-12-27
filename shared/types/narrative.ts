/**
 * Campaign Narrative System Types
 *
 * Supports before/during/after scenario narrative display with
 * complex AND/OR trigger conditions and game effects.
 */

import type { AxialCoordinates } from './entities';

// ========== CONDITION TYPES ==========

/**
 * Logical operator for combining conditions
 */
export type ConditionOperator = 'AND' | 'OR';

/**
 * Supported condition types for narrative triggers
 */
export type NarrativeConditionType =
  | 'character_on_hex' // Single character on hex
  | 'characters_on_hexes' // Multiple characters on specific hexes
  | 'monsters_killed' // X monsters killed
  | 'round_reached' // Round X reached
  | 'all_enemies_dead' // All enemies defeated
  | 'treasure_collected' // Specific treasure collected
  | 'door_opened' // Specific door opened
  | 'loot_collected'; // Loot collected from hex

/**
 * Base condition interface
 */
export interface BaseCondition {
  type: NarrativeConditionType;
  negate?: boolean; // Invert the condition result
}

/**
 * Character on hex condition
 */
export interface CharacterOnHexCondition extends BaseCondition {
  type: 'character_on_hex';
  params: {
    hex: AxialCoordinates;
    characterId?: string; // Specific character or any
    characterClass?: string; // Specific class or any
  };
}

/**
 * Multiple characters positioned on hexes
 */
export interface CharactersOnHexesCondition extends BaseCondition {
  type: 'characters_on_hexes';
  params: {
    hexes: AxialCoordinates[];
    requireAll: boolean; // All hexes must be occupied
    mustBeSimultaneous: boolean; // All at same time vs cumulative
  };
}

/**
 * Monsters killed condition
 */
export interface MonstersKilledCondition extends BaseCondition {
  type: 'monsters_killed';
  params: {
    count: number;
    monsterType?: string; // Specific type or any
  };
}

/**
 * Round reached condition
 */
export interface RoundReachedCondition extends BaseCondition {
  type: 'round_reached';
  params: {
    round: number;
  };
}

/**
 * All enemies dead condition
 */
export interface AllEnemiesDeadCondition extends BaseCondition {
  type: 'all_enemies_dead';
  params?: Record<string, never>;
}

/**
 * Treasure collected condition
 */
export interface TreasureCollectedCondition extends BaseCondition {
  type: 'treasure_collected';
  params: {
    treasureId: string;
  };
}

/**
 * Door opened condition
 */
export interface DoorOpenedCondition extends BaseCondition {
  type: 'door_opened';
  params: {
    doorId?: string;
    doorHex?: AxialCoordinates;
  };
}

/**
 * Loot collected from hex condition
 */
export interface LootCollectedCondition extends BaseCondition {
  type: 'loot_collected';
  params: {
    hex: AxialCoordinates;
  };
}

/**
 * Union type for all leaf conditions
 */
export type NarrativeConditionLeaf =
  | CharacterOnHexCondition
  | CharactersOnHexesCondition
  | MonstersKilledCondition
  | RoundReachedCondition
  | AllEnemiesDeadCondition
  | TreasureCollectedCondition
  | DoorOpenedCondition
  | LootCollectedCondition;

/**
 * Compound condition with AND/OR logic
 */
export interface CompoundCondition {
  operator: ConditionOperator;
  conditions: NarrativeCondition[];
}

/**
 * A condition can be a leaf condition or a compound condition
 */
export type NarrativeCondition = NarrativeConditionLeaf | CompoundCondition;

/**
 * Type guard to check if a condition is a compound condition
 */
export function isCompoundCondition(
  condition: NarrativeCondition
): condition is CompoundCondition {
  return 'operator' in condition;
}

/**
 * Type guard to check if a condition is a leaf condition
 */
export function isLeafCondition(
  condition: NarrativeCondition
): condition is NarrativeConditionLeaf {
  return 'type' in condition && !('operator' in condition);
}

// ========== NARRATIVE CONTENT ==========

/**
 * Narrative content structure
 * Note: rewards is optional and primarily used for victory/defeat narratives
 */
export interface NarrativeContent {
  title?: string;
  text: string;
  imageUrl?: string;
  rewards?: NarrativeRewards;
}

/**
 * How rewards are distributed among players
 * - triggerer: Only the player who triggered it gets the reward
 * - collective: Total is split evenly among all players
 * - everyone: Each player gets the full reward amount (default)
 */
export type RewardDistribution = 'triggerer' | 'collective' | 'everyone';

/**
 * Rewards granted when narrative is acknowledged
 */
export interface NarrativeRewards {
  gold?: number;
  xp?: number;
  items?: string[];
  distribution?: RewardDistribution; // Defaults to 'everyone'
}

/**
 * Monster spawn definition for game effects
 */
export interface MonsterSpawnDef {
  type: string;
  hex: AxialCoordinates;
  isElite?: boolean;
}

/**
 * Overlay spawn definition for game effects
 */
export interface OverlaySpawnDef {
  type: string;
  hex: AxialCoordinates;
}

/**
 * Game effects triggered by narrative
 */
export interface NarrativeGameEffects {
  spawnMonsters?: MonsterSpawnDef[];
  unlockDoors?: AxialCoordinates[];
  revealHexes?: AxialCoordinates[];
  addOverlays?: OverlaySpawnDef[];
  removeOverlays?: AxialCoordinates[];
}

/**
 * Complete trigger definition
 */
export interface NarrativeTriggerDef {
  id: string;
  triggerId: string;
  displayOrder?: number;
  content: NarrativeContent;
  conditions: NarrativeCondition;
  rewards?: NarrativeRewards;
  gameEffects?: NarrativeGameEffects;
}

/**
 * Complete scenario narrative definition
 */
export interface ScenarioNarrativeDef {
  scenarioId: string;
  intro?: NarrativeContent;
  victory?: NarrativeContent;
  defeat?: NarrativeContent;
  triggers?: NarrativeTriggerDef[];
}

// ========== RUNTIME STATE ==========

/**
 * State of a narrative trigger in a game session
 */
export interface TriggerState {
  triggerId: string;
  fired: boolean;
  firedAt?: number; // Timestamp when fired
}

/**
 * Player acknowledgment state
 */
export interface NarrativeAcknowledgment {
  playerId: string;
  playerName: string;
  acknowledged: boolean;
  acknowledgedAt?: number;
}

/**
 * Narrative display type
 */
export type NarrativeType = 'intro' | 'trigger' | 'victory' | 'defeat';

/**
 * Active narrative display state
 */
export interface ActiveNarrative {
  id: string; // Unique ID for this narrative instance
  type: NarrativeType;
  triggerId?: string; // For trigger type
  triggeredBy?: string; // Player ID who triggered it (for 'triggerer' distribution)
  content: NarrativeContent;
  rewards?: NarrativeRewards;
  gameEffects?: NarrativeGameEffects;
  acknowledgments: NarrativeAcknowledgment[];
  displayedAt: number;
  timeoutMs: number; // Default 60000
  disconnectedPlayers: string[]; // Players who disconnected during narrative
}

// ========== GAME CONTEXT FOR EVALUATION ==========

/**
 * Character position info for condition evaluation
 */
export interface CharacterPositionInfo {
  id: string;
  characterClass: string;
  hex: AxialCoordinates;
}

/**
 * Monster info for condition evaluation
 */
export interface MonsterInfo {
  id: string;
  type: string;
  isAlive: boolean;
}

/**
 * Context passed to condition evaluator
 */
export interface NarrativeGameContext {
  currentRound: number;
  characters: CharacterPositionInfo[];
  monsters: MonsterInfo[];
  monstersKilled: number;
  monstersKilledByType: Record<string, number>;
  openedDoors: AxialCoordinates[];
  collectedTreasures: string[];
  collectedLootHexes: AxialCoordinates[];
}
