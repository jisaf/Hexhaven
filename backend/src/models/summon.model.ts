/**
 * Summon Model (Issue #228)
 *
 * Represents an allied entity summoned by a player or spawned by a scenario.
 * Summons can be AI-controlled or player-controlled, and act immediately
 * before their owner in turn order.
 *
 * Design decisions:
 * - ownerId is optional: undefined for scenario/narrative allies
 * - playerControlled: if true, player gives orders; otherwise AI-controlled
 * - initiative: copies owner's initiative (treated as LOWER for tiebreakers)
 * - Summons act BEFORE their owner in turn order
 * - Monsters focus summons BEFORE their owner at same distance
 */

import { randomUUID } from 'crypto';
import type {
  AxialCoordinates,
  Condition,
} from '../../../shared/types/entities';
import { SummonDefinition } from '../../../shared/types/modifiers';

export type SummonDeathReason =
  | 'damage'
  | 'owner_exhausted'
  | 'owner_died'
  | 'scenario_end';

export interface SummonData {
  id: string;
  roomId: string;
  ownerId?: string; // Character ID if player-summoned, undefined for scenario allies
  name: string;
  position: AxialCoordinates;
  health: number;
  maxHealth: number;
  attack: number;
  move: number;
  range: number;
  conditions: Condition[];
  isDead: boolean;
  playerControlled: boolean;
  initiative: number;
  typeIcon?: string;
  deathReason?: SummonDeathReason;
  createdAt: Date;
  updatedAt: Date;
}

export class Summon {
  public readonly id: string;
  public readonly roomId: string;
  public readonly ownerId?: string;
  public readonly name: string;
  private _position: AxialCoordinates;
  private readonly _maxHealth: number;
  private _currentHealth: number;
  public readonly attack: number;
  public readonly move: number;
  public readonly range: number;
  private _conditions: Set<Condition>;
  private _isDead: boolean;
  public readonly playerControlled: boolean;
  public readonly initiative: number;
  public readonly typeIcon?: string;
  private _deathReason?: SummonDeathReason;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(data: SummonData) {
    this.id = data.id;
    this.roomId = data.roomId;
    this.ownerId = data.ownerId;
    this.name = data.name;
    this._position = data.position;
    this._maxHealth = data.maxHealth;
    this._currentHealth = data.health;
    this.attack = data.attack;
    this.move = data.move;
    this.range = data.range;
    this._conditions = new Set(data.conditions);
    this._isDead = data.isDead;
    this.playerControlled = data.playerControlled;
    this.initiative = data.initiative;
    this.typeIcon = data.typeIcon;
    this._deathReason = data.deathReason;
    this._createdAt = data.createdAt;
    this._updatedAt = data.updatedAt;
  }

  // Getters
  get position(): AxialCoordinates {
    return { ...this._position };
  }

  get currentHealth(): number {
    return this._currentHealth;
  }

  get maxHealth(): number {
    return this._maxHealth;
  }

  get conditions(): Condition[] {
    return Array.from(this._conditions);
  }

  get isDead(): boolean {
    return this._isDead;
  }

  get deathReason(): SummonDeathReason | undefined {
    return this._deathReason;
  }

  get isScenarioAlly(): boolean {
    return this.ownerId === undefined;
  }

  get isStunned(): boolean {
    return this._conditions.has('stun' as Condition);
  }

  get isImmobilized(): boolean {
    return this._conditions.has('immobilize' as Condition);
  }

  get isDisarmed(): boolean {
    return this._conditions.has('disarm' as Condition);
  }

  get canAct(): boolean {
    return !this._isDead && !this.isStunned;
  }

  get canMove(): boolean {
    return !this._isDead && !this.isStunned && !this.isImmobilized;
  }

  get canAttack(): boolean {
    return !this._isDead && !this.isStunned && !this.isDisarmed;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // Methods
  moveTo(position: AxialCoordinates): void {
    if (this._isDead) {
      throw new Error('Summon is dead and cannot move');
    }

    if (this.isStunned) {
      throw new Error('Summon is stunned and cannot take actions');
    }

    if (this.isImmobilized) {
      throw new Error('Summon is immobilized and cannot move');
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
      this._deathReason = 'damage';
    }

    this._updatedAt = new Date();
    return actualDamage;
  }

  heal(amount: number): number {
    if (amount < 0) {
      throw new Error('Heal amount must be positive');
    }

    if (this._isDead) {
      return 0;
    }

    const actualHeal = Math.min(amount, this._maxHealth - this._currentHealth);
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

  kill(reason: SummonDeathReason = 'damage'): void {
    this._isDead = true;
    this._currentHealth = 0;
    this._deathReason = reason;
    this._updatedAt = new Date();
  }

  toJSON(): SummonData {
    return {
      id: this.id,
      roomId: this.roomId,
      ownerId: this.ownerId,
      name: this.name,
      position: this._position,
      health: this._currentHealth,
      maxHealth: this._maxHealth,
      attack: this.attack,
      move: this.move,
      range: this.range,
      conditions: Array.from(this._conditions),
      isDead: this._isDead,
      playerControlled: this.playerControlled,
      initiative: this.initiative,
      typeIcon: this.typeIcon,
      deathReason: this._deathReason,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  static fromJSON(data: SummonData): Summon {
    return new Summon(data);
  }

  /**
   * Create a new Summon from a SummonDefinition
   * @param roomId - Game room ID
   * @param definition - Summon stats and configuration
   * @param position - Initial position on hex grid
   * @param ownerId - Character ID of summoner (undefined for scenario allies)
   * @param initiative - Initiative value (copies owner's or uses definition's)
   */
  static create(
    roomId: string,
    definition: SummonDefinition,
    position: AxialCoordinates,
    ownerId?: string,
    initiative?: number,
  ): Summon {
    const now = new Date();

    return new Summon({
      id: randomUUID(),
      roomId,
      ownerId,
      name: definition.name,
      position,
      health: definition.health,
      maxHealth: definition.health,
      attack: definition.attack,
      move: definition.move,
      range: definition.range,
      conditions: [],
      isDead: false,
      playerControlled: definition.playerControlled ?? false,
      initiative: initiative ?? definition.initiative ?? 99,
      typeIcon: definition.typeIcon,
      createdAt: now,
      updatedAt: now,
    });
  }
}
