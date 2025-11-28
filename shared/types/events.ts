/**
 * WebSocket event type definitions for client-server communication
 * Based on contracts/websocket-events.yaml
 */

import type { AxialCoordinates, CharacterClass, ElementType } from './entities';

// ========== CLIENT -> SERVER EVENTS ==========

export interface JoinRoomPayload {
  roomCode: string;
  playerUUID: string;
  nickname: string;
  intent?: 'create' | 'join' | 'rejoin' | 'refresh'; // Why is this join happening? Used for logging
}

export interface SelectCharacterPayload {
  characterClass: CharacterClass;
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
    classType: string;
    health: number;
    maxHealth: number;
    currentHex: AxialCoordinates;
    conditions: string[];
    isExhausted: boolean;
  }[];
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
  completionTime: number; // seconds
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
}
