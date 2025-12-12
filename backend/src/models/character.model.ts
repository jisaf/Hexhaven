/**
 * Character Model (US1 - T047)
 *
 * Represents a playable character in the game with stats,
 * position, health, and conditions.
 */

import type {
  CharacterClass,
  AxialCoordinates,
} from '../../../shared/types/entities';
import { Condition } from '../../../shared/types/entities';
import { AbilityCard } from './ability-card.model';

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
  hand: string[]; // Card IDs in hand
  discardPile: string[]; // Card IDs in discard pile
  lostPile: string[]; // Card IDs in lost pile
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
  private _hand: string[]; // Card IDs in hand
  private _discardPile: string[]; // Card IDs in discard pile
  private _lostPile: string[]; // Card IDs in lost pile
  private _selectedCards?: {
    topCardId: string;
    bottomCardId: string;
    initiative: number;
  };
  private _hasMovedThisTurn: boolean = false; // Deprecated - kept for backward compatibility
  private _movementUsedThisTurn: number = 0; // New: tracks cumulative movement distance
  private _effectiveMovementThisTurn: number = 0; // Movement value from selected card (Gloomhaven: movement comes from cards, not base stats)
  private _effectiveAttackThisTurn: number = 0; // Attack value from selected card (Gloomhaven: attack comes from cards, not base stats)
  private _effectiveRangeThisTurn: number = 0; // Attack range from selected card
  private _hasAttackedThisTurn: boolean = false;
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
    this._hand = data.hand || [];
    this._discardPile = data.discardPile || [];
    this._lostPile = data.lostPile || [];
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
    return this._conditions.has(Condition.IMMOBILIZE);
  }

  get isStunned(): boolean {
    return this._conditions.has(Condition.STUN);
  }

  get isDisarmed(): boolean {
    return this._conditions.has(Condition.DISARM);
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get selectedCards():
    | { topCardId: string; bottomCardId: string; initiative: number }
    | undefined {
    return this._selectedCards ? { ...this._selectedCards } : undefined;
  }

  set selectedCards(
    cards:
      | { topCardId: string; bottomCardId: string; initiative: number }
      | undefined,
  ) {
    this._selectedCards = cards ? { ...cards } : undefined;
    this._updatedAt = new Date();
  }

  get hasMovedThisTurn(): boolean {
    return this._hasMovedThisTurn;
  }

  get movementUsedThisTurn(): number {
    return this._movementUsedThisTurn;
  }

  get effectiveMovementThisTurn(): number {
    // Use card's movement value if set, otherwise fall back to base stat
    return this._effectiveMovementThisTurn > 0
      ? this._effectiveMovementThisTurn
      : this._stats.movement;
  }

  get movementRemainingThisTurn(): number {
    return Math.max(
      0,
      this.effectiveMovementThisTurn - this._movementUsedThisTurn,
    );
  }

  get effectiveAttackThisTurn(): number {
    // Use card's attack value if set, otherwise fall back to base stat
    return this._effectiveAttackThisTurn > 0
      ? this._effectiveAttackThisTurn
      : this._stats.attack;
  }

  get effectiveRangeThisTurn(): number {
    // Use card's range value if set, otherwise fall back to base stat
    return this._effectiveRangeThisTurn > 0
      ? this._effectiveRangeThisTurn
      : this._stats.range;
  }

  get hasAttackedThisTurn(): boolean {
    return this._hasAttackedThisTurn;
  }

  get hand(): string[] {
    return [...this._hand];
  }

  set hand(cards: string[]) {
    this._hand = [...cards];
    this._updatedAt = new Date();
  }

  get discardPile(): string[] {
    return [...this._discardPile];
  }

  set discardPile(cards: string[]) {
    this._discardPile = [...cards];
    this._updatedAt = new Date();
  }

  get lostPile(): string[] {
    return [...this._lostPile];
  }

  set lostPile(cards: string[]) {
    this._lostPile = [...cards];
    this._updatedAt = new Date();
  }

  // Card pile management methods
  removeFromHand(cardId: string): boolean {
    const index = this._hand.indexOf(cardId);
    if (index === -1) return false;
    this._hand.splice(index, 1);
    this._updatedAt = new Date();
    return true;
  }

  addToDiscard(cardId: string): void {
    this._discardPile.push(cardId);
    this._updatedAt = new Date();
  }

  addToLost(cardId: string): void {
    this._lostPile.push(cardId);
    this._updatedAt = new Date();
  }

  removeFromDiscard(cardId: string): boolean {
    const index = this._discardPile.indexOf(cardId);
    if (index === -1) return false;
    this._discardPile.splice(index, 1);
    this._updatedAt = new Date();
    return true;
  }

  moveDiscardToHand(): void {
    this._hand.push(...this._discardPile);
    this._discardPile = [];
    this._updatedAt = new Date();
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

    const actualHeal = Math.min(
      amount,
      this._stats.maxHealth - this._currentHealth,
    );
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

  /**
   * Mark that character has moved this turn
   * @deprecated Use addMovementUsed() instead to track cumulative distance
   */
  markMovedThisTurn(): void {
    this._hasMovedThisTurn = true;
    this._updatedAt = new Date();
  }

  /**
   * Add movement distance used this turn
   * @param distance - The distance moved (in hexes)
   */
  addMovementUsed(distance: number): void {
    if (distance < 0) {
      throw new Error('Movement distance must be non-negative');
    }
    this._movementUsedThisTurn += distance;
    if (this._movementUsedThisTurn > 0) {
      this._hasMovedThisTurn = true; // Keep backward compatibility
    }
    this._updatedAt = new Date();
  }

  /**
   * Set effective movement for this turn from selected card
   * In Gloomhaven, movement comes from the card you play, not base stats
   * @param movement - The movement value from the selected card
   */
  setEffectiveMovement(movement: number): void {
    if (movement < 0) {
      throw new Error('Movement value must be non-negative');
    }
    this._effectiveMovementThisTurn = movement;
    this._updatedAt = new Date();
  }

  /**
   * Set effective attack and range for this turn from selected card
   * In Gloomhaven, attack comes from the card you play, not base stats
   * @param attack - The attack value from the selected card
   * @param range - The attack range from the selected card (0 for melee)
   */
  setEffectiveAttack(attack: number, range: number): void {
    if (attack < 0) {
      throw new Error('Attack value must be non-negative');
    }
    if (range < 0) {
      throw new Error('Range value must be non-negative');
    }
    this._effectiveAttackThisTurn = attack;
    this._effectiveRangeThisTurn = range;
    this._updatedAt = new Date();
  }

  /**
   * Mark that character has attacked this turn
   */
  markAttackedThisTurn(): void {
    this._hasAttackedThisTurn = true;
    this._updatedAt = new Date();
  }

  /**
   * Reset action flags at end of turn
   */
  resetActionFlags(): void {
    this._hasMovedThisTurn = false;
    this._movementUsedThisTurn = 0;
    this._effectiveMovementThisTurn = 0; // Reset card movement value for next turn
    this._effectiveAttackThisTurn = 0; // Reset card attack value for next turn
    this._effectiveRangeThisTurn = 0; // Reset card range value for next turn
    this._hasAttackedThisTurn = false;
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
      hand: [...this._hand],
      discardPile: [...this._discardPile],
      lostPile: [...this._lostPile],
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

    // Get starter deck and extract card IDs
    const starterDeck = AbilityCard.getStarterDeck(characterClass);
    const cardIds = starterDeck.map((card) => card.id);

    return new Character({
      id: `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      playerId,
      characterClass,
      position: startingPosition,
      stats,
      currentHealth: stats.maxHealth,
      conditions: [],
      exhausted: false,
      hand: cardIds, // Start with all cards in hand
      discardPile: [], // Empty discard pile
      lostPile: [], // Empty lost pile
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Create a character with a specific ID (Issue #205)
   * Used when loading persistent characters from database.
   *
   * @param id - The persistent character ID from database
   * @param playerId - The player's session UUID
   * @param characterClass - The character class
   * @param startingPosition - Starting position for the game
   * @param currentHealth - Current health (optional, defaults to max)
   */
  static createWithId(
    id: string,
    playerId: string,
    characterClass: CharacterClass,
    startingPosition: AxialCoordinates,
    currentHealth?: number,
  ): Character {
    const now = new Date();
    const stats = Character.getStatsForClass(characterClass);

    // Get starter deck and extract card IDs
    const starterDeck = AbilityCard.getStarterDeck(characterClass);
    const cardIds = starterDeck.map((card) => card.id);

    return new Character({
      id, // Use provided ID (persistent character ID)
      playerId,
      characterClass,
      position: startingPosition,
      stats,
      currentHealth: currentHealth ?? stats.maxHealth,
      conditions: [],
      exhausted: false,
      hand: cardIds,
      discardPile: [],
      lostPile: [],
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
