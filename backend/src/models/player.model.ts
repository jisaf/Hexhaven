/**
 * Player Model (US1 - T045)
 *
 * Represents a player in the game with connection state,
 * character selection, and room association.
 */

import type {
  CharacterClass,
} from '../../../shared/types/entities';
import { ConnectionStatus } from '../../../shared/types/entities';

export interface PlayerData {
  id: string;
  uuid: string;
  nickname: string;
  roomId: string | null;
  characterClass: CharacterClass | null;
  isHost: boolean;
  connectionStatus: ConnectionStatus;
  isReady: boolean;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class Player {
  public readonly id: string;
  public readonly uuid: string;
  private _nickname: string;
  private _roomId: string | null;
  private _characterClass: CharacterClass | null;
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
    this._characterClass = data.characterClass;
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

  get characterClass(): CharacterClass | null {
    return this._characterClass;
  }

  get isHost(): boolean {
    return this._isHost;
  }

  get connectionStatus(): ConnectionStatus {
    return this._connectionStatus;
  }

  get isReady(): boolean {
    return this._isReady;
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
  selectCharacter(characterClass: CharacterClass): void {
    this._characterClass = characterClass;
    this._isReady = true;
    this._updatedAt = new Date();
  }

  clearCharacter(): void {
    this._characterClass = null;
    this._isReady = false;
    this._updatedAt = new Date();
  }

  joinRoom(roomId: string, isHost: boolean = false): void {
    this._roomId = roomId;
    this._isHost = isHost;
    this._updatedAt = new Date();
  }

  leaveRoom(): void {
    this._roomId = null;
    this._isHost = false;
    this._characterClass = null;
    this._isReady = false;
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
      characterClass: this._characterClass,
      isHost: this._isHost,
      connectionStatus: this._connectionStatus,
      isReady: this._isReady,
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
      characterClass: null,
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
