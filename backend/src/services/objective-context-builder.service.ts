/**
 * Objective Context Builder Service (Phase 2 - Game Completion System)
 *
 * Builds ObjectiveEvaluationContext from current game state.
 * Sanitizes and filters data to only expose what's needed for objective evaluation.
 */

import { Injectable, Logger } from '@nestjs/common';
import type { Character } from '../models/character.model';
import type { Monster } from '../models/monster.model';
import type { LootToken } from '../models/loot-token.model';
import {
  ElementState,
  type GameRoom,
  type AxialCoordinates,
  type HexTile,
} from '../../../shared/types/entities';
import type {
  ObjectiveEvaluationContext,
  EvaluationCharacter,
  EvaluationMonster,
  EvaluationNPC,
  EvaluationBoard,
  EvaluationGame,
  ObjectiveProgressData,
} from '../../../shared/types/objectives';

/**
 * Input data structure for building evaluation context
 */
export interface ContextBuilderInput {
  /** Game room data */
  room: GameRoom;

  /** Character instances (from characterService) */
  characters: Character[];

  /** Monster instances (from roomMonsters map) */
  monsters: Monster[] | MonsterData[];

  /** Loot tokens (from roomLootTokens map) */
  lootTokens: LootToken[] | LootTokenData[];

  /** Map layout (from roomMaps) */
  mapLayout?: HexTile[];

  /** Current round number */
  currentRound: number;

  /** Scenario difficulty */
  difficulty: number;

  /** Current objective progress (keyed by objective ID) */
  objectiveProgress?: Record<string, ObjectiveProgressData>;

  /** Optional: Accumulated statistics */
  accumulatedStats?: AccumulatedStats;

  /** Optional: Treasure data */
  treasures?: TreasureData[];

  /** Optional: NPC data (future feature) */
  npcs?: NPCData[];

  /** Optional: Special locations (exits, objective markers, etc.) */
  specialLocations?: SpecialLocationData[];
}

/**
 * Simplified monster data interface (for when we get raw data from maps)
 */
export interface MonsterData {
  id: string;
  monsterType: string;
  health: number;
  maxHealth: number;
  currentHex: AxialCoordinates;
  isDead: boolean;
  isElite: boolean;
  conditions: string[];
}

/**
 * Simplified loot token data interface
 */
export interface LootTokenData {
  id: string;
  coordinates: AxialCoordinates;
  value: number;
  isCollected: boolean;
  collectedBy: string | null;
}

/**
 * Treasure data interface
 */
export interface TreasureData {
  id: string;
  position: AxialCoordinates;
  isCollected: boolean;
  collectedBy: string | null;
}

/**
 * NPC data interface (future feature)
 */
export interface NPCData {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  position: AxialCoordinates;
  isDead: boolean;
}

/**
 * Special location data interface
 */
export interface SpecialLocationData {
  type: string;
  position: AxialCoordinates;
  data?: Record<string, unknown>;
}

/**
 * Accumulated statistics interface
 */
export interface AccumulatedStats {
  totalMonstersKilled: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  totalLootCollected: number;
  totalGoldCollected: number;
  roundsCompleted: number;
  charactersExhausted: number;
  characterDeaths: number;
}

@Injectable()
export class ObjectiveContextBuilderService {
  private readonly logger = new Logger(ObjectiveContextBuilderService.name);

