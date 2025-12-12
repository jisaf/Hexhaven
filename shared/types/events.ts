/**
 * WebSocket event type definitions for client-server communication
 * Based on contracts/websocket-events.yaml
 */

import type {
  AxialCoordinates,
  CharacterClass,
  ElementType,
  AbilityCard,
  ItemSlot,
  ItemState,
  ItemEffect,
} from './entities';

// ========== CLIENT -> SERVER EVENTS ==========

export interface JoinRoomPayload {
  roomCode: string;
  playerUUID: string;
  nickname: string;
  intent?: 'create' | 'join' | 'rejoin' | 'refresh'; // Why is this join happening? Used for logging
}

export interface SelectCharacterPayload {
  characterClass?: CharacterClass; // Legacy - for backward compatibility
  characterId?: string; // New persistent character ID (002)
}

export interface StartGamePayload {
  scenarioId: string;
}

export interface MoveCharacterPayload {
  characterId: string;
  targetHex: AxialCoordinates;
}

export interface SelectCardsPayload {
  topCardId: string;
  bottomCardId: string;
}

export interface AttackTargetPayload {
  targetId: string; // Monster or Character UUID
  attackingCardId: string;
}

export interface UseAbilityPayload {
  abilityCardId: string;
  actionType: 'top' | 'bottom';
  targetHex?: AxialCoordinates;
  targetId?: string;
}

export interface CollectLootPayload {
  hexCoordinates: AxialCoordinates;
}

export interface EndTurnPayload {
  // No additional data needed
}

export interface LongRestPayload {
  cardToLose: string; // AbilityCard UUID to permanently lose
}

export interface LeaveRoomPayload {
  // No additional data needed
}

export interface ReconnectPayload {
  playerUUID: string;
  roomId: string;
}

// ========== ITEM & INVENTORY EVENTS (Issue #205) ==========

export interface UseItemPayload {
  itemId: string;
  targetId?: string;          // For targeted items (e.g., heal ally)
  targetHex?: AxialCoordinates; // For area effect items
}

export interface EquipItemPayload {
  itemId: string;
}

export interface UnequipItemPayload {
  itemId: string; // Unequip by item ID - backend finds the slot
}

// ========== SERVER -> CLIENT EVENTS ==========

export interface RoomJoinedPayload {
  roomId: string;
  roomCode: string;
  roomStatus: 'lobby' | 'active' | 'completed' | 'abandoned';
  players: {
    id: string;
    nickname: string;
    isHost: boolean;
    characterClass?: CharacterClass;
  }[];
  scenarioId?: string;
}

export interface PlayerJoinedPayload {
  playerId: string;
  nickname: string;
  isHost: boolean;
}

export interface PlayerLeftPayload {
  playerId: string;
  nickname: string;
  playersRemaining: number;
}

export interface CharacterSelectedPayload {
  playerId: string;
  characterClass: CharacterClass;
}

export interface GameStartedPayload {
  scenarioId: string;
  scenarioName: string;
  mapLayout: {
    coordinates: AxialCoordinates;
    terrain: string;
    occupiedBy: string | null;
    hasLoot: boolean;
    hasTreasure: boolean;
  }[];
  monsters: {
    id: string;
    monsterType: string;
    isElite: boolean;
    currentHex: AxialCoordinates;
    health: number;
    maxHealth: number;
    conditions: string[];
  }[];
  characters: {
    id: string;
    playerId: string;
    userCharacterId?: string; // Database character ID for inventory API (Issue #205)
    classType: string;
    health: number;
    maxHealth: number;
    experience?: number;
    level?: number;
    currentHex: AxialCoordinates | null;
    conditions: string[];
    isExhausted: boolean;
    activeCards?: { top: string; bottom: string } | null;
    // Added for game rejoin - restore selected cards and action state
    selectedCards?: {
      topCardId: string;
      bottomCardId: string;
      initiative: number;
    };
    effectiveMovement?: number;
    effectiveAttack?: number;
    effectiveRange?: number;
    hasAttackedThisTurn?: boolean;
    movementUsedThisTurn?: number;
    // Deck management fields
    hand: string[];
    discardPile: string[];
    lostPile: string[];
    abilityDeck: AbilityCard[];
  }[];
  objectives?: {
    primary: {
      id: string;
      description: string;
      trackProgress: boolean;
    };
    secondary: Array<{
      id: string;
      description: string;
      trackProgress: boolean;
      optional: boolean;
    }>;
    failureConditions?: Array<{
      id: string;
      description: string;
    }>;
  };
  // Background image configuration (Issue #191)
  backgroundImageUrl?: string;
  backgroundOpacity?: number;
  backgroundOffsetX?: number;
  backgroundOffsetY?: number;
  backgroundScale?: number;
}

