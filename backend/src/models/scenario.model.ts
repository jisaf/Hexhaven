/**
 * Scenario Model (US2 - T089)
 *
 * Represents a pre-defined battle setup with map layout, monster groups,
 * and victory/defeat conditions. Scenarios define the tactical challenge
 * that players must complete.
 */

import type {
  AxialCoordinates,
  HexTile,
  MonsterGroup,
  TreasureLocation,
} from '../../../shared/types/entities';
import { TerrainType } from '../../../shared/types/entities';

export interface ScenarioData {
  id: string;
  name: string;
  difficulty: number;
  mapLayout: HexTile[];
  monsterGroups: MonsterGroup[];
  objectivePrimary: string;
  objectiveSecondary?: string;
  treasures?: TreasureLocation[];
  createdAt: Date;
}

export class Scenario {
  public readonly id: string;
  public readonly name: string;
  private _difficulty: number;
  private readonly _mapLayout: HexTile[];
  private readonly _monsterGroups: MonsterGroup[];
  public readonly objectivePrimary: string;
  public readonly objectiveSecondary?: string;
  private readonly _treasures: TreasureLocation[];
  private readonly _createdAt: Date;

  constructor(data: ScenarioData) {
    this.id = data.id;
    this.name = data.name;
    this._difficulty = data.difficulty;
    this._mapLayout = data.mapLayout;
    this._monsterGroups = data.monsterGroups;
    this.objectivePrimary = data.objectivePrimary;
    this.objectiveSecondary = data.objectiveSecondary;
    this._treasures = data.treasures || [];
    this._createdAt = data.createdAt;

    this.validate();
  }

  // Getters
  get difficulty(): number {
    return this._difficulty;
  }

  get mapLayout(): readonly HexTile[] {
    return [...this._mapLayout];
  }

  get monsterGroups(): readonly MonsterGroup[] {
    return [...this._monsterGroups];
  }