  /**
   * Build complete evaluation context from game state
   */
  buildContext(input: ContextBuilderInput): ObjectiveEvaluationContext {
    try {
      return {
        characters: this.buildCharacterData(input.characters),
        monsters: this.buildMonsterData(input.monsters),
        npcs: this.buildNPCData(input.npcs || []),
        board: this.buildBoardData(
          input.lootTokens,
          input.treasures,
          input.specialLocations,
          input.mapLayout,
        ),
        game: this.buildGameData(
          input.room,
          input.currentRound,
          input.difficulty,
        ),
        progress: input.objectiveProgress || {},
        accumulated:
          input.accumulatedStats || this.getDefaultAccumulatedStats(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to build evaluation context: ${errorMessage}`);

      // Return a minimal valid context to prevent crashes
      return this.buildEmptyContext(
        input.room,
        input.currentRound,
        input.difficulty,
      );
    }
  }

  /**
   * Build character data for evaluation
   * Sanitizes to only include what's needed
   */
  private buildCharacterData(characters: Character[]): EvaluationCharacter[] {
    return characters.map((char) => {
      // Handle both Character class instances and plain objects
      const isClassInstance = typeof char.toJSON === 'function';

      if (isClassInstance) {
        const data = char.toJSON();
        return {
          id: data.id,
          playerId: data.playerId,
          classType: data.characterClass,
          health: data.currentHealth,
          maxHealth: data.stats.maxHealth,
          position: { ...data.position },
          conditions: [...data.conditions],
          inventory: {
            gold: 0, // TODO: Track gold per character
            items: [],
          },
          isExhausted: data.exhausted,
          isDead: data.currentHealth <= 0,
        };
      }

      // Fallback for plain objects
      const charAny = char as any;
      return {
        id: charAny.id || '',
        playerId: charAny.playerId || '',
        classType: charAny.characterClass || charAny.classType || '',
        health: charAny.currentHealth || charAny.health || 0,
        maxHealth: charAny.stats?.maxHealth || charAny.maxHealth || 0,
        position: charAny.position || charAny.currentHex || { q: 0, r: 0 },
        conditions: charAny.conditions || [],
        inventory: {
          gold: charAny.gold || 0,
          items: charAny.items || [],
        },
        isExhausted: charAny.exhausted || charAny.isExhausted || false,
        isDead: (charAny.currentHealth || charAny.health || 0) <= 0,
      };
    });
  }

  /**
   * Build monster data for evaluation
   */
  private buildMonsterData(
    monsters: Monster[] | MonsterData[],
  ): EvaluationMonster[] {
    return monsters.map((monster) => {
      // Handle both Monster class instances and plain objects
      const isClassInstance = typeof (monster as any).toJSON === 'function';

      if (isClassInstance) {
        const data = (monster as Monster).toJSON();
        return {
          id: data.id,
          type: data.monsterType,
          health: data.currentHealth,
          maxHealth: data.stats.maxHealth,
          position: { ...data.position },
          isDead: data.isDead,
          isElite: data.isElite,
          conditions: [...data.conditions],
        };
      }

      // Plain object (MonsterData)
      const monsterData = monster as MonsterData;
      return {
        id: monsterData.id,
        type: monsterData.monsterType,
        health: monsterData.health,
        maxHealth: monsterData.maxHealth,
        position: { ...monsterData.currentHex },
        isDead: monsterData.isDead,
        isElite: monsterData.isElite,
        conditions: monsterData.conditions as any[],
      };
    });
  }

  /**
   * Build NPC data for evaluation (future feature)
   */
  private buildNPCData(npcs: NPCData[]): EvaluationNPC[] {
    return npcs.map((npc) => ({
      id: npc.id,
      name: npc.name,
      health: npc.health,
      maxHealth: npc.maxHealth,
      position: { ...npc.position },
      isDead: npc.isDead,
    }));
  }

  /**
   * Build board data for evaluation
   */
  private buildBoardData(
    lootTokens: LootToken[] | LootTokenData[],
    treasures?: TreasureData[],
    specialLocations?: SpecialLocationData[],
    mapLayout?: HexTile[],
  ): EvaluationBoard {
    // Build loot token data
    const lootData = lootTokens.map((token) => {
      // Handle both LootToken class instances and plain objects
      const isClassInstance = typeof (token as any).toJSON === 'function';

      if (isClassInstance) {
        const data = (token as LootToken).toJSON();
        return {
          id: data.id,
          position: { ...data.coordinates },
          value: data.value,
          isCollected: data.isCollected,
          collectedBy: data.collectedBy,
        };
      }

      // Plain object (LootTokenData)
      const tokenData = token as LootTokenData;
      return {
        id: tokenData.id,
        position: { ...tokenData.coordinates },
        value: tokenData.value,
        isCollected: tokenData.isCollected,
        collectedBy: tokenData.collectedBy,
      };
    });

    // Build treasure data
    const treasureData = (treasures || []).map((t) => ({
      id: t.id,
      position: { ...t.position },
      isCollected: t.isCollected,
      collectedBy: t.collectedBy,
    }));

    // Build special locations
    const specialData = (specialLocations || []).map((loc) => ({
      type: loc.type,
      position: { ...loc.position },
      data: loc.data,
    }));

    // Calculate map bounds
    const bounds = this.calculateMapBounds(mapLayout);

    return {
      lootTokens: lootData,
      treasures: treasureData,
      specialLocations: specialData,
      bounds,
    };
  }

  /**
   * Calculate map bounds from layout
   */
  private calculateMapBounds(mapLayout?: HexTile[]): {
    minQ: number;
    maxQ: number;
    minR: number;
    maxR: number;
  } {
    if (!mapLayout || mapLayout.length === 0) {
      return { minQ: 0, maxQ: 0, minR: 0, maxR: 0 };
    }

    const qValues = mapLayout.map((tile) => tile.coordinates.q);
    const rValues = mapLayout.map((tile) => tile.coordinates.r);

    return {
      minQ: Math.min(...qValues),
      maxQ: Math.max(...qValues),
      minR: Math.min(...rValues),
      maxR: Math.max(...rValues),
    };
  }

  /**
   * Build game data for evaluation
   */
  private buildGameData(
    room: GameRoom,
    currentRound: number,
    difficulty: number,
  ): EvaluationGame {
    // Default elemental state using enum values
    const defaultElementalState: EvaluationGame['elementsActive'] = {
      fire: ElementState.INERT,
      ice: ElementState.INERT,
      air: ElementState.INERT,
      earth: ElementState.INERT,
      light: ElementState.INERT,
      dark: ElementState.INERT,
    };

    // Map room's elemental state if available
    let elementsActive = defaultElementalState;
    if (room.elementalState) {
      elementsActive = {
        fire: room.elementalState.fire,
        ice: room.elementalState.ice,
        air: room.elementalState.air,
        earth: room.elementalState.earth,
        light: room.elementalState.light,
        dark: room.elementalState.dark,
      };
    }

    return {
      currentRound,
      turnCount: room.currentTurnIndex || 0,
      elementsActive,
      difficulty,
      scenarioId: room.scenarioId || '',
      roomId: room.id,
    };
  }

  /**
   * Get default accumulated stats
   */
  private getDefaultAccumulatedStats(): AccumulatedStats {
    return {
      totalMonstersKilled: 0,
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      totalLootCollected: 0,
      totalGoldCollected: 0,
      roundsCompleted: 0,
      charactersExhausted: 0,
      characterDeaths: 0,
    };
  }

  /**
   * Build an empty context (for error handling)
   */
  private buildEmptyContext(
    room: GameRoom,
    currentRound: number,
    difficulty: number,
  ): ObjectiveEvaluationContext {
    return {
      characters: [],
      monsters: [],
      npcs: [],
      board: {
        lootTokens: [],
        treasures: [],
        specialLocations: [],
        bounds: { minQ: 0, maxQ: 0, minR: 0, maxR: 0 },
      },
      game: this.buildGameData(room, currentRound, difficulty),
      progress: {},
      accumulated: this.getDefaultAccumulatedStats(),
    };
  }

  /**
   * Calculate accumulated stats from game state
   * Call this periodically to update the accumulated statistics
   */
  calculateAccumulatedStats(
    previousStats: AccumulatedStats,
    characters: Character[],
    monsters: Monster[] | MonsterData[],
    lootTokens: LootToken[] | LootTokenData[],
    currentRound: number,
  ): AccumulatedStats {
    // Count dead monsters
    const deadMonsters = monsters.filter((m) => {
      if (typeof (m as any).toJSON === 'function') {
        return (m as Monster).isDead;
      }
      return (m as MonsterData).isDead;
    }).length;

    // Count collected loot
    const collectedLoot = lootTokens.filter((t) => {
      if (typeof (t as any).toJSON === 'function') {
        return (t as LootToken).isCollected;
      }
      return t.isCollected;
    });

    const totalGold = collectedLoot.reduce((sum, t) => {
      if (typeof (t as any).toJSON === 'function') {
        return sum + (t as LootToken).value;
      }
      return sum + (t as LootTokenData).value;
    }, 0);

    // Count exhausted/dead characters
    const exhaustedCount = characters.filter((c) => {
      if (typeof c.toJSON === 'function') {
        return c.exhausted;
      }
      return (c as any).isExhausted || (c as any).exhausted;
    }).length;

    const deadCount = characters.filter((c) => {
      if (typeof c.toJSON === 'function') {
        return c.isDead;
      }
      return (
        (c as any).isDead ||
        ((c as any).health || (c as any).currentHealth) <= 0
      );
    }).length;

    return {
      totalMonstersKilled: deadMonsters,
      totalDamageDealt: previousStats.totalDamageDealt, // Must be tracked separately via events
      totalDamageTaken: previousStats.totalDamageTaken, // Must be tracked separately via events
      totalLootCollected: collectedLoot.length,
      totalGoldCollected: totalGold,
      roundsCompleted: currentRound - 1,
      charactersExhausted: exhaustedCount,
      characterDeaths: deadCount,
    };
  }

  /**
   * Create a deep copy of accumulated stats for tracking changes
   */
  copyAccumulatedStats(stats: AccumulatedStats): AccumulatedStats {
    return { ...stats };
  }

  /**
   * Update accumulated stats with damage dealt
   * Call this when an attack resolves
   */
  recordDamageDealt(stats: AccumulatedStats, damage: number): AccumulatedStats {
    return {
      ...stats,
      totalDamageDealt: stats.totalDamageDealt + damage,
    };
  }

  /**
   * Update accumulated stats with damage taken
   * Call this when a character takes damage
   */
  recordDamageTaken(stats: AccumulatedStats, damage: number): AccumulatedStats {
    return {
      ...stats,
      totalDamageTaken: stats.totalDamageTaken + damage,
    };
  }
}
