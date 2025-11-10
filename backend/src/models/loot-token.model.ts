/**
 * LootToken Model (US2 - T119)
 *
 * Represents a loot token on the game board that can be collected by players.
 * Loot tokens spawn when monsters are defeated and provide gold rewards.
 */

import type { AxialCoordinates } from '../../../shared/types/entities';

export interface LootTokenData {
  id: string;
  roomId: string;
  coordinates: AxialCoordinates;
  value: number;
  isCollected: boolean;
  collectedBy: string | null;
  createdAt: Date;
  collectedAt: Date | null;
}

export class LootToken {
  public readonly id: string;
  public readonly roomId: string;
  private _coordinates: AxialCoordinates;
  private readonly _value: number;
  private _isCollected: boolean;
  private _collectedBy: string | null;
  private readonly _createdAt: Date;
  private _collectedAt: Date | null;

  constructor(data: LootTokenData) {
    this.id = data.id;
    this.roomId = data.roomId;
    this._coordinates = data.coordinates;
    this._value = data.value;
    this._isCollected = data.isCollected;
    this._collectedBy = data.collectedBy;
    this._createdAt = data.createdAt;
    this._collectedAt = data.collectedAt;
  }

  // Getters
  get coordinates(): AxialCoordinates {
    return { ...this._coordinates };
  }

  get value(): number {
    return this._value;
  }

  get isCollected(): boolean {
    return this._isCollected;
  }

  get collectedBy(): string | null {
    return this._collectedBy;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get collectedAt(): Date | null {
    return this._collectedAt;
  }

  // Methods

  /**
   * Mark loot token as collected by a player
   * @param playerId - UUID of the player collecting the loot
   * @throws Error if already collected
   */
  collect(playerId: string): void {
    if (this._isCollected) {
      throw new Error('Loot token has already been collected');
    }

    if (!playerId || typeof playerId !== 'string') {
      throw new Error('Invalid player ID');
    }

    this._isCollected = true;
    this._collectedBy = playerId;
    this._collectedAt = new Date();
  }

  /**
   * Check if loot token is at specific coordinates
   * @param coordinates - Axial coordinates to check
   * @returns True if loot is at the given coordinates
   */
  isAtCoordinates(coordinates: AxialCoordinates): boolean {
    return (
      this._coordinates.q === coordinates.q &&
      this._coordinates.r === coordinates.r
    );
  }

  /**
   * Serialize to plain object for transmission
   */
  toJSON(): LootTokenData {
    return {
      id: this.id,
      roomId: this.roomId,
      coordinates: this.coordinates,
      value: this._value,
      isCollected: this._isCollected,
      collectedBy: this._collectedBy,
      createdAt: this._createdAt,
      collectedAt: this._collectedAt,
    };
  }

  /**
   * Create loot token from plain object
   */
  static fromJSON(data: LootTokenData): LootToken {
    return new LootToken(data);
  }

  /**
   * Factory method to create a new uncollected loot token
   * @param roomId - Game room ID
   * @param coordinates - Position on the hex grid
   * @param value - Gold value (1-3 based on difficulty)
   * @returns New LootToken instance
   */
  static create(
    roomId: string,
    coordinates: AxialCoordinates,
    value: number,
  ): LootToken {
    if (value < 1 || value > 3) {
      throw new Error('Loot value must be between 1 and 3');
    }

    const data: LootTokenData = {
      id: crypto.randomUUID(),
      roomId,
      coordinates,
      value,
      isCollected: false,
      collectedBy: null,
      createdAt: new Date(),
      collectedAt: null,
    };

    return new LootToken(data);
  }

  /**
   * Calculate loot value based on scenario difficulty
   * @param difficulty - Scenario difficulty level (0-7)
   * @returns Loot value (1-3)
   */
  static calculateLootValue(difficulty: number): number {
    if (difficulty <= 2) return 1;
    if (difficulty <= 5) return 2;
    return 3;
  }
}
