/**
 * Shared types barrel export
 * Import shared types with: import { Player, JoinRoomPayload, GameState } from 'shared/types'
 */

export type {
  // Interfaces and Type Aliases
  AxialCoordinates,
  CubeCoordinates,
  Trigger,
  HexFeature,
  Player,
  GameRoom,
  Character,
  Monster,
  AbilityCard,
  Action,
  Scenario,
  HexTile,
  MonsterGroup,
  MonsterType,
  TreasureLocation,
  ElementalInfusion,
  AttackModifierCard,
  AttackModifierDeck,
  LootToken,
  Account,
  Progression,
  LogMessagePart,
  LogMessage,
  TurnEntity,
  LogColor,
  // New Modular Card System Types
  CardModule,
  IconActionModule,
  TextModule,
  SummonModule,
  HexTargetModule,
  AnyCardModule,
  Ability,
  ElementInfusion as CardElementInfusion,
} from './entities';

export {
  // Enums
  RoomStatus,
  ConnectionStatus,
  CharacterClass,
  TerrainType,
  HexFeatureType,
  TriggerType,
  Condition,
  ElementType,
  ElementState,
  ModuleType,
  ElementInfusionAction,
} from './entities';

export * from './events';
export * from './game-state';
