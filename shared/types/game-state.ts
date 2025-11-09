/**
 * Game state type definitions for state management
 * Used by frontend hooks and backend services
 */

import type {
  Character,
  Monster,
  HexTile,
  ElementalInfusion,
  GameRoom,
  Player,
  Scenario,
} from './entities';

// ========== GAME STATE ==========

export interface GameState {
  room: GameRoom;
  players: Player[];
  characters: Character[];
  monsters: Monster[];
  scenario: Scenario | null;
  board: {
    tiles: HexTile[];
    width: number;
    height: number;
  };
  turn: TurnState | null;
  elementalState: ElementalInfusion | null;
}

export interface TurnState {
  currentEntityId: string;
  currentEntityType: 'character' | 'monster';
  turnIndex: number;
  turnOrder: TurnOrderEntry[];
  actionsRemaining: {
    move: boolean;
    attack: boolean;
    topAction: boolean;
    bottomAction: boolean;
  };
}

export interface TurnOrderEntry {
  entityId: string;
  entityType: 'character' | 'monster';
  initiative: number;
  name: string;
  hasActed: boolean;
}

// ========== LOBBY STATE ==========

export interface LobbyState {
  room: GameRoom;
  players: Array<{
    id: string;
    nickname: string;
    isHost: boolean;
    characterClass?: string;
    isReady: boolean;
  }>;
  availableCharacters: string[];
  selectedScenario?: {
    id: string;
    name: string;
    difficulty: number;
  };
}

// ========== UI STATE ==========

export interface UIState {
  selectedCharacterId: string | null;
  selectedHex: { q: number; r: number } | null;
  highlightedHexes: { q: number; r: number }[];
  hoveredEntityId: string | null;
  contextMenu: {
    visible: boolean;
    position: { x: number; y: number };
    options: ContextMenuOption[];
  } | null;
  modals: {
    cardSelection: boolean;
    scenarioComplete: boolean;
    characterSelect: boolean;
  };
  notifications: Notification[];
}

export interface ContextMenuOption {
  label: string;
  action: string;
  icon?: string;
  disabled?: boolean;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  duration?: number; // milliseconds
  createdAt: number;
}

// ========== VIEWPORT STATE (PixiJS) ==========

export interface ViewportState {
  center: { x: number; y: number };
  scale: number;
  rotation: number;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

// ========== ANIMATION STATE ==========

export interface AnimationState {
  activeAnimations: ActiveAnimation[];
}

export interface ActiveAnimation {
  id: string;
  type: 'move' | 'attack' | 'damage' | 'effect' | 'loot';
  entityId: string;
  startTime: number;
  duration: number;
  data: any;
}

// ========== PARTIAL STATE UPDATES ==========

export type GameStateUpdate = Partial<GameState>;

export interface CharacterStateUpdate {
  characterId: string;
  updates: Partial<Character>;
}

export interface MonsterStateUpdate {
  monsterId: string;
  updates: Partial<Monster>;
}

export interface BoardStateUpdate {
  hexUpdates: Array<{
    coordinates: { q: number; r: number };
    updates: Partial<HexTile>;
  }>;
}
