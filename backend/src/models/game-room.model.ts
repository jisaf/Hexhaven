/**
 * GameRoom Model (US1 - T046)
 *
 * Represents a game room/lobby where players gather before
 * starting a game session.
 */

import { RoomStatus } from '../../../shared/types/entities';
import type { Player } from './player.model';

export interface GameRoomData {
  id: string;
  roomCode: string;
  status: RoomStatus;
  scenarioId: string | null;
  campaignId: string | null; // Issue #244 - Campaign Mode
  maxPlayers: number;
  currentRound: number | null;
  currentTurnIndex: number | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export class GameRoom {
  public readonly id: string;
  public readonly roomCode: string;
  private _status: RoomStatus;
  private _scenarioId: string | null;
  private _campaignId: string | null; // Issue #244 - Campaign Mode
  private readonly _maxPlayers: number;
  private _currentRound: number | null;
  private _currentTurnIndex: number | null;
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private readonly _expiresAt: Date;
  private _players: Map<string, Player>;

  constructor(data: GameRoomData) {
    this.id = data.id;
    this.roomCode = data.roomCode;
    this._status = data.status;
    this._scenarioId = data.scenarioId;
    this._campaignId = data.campaignId;
    this._maxPlayers = data.maxPlayers;
    this._currentRound = data.currentRound;
    this._currentTurnIndex = data.currentTurnIndex;
    this._createdAt = data.createdAt;
    this._updatedAt = data.updatedAt;
    this._expiresAt = data.expiresAt;
    this._players = new Map();
  }

  // Getters
  get status(): RoomStatus {
    return this._status;
  }

  get scenarioId(): string | null {
    return this._scenarioId;
  }

  get campaignId(): string | null {
    return this._campaignId;
  }

  get maxPlayers(): number {
    return this._maxPlayers;
  }

  get currentRound(): number | null {
    return this._currentRound;
  }

  get currentTurnIndex(): number | null {
    return this._currentTurnIndex;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get expiresAt(): Date {
    return this._expiresAt;
  }

  get players(): Player[] {
    return Array.from(this._players.values());
  }

  get playerCount(): number {
    return this._players.size;
  }

  get isFull(): boolean {
    return this._players.size >= this._maxPlayers;
  }

  get isStartable(): boolean {
    if (this._status !== RoomStatus.LOBBY) return false;
    if (this._players.size < 1) return false;

    // All players must have selected characters
    return this.players.every((p) => p.isReady && p.characterClass !== null);
  }

  get hostPlayer(): Player | null {
    return this.players.find((p) => p.isHost) || null;
  }

  // Methods
  addPlayer(player: Player): void {
    if (this.isFull) {
      throw new Error('Room is full');
    }

    if (this._status !== RoomStatus.LOBBY) {
      throw new Error('Cannot join room - game already started');
    }

    if (this._players.has(player.uuid)) {
      throw new Error('Player already in room');
    }

    // Check for duplicate nickname
    const existingNicknames = this.players.map((p) => p.nickname.toLowerCase());
    if (existingNicknames.includes(player.nickname.toLowerCase())) {
      throw new Error('Nickname already taken in this room');
    }

    this._players.set(player.uuid, player);
    this._updatedAt = new Date();
  }

  removePlayer(playerUuid: string): Player | null {
    const player = this._players.get(playerUuid);
    if (!player) return null;

    this._players.delete(playerUuid);

    // If player was host, promote next player
    if (player.isHost && this._players.size > 0) {
      const nextHost = this.players[0];
      nextHost.promoteToHost();
    }

    this._updatedAt = new Date();
    return player;
  }

  getPlayer(playerUuid: string): Player | null {
    return this._players.get(playerUuid) || null;
  }

  startGame(scenarioId: string, campaignId?: string): void {
    if (this._status !== RoomStatus.LOBBY) {
      throw new Error('Game has already started');
    }

    if (!this.isStartable) {
      throw new Error('All players must select characters before starting');
    }

    this._status = RoomStatus.ACTIVE;
    this._scenarioId = scenarioId;
    this._campaignId = campaignId || null; // Issue #244 - Campaign Mode
    this._currentRound = 1;
    this._currentTurnIndex = 0;
    this._updatedAt = new Date();
  }

  completeGame(): void {
    if (this._status !== RoomStatus.ACTIVE) {
      throw new Error('Cannot complete game - game is not active');
    }

    this._status = RoomStatus.COMPLETED;
    this._updatedAt = new Date();
  }

  abandonGame(): void {
    this._status = RoomStatus.ABANDONED;
    this._updatedAt = new Date();
  }

  updateTurn(turnIndex: number): void {
    this._currentTurnIndex = turnIndex;
    this._updatedAt = new Date();
  }

  advanceRound(): void {
    if (this._currentRound === null) {
      this._currentRound = 1;
    } else {
      this._currentRound++;
    }
    this._currentTurnIndex = 0;
    this._updatedAt = new Date();
  }

  toJSON(): GameRoomData & { players: any[] } {
    return {
      id: this.id,
      roomCode: this.roomCode,
      status: this._status,
      scenarioId: this._scenarioId,
      campaignId: this._campaignId, // Issue #244 - Campaign Mode
      maxPlayers: this._maxPlayers,
      currentRound: this._currentRound,
      currentTurnIndex: this._currentTurnIndex,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      expiresAt: this._expiresAt,
      players: this.players.map((p) => p.toJSON()),
    };
  }

  /**
   * Create a new GameRoom instance with generated room code
   * @param hostPlayer The player creating the room (becomes host)
   * @param options Optional campaign context (campaignId, scenarioId)
   */
  static create(
    hostPlayer: Player,
    options?: { campaignId?: string; scenarioId?: string },
  ): GameRoom {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    const roomCode = GameRoom.generateRoomCode();

    const room = new GameRoom({
      id: `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      roomCode,
      status: RoomStatus.LOBBY,
      scenarioId: options?.scenarioId || null,
      campaignId: options?.campaignId || null, // Issue #244 - Campaign Mode
      maxPlayers: 4,
      currentRound: null,
      currentTurnIndex: null,
      createdAt: now,
      updatedAt: now,
      expiresAt,
    });

    // Add host player
    hostPlayer.joinRoom(room.id, true);
    room._players.set(hostPlayer.uuid, hostPlayer);

    return room;
  }

  /**
   * Generate a unique 6-character alphanumeric room code
   * Excludes ambiguous characters: 0, O, 1, I, l
   */
  static generateRoomCode(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // No 0,O,1,I
    let code = '';

    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return code;
  }

  /**
   * Validate room code format
   */
  static isValidRoomCode(code: string): boolean {
    return /^[A-Z0-9]{6}$/.test(code);
  }
}
