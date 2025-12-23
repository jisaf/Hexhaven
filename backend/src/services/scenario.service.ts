/**
 * Scenario Service (US2 - T096, T100)
 *
 * Manages scenario lifecycle:
 * - Load scenario data from database
 * - Spawn monsters based on scenario definition
 * - Scale monster stats by difficulty level
 * - Check scenario completion conditions
 * - Handle loot token spawning
 */

import { Injectable } from '@nestjs/common';
import {
  Scenario,
  Monster,
  Character,
  AxialCoordinates,
  TerrainType,
} from '../../../shared/types/entities';
import { LootToken } from '../models/loot-token.model';
import { PrismaService } from './prisma.service';

interface MonsterStats {
  health: number;
  movement: number;
  attack: number;
  range: number;
}

@Injectable()
export class ScenarioService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Load scenario by ID from database
   */
  async loadScenario(scenarioId: string): Promise<Scenario | null> {
    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(scenarioId)) {
      console.warn(`Invalid scenario ID format (not UUID): ${scenarioId}`);
      return null;
    }

    const dbScenario = await this.prisma.scenario.findUnique({
      where: { id: scenarioId },
    });

    return this.transformDbScenario(dbScenario);
  }

  /**
   * Get available scenarios list from database
   */
  async getAvailableScenarios(): Promise<
    Array<{ id: string; name: string; difficulty: number }>
  > {
    const scenarios = await this.prisma.scenario.findMany({
      select: { id: true, name: true, difficulty: true },
      orderBy: { difficulty: 'asc' },
    });
    return scenarios;
  }

  /**
   * Batch load scenarios by IDs - avoids N+1 queries
   * Returns a Map for O(1) lookups
   */
  async loadScenariosByIds(
    scenarioIds: string[],
  ): Promise<Map<string, Scenario>> {
    const scenarioMap = new Map<string, Scenario>();
    if (scenarioIds.length === 0) return scenarioMap;

    // Filter valid UUIDs
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validIds = scenarioIds.filter((id) => uuidRegex.test(id));
    if (validIds.length === 0) return scenarioMap;

    const dbScenarios = await this.prisma.scenario.findMany({
      where: { id: { in: validIds } },
    });

    for (const dbScenario of dbScenarios) {
      const scenario = this.transformDbScenario(dbScenario);
      if (scenario) {
        scenarioMap.set(dbScenario.id, scenario);
      }
    }

    return scenarioMap;
  }

  /**
   * Transform database scenario to Scenario type (shared logic)
   */
  private transformDbScenario(dbScenario: any): Scenario | null {
    if (!dbScenario) return null;

    const objectives = dbScenario.objectives;
    const dbMonsterGroups = dbScenario.monsterGroups as any[];
    const dbMapLayout = dbScenario.mapLayout as any[];
    const dbPlayerStarts = dbScenario.playerStartPositions;

    // Transform monsterGroups format
    const monsterGroups = dbMonsterGroups.map((group: any) => {
      const isElite =
        group.isElite !== undefined ? group.isElite : group.level === 'elite';
      const rawPositions = group.spawnPoints || group.positions || [];
      const spawnPoints = rawPositions.map((pos: any) => ({
        q: pos.q !== undefined ? pos.q : pos.x,
        r: pos.r !== undefined ? pos.r : pos.y,
      }));
      return {
        type: group.type,
        isElite,
        count: group.count !== undefined ? group.count : spawnPoints.length,
        spawnPoints,
      };
    });

    // Transform mapLayout format
    const mapLayout = dbMapLayout.map((tile: any) => ({
      coordinates: {
        q: tile.coordinates?.q !== undefined ? tile.coordinates.q : tile.x,
        r: tile.coordinates?.r !== undefined ? tile.coordinates.r : tile.y,
      },
      terrain: tile.terrain,
      features: tile.features || [],
      occupiedBy: null,
      hasLoot: false,
      hasTreasure: false,
    }));

    // Transform playerStartPositions
    let playerStartPositions: Record<number, Array<{ q: number; r: number }>>;
    if (Array.isArray(dbPlayerStarts)) {
      const positions = dbPlayerStarts.map((pos: any) => ({
        q: pos.q !== undefined ? pos.q : pos.x,
        r: pos.r !== undefined ? pos.r : pos.y,
      }));
      playerStartPositions = {
        1: positions.slice(0, 1),
        2: positions,
        3: positions,
        4: positions,
      };
    } else if (dbPlayerStarts) {
      playerStartPositions = {};
      for (const [count, positions] of Object.entries(dbPlayerStarts)) {
        playerStartPositions[parseInt(count)] = (positions as any[]).map(
          (pos: any) => ({
            q: pos.q !== undefined ? pos.q : pos.x,
            r: pos.r !== undefined ? pos.r : pos.y,
          }),
        );
      }
    } else {
      playerStartPositions = { 1: [], 2: [], 3: [], 4: [] };
    }

    return {
      id: dbScenario.id,
      name: dbScenario.name,
      difficulty: dbScenario.difficulty,
      mapLayout,
      monsterGroups,
      // Full objectives structure for buildScenarioObjectives
      objectives: objectives,
      // String description for backward compatibility with Scenario Designer
      objectivePrimary: objectives?.primary?.description || 'Complete the scenario',
      objectiveSecondary: objectives?.secondary?.[0]?.description,
      treasures: dbScenario.treasures,
      playerStartPositions,
      backgroundImageUrl: dbScenario.backgroundImageUrl ?? undefined,
      backgroundOpacity: dbScenario.backgroundOpacity ?? undefined,
      backgroundOffsetX: dbScenario.backgroundOffsetX ?? undefined,
      backgroundOffsetY: dbScenario.backgroundOffsetY ?? undefined,
      backgroundScale: dbScenario.backgroundScale ?? undefined,
    };
  }

  /**
   * Spawn monsters for a scenario based on monster groups
   */
  spawnMonsters(
    scenario: Scenario,
    roomId: string,
    difficulty: number,
  ): Monster[] {
    const monsters: Monster[] = [];

    for (const group of scenario.monsterGroups) {
      for (let i = 0; i < group.count; i++) {
        const spawnPoint = group.spawnPoints[i];
        if (!spawnPoint) {
          console.warn(
            `Not enough spawn points for monster group ${group.type}`,
          );
          continue;
        }

        const baseStats = this.getMonsterBaseStats(group.type, group.isElite);
        const scaledStats = this.scaleMonsterStats(baseStats, difficulty);

        const monster: Monster = {
          id: this.generateMonsterId(),
          roomId,
          monsterType: group.type,
          isElite: group.isElite,
          health: scaledStats.health,
          maxHealth: scaledStats.health,
          movement: scaledStats.movement,
          attack: scaledStats.attack,
          range: scaledStats.range,
          currentHex: spawnPoint,
          specialAbilities: this.getMonsterSpecialAbilities(group.type),
          conditions: [],
          isDead: false,
        };

        monsters.push(monster);
      }
    }

    return monsters;
  }

  /**
   * Check if scenario is complete
   */
  checkScenarioCompletion(
    characters: Character[],
    monsters: Monster[],
    _scenario: Scenario,
  ): { isComplete: boolean; victory: boolean; reason: string } {
    const allPlayersExhausted = characters.every((char) => char.isExhausted);
    if (allPlayersExhausted) {
      return {
        isComplete: true,
        victory: false,
        reason: 'All players exhausted',
      };
    }

    const allMonstersDead = monsters.every((monster) => monster.isDead);
    if (allMonstersDead) {
      return {
        isComplete: true,
        victory: true,
        reason: 'All monsters defeated',
      };
    }

    return {
      isComplete: false,
      victory: false,
      reason: 'Scenario in progress',
    };
  }

  /**
   * Scale monster stats based on difficulty level (0-7)
   */
  scaleMonsterStats(baseStats: MonsterStats, difficulty: number): MonsterStats {
    const clampedDifficulty = Math.max(0, Math.min(7, difficulty));
    const scaleFactor = 1 + clampedDifficulty * 0.1;

    return {
      health: Math.floor(baseStats.health * scaleFactor),
      movement: baseStats.movement,
      attack: Math.floor(baseStats.attack * scaleFactor),
      range: baseStats.range,
    };
  }

  /**
   * Get base stats for monster type
   */
  private getMonsterBaseStats(
    monsterType: string,
    isElite: boolean,
  ): MonsterStats {
    // Use kebab-case keys to match scenario data format
    const baseStats: Record<string, MonsterStats> = {
      'bandit-guard': { health: 5, movement: 2, attack: 2, range: 0 },
      'bandit-archer': { health: 4, movement: 2, attack: 2, range: 3 },
      'living-bones': { health: 4, movement: 2, attack: 1, range: 0 },
      'inox-guard': { health: 8, movement: 2, attack: 3, range: 0 },
      'inox-shaman': { health: 6, movement: 2, attack: 2, range: 3 },
      'vermling-scout': { health: 3, movement: 3, attack: 2, range: 0 },
      'vermling-shaman': { health: 4, movement: 2, attack: 1, range: 2 },
      'flame-demon': { health: 6, movement: 2, attack: 3, range: 0 },
      'frost-demon': { health: 6, movement: 2, attack: 2, range: 2 },
      'earth-demon': { health: 8, movement: 1, attack: 3, range: 0 },
      'city-guard': { health: 6, movement: 2, attack: 3, range: 0 },
      'fire-imp': { health: 3, movement: 3, attack: 2, range: 2 },
      'magma-golem': { health: 10, movement: 1, attack: 4, range: 0 },
      'living-corpse': { health: 5, movement: 1, attack: 2, range: 0 },
      cultist: { health: 4, movement: 2, attack: 2, range: 0 },
      'stone-golem': { health: 10, movement: 1, attack: 3, range: 0 },
      // Training monsters
      'training-dummy': { health: 1, movement: 0, attack: 0, range: 0 },
    };

    // Normalize monster type to kebab-case for lookup
    const normalizedType = monsterType.toLowerCase().replace(/\s+/g, '-');
    const stats = baseStats[normalizedType];

    if (!stats) {
      console.warn(
        `Unknown monster type: ${monsterType} (normalized: ${normalizedType}), using default stats`,
      );
      return {
        health: 5,
        movement: 2,
        attack: 2,
        range: 0,
      };
    }

    if (isElite) {
      return {
        ...stats,
        health: stats.health + 2,
        attack: stats.attack + 1,
      };
    }

    return stats;
  }

  /**
   * Get special abilities for monster type
   */
  private getMonsterSpecialAbilities(monsterType: string): string[] {
    const abilities: Record<string, string[]> = {
      'Bandit Guard': ['Retaliate 1'],
      'Bandit Archer': [],
      'Living Bones': [],
      'Inox Guard': ['Shield 1'],
      'Inox Shaman': ['Heal 2', 'Curse'],
      'Vermling Scout': [],
      'Vermling Shaman': ['Bless', 'Poison'],
      'Flame Demon': ['Fire Generation', 'Retaliate 2'],
      'Frost Demon': ['Ice Generation', 'Immobilize'],
      'Earth Demon': ['Earth Generation', 'Shield 2'],
      'City Guard': ['Shield 1'],
    };

    return abilities[monsterType] || [];
  }

  /**
   * Generate unique monster ID
   */
  private generateMonsterId(): string {
    return `monster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Spawn loot token on hex when monster dies
   */
  spawnLootToken(
    roomId: string,
    monsterHex: AxialCoordinates,
    difficulty: number,
  ): LootToken {
    const lootValue = LootToken.calculateLootValue(difficulty);
    return LootToken.create(roomId, monsterHex, lootValue);
  }

  /**
   * Spawn multiple loot tokens from defeated monsters
   */
  spawnLootTokensFromDefeatedMonsters(
    roomId: string,
    defeatedMonsters: Monster[],
    difficulty: number,
  ): LootToken[] {
    const lootTokens: LootToken[] = [];

    for (const monster of defeatedMonsters) {
      if (monster.isDead) {
        const lootToken = this.spawnLootToken(
          roomId,
          monster.currentHex,
          difficulty,
        );
        lootTokens.push(lootToken);
      }
    }

    return lootTokens;
  }

  /**
   * Validate scenario data
   */
  validateScenario(scenario: Scenario): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (scenario.mapLayout.length < 5) {
      errors.push('Map layout must have at least 5 tiles');
    }

    if (scenario.monsterGroups.length === 0) {
      errors.push('Scenario must have at least one monster group');
    }

    for (const group of scenario.monsterGroups) {
      for (const spawnPoint of group.spawnPoints) {
        const tile = scenario.mapLayout.find(
          (t) =>
            t.coordinates.q === spawnPoint.q &&
            t.coordinates.r === spawnPoint.r,
        );

        if (!tile) {
          errors.push(
            `Spawn point (${spawnPoint.q},${spawnPoint.r}) not found in map layout`,
          );
        } else if (tile.terrain === TerrainType.OBSTACLE) {
          errors.push(
            `Spawn point (${spawnPoint.q},${spawnPoint.r}) is on obstacle terrain`,
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