export interface CardsSelectedPayload {
  playerId: string;
  topCardInitiative: number;
  bottomCardInitiative: number;
}

export interface TurnOrderDeterminedPayload {
  turnOrder: {
    entityId: string;
    entityType: 'character' | 'monster';
    initiative: number;
    name: string;
  }[];
}

export interface TurnStartedPayload {
  entityId: string;
  entityType: 'character' | 'monster';
  turnIndex: number;
}

export interface CharacterMovedPayload {
  characterId: string;
  characterName: string;
  fromHex: AxialCoordinates;
  toHex: AxialCoordinates;
  movementPath: AxialCoordinates[];
  distance: number;
}

export interface AttackResolvedPayload {
  attackerId: string;
  attackerName: string;
  targetId: string;
  targetName: string;
  baseDamage: number;
  damage: number;
  modifier: number | 'null' | 'x2';
  effects: string[];
  targetHealth: number;
  targetDead: boolean;
}

export interface MonsterActivatedPayload {
  monsterId: string;
  monsterName: string;
  focusTarget: string; // Character UUID
  focusTargetName: string;
  movement: AxialCoordinates;
  movementDistance: number;
  attack: {
    targetId: string;
    baseDamage: number;
    damage: number;
    modifier: number | 'null' | 'x2';
    effects: string[];
  } | null;
}

export interface ElementalStateChangedPayload {
  element: ElementType;
  previousState: 'inert' | 'waning' | 'strong';
  newState: 'inert' | 'waning' | 'strong';
}

export interface RoundEndedPayload {
  roundNumber: number;
  elementalState: {
    fire: 'inert' | 'waning' | 'strong';
    ice: 'inert' | 'waning' | 'strong';
    air: 'inert' | 'waning' | 'strong';
    earth: 'inert' | 'waning' | 'strong';
    light: 'inert' | 'waning' | 'strong';
    dark: 'inert' | 'waning' | 'strong';
  };
}

export interface LootCollectedPayload {
  playerId: string;
  lootTokenId: string;
  hexCoordinates: AxialCoordinates;
  goldValue: number;
}

export interface ScenarioCompletedPayload {
  victory: boolean;
  experience: number;
  loot: {
    playerId: string;
    gold: number;
    items: string[];
  }[];
  completionTime: number; // milliseconds from game start

  // Phase 3: Enhanced objective completion fields
  primaryObjectiveCompleted: boolean;
  secondaryObjectivesCompleted: string[]; // IDs of completed secondary objectives
  objectiveProgress: Record<string, { current: number; target: number }>;
  playerStats: Array<{
    playerId: string;
    damageDealt: number;
    damageTaken: number;
    monstersKilled: number;
    cardsLost: number;
  }>;
}

export interface MonsterDiedPayload {
  monsterId: string;
  killerId: string; // The character/entity that killed it
  hexCoordinates: AxialCoordinates; // where it died
}

export interface LootSpawnedPayload {
  id: string;
  coordinates: AxialCoordinates;
  value: number;
}

export interface PlayerDisconnectedPayload {
  playerId: string;
  nickname: string;
}

export interface PlayerReconnectedPayload {
  playerId: string;
  nickname: string;
}

export interface GameStateUpdatePayload {
  state: any; // Full or partial game state (from game-state.ts)
}

export interface ErrorPayload {
  code: string;
  message: string;
  details?: any;
}

export interface DebugLogPayload {
  level: 'log' | 'error' | 'warn' | 'info';
  message: string;
  category?: string; // e.g., 'MonsterAI', 'Combat', 'Movement'
  data?: any;
}

// ========== PHASE 3: OBJECTIVE SYSTEM EVENTS ==========

/**
 * Payload for objectives_loaded event
 * Sent when game starts to inform clients of scenario objectives
 */
export interface ObjectivesLoadedPayload {
  primary: {
    id: string;
    description: string;
    trackProgress: boolean;
  };
  secondary: Array<{
    id: string;
    description: string;
    trackProgress: boolean;
    optional: boolean;
  }>;
  failureConditions?: Array<{
    id: string;
    description: string;
  }>;
}

/**
 * Payload for objective_progress event
 * Sent when objective progress updates
 */
export interface ObjectiveProgressUpdatePayload {
  objectiveId: string;
  description: string;
  current: number;
  target: number;
  percentage: number;
  milestone?: number; // 25, 50, 75, 100
}

/**
 * Payload for character_exhausted event
 * Sent when a character becomes exhausted
 */
export interface CharacterExhaustedPayload {
  characterId: string;
  characterName: string;
  playerId: string;
  reason: 'health' | 'cards' | 'manual';
}

