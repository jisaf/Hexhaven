/**
 * Character Model (US1 - T047)
 *
 * Represents a playable character in the game with stats,
 * position, health, and conditions.
 */

import type {
  CharacterClass,
  AxialCoordinates,
  Condition,
} from '../../../shared/types/entities';

export interface CharacterStats {
  health: number;
  maxHealth: number;
  movement: number;
  attack: number;
  range: number;
}

export interface CharacterData {
  id: string;
  playerId: string;
  characterClass: CharacterClass;
  position: AxialCoordinates;
  stats: CharacterStats;
  currentHealth: number;
  conditions: Condition[];
  exhausted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Character {
  public readonly id: string;
  public readonly playerId: string;
  public readonly characterClass: CharacterClass;
  private _position: AxialCoordinates;
  private readonly _stats: CharacterStats;
  private _currentHealth: number;
  private _conditions: Set<Condition>;
  private _exhausted: boolean;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(data: CharacterData) {
    this.id = data.id;
    this.playerId = data.playerId;
    this.characterClass = data.characterClass;
    this._position = data.position;
    this._stats = data.stats;
    this._currentHealth = data.currentHealth;
    this._conditions = new Set(data.conditions);
    this._exhausted = data.exhausted;
    this._createdAt = data.createdAt;
    this._updatedAt = data.updatedAt;
  }

  // Getters
  get position(): AxialCoordinates {
    return { ...this._position };
  }

  get stats(): Readonly<CharacterStats> {
    return { ...this._stats };
  }

  get currentHealth(): number {
    return this._currentHealth;
  }

  get maxHealth(): number {
    return this._stats.maxHealth;
  }

  get movement(): number {
    return this._stats.movement;
  }

  get attack(): number {
    return this._stats.attack;
  }

  get range(): number {
    return this._stats.range;
  }

  get conditions(): Condition[] {
    return Array.from(this._conditions);
  }

  get exhausted(): boolean {
    return this._exhausted;
  }

  get isDead(): boolean {
    return this._currentHealth <= 0;
  }

  get isImmobilized(): boolean {
    return this._conditions.has('immobilize');
  }

  get isStunned(): boolean {
    return this._conditions.has('stun');
  }

  get isDisarmed(): boolean {
    return this._conditions.has('disarm');
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // Methods
  moveTo(position: AxialCoordinates): void {
    if (this.isImmobilized) {
      throw new Error('Character is immobilized and cannot move');
    }

    this._position = position;
    this._updatedAt = new Date();
  }

  takeDamage(amount: number): number {
    if (amount < 0) {
      throw new Error('Damage amount must be positive');
    }

    const actualDamage = Math.min(amount, this._currentHealth);
    this._currentHealth -= actualDamage;
    this._updatedAt = new Date();

    return actualDamage;
  }

  heal(amount: number): number {
    if (amount < 0) {
      throw new Error('Heal amount must be positive');
    }

    const actualHeal = Math.min(amount, this._stats.maxHealth - this._currentHealth);
    this._currentHealth += actualHeal;
    this._updatedAt = new Date();

    return actualHeal;
  }

  addCondition(condition: Condition): void {
    this._conditions.add(condition);
    this._updatedAt = new Date();
  }

  removeCondition(condition: Condition): void {
    this._conditions.delete(condition);
    this._updatedAt = new Date();
  }

  clearConditions(): void {
    this._conditions.clear();
    this._updatedAt = new Date();
  }

  exhaust(): void {
    this._exhausted = true;
    this._updatedAt = new Date();
  }

  revive(): void {
    if (!this._exhausted) {
      throw new Error('Character is not exhausted');
    }

    this._exhausted = false;
    this._currentHealth = 1;
    this._conditions.clear();
    this._updatedAt = new Date();
  }

  toJSON(): CharacterData {
    return {
      id: this.id,
      playerId: this.playerId,
      characterClass: this.characterClass,
      position: this._position,
      stats: this._stats,
      currentHealth: this._currentHealth,
      conditions: Array.from(this._conditions),
      exhausted: this._exhausted,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  /**
   * Create a new Character instance for a player
   */
  static create(
    playerId: string,
    characterClass: CharacterClass,
    startingPosition: AxialCoordinates,
  ): Character {
    const now = new Date();
    const stats = Character.getStatsForClass(characterClass);

    return new Character({
      id: `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      playerId,
      characterClass,
      position: startingPosition,
      stats,
      currentHealth: stats.maxHealth,
      conditions: [],
      exhausted: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Get base stats for each character class
   */
  static getStatsForClass(characterClass: CharacterClass): CharacterStats {
    const statsMap: Record<CharacterClass, CharacterStats> = {
      Brute: {
        health: 10,
        maxHealth: 10,
        movement: 2,
        attack: 3,
        range: 1,
      },
      Tinkerer: {
        health: 8,
        maxHealth: 8,
        movement: 2,
        attack: 2,
        range: 2,
      },
      Spellweaver: {
        health: 6,
        maxHealth: 6,
        movement: 2,
        attack: 3,
        range: 3,
      },
      Scoundrel: {
        health: 8,
        maxHealth: 8,
        movement: 3,
        attack: 3,
        range: 1,
      },
      Cragheart: {
        health: 10,
        maxHealth: 10,
        movement: 2,
        attack: 3,
        range: 2,
      },
      Mindthief: {
        health: 6,
        maxHealth: 6,
        movement: 3,
        attack: 2,
        range: 1,
      },
    };

    return { ...statsMap[characterClass] };
  }
}