  get treasures(): readonly TreasureLocation[] {
    return [...this._treasures];
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get hexCount(): number {
    return this._mapLayout.length;
  }

  get monsterTypeCount(): number {
    return this._monsterGroups.length;
  }

  get totalMonsters(): number {
    return this._monsterGroups.reduce((sum, group) => sum + group.count, 0);
  }

  get hasSecondaryObjective(): boolean {
    return !!this.objectiveSecondary;
  }

  get hasTreasures(): boolean {
    return this._treasures.length > 0;
  }

  // Methods
  private validate(): void {
    if (this._difficulty < 0 || this._difficulty > 7) {
      throw new Error('Difficulty must be between 0 and 7');
    }

    if (this._mapLayout.length < 10) {
      throw new Error('Map layout must have at least 10 hexes');
    }

    if (this._monsterGroups.length === 0) {
      throw new Error('Scenario must have at least one monster group');
    }

    if (!this.objectivePrimary || this.objectivePrimary.trim().length === 0) {
      throw new Error('Primary objective cannot be empty');
    }

    // Validate spawn points are on map
    this._monsterGroups.forEach((group) => {
      group.spawnPoints.forEach((spawn) => {
        const hex = this.getHexAt(spawn);
        if (!hex) {
          throw new Error(`Spawn point (${spawn.q},${spawn.r}) is not on map`);
        }
        if (hex.terrain === TerrainType.OBSTACLE) {
          throw new Error(`Spawn point cannot be on obstacle terrain`);
        }
      });
    });
  }

  getHexAt(coordinates: AxialCoordinates): HexTile | null {
    return (
      this._mapLayout.find(
        (hex) =>
          hex.coordinates.q === coordinates.q &&
          hex.coordinates.r === coordinates.r,
      ) || null
    );
  }

  getHexesByTerrain(terrain: TerrainType): HexTile[] {
    return this._mapLayout.filter((hex) => hex.terrain === terrain);
  }

  getSpawnPoints(): AxialCoordinates[] {
    return this._monsterGroups.flatMap((group) => group.spawnPoints);
  }

  getTreasureAt(coordinates: AxialCoordinates): TreasureLocation | null {
    return (
      this._treasures.find(
        (treasure) =>
          treasure.coordinates.q === coordinates.q &&
          treasure.coordinates.r === coordinates.r,
      ) || null
    );
  }

  isStartingArea(coordinates: AxialCoordinates): boolean {
    // Starting area is typically at q=0, r=0 and adjacent hexes
    const distance = Math.max(
      Math.abs(coordinates.q),
      Math.abs(coordinates.r),
      Math.abs(-coordinates.q - coordinates.r),
    );
    return distance <= 1;
  }

  getMonsterGroupByType(monsterType: string): MonsterGroup | null {
    return (
      this._monsterGroups.find((group) => group.type === monsterType) || null
    );
  }

  getTotalMonstersForPlayerCount(playerCount: number): number {
    // Adjust monster count based on player count
    // Typically: 2 players = base, 3 players = +50%, 4 players = +100%
    const baseCount = this.totalMonsters;
    const multiplier = 0.5 * (playerCount - 2);
    return Math.ceil(baseCount * (1 + multiplier));
  }

  toJSON(): ScenarioData {
    return {
      id: this.id,
      name: this.name,
      difficulty: this._difficulty,
      mapLayout: this._mapLayout,
      monsterGroups: this._monsterGroups,
      objectivePrimary: this.objectivePrimary,
      objectiveSecondary: this.objectiveSecondary,
      treasures: this._treasures,
      createdAt: this._createdAt,
    };
  }

  /**
   * Create a new Scenario instance
   */
  static create(
    name: string,
    difficulty: number,
    mapLayout: HexTile[],
    monsterGroups: MonsterGroup[],
    objectivePrimary: string,
    objectiveSecondary?: string,
    treasures?: TreasureLocation[],
  ): Scenario {
    return new Scenario({
      id: `scenario_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      difficulty,
      mapLayout,
      monsterGroups,
      objectivePrimary,
      objectiveSecondary,
      treasures,
      createdAt: new Date(),
    });
  }

  /**
   * Create a simple test scenario (Black Barrow #1)
   */
  static createBlackBarrow(): Scenario {
    // Simple rectangular map (5x5 grid)
    const mapLayout: HexTile[] = [];
    for (let q = -2; q <= 2; q++) {
      for (let r = -2; r <= 2; r++) {
        // Skip corners to make it more interesting
        if (Math.abs(q) === 2 && Math.abs(r) === 2) continue;

        const terrain: TerrainType =
          Math.random() > 0.8 ? TerrainType.OBSTACLE : TerrainType.NORMAL;

        mapLayout.push({
          coordinates: { q, r },
          terrain,
          occupiedBy: null,
          hasLoot: false,
          hasTreasure: false,
        });
      }
    }

    // Bandit guards spawn in back
    const monsterGroups: MonsterGroup[] = [
      {
        type: 'Bandit Guard',
        count: 3,
        spawnPoints: [
          { q: 2, r: 0 },
          { q: 1, r: 1 },
          { q: 1, r: -1 },
        ],
        isElite: false,
      },
      {
        type: 'Bandit Archer',
        count: 2,
        spawnPoints: [
          { q: 2, r: -1 },
          { q: 2, r: 1 },
        ],
        isElite: false,
      },
    ];

    return Scenario.create(
      'Black Barrow #1',
      1,
      mapLayout,
      monsterGroups,
      'Kill all enemies',
      'Loot the treasure chest',
      [
        {
          coordinates: { q: 2, r: 0 },
          treasureId: 'chest_001',
        },
      ],
    );
  }

  /**
   * Create a scenario with Living Bones
   */
  static createBarrowLair(): Scenario {
    const mapLayout: HexTile[] = [];

    // Create a larger hex grid (7x7)
    for (let q = -3; q <= 3; q++) {
      for (let r = -3; r <= 3; r++) {
        if (Math.abs(q) === 3 && Math.abs(r) === 3) continue;

        const isCenter = q === 0 && r === 0;
        const terrain: TerrainType = isCenter
          ? TerrainType.DIFFICULT
          : Math.random() > 0.85
            ? TerrainType.OBSTACLE
            : TerrainType.NORMAL;

        mapLayout.push({
          coordinates: { q, r },
          terrain,
          occupiedBy: null,
          hasLoot: Math.random() > 0.95,
          hasTreasure: false,
        });
      }
    }

    const monsterGroups: MonsterGroup[] = [
      {
        type: 'Living Bones',
        count: 4,
        spawnPoints: [
          { q: 3, r: 0 },
          { q: 2, r: 1 },
          { q: 2, r: -1 },
          { q: 3, r: -1 },
        ],
        isElite: false,
      },
      {
        type: 'Living Bones',
        count: 1,
        spawnPoints: [{ q: 3, r: 1 }],
        isElite: true,
      },
    ];

    return Scenario.create(
      'Barrow Lair #2',
      2,
      mapLayout,
      monsterGroups,
      'Defeat all Living Bones',
      'Reach the exit at (3, 0)',
    );
  }

  /**
   * Create a scenario from JSON data
   */
  static fromJSON(data: ScenarioData): Scenario {
    return new Scenario(data);
  }
}
