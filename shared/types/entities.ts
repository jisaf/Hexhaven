/**
 * Shared entity type definitions for Hexhaven Multiplayer
 * Used across both frontend and backend for type-safe communication
 */

// Import action types from modifiers for local use
import type { CardAction as _CardAction } from './modifiers';
import type { ScenarioObjectives } from './objectives';

// Re-export action types from modifiers
export type {
  CardAction,
  Modifier,
  AttackAction,
  MoveAction,
  HealAction,
  LootAction,
  SpecialAction,
  SummonAction,
  TextAction,
  SummonDefinition,
  // Modifier types
  RangeModifier,
  TargetModifier,
  PierceModifier,
  AreaOfEffectModifier,
  JumpModifier,
  TeleportModifier,
  PushModifier,
  PullModifier,
  InfuseModifier,
  ConsumeModifier,
  ConditionModifier,
  RoundModifier,
  PersistentModifier,
  LostModifier,
  RecoverModifier,
  DiscardModifier,
  ShieldModifier,
  RetaliateModifier,
  HealModifier,
  XPModifier,
} from './modifiers';

// Re-export CardAction as Action for backward compatibility
export type { CardAction as Action } from './modifiers';

// Type alias for use within this file
type Action = _CardAction;

// Re-export helper functions
export {
  getRange,
  hasJump,
  getPush,
  getPull,
  getConditions,
  isLostAction,
  isPersistent,
  getXPValue,
  getShield,
  getRetaliate,
  getInfuseModifiers,
  getConsumeModifiers,
  getPierce,
  getTarget,
  getAoE,
} from './modifiers';

// ========== COORDINATE TYPES ==========

export interface AxialCoordinates {
  q: number;
  r: number;
}

export interface CubeCoordinates {
  q: number;
  r: number;
  s: number;
}

// ========== ENUMS ==========

export enum RoomStatus {
  LOBBY = 'lobby',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}

export enum ConnectionStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
}

export enum CharacterClass {
  BRUTE = 'Brute',
  TINKERER = 'Tinkerer',
  SPELLWEAVER = 'Spellweaver',
  SCOUNDREL = 'Scoundrel',
  CRAGHEART = 'Cragheart',
  MINDTHIEF = 'Mindthief',
  TESTICONCLASS = 'TestIconClass',
}

export enum TerrainType {
  NORMAL = 'normal',
  OBSTACLE = 'obstacle',
  DIFFICULT = 'difficult',
  HAZARDOUS = 'hazardous',
}

export enum HexFeatureType {
  WALL = 'wall',
  DOOR = 'door',
  TRAP = 'trap',
}

export enum TriggerType {
  ON_ENTER = 'onEnter',
}

export interface Trigger {
  type: TriggerType;
  // actions will be defined later
}

export interface HexFeature {
  type: HexFeatureType;
  isOpen?: boolean; // For doors
}

export enum Condition {
  // Negative Conditions (Enemies)
  POISON = 'poison',
  WOUND = 'wound',
  MUDDLE = 'muddle',
  IMMOBILIZE = 'immobilize',
  DISARM = 'disarm',
  STUN = 'stun',
  CURSE = 'curse',
  BRITTLE = 'brittle',
  BANE = 'bane',

  // Positive Conditions (Allies)
  STRENGTHEN = 'strengthen',
  BLESS = 'bless',
  REGENERATE = 'regenerate',
  WARD = 'ward',
  INVISIBLE = 'invisible',
}

export enum ElementType {
  FIRE = 'fire',
  ICE = 'ice',
  AIR = 'air',
  EARTH = 'earth',
  LIGHT = 'light',
  DARK = 'dark',
}

export enum ElementState {
  INERT = 'inert',
  INFUSING = 'infusing',
  WANING = 'waning',
  STRONG = 'strong',
}

// ========== CORE ENTITIES ==========

export interface Player {
  id: string;
  uuid: string;
  nickname: string;
  roomId: string | null;
  characterId: string | null;
  isHost: boolean;
  connectionStatus: ConnectionStatus;
  lastSeenAt: string; // ISO 8601 timestamp
  createdAt: string; // ISO 8601 timestamp
}