/**
 * Payload for rest-event events
 * Sent during rest mechanics (short/long rest)
 */
export interface RestEventPayload {
  type: 'rest-started' | 'long-selection' | 'card-selected' | 'awaiting-decision' | 'damage-taken' | 'rest-declared' | 'rest-complete' | 'exhaustion' | 'error';
  characterId: string;
  restType?: 'short' | 'long';
  randomCardId?: string;
  selectedCardToLose?: string;
  canReroll?: boolean;
  damage?: number;
  currentHealth?: number;
  message?: string;
  // Long rest selection fields
  discardPileCards?: string[];
  cardToLose?: string;
  initiative?: number;
  // Rest completion fields
  cardLost?: string;
  healthHealed?: number;
  cardsInHand?: number;
  reason?: 'damage' | 'insufficient_cards';
}

// ========== SERVER -> CLIENT ITEM EVENTS (Issue #205) ==========

export interface ItemUsedPayload {
  characterId: string;
  characterName: string;
  itemId: string;
  itemName: string;
  effects: ItemEffect[];
  newState: ItemState;
  usesRemaining?: number;
}

export interface ItemsRefreshedPayload {
  characterId: string;
  refreshedItems: { itemId: string; itemName: string }[];
  trigger: 'long_rest' | 'scenario_end' | 'ability';
}

export interface ItemEquippedPayload {
  characterId: string;
  itemId: string;
  itemName: string;
  slot: ItemSlot;
}

export interface ItemUnequippedPayload {
  characterId: string;
  itemId: string;
  itemName: string;
  slot: ItemSlot;
}

/**
 * Payload sent when a character's inventory is loaded (Issue #205 - Phase 4.5)
 * Sent after character selection for persistent characters
 */
export interface CharacterInventoryPayload {
  characterId: string;
  equippedItems: {
    slot: string;
    itemId: string;
    itemName: string;
  }[];
  bonuses: {
    attackBonus: number;
    defenseBonus: number;
    movementBonus: number;
    rangeBonus: number;
  };
}

// ========== EVENT TYPE MAPPING ==========

export interface ClientEvents {
  join_room: JoinRoomPayload;
  select_character: SelectCharacterPayload;
  start_game: StartGamePayload;
  move_character: MoveCharacterPayload;
  select_cards: SelectCardsPayload;
  attack_target: AttackTargetPayload;
  use_ability: UseAbilityPayload;
  collect_loot: CollectLootPayload;
  end_turn: EndTurnPayload;
  long_rest: LongRestPayload;
  leave_room: LeaveRoomPayload;
  reconnect: ReconnectPayload;
  // Item & Inventory events (Issue #205)
  use_item: UseItemPayload;
  equip_item: EquipItemPayload;
  unequip_item: UnequipItemPayload;
}

export interface RoundStartedPayload {
  roundNumber: number;
  turnOrder: TurnEntity[];
}

export interface TurnEntity {
  entityId: string;
  name: string;
  entityType: 'character' | 'monster';
  initiative: number;
}

export interface ServerEvents {
  round_started: RoundStartedPayload;
  room_joined: RoomJoinedPayload;
  player_joined: PlayerJoinedPayload;
  player_left: PlayerLeftPayload;
  character_selected: CharacterSelectedPayload;
  game_started: GameStartedPayload;
  cards_selected: CardsSelectedPayload;
  turn_order_determined: TurnOrderDeterminedPayload;
  turn_started: TurnStartedPayload;
  character_moved: CharacterMovedPayload;
  attack_resolved: AttackResolvedPayload;
  monster_activated: MonsterActivatedPayload;
  monster_died: MonsterDiedPayload;
  loot_spawned: LootSpawnedPayload;
  elemental_state_changed: ElementalStateChangedPayload;
  loot_collected: LootCollectedPayload;
  round_ended: RoundEndedPayload;
  scenario_completed: ScenarioCompletedPayload;
  player_disconnected: PlayerDisconnectedPayload;
  player_reconnected: PlayerReconnectedPayload;
  game_state_update: GameStateUpdatePayload;
  error: ErrorPayload;
  debug_log: DebugLogPayload;
  // Phase 3: Objective system events
  objectives_loaded: ObjectivesLoadedPayload;
  objective_progress: ObjectiveProgressUpdatePayload;
  character_exhausted: CharacterExhaustedPayload;
  // Phase 4: Rest mechanics events
  'rest-event': RestEventPayload;
  // Issue #205: Item & Inventory events
  item_used: ItemUsedPayload;
  items_refreshed: ItemsRefreshedPayload;
  item_equipped: ItemEquippedPayload;
  item_unequipped: ItemUnequippedPayload;
  character_inventory: CharacterInventoryPayload;
}
