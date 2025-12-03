/**
 * GameStateService Unit Tests (Phase 7)
 * Comprehensive tests for event sourcing and game state management
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GameStateService } from '../../src/services/game-state.service';
import { ValidationError, NotFoundError, ConflictError } from '../../src/types/errors';

describe('GameStateService', () => {
  let service: GameStateService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      game: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      character: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      scenario: {
        findUnique: jest.fn(),
      },
      gameEvent: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      gameState: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };

    service = new GameStateService(mockPrisma);
  });

  describe('createGame()', () => {
    it('should create game and assign host character', async () => {
      const userId = 'user-123';
      const dto = {
        roomCode: 'ABC123',
        scenarioId: 'scenario-1',
        difficulty: 2,
        hostCharacterId: 'char-123',
      };

      mockPrisma.character.findUnique.mockResolvedValue({
        id: 'char-123',
        userId: 'user-123',
        currentGameId: null,
        class: { name: 'Brute' },
      });

      mockPrisma.scenario.findUnique.mockResolvedValue({
        id: 'scenario-1',
        name: 'Black Barrow',
      });

      mockPrisma.game.create.mockResolvedValue({
        id: 'game-123',
        roomCode: 'ABC123',
        scenarioId: 'scenario-1',
        difficulty: 2,
        status: 'LOBBY',
        createdAt: new Date(),
        updatedAt: new Date(),
        startedAt: null,
        completedAt: null,
      });

      mockPrisma.character.update.mockResolvedValue({
        id: 'char-123',
        currentGameId: 'game-123',
      });

      mockPrisma.gameEvent.findFirst.mockResolvedValue(null); // No previous events
      mockPrisma.gameEvent.create.mockResolvedValue({
        id: 'event-1',
        gameId: 'game-123',
        sequenceNum: 1,
        eventType: 'GAME_STARTED',
        eventData: dto,
        createdAt: new Date(),
      });

      mockPrisma.character.findMany.mockResolvedValue([
        {
          id: 'char-123',
          name: 'Thorgar',
          userId: 'user-123',
          level: 1,
          class: { name: 'Brute' },
        },
      ]);

      // Mock game.findUnique for getGameWithCharacters call
      mockPrisma.game.findUnique.mockResolvedValue({
        id: 'game-123',
        roomCode: 'ABC123',
        scenarioId: 'scenario-1',
        difficulty: 2,
        status: 'LOBBY',
        createdAt: new Date(),
        updatedAt: new Date(),
        startedAt: null,
        completedAt: null,
      });

      const result = await service.createGame(userId, dto);

      expect(result.roomCode).toBe('ABC123');
      expect(result.difficulty).toBe(2);
      expect(result.status).toBe('LOBBY');
      expect(result.characters).toHaveLength(1);
      expect(mockPrisma.character.update).toHaveBeenCalledWith({
        where: { id: 'char-123' },
        data: { currentGameId: 'game-123' },
      });
    });

    it('should reject if character does not belong to user', async () => {
      const dto = {
        roomCode: 'ABC123',
        scenarioId: 'scenario-1',
        difficulty: 1,
        hostCharacterId: 'char-123',
      };

      mockPrisma.character.findUnique.mockResolvedValue({
        id: 'char-123',
        userId: 'other-user', // Different user
        class: {},
      });

      await expect(service.createGame('user-123', dto))
        .rejects
        .toThrow(NotFoundError);
    });

    it('should reject if character is already in a game', async () => {
      const dto = {
        roomCode: 'ABC123',
        scenarioId: 'scenario-1',
        difficulty: 1,
        hostCharacterId: 'char-123',
      };

      mockPrisma.character.findUnique.mockResolvedValue({
        id: 'char-123',
        userId: 'user-123',
        currentGameId: 'other-game', // Already in game
        class: {},
      });

      await expect(service.createGame('user-123', dto))
        .rejects
        .toThrow(ConflictError);
    });

    it('should reject if scenario does not exist', async () => {
      const dto = {
        roomCode: 'ABC123',
        scenarioId: 'invalid-scenario',
        difficulty: 1,
        hostCharacterId: 'char-123',
      };

      mockPrisma.character.findUnique.mockResolvedValue({
        id: 'char-123',
        userId: 'user-123',
        currentGameId: null,
        class: {},
      });

      mockPrisma.scenario.findUnique.mockResolvedValue(null);

      await expect(service.createGame('user-123', dto))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('joinGame()', () => {
    it('should add character to game in LOBBY status', async () => {
      mockPrisma.game.findUnique.mockResolvedValue({
        id: 'game-123',
        status: 'LOBBY',
      });

      mockPrisma.character.findUnique.mockResolvedValue({
        id: 'char-456',
        userId: 'user-456',
        currentGameId: null,
        class: { name: 'Spellweaver' },
      });

      mockPrisma.character.update.mockResolvedValue({
        id: 'char-456',
        currentGameId: 'game-123',
      });

      mockPrisma.gameEvent.findFirst.mockResolvedValue({ sequenceNum: 1 });
      mockPrisma.gameEvent.create.mockResolvedValue({
        id: 'event-2',
        gameId: 'game-123',
        sequenceNum: 2,
        eventType: 'PLAYER_JOINED',
      });

      mockPrisma.character.findMany.mockResolvedValue([
        { id: 'char-123', name: 'Host', class: { name: 'Brute' }, level: 1, userId: 'user-123' },
        { id: 'char-456', name: 'Player2', class: { name: 'Spellweaver' }, level: 1, userId: 'user-456' },
      ]);

      const result = await service.joinGame('user-456', 'game-123', { characterId: 'char-456' });

      expect(result.characters).toHaveLength(2);
      expect(mockPrisma.character.update).toHaveBeenCalledWith({
        where: { id: 'char-456' },
        data: { currentGameId: 'game-123' },
      });
    });

    it('should reject joining game that has already started', async () => {
      mockPrisma.game.findUnique.mockResolvedValue({
        id: 'game-123',
        status: 'ACTIVE', // Already started
      });

      await expect(service.joinGame('user-456', 'game-123', { characterId: 'char-456' }))
        .rejects
        .toThrow(ConflictError);
    });

    it('should reject if character is already in a game', async () => {
      mockPrisma.game.findUnique.mockResolvedValue({
        id: 'game-123',
        status: 'LOBBY',
      });

      mockPrisma.character.findUnique.mockResolvedValue({
        id: 'char-456',
        userId: 'user-456',
        currentGameId: 'other-game', // Already in different game
        class: {},
      });

      await expect(service.joinGame('user-456', 'game-123', { characterId: 'char-456' }))
        .rejects
        .toThrow(ConflictError);
    });
  });

  describe('startGame()', () => {
    it('should start game and update status to ACTIVE', async () => {
      // First call to findUnique (checking game status)
      mockPrisma.game.findUnique.mockResolvedValueOnce({
        id: 'game-123',
        status: 'LOBBY',
      });

      mockPrisma.character.findMany.mockResolvedValue([
        { id: 'char-1', name: 'Player1', class: { name: 'Brute' }, level: 1, userId: 'user-1' },
        { id: 'char-2', name: 'Player2', class: { name: 'Spellweaver' }, level: 1, userId: 'user-2' },
      ]);

      mockPrisma.game.update.mockResolvedValue({
        id: 'game-123',
        status: 'ACTIVE',
        startedAt: new Date(),
      });

      mockPrisma.gameEvent.findFirst.mockResolvedValue({ sequenceNum: 2 });
      mockPrisma.gameEvent.create.mockResolvedValue({
        id: 'event-3',
        sequenceNum: 3,
        eventType: 'TURN_STARTED',
      });

      // Second call to findUnique (in getGameWithCharacters)
      mockPrisma.game.findUnique.mockResolvedValueOnce({
        id: 'game-123',
        roomCode: 'ABC123',
        scenarioId: 'scenario-1',
        difficulty: 2,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        startedAt: new Date(),
        completedAt: null,
      });

      const result = await service.startGame('game-123');

      expect(result.status).toBe('ACTIVE');
      expect(mockPrisma.game.update).toHaveBeenCalledWith({
        where: { id: 'game-123' },
        data: {
          status: 'ACTIVE',
          startedAt: expect.any(Date),
        },
      });
    });

    it('should reject starting game with no characters', async () => {
      mockPrisma.game.findUnique.mockResolvedValue({
        id: 'game-123',
        status: 'LOBBY',
      });

      mockPrisma.character.findMany.mockResolvedValue([]); // No characters

      await expect(service.startGame('game-123'))
        .rejects
        .toThrow(ValidationError);
    });

    it('should reject starting game that is already active', async () => {
      mockPrisma.game.findUnique.mockResolvedValue({
        id: 'game-123',
        status: 'ACTIVE', // Already started
      });

      await expect(service.startGame('game-123'))
        .rejects
        .toThrow(ConflictError);
    });
  });

  describe('completeGame()', () => {
    it('should complete game with victory and update character stats', async () => {
      mockPrisma.game.findUnique.mockResolvedValue({
        id: 'game-123',
        status: 'ACTIVE',
        difficulty: 3,
      });

      mockPrisma.character.findMany.mockResolvedValue([
        {
          id: 'char-1',
          experience: 0,
          gold: 0,
          class: {},
        },
        {
          id: 'char-2',
          experience: 10,
          gold: 5,
          class: {},
        },
      ]);

      mockPrisma.character.update.mockResolvedValue({});
      mockPrisma.game.update.mockResolvedValue({
        id: 'game-123',
        status: 'COMPLETED',
      });

      mockPrisma.gameEvent.findFirst.mockResolvedValue({ sequenceNum: 10 });
      mockPrisma.gameEvent.create.mockResolvedValue({
        id: 'event-11',
        eventType: 'GAME_COMPLETED',
      });

      const result = await service.completeGame('game-123', true);

      expect(result.victory).toBe(true);
      expect(result.experienceGained).toBe(30); // difficulty 3 × 10
      expect(result.goldGained).toBe(15); // difficulty 3 × 5
      expect(result.charactersUpdated).toHaveLength(2);

      // Verify each character was updated
      expect(mockPrisma.character.update).toHaveBeenCalledTimes(2);
      expect(mockPrisma.character.update).toHaveBeenCalledWith({
        where: { id: 'char-1' },
        data: {
          experience: 30, // 0 + 30
          gold: 15, // 0 + 15
          currentGameId: null,
        },
      });
    });

    it('should give reduced rewards on defeat', async () => {
      mockPrisma.game.findUnique.mockResolvedValue({
        id: 'game-123',
        status: 'ACTIVE',
        difficulty: 2,
      });

      mockPrisma.character.findMany.mockResolvedValue([
        {
          id: 'char-1',
          experience: 0,
          gold: 0,
          class: {},
        },
      ]);

      mockPrisma.character.update.mockResolvedValue({});
      mockPrisma.game.update.mockResolvedValue({ id: 'game-123', status: 'COMPLETED' });
      mockPrisma.gameEvent.findFirst.mockResolvedValue({ sequenceNum: 5 });
      mockPrisma.gameEvent.create.mockResolvedValue({ id: 'event-6' });

      const result = await service.completeGame('game-123', false); // Defeat

      expect(result.victory).toBe(false);
      expect(result.experienceGained).toBe(10); // difficulty 2 × 10 / 2
      expect(result.goldGained).toBe(5); // difficulty 2 × 5 / 2
    });

    it('should reject completing already completed game', async () => {
      mockPrisma.game.findUnique.mockResolvedValue({
        id: 'game-123',
        status: 'COMPLETED',
      });

      await expect(service.completeGame('game-123', true))
        .rejects
        .toThrow(ConflictError);
    });
  });

  describe('recordEvent()', () => {
    it('should create event with sequential number', async () => {
      mockPrisma.gameEvent.findFirst.mockResolvedValue({
        sequenceNum: 5, // Last event was #5
      });

      mockPrisma.gameEvent.create.mockResolvedValue({
        id: 'event-6',
        gameId: 'game-123',
        sequenceNum: 6, // Next is #6
        eventType: 'ATTACK_EXECUTED',
        eventData: { damage: 5 },
        createdAt: new Date(),
      });

      const result = await service.recordEvent('game-123', 'ATTACK_EXECUTED', { damage: 5 });

      expect(result.sequenceNum).toBe(6);
      expect(mockPrisma.gameEvent.create).toHaveBeenCalledWith({
        data: {
          gameId: 'game-123',
          sequenceNum: 6,
          eventType: 'ATTACK_EXECUTED',
          eventData: { damage: 5 },
        },
      });
    });

    it('should create snapshot every 20 events', async () => {
      mockPrisma.gameEvent.findFirst.mockResolvedValue({
        sequenceNum: 19, // Event #19
      });

      mockPrisma.gameEvent.create.mockResolvedValue({
        id: 'event-20',
        sequenceNum: 20, // Event #20 (20 % 20 === 0)
        eventType: 'ROUND_ENDED',
      });

      mockPrisma.gameEvent.findMany.mockResolvedValue([
        { eventType: 'GAME_STARTED' },
        // ... 19 more events
      ]);

      mockPrisma.gameState.create.mockResolvedValue({
        id: 'snapshot-1',
        gameId: 'game-123',
        sequenceNum: 1,
      });

      await service.recordEvent('game-123', 'ROUND_ENDED', {});

      // Snapshot should be created
      expect(mockPrisma.gameState.create).toHaveBeenCalled();
    });
  });
});