export interface GameRoom {
  id: string;
  roomCode: string;
  status: RoomStatus;
  scenarioId: string | null;
  currentRound: number | null;
  currentTurnIndex: number | null;
  turnOrder: string[] | null; // Array of entity UUIDs
  elementalState: ElementalInfusion | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface Character {
  id: string;
  playerId: string;
  userCharacterId?: string; // Database character ID (for inventory API)
  classType: CharacterClass | string;
  health: number;
  maxHealth: number;
  experience?: number;
  level?: number;
  currentHex: AxialCoordinates | null;
  abilityDeck: string[] | AbilityCard[]; // Array of AbilityCard UUIDs or full objects
  hand: string[];
  discardPile: string[];
  lostPile: string[];
  activeCards?: { top: string; bottom: string } | null; // Currently selected cards (backward compatible)
  conditions: Condition[] | string[];
  isExhausted: boolean;

  // NEW FIELDS (backward compatible additions for deck management)
  activeEffects?: ActiveCardEffect[]; // Cards in active area with persistent effects
  isResting?: boolean; // True if long rest this round
  restType?: 'none' | 'short' | 'long';
  shortRestState?: ShortRestState | null; // Minimal state for short rest
  exhaustionReason?: 'damage' | 'insufficient_cards' | null;
}

export interface ActiveCardEffect {
  cardId: string;
  effectType: 'persistent' | 'round';
  remainingUses?: number; // For persistent effects with limited uses
  appliedAt: number; // Round number when applied
}

export interface ShortRestState {
  randomCardId: string; // Server's random selection
  randomSeed: number; // For validation/replay
  hasRerolled: boolean; // True after one reroll
  timestamp: number;
}

export interface Monster {
  id: string;
  roomId: string;
  monsterType: string;
  isElite: boolean;
  health: number;
  maxHealth: number;
  movement: number;
  attack: number;
  range: number;
  currentHex: AxialCoordinates;
  specialAbilities: string[];
  conditions: Condition[];
  isDead: boolean;
}

/**
 * Summon entity - allied creatures summoned by players or scenarios (Issue #228)
 *
 * Design decisions:
 * - ownerId is optional: undefined for scenario/narrative allies, set for player-summoned
 * - playerControlled: if true, player gives orders; otherwise AI-controlled
 * - initiative: copies owner's initiative (treated as LOWER for tiebreakers)
 * - Summons act BEFORE their owner in turn order
 * - Monsters focus summons BEFORE their owner at same distance
 */
export interface Summon {
  id: string;
  roomId: string;
  ownerId?: string; // Character ID if player-summoned, undefined for scenario/narrative allies
  name: string;
  currentHex: AxialCoordinates;
  health: number;
  maxHealth: number;
  attack: number;
  move: number;
  range: number;
  conditions: Condition[];
  isDead: boolean;
  typeIcon?: string;
  playerControlled?: boolean; // If true, player controls instead of AI
  initiative: number; // Own initiative for scenario allies, or copies owner's
}

export interface AbilityCard {
  id: string;
  characterClass: CharacterClass;
  name: string;
  level: number | 'X';
  initiative: number;
  topAction: Action;
  bottomAction: Action;
  imageUrl?: string;
}

// Action interface is now imported from ./modifiers as CardAction
// The old string-based Action interface has been replaced with typed modifiers

// Card Enhancement interface (matches Prisma model)
export interface CardEnhancement {
  id: string;
  characterId: string;
  cardId: string;
  slot: 'TOP' | 'BOTTOM';
  enhancementType: string;
  appliedAt: Date;
}

// Enhanced Ability Card (base card + enhancements)
export interface EnhancedAbilityCard extends AbilityCard {
  enhancements: CardEnhancement[];
  isLost: boolean; // Has loss icon
  isPersistent: boolean; // Has persistent effect
  isRoundBonus: boolean; // Has round bonus effect
}

export interface Scenario {
  id: string;
  name: string;
  difficulty: number;
  mapLayout: HexTile[];
  monsterGroups: MonsterGroup[];
  // TODO: Simplify to AxialCoordinates[] and allow players to select their starting hex
  // See game.gateway.ts:538 for implementation details
  playerStartPositions: Record<number, AxialCoordinates[]>; // Keyed by player count (2, 3, 4)
  // Full objectives structure (seeded scenarios have this)
  objectives?: ScenarioObjectives;
  // String descriptions for backward compatibility with Scenario Designer
  objectivePrimary: string;
  objectiveSecondary?: string;
  treasures?: TreasureLocation[];
  // Background image configuration (Issue #191)
  backgroundImageUrl?: string;
  backgroundOpacity?: number;
  backgroundOffsetX?: number;
  backgroundOffsetY?: number;
  backgroundScale?: number;
  // Two-anchor alignment system for device-independent positioning
  backgroundAnchors?: BackgroundAnchors;
}

/**
 * Two-anchor alignment system for background images (Issue #191)
 *
 * Instead of storing absolute pixel offsets that break on different screens,
 * store the relationship between image points and hex positions.
 * This allows the background to be correctly positioned regardless of
 * viewport size or zoom level.
 */
export interface BackgroundAnchor {
  // Position on the background image as percentage (0-1)
  imageX: number;
  imageY: number;
  // The hex coordinate this image point should align with
  hexQ: number;
  hexR: number;
}

export interface BackgroundAnchors {
  anchor1: BackgroundAnchor;
  anchor2?: BackgroundAnchor; // Optional second anchor for scale calculation
}

export interface HexTile {
  coordinates: AxialCoordinates;
  terrain: TerrainType;
  features?: HexFeature[];
  triggers?: Trigger[];
  occupiedBy: string | null; // Entity UUID
  hasLoot: boolean;
  hasTreasure: boolean;
}

export interface MonsterGroup {
  type: string;
  count: number;
  spawnPoints: AxialCoordinates[];
  isElite: boolean;
}

export interface MonsterType {
  type: string;
  isElite: boolean;
}

export interface TreasureLocation {
  coordinates: AxialCoordinates;
  treasureId: string;
}

export interface ElementalInfusion {
  fire: ElementState;
  ice: ElementState;
  air: ElementState;
  earth: ElementState;
  light: ElementState;
  dark: ElementState;
}

export interface AttackModifierCard {
  modifier: number | 'null' | 'x2';
  isReshuffle: boolean;
  effects?: string[];
}

export interface AttackModifierDeck {
  characterId: string;
  cards: AttackModifierCard[];
  discardPile: AttackModifierCard[];
}

// ========== LOOT (User Story 2) ==========

export interface LootToken {
  id: string;
  roomId: string;
  coordinates: AxialCoordinates;
  value: number; // Gold value (1-3 based on scenario difficulty)
  isCollected: boolean;
  collectedBy: string | null; // Player UUID who collected it
  createdAt: string;
  collectedAt: string | null;
}

// ========== ACCOUNT & PROGRESSION (User Story 7) ==========

export interface Account {
  id: string;
  uuid: string;
  email: string | null;
  createdAt: string;
}

export interface Progression {
  accountId: string;
  characterClass: CharacterClass;
  experience: number;
  level: number;
  unlockedPerks: string[];
  completedScenarios: string[];
}

// ========== LOGGING TYPES ==========

export type LogColor = 'red' | 'blue' | 'gold' | 'green' | 'orange' | 'lightgreen' | 'lightblue' | 'white';

export interface LogMessagePart {
  text: string;
  color?: LogColor;
}

export interface LogMessage {
  id: string; // Unique ID for React key
  parts: LogMessagePart[];
}

export interface TurnEntity {
  entityId: string;
  name: string;
  entityType: 'character' | 'monster' | 'summon';
  initiative: number;
  ownerId?: string; // For summons, links to summoner character
}

// ========== ITEMS & INVENTORY (Issue #205) ==========

/**
 * Item slot types following Gloomhaven rules
 * Characters can equip: 1 head, 1 body, 1 legs, up to 2 one-hand OR 1 two-hand, and ceil(level/2) small items
 */
export enum ItemSlot {
  HEAD = 'HEAD',
  BODY = 'BODY',
  LEGS = 'LEGS',
  ONE_HAND = 'ONE_HAND',
  TWO_HAND = 'TWO_HAND',
  SMALL = 'SMALL',
}

/**
 * Item usage type determining refresh mechanics
 * - PERSISTENT: No usage limits, always available
 * - SPENT: Rotated sideways after use, refreshed on long rest
 * - CONSUMED: Flipped facedown after use, refreshed between scenarios
 */
export enum ItemUsageType {
  PERSISTENT = 'PERSISTENT',
  SPENT = 'SPENT',
  CONSUMED = 'CONSUMED',
}

/**
 * Runtime state of an item during gameplay
 */
export enum ItemState {
  READY = 'ready',
  SPENT = 'spent',
  CONSUMED = 'consumed',
}

/**
 * Rarity levels for items
 */
export enum ItemRarity {
  COMMON = 'COMMON',
  UNCOMMON = 'UNCOMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY',
}

/**
 * Effect types that items can provide
 */
export type ItemEffectType =
  | 'attack_modifier'  // Adds to attack value
  | 'defense'          // Reduces incoming damage
  | 'heal'             // Heals HP
  | 'shield'           // Provides shield value
  | 'retaliate'        // Deals damage when attacked
  | 'pierce'           // Ignores shield
  | 'condition'        // Applies a condition
  | 'movement'         // Modifies movement
  | 'element'          // Generates/consumes element
  | 'special';         // Custom effect described in description

/**
 * Item effect definition
 */
export interface ItemEffect {
  type: ItemEffectType;
  value?: number;
  condition?: Condition;
  element?: ElementType;
  description?: string;
}

/**
 * Trigger events for reactive items (e.g., "when attacked")
 */
export type ItemTriggerEvent =
  | 'on_attack'        // When you attack
  | 'when_attacked'    // When you are attacked
  | 'on_damage'        // When you take damage
  | 'on_move'          // When you move
  | 'start_of_turn'    // At the start of your turn
  | 'end_of_turn'      // At the end of your turn
  | 'on_rest';         // When you rest

/**
 * Trigger condition for reactive items
 */
export interface ItemTrigger {
  event: ItemTriggerEvent;
  condition?: string; // Optional condition like "when attacked by adjacent enemy"
}

/**
 * Full item definition
 */
export interface Item {
  id: string;
  name: string;
  slot: ItemSlot;
  usageType: ItemUsageType;
  maxUses?: number;
  rarity: ItemRarity;
  effects: ItemEffect[];
  triggers?: ItemTrigger[];
  modifierDeckImpact?: { adds: string[] }; // e.g., { adds: ['-1', '-1'] }
  cost: number;
  description?: string;
  imageUrl?: string;
  createdBy?: string;
  createdAt?: string;
}

/**
 * Runtime item state during gameplay
 */
export interface ItemRuntimeState {
  state: ItemState;
  usesRemaining?: number;
}

/**
 * Equipped items structure on character
 * Follows Gloomhaven equip rules:
 * - 1 head, 1 body, 1 legs
 * - Up to 2 one-hand items OR 1 two-hand item
 * - Up to ceil(level/2) small items
 */
export interface EquippedItems {
  head?: string;       // Item ID
  body?: string;       // Item ID
  legs?: string;       // Item ID
  hands: string[];     // 1-2 one-hand items OR 1 two-hand item
  small: string[];     // Up to ceil(level/2) small items
}

/**
 * Extended character interface with inventory fields
 */
export interface CharacterWithInventory extends Character {
  equippedItems: EquippedItems;
  itemStates: Record<string, ItemRuntimeState>;
  inventory: string[]; // Array of owned item IDs
  gold: number;
}

/**
 * User roles for access control
 */
export type UserRole = 'player' | 'creator' | 'admin';

/**
 * Extended user interface with roles
 */
export interface UserWithRoles {
  id: string;
  username: string;
  email?: string;
  roles: UserRole[];
}
