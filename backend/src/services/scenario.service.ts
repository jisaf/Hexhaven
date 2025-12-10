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
} from '../../../shared/types/entities';
import { LootToken } from '../models/loot-token.model';
import { PrismaService } from './prisma.service';
import * as fs from 'fs';
import * as path from 'path';

interface MonsterStats {
  health: number;
  movement: number;
  attack: number;
  range: number;
}

@Injectable()
export class ScenarioService {
  private scenarios: Scenario[] | null = null;
  private scenariosFilePath: string | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Load all scenarios from JSON file (lazy load)
   */
  private async loadScenariosFromFile(): Promise<Scenario[]> {
    if (this.scenarios) {
      return this.scenarios;
    }

    if (this.scenariosFilePath) {
      const fileContent = await fs.promises.readFile(
        this.scenariosFilePath,
        'utf-8',
      );
      const data = JSON.parse(fileContent) as { scenarios: Scenario[] };
      this.scenarios = data.scenarios;
      return this.scenarios;
    }

    try {
      // Try multiple possible paths for scenarios.json
      const possiblePaths = [
        // Development path: backend/src/data/scenarios.json
        path.join(__dirname, '../data/scenarios.json'),
        // Production path in dist: backend/dist/data/scenarios.json
        path.join(__dirname, '../../../data/scenarios.json'),
        // Alternative production path
        path.join(process.cwd(), 'backend/dist/data/scenarios.json'),
        // Root dist path (monorepo structure)
        path.join(process.cwd(), 'dist/data/scenarios.json'),
      ];

      let fileContent: string | null = null;

      for (const scenariosPath of possiblePaths) {
        try {
          fileContent = await fs.promises.readFile(scenariosPath, 'utf-8');
          this.scenariosFilePath = scenariosPath;
          break;
        } catch {
          // Try next path
          continue;
        }
      }

      if (!fileContent) {
        throw new Error('scenarios.json not found in any expected location');
      }

      const data = JSON.parse(fileContent) as { scenarios: Scenario[] };
      this.scenarios = data.scenarios;
      console.log(
        `Successfully loaded scenarios from: ${this.scenariosFilePath}`,
      );
      return this.scenarios;
    } catch (error) {
      console.error('Failed to load scenarios.json:', error);
      return [];
    }
  }

