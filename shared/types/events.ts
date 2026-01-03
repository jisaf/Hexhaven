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

import type {
  NarrativeContent,
  NarrativeRewards,
  NarrativeGameEffects,
  NarrativeType,
} from './narrative';

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
  action?: 'add' | 'remove' | 'set_active'; // Multi-character control action
  index?: number; // Deprecated: For remove/set_active operations by index
  targetCharacterId?: string; // Preferred: ID-based remove/set_active operations
}

export interface StartGamePayload {
  scenarioId: string;
  campaignId?: string; // Issue #244 - Campaign Mode (optional)
}

export interface MoveCharacterPayload {
  characterId: string;
  targetHex: AxialCoordinates;
}

export interface SelectCardsPayload {
  characterId?: string; // Which character's cards (for multi-character control)
  topCardId: string;
  bottomCardId: string;
  initiativeCardId?: string; // Issue #411: Which card determines initiative (topCardId or bottomCardId)
}

export interface AttackTargetPayload {
  characterId: string; // Required: which character is attacking (multi-character support)
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
  characterId: string; // Required: which character is collecting (multi-character support)
  hexCoordinates: AxialCoordinates;
}

export interface EndTurnPayload {
  // No additional data needed
}

export interface LongRestPayload {
  characterId: string; // Required: which character is resting (multi-character support)
  cardToLose: string; // AbilityCard UUID to permanently lose
}

export interface LeaveRoomPayload {
  // No additional data needed
}

export interface SwitchActiveCharacterPayload {
  characterIndex: number; // 0-3
}

export interface ReconnectPayload {
  playerUUID: string;
  roomId: string;
}

// ========== ITEM & INVENTORY EVENTS (Issue #205) ==========

export interface UseItemPayload {
  characterId: string; // Required: which character is using item (multi-character support)
  itemId: string;
  targetId?: string;          // For targeted items (e.g., heal ally)
  targetHex?: AxialCoordinates; // For area effect items
}

export interface EquipItemPayload {
  characterId: string; // Required: which character is equipping (multi-character support)
  itemId: string;
}

export interface UnequipItemPayload {
  characterId: string; // Required: which character is unequipping (multi-character support)
  itemId: string; // Unequip by item ID - backend finds the slot
}

// ========== CARD ACTION SELECTION EVENTS (Issue #411) ==========

/**
 * Client -> Server: Execute a card action during player's turn
 * Player clicks top/bottom of a card to execute that action
 */
export interface UseCardActionPayload {
  characterId: string;
  cardId: string;
  position: 'top' | 'bottom';
  targetId?: string; // For attack/heal targeting
  targetHex?: AxialCoordinates; // For movement/summon placement
}

/**
 * Represents a card action selection (Issue #411)
 * Reusable type for tracking card action choices during a turn
 */
export interface TurnAction {
  cardId: string;
  position: 'top' | 'bottom';
}

/**
 * Tracks which card actions have been used during a turn
 * Sent with turn_started to inform client of available actions
 */
export interface TurnActionState {
  firstAction?: TurnAction;
  secondAction?: TurnAction;
  availableActions: TurnAction[];
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
    characterClass?: CharacterClass; // Backward compatibility - first character
    characterClasses?: CharacterClass[]; // Multi-character support
    characterIds?: string[]; // Persistent character IDs
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
  characterClass?: CharacterClass; // Backward compatibility - first character
  characterClasses: CharacterClass[]; // All selected characters
  characterIds?: string[]; // Persistent character IDs
  activeIndex: number; // Which character is active
}

