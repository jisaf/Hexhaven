/**
 * Game State Service (002 - Phase 6)
 * Manages game state with event sourcing and character progression
 */

import { PrismaClient } from '@prisma/client';
import type { Character } from '@prisma/client';
import type {
  CreateGameDto,
  JoinGameDto,
  GameWithCharacters,
  GameCompletionResult,
  GameEventType,
  GameSnapshot,
  GameEventRecord,
  GameStatus,
} from '../types/game-state.types';
import { ValidationError, NotFoundError, ConflictError } from '../types/errors';

const SNAPSHOT_INTERVAL = 20; // Create snapshot every 20 events

export class GameStateService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new game with host character
   */
  async createGame(
    userId: string,
    dto: CreateGameDto,
  ): Promise<GameWithCharacters> {
    // Verify character exists and belongs to user
    const character = await this.prisma.character.findUnique({
      where: { id: dto.hostCharacterId },
      include: { class: true },
    });

    if (!character || character.userId !== userId) {
      throw new NotFoundError('Character not found');
    }

    // Check if character is already in a game
    if (character.currentGameId) {
      throw new ConflictError('Character is already in an active game');
    }

    // Verify scenario exists
    const scenario = await this.prisma.scenario.findUnique({
      where: { id: dto.scenarioId },
    });

    if (!scenario) {
      throw new NotFoundError('Scenario not found');
    }

    // Create game
    const game = await this.prisma.game.create({
      data: {
        roomCode: dto.roomCode,
        scenarioId: dto.scenarioId,
        difficulty: dto.difficulty,
        status: 'LOBBY',
      },
    });

    // Assign character to game
    await this.prisma.character.update({
      where: { id: dto.hostCharacterId },
      data: { currentGameId: game.id },
    });

    // Record GAME_STARTED event
    await this.recordEvent(game.id, 'GAME_STARTED', {
      roomCode: dto.roomCode,
      scenarioId: dto.scenarioId,
      difficulty: dto.difficulty,
      hostCharacterId: dto.hostCharacterId,
    });

    return this.getGameWithCharacters(game.id);
  }

  /**
   * Add character to existing game
   */
  async joinGame(
    userId: string,
    gameId: string,
    dto: JoinGameDto,
  ): Promise<GameWithCharacters> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      throw new NotFoundError('Game not found');
    }

    if (game.status !== 'LOBBY') {
      throw new ConflictError('Game has already started');
    }

    // Verify character
    const character = await this.prisma.character.findUnique({
      where: { id: dto.characterId },
      include: { class: true },
    });

    if (!character || character.userId !== userId) {
      throw new NotFoundError('Character not found');
    }

    if (character.currentGameId) {
      throw new ConflictError('Character is already in an active game');
    }

    // Assign character to game
    await this.prisma.character.update({
      where: { id: dto.characterId },
      data: { currentGameId: game.id },
    });

    // Record PLAYER_JOINED event
    await this.recordEvent(game.id, 'PLAYER_JOINED', {
      characterId: dto.characterId,
      characterName: character.name,
      className: character.class.name,
    });

    return this.getGameWithCharacters(game.id);
  }

  /**
   * Start the game
   */
  async startGame(gameId: string): Promise<GameWithCharacters> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      throw new NotFoundError('Game not found');
    }

    if (game.status !== 'LOBBY') {
      throw new ConflictError('Game has already started');
    }

    // Get characters in game
    const characters = await this.prisma.character.findMany({
      where: { currentGameId: gameId },
    });

    if (characters.length === 0) {
      throw new ValidationError('No characters in game');
    }

    // Update game status
    await this.prisma.game.update({
      where: { id: gameId },
      data: {
        status: 'ACTIVE',
        startedAt: new Date(),
      },
    });

    // Record event
    await this.recordEvent(gameId, 'TURN_STARTED', {
      characterCount: characters.length,
    });

    return this.getGameWithCharacters(gameId);
  }

  /**
   * Record a game event with automatic snapshot creation
   */
  async recordEvent(
    gameId: string,
    eventType: GameEventType | string,
    eventData: any,
  ): Promise<GameEventRecord> {
    // Get next sequence number
    const lastEvent = await this.prisma.gameEvent.findFirst({
      where: { gameId },
      orderBy: { sequenceNum: 'desc' },
    });

    const sequenceNum = (lastEvent?.sequenceNum || 0) + 1;

    // Create event
    const event = await this.prisma.gameEvent.create({
      data: {
        gameId,
        sequenceNum,
        eventType,
        eventData,
      },
    });

    // Create snapshot every N events
    if (sequenceNum % SNAPSHOT_INTERVAL === 0) {
      await this.createSnapshot(gameId, sequenceNum);
    }

    return event;
  }

  /**
   * Create a state snapshot
   */
  private async createSnapshot(
    gameId: string,
    sequenceNum: number,
  ): Promise<GameSnapshot> {
    // Get all events up to this point
    const events = await this.prisma.gameEvent.findMany({
      where: { gameId },
      orderBy: { sequenceNum: 'asc' },
    });

    // Build state from events (simplified - in production would replay events)
    const stateData = {
      gameId,
      eventCount: events.length,
      lastEventType: events[events.length - 1]?.eventType,
      snapshotAt: new Date(),
    };

    const snapshot = await this.prisma.gameState.create({
      data: {
        gameId,
        sequenceNum: Math.floor(sequenceNum / SNAPSHOT_INTERVAL),
        stateData,
      },
    });

    return snapshot;
  }

  /**
   * Complete game and update character progression
   */
  async completeGame(
    gameId: string,
    victory: boolean,
  ): Promise<GameCompletionResult> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      throw new NotFoundError('Game not found');
    }

    if (game.status === 'COMPLETED') {
      throw new ConflictError('Game already completed');
    }

    // Get all characters in this game
    const characters = await this.prisma.character.findMany({
      where: { currentGameId: gameId },
      include: { class: true },
    });

    // Calculate rewards based on scenario difficulty and victory
    const baseXP = game.difficulty * 10;
    const baseGold = game.difficulty * 5;

    const experienceGained = victory ? baseXP : Math.floor(baseXP / 2);
    const goldGained = victory ? baseGold : Math.floor(baseGold / 2);

    // Update all characters
    const characterIds: string[] = [];
    for (const character of characters) {
      await this.prisma.character.update({
        where: { id: character.id },
        data: {
          experience: character.experience + experienceGained,
          gold: character.gold + goldGained,
          currentGameId: null, // Release from game
        },
      });
      characterIds.push(character.id);
    }

    // Update game status
    await this.prisma.game.update({
      where: { id: gameId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // Record completion event
    await this.recordEvent(gameId, 'GAME_COMPLETED', {
      victory,
      experienceGained,
      goldGained,
      characterCount: characters.length,
    });

    return {
      victory,
      experienceGained,
      goldGained,
      itemsUnlocked: [], // Future: unlock items based on scenario
      charactersUpdated: characterIds,
    };
  }

  /**
   * Get game with character details
   */
  async getGameWithCharacters(gameId: string): Promise<GameWithCharacters> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      throw new NotFoundError('Game not found');
    }

    const characters = await this.prisma.character.findMany({
      where: { currentGameId: gameId },
      include: { class: true },
    });

    return {
      id: game.id,
      roomCode: game.roomCode,
      scenarioId: game.scenarioId,
      difficulty: game.difficulty,
      status: game.status as GameStatus,
      createdAt: game.createdAt,
      startedAt: game.startedAt,
      completedAt: game.completedAt,
      characters: characters.map((c: Character & { class: any }) => ({
        id: c.id,
        name: c.name,
        className: c.class.name,
        level: c.level,
        userId: c.userId,
      })),
    };
  }

  /**
   * Get game events
   */
  async getGameEvents(gameId: string): Promise<GameEventRecord[]> {
    return await this.prisma.gameEvent.findMany({
      where: { gameId },
      orderBy: { sequenceNum: 'asc' },
    });
  }

  /**
   * Get game snapshots
   */
  async getGameSnapshots(gameId: string): Promise<GameSnapshot[]> {
    return await this.prisma.gameState.findMany({
      where: { gameId },
      orderBy: { sequenceNum: 'asc' },
    });
  }

  /**
   * Abandon game (when players leave)
   */
  async abandonGame(gameId: string): Promise<void> {
    // Release all characters
    await this.prisma.character.updateMany({
      where: { currentGameId: gameId },
      data: { currentGameId: null },
    });

    // Update game status
    await this.prisma.game.update({
      where: { id: gameId },
      data: {
        status: 'ABANDONED',
        completedAt: new Date(),
      },
    });

    await this.recordEvent(gameId, 'GAME_COMPLETED', {
      abandoned: true,
    });
  }
}