  /**
   * Load scenario by ID (002 - Updated to fetch from database first, fallback to JSON)
   */
  async loadScenario(scenarioId: string): Promise<Scenario | null> {
    // Try loading from database first (UUID format)
    try {
      const dbScenario = await this.prisma.scenario.findUnique({
        where: { id: scenarioId },
      });

      if (dbScenario) {
        // Convert database scenario to Scenario type
        const objectives = dbScenario.objectives as any;
        const dbMonsterGroups = dbScenario.monsterGroups as any[];
        const dbMapLayout = dbScenario.mapLayout as any[];
        const dbPlayerStarts = dbScenario.playerStartPositions as any;

        // Transform monsterGroups format (supports both old {level, positions} and new {isElite, spawnPoints})
        const monsterGroups = dbMonsterGroups.map((group: any) => {
          // Support both formats: isElite (new) and level (old)
          const isElite = group.isElite !== undefined ? group.isElite : group.level === 'elite';
          // Support both formats: spawnPoints (new) and positions (old)
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

        // Transform mapLayout format (x,y -> coordinates: {q, r})
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

        // Transform playerStartPositions (array -> keyed by player count)
        let playerStartPositions: Record<
          number,
          Array<{ q: number; r: number }>
        >;
        if (Array.isArray(dbPlayerStarts)) {
          // Database has simple array, convert to all player counts
          const positions = dbPlayerStarts.map((pos: any) => ({
            q: pos.q !== undefined ? pos.q : pos.x,
            r: pos.r !== undefined ? pos.r : pos.y,
          }));
          playerStartPositions = {
            1: positions.slice(0, 1), // For testing with 1 player
            2: positions,
            3: positions,
            4: positions,
          };
        } else {
          // Already in correct format, just convert coordinates
          playerStartPositions = {};
          for (const [count, positions] of Object.entries(dbPlayerStarts)) {
            playerStartPositions[parseInt(count)] = (positions as any[]).map(
              (pos: any) => ({
                q: pos.q !== undefined ? pos.q : pos.x,
                r: pos.r !== undefined ? pos.r : pos.y,
              }),
            );
          }
        }

        return {
          id: dbScenario.id,
          name: dbScenario.name,
          difficulty: dbScenario.difficulty,
          mapLayout,
          monsterGroups,
          objectivePrimary: objectives?.primary || 'Complete the scenario',
          objectiveSecondary: objectives?.secondary,
          treasures: dbScenario.treasures as any,
          playerStartPositions,
          // Background image configuration (Issue #191)
          backgroundImageUrl: dbScenario.backgroundImageUrl ?? undefined,
          backgroundOpacity: dbScenario.backgroundOpacity ?? undefined,
          backgroundOffsetX: dbScenario.backgroundOffsetX ?? undefined,
          backgroundOffsetY: dbScenario.backgroundOffsetY ?? undefined,
          backgroundScale: dbScenario.backgroundScale ?? undefined,
        };
      }
    } catch (error) {
      console.warn(
        `Failed to load scenario ${scenarioId} from database, trying JSON file:`,
        error,
      );
    }

    // Fallback to JSON file for legacy scenarios (e.g., 'scenario-1')
    const scenarios = await this.loadScenariosFromFile();
    const scenario = scenarios.find((s) => s.id === scenarioId);
    return scenario || null;
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
   * Returns: { isComplete: boolean, victory: boolean, reason: string }
   */
  checkScenarioCompletion(
    characters: Character[],
    monsters: Monster[],
    _scenario: Scenario,
  ): { isComplete: boolean; victory: boolean; reason: string } {
    // Check if all players are exhausted (defeat)
    const allPlayersExhausted = characters.every((char) => char.isExhausted);
    if (allPlayersExhausted) {
      return {
        isComplete: true,
        victory: false,
        reason: 'All players exhausted',
      };
    }

    // Check if all monsters are dead (victory)
    const allMonstersDead = monsters.every((monster) => monster.isDead);
    if (allMonstersDead) {
      return {
        isComplete: true,
        victory: true,
        reason: 'All monsters defeated',
      };
    }

    // Check custom objective completion (if implemented)
    // TODO: Implement custom objective checking based on scenario.objectivePrimary

    return {
      isComplete: false,
      victory: false,
      reason: 'Scenario in progress',
    };
  }

  /**
   * Scale monster stats based on difficulty level
   * Difficulty 0-7, where 0 is easiest
   */
  scaleMonsterStats(baseStats: MonsterStats, difficulty: number): MonsterStats {
    // Clamp difficulty to valid range
    const clampedDifficulty = Math.max(0, Math.min(7, difficulty));

    // Scale factor: +10% per difficulty level
    const scaleFactor = 1 + clampedDifficulty * 0.1;

    return {
      health: Math.floor(baseStats.health * scaleFactor),
      movement: baseStats.movement, // Movement doesn't scale
      attack: Math.floor(baseStats.attack * scaleFactor),
      range: baseStats.range, // Range doesn't scale
    };
  }

  /**
   * Get base stats for monster type
   * In production, this would query a monster database
   */
  private getMonsterBaseStats(
    monsterType: string,
    isElite: boolean,
  ): MonsterStats {
    // Default stats for monster types from scenarios.json
    const baseStats: Record<string, MonsterStats> = {
      'Bandit Guard': { health: 5, movement: 2, attack: 2, range: 0 },
      'Bandit Archer': { health: 4, movement: 2, attack: 2, range: 3 },
      'Living Bones': { health: 4, movement: 2, attack: 1, range: 0 },
      'Inox Guard': { health: 8, movement: 2, attack: 3, range: 0 },
      'Inox Shaman': { health: 6, movement: 2, attack: 2, range: 3 },
      'Vermling Scout': { health: 3, movement: 3, attack: 2, range: 0 },
      'Vermling Shaman': { health: 4, movement: 2, attack: 1, range: 2 },
      'Flame Demon': { health: 6, movement: 2, attack: 3, range: 0 },
      'Frost Demon': { health: 6, movement: 2, attack: 2, range: 2 },
      'Earth Demon': { health: 8, movement: 1, attack: 3, range: 0 },
      'City Guard': { health: 6, movement: 2, attack: 3, range: 0 },
    };

    const stats = baseStats[monsterType] || {
      health: 5,
      movement: 2,
      attack: 2,
      range: 0,
    };

    // Elite monsters have +2 health and +1 attack
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
   * Spawn loot token on hex when monster dies (T120)
   * @param roomId - Game room ID
   * @param monsterHex - Hex coordinates where monster died
   * @param difficulty - Scenario difficulty level (0-7)
   * @returns LootToken instance
   */
  spawnLootToken(
    roomId: string,
    monsterHex: AxialCoordinates,
    difficulty: number,
  ): LootToken {
    // Calculate loot value based on difficulty
    const lootValue = LootToken.calculateLootValue(difficulty);

    // Create loot token at monster's hex
    const lootToken = LootToken.create(roomId, monsterHex, lootValue);

    return lootToken;
  }

  /**
   * Spawn multiple loot tokens from defeated monsters
   * @param roomId - Game room ID
   * @param defeatedMonsters - Array of monsters that died this round
   * @param difficulty - Scenario difficulty level
   * @returns Array of LootToken instances
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

    // Check map layout has minimum tiles (reduced to 5 for testing)
    if (scenario.mapLayout.length < 5) {
      errors.push('Map layout must have at least 5 tiles');
    }

    // Check monster groups exist
    if (scenario.monsterGroups.length === 0) {
      errors.push('Scenario must have at least one monster group');
    }

    // Check spawn points match terrain
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
          // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
        } else if (tile.terrain === 'obstacle') {
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

  /**
   * Get available scenarios list
   */
  async getAvailableScenarios(): Promise<
    Array<{ id: string; name: string; difficulty: number }>
  > {
    const scenarios = await this.loadScenariosFromFile();
    return scenarios.map((s) => ({
      id: s.id,
      name: s.name,
      difficulty: s.difficulty,
    }));
  }

  async saveScenario(scenarioData: Omit<Scenario, 'id'>): Promise<Scenario> {
    const scenarios = await this.loadScenariosFromFile();
    if (!this.scenariosFilePath) {
      throw new Error('Scenario file path not found, cannot save.');
    }

    const maxId = scenarios.reduce((max, s) => {
      const idNum = parseInt(s.id.replace('scenario-', ''));
      return idNum > max ? idNum : max;
    }, 0);
    const newId = `scenario-${maxId + 1}`;
    const newScenario: Scenario = {
      id: newId,
      ...scenarioData,
    };

    scenarios.push(newScenario);

    const dataToWrite = JSON.stringify({ scenarios }, null, 2);

    try {
      await fs.promises.writeFile(this.scenariosFilePath, dataToWrite, 'utf-8');
      // Invalidate cache
      this.scenarios = null;
      return newScenario;
    } catch (error) {
      console.error('Failed to save scenario:', error);
      throw new Error('Could not save scenario.');
    }
  }
}
