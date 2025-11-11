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
  mapLayout: any[]; // HexTile[] from entities
  monsters: any[]; // Monster[] from entities
  characters: any[]; // Character[] from entities
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
  fromHex: AxialCoordinates;
  toHex: AxialCoordinates;
  movementPath: AxialCoordinates[];
}

export interface AttackResolvedPayload {
  attackerId: string;
  targetId: string;
  damage: number;
  modifier: number | 'null' | 'x2';
  effects: string[];
  targetHealth: number;
  targetDead: boolean;
}

export interface MonsterActivatedPayload {
  monsterId: string;
  focusTarget: string; // Character UUID
  movement: AxialCoordinates;
  attack: {
    targetId: string;
    damage: number;
    modifier: number | 'null' | 'x2';
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

export interface ServerEvents {
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
  elemental_state_changed: ElementalStateChangedPayload;
  loot_collected: LootCollectedPayload;
  round_ended: RoundEndedPayload;
  scenario_completed: ScenarioCompletedPayload;
  player_disconnected: PlayerDisconnectedPayload;
  player_reconnected: PlayerReconnectedPayload;
  game_state_update: GameStateUpdatePayload;
  error: ErrorPayload;
}
