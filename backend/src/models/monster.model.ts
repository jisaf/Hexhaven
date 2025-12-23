/**
 * Monster Model (US2 - T086)
 *
 * Represents an AI-controlled enemy entity with stats, position,
 * and special abilities. Monsters have health, movement, attack,
 * and can have conditions applied to them.
 */

import { randomUUID } from 'crypto';
import type { AxialCoordinates } from '../../../shared/types/entities';
import { Condition } from '../../../shared/types/entities';

export interface MonsterStats {
  health: number;
  maxHealth: number;
  movement: number;
  attack: number;
  range: number;
}

export interface MonsterData {
  id: string;
  roomId: string;
  monsterType: string;
  isElite: boolean;
  position: AxialCoordinates;
  stats: MonsterStats;
  currentHealth: number;
  specialAbilities: string[];
  conditions: Condition[];
  isDead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Monster {
  public readonly id: string;
  public readonly roomId: string;
  public readonly monsterType: string;
  public readonly isElite: boolean;
  private _position: AxialCoordinates;
  private readonly _stats: MonsterStats;
  private _currentHealth: number;
  private readonly _specialAbilities: Set<string>;
  private _conditions: Set<Condition>;
  private _isDead: boolean;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(data: MonsterData) {
    this.id = data.id;
    this.roomId = data.roomId;
    this.monsterType = data.monsterType;
    this.isElite = data.isElite;
    this._position = data.position;
    this._stats = data.stats;
    this._currentHealth = data.currentHealth;
    this._specialAbilities = new Set(data.specialAbilities);
    this._conditions = new Set(data.conditions);
    this._isDead = data.isDead;
    this._createdAt = data.createdAt;
    this._updatedAt = data.updatedAt;
  }

  // Getters
  get position(): AxialCoordinates {
    return { ...this._position };
  }

  get stats(): Readonly<MonsterStats> {
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

  get specialAbilities(): string[] {
    return Array.from(this._specialAbilities);
  }

  get conditions(): Condition[] {
    return Array.from(this._conditions);
  }

  get isDead(): boolean {
    return this._isDead;
  }

  get isImmobilized(): boolean {
    return this._conditions.has(Condition.IMMOBILIZE);
  }

  get isStunned(): boolean {
    return this._conditions.has(Condition.STUN);
  }

  get isDisarmed(): boolean {
    return this._conditions.has(Condition.DISARM);
  }

  get isMuddled(): boolean {
    return this._conditions.has(Condition.MUDDLE);
  }

  get hasFlying(): boolean {
    return this._specialAbilities.has('Flying');
  }

  get hasRetaliate(): boolean {
    return Array.from(this._specialAbilities).some((ability) =>
      ability.startsWith('Retaliate'),
    );
  }

  get hasShield(): boolean {
    return Array.from(this._specialAbilities).some((ability) =>
      ability.startsWith('Shield'),
    );
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
      throw new Error('Monster is immobilized and cannot move');
    }

    if (this.isStunned) {
      throw new Error('Monster is stunned and cannot take actions');
    }

    if (this._isDead) {
      throw new Error('Monster is dead and cannot move');
    }

    this._position = position;
    this._updatedAt = new Date();
  }

  takeDamage(amount: number): number {
    if (amount < 0) {
      throw new Error('Damage amount must be positive');
    }

    if (this._isDead) {
      return 0;
    }

    const actualDamage = Math.min(amount, this._currentHealth);
    this._currentHealth -= actualDamage;

    if (this._currentHealth <= 0) {
      this._isDead = true;
    }

    this._updatedAt = new Date();
    return actualDamage;
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

  kill(): void {
    this._isDead = true;
    this._currentHealth = 0;
    this._updatedAt = new Date();
  }

  getRetaliateValue(): number {
    const retaliateAbility = Array.from(this._specialAbilities).find(
      (ability) => ability.startsWith('Retaliate'),
    );

    if (!retaliateAbility) {
      return 0;
    }

    // Extract number from "Retaliate X" (e.g., "Retaliate 2" -> 2)
    const match = retaliateAbility.match(/Retaliate\s+(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  getShieldValue(): number {
    const shieldAbility = Array.from(this._specialAbilities).find((ability) =>
      ability.startsWith('Shield'),
    );

    if (!shieldAbility) {
      return 0;
    }

    // Extract number from "Shield X" (e.g., "Shield 1" -> 1)
    const match = shieldAbility.match(/Shield\s+(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  toJSON(): MonsterData {
    return {
      id: this.id,
      roomId: this.roomId,
      monsterType: this.monsterType,
      isElite: this.isElite,
      position: this._position,
      stats: this._stats,
      currentHealth: this._currentHealth,
      specialAbilities: Array.from(this._specialAbilities),
      conditions: Array.from(this._conditions),
      isDead: this._isDead,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  /**
   * Create a new Monster instance
   */
  static create(
    roomId: string,
    monsterType: string,
    isElite: boolean,
    position: AxialCoordinates,
    stats: MonsterStats,
    specialAbilities: string[] = [],
  ): Monster {
    const now = new Date();

    return new Monster({
      id: randomUUID(), // Use UUID for consistency
      roomId,
      monsterType,
      isElite,
      position,
      stats,
      currentHealth: stats.maxHealth,
      specialAbilities,
      conditions: [],
      isDead: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Note: Monster stats are defined in ScenarioService.getMonsterBaseStats()
  // to avoid duplication. This class focuses on monster instance behavior.
}
