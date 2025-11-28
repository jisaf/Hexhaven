/**
 * Shared entity type definitions for Hexhaven Multiplayer
 * Used across both frontend and backend for type-safe communication
 */

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
  POISON = 'poison',
  WOUND = 'wound',
  STUN = 'stun',
  IMMOBILIZE = 'immobilize',
  DISARM = 'disarm',
  MUDDLE = 'muddle',
  STRENGTHEN = 'strengthen',
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
  classType: CharacterClass;
  health: number;
  maxHealth: number;
  experience: number;
  level: number;
  currentHex: AxialCoordinates | null;
  abilityDeck: string[]; // Array of AbilityCard UUIDs
  hand: string[];
  discardPile: string[];
  lostPile: string[];
  activeCards: { top: string; bottom: string } | null;
  conditions: Condition[];
  isExhausted: boolean;
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

// ========== NEW MODULAR CARD STRUCTURE (IA Proposal B) ==========

export enum ModuleType {
  ICON_ACTION = 'icon_action',
  TEXT = 'text',
  SUMMON = 'summon',
  HEX_TARGET = 'hex_target',
}

export enum ElementInfusionAction {
  CREATE = 'create',
  CONSUME = 'consume',
}

export interface ElementInfusion {
  element: ElementType;
  action: ElementInfusionAction;
}

export interface CardModule {
  type: ModuleType;
}

export interface ActionBonus {
  type: 'jump' | 'pierce' | 'range';
  value?: number;
}

export interface IconActionModule extends CardModule {
  type: ModuleType.ICON_ACTION;
  action: string; // e.g., 'attack', 'move', 'heal'
  value: number;
  range?: number;
  target?: number;
  bonuses?: ActionBonus[];
}

export interface TextModule extends CardModule {
  type: ModuleType.TEXT;
  text: string; // e.g., '[Poison]', '[Wound]', 'UNIQUE'
}

export interface SummonModule extends CardModule {
  type: ModuleType.SUMMON;
  move: number;
  attack: number;
  range: number;
  health: number;
}

export interface HexTargetModule extends CardModule {
  type: ModuleType.HEX_TARGET;
  pattern: string[][];
}

export type AnyCardModule = IconActionModule | TextModule | SummonModule | HexTargetModule;

export interface AbilityRow {
  modules: AnyCardModule[];
}

export interface Ability {
  rows: AbilityRow[];
  xp?: number;
  isLoss?: boolean;
  elements?: ElementInfusion[];
}

export interface AbilityCard {
  id: string;
  characterClass: CharacterClass;
  name: string;
  level: number | 'X';
  initiative: number;
  topAction: Ability;
  bottomAction: Ability;
  imageUrl?: string;
}

/**
 * @deprecated The old Action interface is replaced by the new modular structure.
 * This will be removed once all card data and components are updated.
 */
export interface Action {
  type: 'move' | 'attack' | 'heal' | 'loot' | 'special';
  value?: number;
  range?: number;
  effects?: string[];
  elementGenerate?: ElementType;
  elementConsume?: ElementType;
  elementBonus?: {
    effect: string;
    value: number;
  };
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
  objectivePrimary: string;
  objectiveSecondary?: string;
  treasures?: TreasureLocation[];
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
  entityType: 'character' | 'monster';
  initiative: number;
}