export interface GameStartedPayload {
  scenarioId: string;
  scenarioName: string;
  campaignId?: string | null; // Issue #318 - Campaign context for return navigation
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
  // Current game state for rejoin
  currentRound?: number;
  // Game log for rejoin
  gameLog?: Array<{
    id: string;
    parts: Array<{ text: string; color?: string; isBold?: boolean }>;
    timestamp: number;
  }>;
  // Loot tokens for rejoin
  lootTokens?: Array<{
    id: string;
    coordinates: AxialCoordinates;
    value: number;
    isCollected: boolean;
  }>;
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
  entityType: 'character' | 'monster' | 'summon';
  turnIndex: number;
  // Issue #411: Card action selection state (only for characters)
  turnActionState?: TurnActionState;
  selectedCards?: {
    card1: AbilityCard;
    card2: AbilityCard;
  };
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

/**
 * Server -> Client: Card action has been executed (Issue #411)
 * Sent after a player uses a top/bottom card action
 */
export interface CardActionExecutedPayload {
  characterId: string;
  cardId: string;
  position: 'top' | 'bottom';
  actionType: 'move' | 'attack' | 'heal' | 'loot' | 'special' | 'summon' | 'text';
  success: boolean;
  cardDestination: 'discard' | 'lost' | 'active'; // Where card went after execution
  // Action-specific results
  movementPath?: AxialCoordinates[];
  damageDealt?: number;
  healAmount?: number;
  targetId?: string;
  error?: string; // Error message if success is false
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

// ========== SUMMON EVENTS (Issue #228) ==========

/**
 * Client -> Server: Player requests to place a summon on a specific hex
 */
export interface RequestSummonPlacementPayload {
  characterId: string;
  cardId: string;
  selectedHex: AxialCoordinates;
}

/**
 * Client -> Server: Player gives orders to a player-controlled summon
 */
export interface SummonOrderPayload {
  summonId: string;
  action: 'move' | 'attack';
  targetHex?: AxialCoordinates; // For move
  targetId?: string; // For attack (monster ID)
}

/**
 * Server -> Client: A summon has been created
 */
export interface SummonCreatedPayload {
  summonId: string;
  summonName: string;
  ownerCharacterId?: string; // undefined for scenario allies
  placementHex: AxialCoordinates;
  health: number;
  maxHealth: number;
  attack: number;
  move: number;
  range: number;
  typeIcon?: string;
  playerControlled?: boolean;
  initiative: number;
}

/**
 * Server -> Client: A summon has moved
 */
export interface SummonMovedPayload {
  summonId: string;
  fromHex: AxialCoordinates;
  toHex: AxialCoordinates;
  path: AxialCoordinates[];
}

/**
 * Server -> Client: A summon has attacked
 */
export interface SummonAttackedPayload {
  summonId: string;
  targetId: string;
  targetType: 'monster';
  damage: number;
  targetNewHealth: number;
  targetDied: boolean;
}

/**
 * Server -> Client: A summon has died
 */
export interface SummonDiedPayload {
  summonId: string;
  summonName: string;
  reason: 'damage' | 'owner_exhausted' | 'owner_died' | 'scenario_end';
  hex: AxialCoordinates;
}

/**
 * Server -> Client: A player-controlled summon is awaiting orders
 */
export interface SummonAwaitingOrdersPayload {
  summonId: string;
  summonName: string;
  validMoveHexes: AxialCoordinates[];
  validTargets: Array<{ id: string; name: string; hex: AxialCoordinates }>;
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

// ========== CAMPAIGN EVENTS (Issue #244) ==========

/**
 * Emitted when a scenario is completed within a campaign
 */
export interface CampaignScenarioCompletedPayload {
  campaignId: string;
  scenarioId: string;
  victory: boolean;
  newlyUnlockedScenarios: string[];
  healedCharacters: string[];
  retiredCharacters: string[];
  campaignCompleted: boolean;
  experienceGained: Record<string, number>;
  goldGained: Record<string, number>;
}

/**
 * Emitted when a campaign is completed (all scenarios done or all characters retired)
 */
export interface CampaignCompletedPayload {
  campaignId: string;
  victory: boolean; // True if final scenario won, false if all characters retired
}

// ========== NARRATIVE SYSTEM EVENTS ==========

/**
 * Server -> Client: Display narrative content
 * Triggers fullscreen story page or modal popup
 */
export interface NarrativeDisplayPayload {
  narrativeId: string;
  type: NarrativeType;
  triggerId?: string;
  content: NarrativeContent;
  rewards?: NarrativeRewards;
  gameEffects?: NarrativeGameEffects;
  acknowledgments: {
    playerId: string;
    playerName: string;
    acknowledged: boolean;
  }[];
}

/**
 * Server -> Client: Player acknowledged narrative
 * Updates UI to show which players have acknowledged
 */
export interface NarrativeAcknowledgedPayload {
  narrativeId: string;
  playerId: string;
  playerName: string;
  allAcknowledged: boolean;
}

/**
 * Server -> Client: All players acknowledged, proceed
 * Signals that the narrative phase is complete
 */
export interface NarrativeDismissedPayload {
  narrativeId: string;
  type: NarrativeType;
  gameEffectsApplied?: boolean;
}

/**
 * Client -> Server: Acknowledge narrative
 * Player clicks "Continue" or "Dismiss"
 */
export interface AcknowledgeNarrativePayload {
  narrativeId: string;
}

/**
 * Server -> Client: Monster spawned by narrative trigger
 */
export interface NarrativeMonsterSpawnedPayload {
  monsterId: string;
  monsterType: string;
  isElite: boolean;
  hex: AxialCoordinates;
  health: number;
  maxHealth: number;
  movement: number;
  attack: number;
  range: number;
  narrativeTriggerId?: string;
}

/**
 * Server -> Client: Door unlocked by narrative trigger
 */
export interface NarrativeDoorUnlockedPayload {
  hex: AxialCoordinates;
  narrativeTriggerId?: string;
}

/**
 * Server -> Client: Hexes revealed by narrative trigger
 */
export interface NarrativeHexesRevealedPayload {
  hexes: AxialCoordinates[];
  narrativeTriggerId?: string;
}

// ========== EVENT TYPE MAPPING ==========

export interface ClientEvents {
  join_room: JoinRoomPayload;
  select_character: SelectCharacterPayload;
  select_scenario: { scenarioId: string };
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
  // Narrative system events
  acknowledge_narrative: AcknowledgeNarrativePayload;
  // Summon events (Issue #228)
  request_summon_placement: RequestSummonPlacementPayload;
  summon_order: SummonOrderPayload;
  // Card action selection (Issue #411)
  use_card_action: UseCardActionPayload;
}

export interface RoundStartedPayload {
  roundNumber: number;
  turnOrder: TurnEntity[];
}

export interface TurnEntity {
  entityId: string;
  name: string;
  entityType: 'character' | 'monster' | 'summon';
  initiative: number;
  ownerId?: string; // For summons, links to summoner character
}

export interface ServerEvents {
  round_started: RoundStartedPayload;
  room_joined: RoomJoinedPayload;
  player_joined: PlayerJoinedPayload;
  player_left: PlayerLeftPayload;
  character_selected: CharacterSelectedPayload;
  scenario_selected: { scenarioId: string };
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
  // Issue #244: Campaign events
  campaign_scenario_completed: CampaignScenarioCompletedPayload;
  campaign_completed: CampaignCompletedPayload;
  // Narrative system events
  narrative_display: NarrativeDisplayPayload;
  narrative_acknowledged: NarrativeAcknowledgedPayload;
  narrative_dismissed: NarrativeDismissedPayload;
  narrative_monster_spawned: NarrativeMonsterSpawnedPayload;
  narrative_door_unlocked: NarrativeDoorUnlockedPayload;
  narrative_hexes_revealed: NarrativeHexesRevealedPayload;
  // Summon events (Issue #228)
  summon_created: SummonCreatedPayload;
  summon_moved: SummonMovedPayload;
  summon_attacked: SummonAttackedPayload;
  summon_died: SummonDiedPayload;
  summon_awaiting_orders: SummonAwaitingOrdersPayload;
  // Card action selection (Issue #411)
  card_action_executed: CardActionExecutedPayload;
}
