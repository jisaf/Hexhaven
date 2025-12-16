/**
 * Player Model (US1 - T045)
 *
 * Represents a player in the game with connection state,
 * character selection, and room association.
 */

import type { CharacterClass } from '../../../shared/types/entities';
import { ConnectionStatus } from '../../../shared/types/entities';
import { MAX_CHARACTERS_PER_PLAYER } from '../../../shared/constants/game';

export interface PlayerData {
  id: string;
  uuid: string;
  nickname: string;
  roomId: string | null; // Room this player instance belongs to
  characterClasses: CharacterClass[]; // Support multi-character control
  characterIds: string[]; // Persistent character IDs (002)
  activeCharacterIndex: number; // Which character is currently focused (0-3)
  isHost: boolean;
  connectionStatus: ConnectionStatus;
  isReady: boolean;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Re-export for backward compatibility
export { MAX_CHARACTERS_PER_PLAYER } from '../../../shared/constants/game';

export class Player {
  public readonly id: string;
  public readonly uuid: string;
  private _nickname: string;
  private _roomId: string | null;
  private _characterClasses: CharacterClass[]; // Support multi-character control
  private _characterIds: string[]; // Persistent character IDs (002)
  private _activeCharacterIndex: number; // Which character is currently focused
  private _isHost: boolean;
  private _connectionStatus: ConnectionStatus;
  private _isReady: boolean;
  private _lastSeenAt: Date;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(data: PlayerData) {
    this.id = data.id;
    this.uuid = data.uuid;
    this._nickname = data.nickname;
    this._roomId = data.roomId;
    this._characterClasses = data.characterClasses || [];
    this._characterIds = data.characterIds || [];
    this._activeCharacterIndex = data.activeCharacterIndex || 0;
    this._isHost = data.isHost;
    this._connectionStatus = data.connectionStatus;
    this._isReady = data.isReady;
    this._lastSeenAt = data.lastSeenAt;
    this._createdAt = data.createdAt;
    this._updatedAt = data.updatedAt;
  }

  // Getters
  get nickname(): string {
    return this._nickname;
  }

  get roomId(): string | null {
    return this._roomId;
  }

  get characterClasses(): CharacterClass[] {
    return this._characterClasses;
  }

  get characterIds(): string[] {
    return this._characterIds;
  }

  get activeCharacterIndex(): number {
    return this._activeCharacterIndex;
  }

  // Backward compatibility - returns first character
  get characterClass(): CharacterClass | null {
    return this._characterClasses[0] || null;
  }

  get characterId(): string | null {
    return this._characterIds[0] || null;
  }

  get isHost(): boolean {
    return this._isHost;
  }

  get connectionStatus(): ConnectionStatus {
    return this._connectionStatus;
  }

  get isReady(): boolean {
    return this._characterClasses.length >= 1;
  }

  get lastSeenAt(): Date {
    return this._lastSeenAt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // Methods
  addCharacter(characterClass: CharacterClass, characterId?: string): void {
    if (this._characterClasses.length >= MAX_CHARACTERS_PER_PLAYER) {
      throw new Error(
        `Cannot add more than ${MAX_CHARACTERS_PER_PLAYER} characters per player`,
      );
    }
    this._characterClasses.push(characterClass);
    this._characterIds.push(characterId || '');
    this._updatedAt = new Date();
  }

  removeCharacter(index: number): void {
    if (index < 0 || index >= this._characterClasses.length) {
      throw new Error('Invalid character index');
    }
    this._characterClasses.splice(index, 1);
    this._characterIds.splice(index, 1);
    // Adjust active index if needed
    if (this._activeCharacterIndex >= this._characterClasses.length) {
      this._activeCharacterIndex = Math.max(
        0,
        this._characterClasses.length - 1,
      );
    }
    this._updatedAt = new Date();
  }

  setActiveCharacter(index: number): void {
    if (index < 0 || index >= this._characterClasses.length) {
      throw new Error('Invalid character index');
    }
    this._activeCharacterIndex = index;
    this._updatedAt = new Date();
  }

  getActiveCharacter(): {
    characterClass: CharacterClass | null;
    characterId: string | null;
  } {
    const index = this._activeCharacterIndex;
    if (index >= 0 && index < this._characterClasses.length) {
      return {
        characterClass: this._characterClasses[index],
        characterId: this._characterIds[index] || null,
      };
    }
    return { characterClass: null, characterId: null };
  }

  clearCharacters(): void {
    this._characterClasses = [];
    this._characterIds = [];
    this._activeCharacterIndex = 0;
    this._updatedAt = new Date();
  }

  // Backward compatibility method
  selectCharacter(characterClass: CharacterClass, characterId?: string): void {
    this.clearCharacters();
    this.addCharacter(characterClass, characterId);
  }

  joinRoom(roomId: string, isHost: boolean = false): void {
    this._roomId = roomId;
    this._isHost = isHost;
    this._updatedAt = new Date();
  }

  leaveRoom(): void {
    this._roomId = null;
    this._isHost = false;
    this.clearCharacters();
    this._updatedAt = new Date();
  }

  promoteToHost(): void {
    if (!this._roomId) {
      throw new Error('Player must be in a room to be promoted to host');
    }
    this._isHost = true;
    this._updatedAt = new Date();
  }

  updateConnectionStatus(status: ConnectionStatus): void {
    this._connectionStatus = status;
    this._lastSeenAt = new Date();
    this._updatedAt = new Date();
  }

  updateNickname(nickname: string): void {
    if (!nickname || nickname.trim().length === 0) {
      throw new Error('Nickname cannot be empty');
    }
    if (nickname.length > 20) {
      throw new Error('Nickname must be between 1 and 20 characters');
    }
    this._nickname = nickname.trim();
    this._updatedAt = new Date();
  }

  toJSON(): PlayerData {
    return {
      id: this.id,
      uuid: this.uuid,
      nickname: this._nickname,
      roomId: this._roomId,
      characterClasses: this._characterClasses,
      characterIds: this._characterIds,
      activeCharacterIndex: this._activeCharacterIndex,
      isHost: this._isHost,
      connectionStatus: this._connectionStatus,
      isReady: this.isReady,
      lastSeenAt: this._lastSeenAt,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  /**
   * Create a new Player instance
   */
  static create(uuid: string, nickname: string): Player {
    const now = new Date();
    return new Player({
      id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      uuid,
      nickname: nickname.trim(),
      roomId: null,
      characterClasses: [],
      characterIds: [],
      activeCharacterIndex: 0,
      isHost: false,
      connectionStatus: ConnectionStatus.CONNECTED,
      isReady: false,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Validate nickname format and constraints
   */
  static validateNickname(
    nickname: string,
    existingPlayers: Player[] = [],
  ): { valid: boolean; error?: string } {
    const trimmed = nickname.trim();

    if (trimmed.length === 0) {
      return { valid: false, error: 'Nickname cannot be empty' };
    }

    if (trimmed.length > 20) {
      return {
        valid: false,
        error: 'Nickname must be between 1 and 20 characters',
      };
    }

    // Check for duplicate (case-insensitive)
    const lowerNickname = trimmed.toLowerCase();
    const duplicate = existingPlayers.find(
      (p) => p.nickname.toLowerCase() === lowerNickname,
    );

    if (duplicate) {
      return { valid: false, error: 'Nickname already taken in this room' };
    }

    return { valid: true };
  }
}
