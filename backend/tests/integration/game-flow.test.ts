/**
 * Full Game Flow Test (Phase 7)
 * Tests complete game lifecycle with character creation, game management, and progression
 * Uses mocked Prisma client for CI compatibility
 */

import { AuthService } from '../../src/services/auth.service';
import { UserCharacterService } from '../../src/services/user-character.service';
import { GameStateService } from '../../src/services/game-state.service';

// Mock Prisma client
const mockPrisma: any = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  character: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  characterClass: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  scenario: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
  game: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  gameState: {
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  gameEvent: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
};

// Create services with mocked prisma
const authService = new AuthService(mockPrisma);
const characterService = new UserCharacterService(mockPrisma);
const gameService = new GameStateService(mockPrisma);

describe('Full Game Flow Test', () => {
  const bruteClassId = 'class-brute-123';
  const spellweaverClassId = 'class-spellweaver-123';
  const scenarioId = 'scenario-001';
  const user1Id = 'user-1';
  const user2Id = 'user-2';
  const character1Id = 'char-1';
  const character2Id = 'char-2';
  const gameId = 'game-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should complete full game flow: register → create characters → create game → join → start → complete → verify progression', async () => {
    // Setup mocks for the full flow

    // Step 1: Register users - mock user creation
    mockPrisma.user.findUnique.mockResolvedValue(null); // Username available
    mockPrisma.user.create
      .mockResolvedValueOnce({
        id: user1Id,
        username: 'player1',
        passwordHash: 'hash',
        createdAt: new Date(),
        lastLoginAt: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      })
      .mockResolvedValueOnce({
        id: user2Id,
        username: 'player2',
        passwordHash: 'hash',
        createdAt: new Date(),
        lastLoginAt: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      });
    mockPrisma.refreshToken.create.mockResolvedValue({ id: 'token-123' });

    // Register users
    const user1 = await authService.register('player1', 'TestPassword123!');
    const user2 = await authService.register('player2', 'TestPassword123!');

    expect(user1.tokens.accessToken).toBeTruthy();
    expect(user2.tokens.accessToken).toBeTruthy();

    // Step 2: Create characters - mock character class and creation
    mockPrisma.characterClass.findUnique
      .mockResolvedValueOnce({
        id: bruteClassId,
        name: 'Brute',
        description: 'Tank class',
        startingHealth: 10,
        startingCards: [],
        perks: [],
        unlocked: true,
      })
      .mockResolvedValueOnce({
        id: spellweaverClassId,
        name: 'Spellweaver',
        description: 'Magic class',
        startingHealth: 6,
        startingCards: [],
        perks: [],
        unlocked: true,
      });

    mockPrisma.character.create
      .mockResolvedValueOnce({
        id: character1Id,
        userId: user1Id,
        classId: bruteClassId,
        name: 'Thorgar',
        level: 1,
        experience: 0,
        gold: 0,
        currentGameId: null,
        class: { name: 'Brute' },
      })
      .mockResolvedValueOnce({
        id: character2Id,
        userId: user2Id,
        classId: spellweaverClassId,
        name: 'Mystica',
        level: 1,
        experience: 0,
        gold: 0,
        currentGameId: null,
        class: { name: 'Spellweaver' },
      });

    const character1 = await characterService.createCharacter(user1Id, {
      name: 'Thorgar',
      classId: bruteClassId,
    });
    const character2 = await characterService.createCharacter(user2Id, {
      name: 'Mystica',
      classId: spellweaverClassId,
    });

    expect(character1.name).toBe('Thorgar');
    expect(character1.className).toBe('Brute');
    expect(character1.level).toBe(1);
    expect(character2.name).toBe('Mystica');
    expect(character2.className).toBe('Spellweaver');

    // Step 3: Create game - mock game creation
    mockPrisma.character.findUnique.mockResolvedValue({
      id: character1Id,
      userId: user1Id,
      currentGameId: null,
    });
    mockPrisma.scenario.findUnique.mockResolvedValue({
      id: scenarioId,
      name: 'Black Barrow',
    });
    mockPrisma.game.create.mockResolvedValue({
      id: gameId,
      roomCode: 'TEST01',
      scenarioId,
      difficulty: 3,
      status: 'LOBBY',
      hostId: user1Id,
      startedAt: null,
      completedAt: null,
    });
    mockPrisma.character.update.mockResolvedValue({
      id: character1Id,
      currentGameId: gameId,
    });
    mockPrisma.gameEvent.findFirst.mockResolvedValue(null);
    mockPrisma.gameEvent.create.mockResolvedValue({ id: 'event-1', sequenceNum: 1 });
    mockPrisma.character.findMany.mockResolvedValue([
      {
        id: character1Id,
        name: 'Thorgar',
        class: { name: 'Brute' },
      },
    ]);
    mockPrisma.game.findUnique.mockResolvedValue({
      id: gameId,
      status: 'LOBBY',
      difficulty: 3,
      characters: [{ id: character1Id, name: 'Thorgar', class: { name: 'Brute' } }],
    });

    const game = await gameService.createGame(user1Id, {
      roomCode: 'TEST01',
      scenarioId,
      difficulty: 3,
      hostCharacterId: character1Id,
    });

    expect(game.status).toBe('LOBBY');
    expect(game.difficulty).toBe(3);

    // Step 4: Join game - mock character joining
    mockPrisma.game.findUnique.mockResolvedValue({
      id: gameId,
      status: 'LOBBY',
      hostId: user1Id,
    });
    mockPrisma.character.findUnique.mockResolvedValue({
      id: character2Id,
      userId: user2Id,
      name: 'Mystica',
      currentGameId: null,
      class: { name: 'Spellweaver' },
    });
    mockPrisma.character.update.mockResolvedValue({
      id: character2Id,
      currentGameId: gameId,
    });
    mockPrisma.gameEvent.findFirst.mockResolvedValue({ sequenceNum: 1 });
    mockPrisma.gameEvent.create.mockResolvedValue({ id: 'event-2', sequenceNum: 2 });
    mockPrisma.character.findMany.mockResolvedValue([
      { id: character1Id, name: 'Thorgar', class: { name: 'Brute' } },
      { id: character2Id, name: 'Mystica', class: { name: 'Spellweaver' } },
    ]);

    const updatedGame = await gameService.joinGame(user2Id, gameId, {
      characterId: character2Id,
    });

    expect(updatedGame.characters).toHaveLength(2);

    // Step 5: Start game
    // First call to game.findUnique returns LOBBY status
    mockPrisma.game.findUnique
      .mockResolvedValueOnce({
        id: gameId,
        status: 'LOBBY',
        hostId: user1Id,
      })
      // Second call (from getGameWithCharacters) returns ACTIVE status
      .mockResolvedValueOnce({
        id: gameId,
        roomCode: 'TEST01',
        scenarioId,
        difficulty: 3,
        status: 'ACTIVE',
        createdAt: new Date(),
        startedAt: new Date(),
        completedAt: null,
        campaignId: null,
      });
    mockPrisma.character.findMany.mockResolvedValue([
      { id: character1Id, name: 'Thorgar', level: 1, userId: user1Id, class: { name: 'Brute' } },
      { id: character2Id, name: 'Mystica', level: 1, userId: user2Id, class: { name: 'Spellweaver' } },
    ]);
    mockPrisma.game.update.mockResolvedValue({
      id: gameId,
      status: 'ACTIVE',
      startedAt: new Date(),
    });
    mockPrisma.gameEvent.findFirst.mockResolvedValue({ sequenceNum: 2 });
    mockPrisma.gameEvent.create.mockResolvedValue({ id: 'event-3', sequenceNum: 3 });
    mockPrisma.gameEvent.findMany.mockResolvedValue([]);
    mockPrisma.gameState.create.mockResolvedValue({ id: 'state-1' });

    const activeGame = await gameService.startGame(gameId);

    expect(activeGame.status).toBe('ACTIVE');
    expect(activeGame.startedAt).toBeTruthy();

    // Step 6: Record game events
    mockPrisma.gameEvent.findFirst.mockResolvedValue({ sequenceNum: 3 });
    mockPrisma.gameEvent.create.mockResolvedValue({ id: 'event-4', sequenceNum: 4 });

    await gameService.recordEvent(gameId, 'CARD_PLAYED', {
      characterId: character1Id,
      cardId: 'brute-attack-1',
    });

    mockPrisma.gameEvent.findFirst.mockResolvedValue({ sequenceNum: 4 });
    mockPrisma.gameEvent.create.mockResolvedValue({ id: 'event-5', sequenceNum: 5 });

    await gameService.recordEvent(gameId, 'ATTACK_EXECUTED', {
      characterId: character1Id,
      targetId: 'monster-1',
      damage: 5,
    });

    // Step 7: Complete game with victory
    mockPrisma.game.findUnique.mockResolvedValue({
      id: gameId,
      status: 'ACTIVE',
      difficulty: 3,
    });
    mockPrisma.character.findMany.mockResolvedValue([
      { id: character1Id, experience: 0, gold: 0 },
      { id: character2Id, experience: 0, gold: 0 },
    ]);
    mockPrisma.character.update.mockResolvedValue({});
    mockPrisma.game.update.mockResolvedValue({
      id: gameId,
      status: 'COMPLETED',
      completedAt: new Date(),
    });
    mockPrisma.gameEvent.findFirst.mockResolvedValue({ sequenceNum: 5 });
    mockPrisma.gameEvent.create.mockResolvedValue({ id: 'event-6', sequenceNum: 6 });

    const completionResult = await gameService.completeGame(gameId, true);

    expect(completionResult.victory).toBe(true);
    expect(completionResult.experienceGained).toBe(30); // difficulty 3 × 10
    expect(completionResult.goldGained).toBe(15); // difficulty 3 × 5
    expect(completionResult.charactersUpdated).toHaveLength(2);

    // Verify character updates were called with correct experience/gold
    expect(mockPrisma.character.update).toHaveBeenCalledWith({
      where: { id: character1Id },
      data: {
        experience: 30,
        gold: 15,
        currentGameId: null,
      },
    });
  });

  it('should handle game completion with defeat and reduced rewards', async () => {
    // Setup for defeat scenario
    mockPrisma.game.findUnique.mockResolvedValue({
      id: gameId,
      status: 'ACTIVE',
      difficulty: 2,
    });
    mockPrisma.character.findMany.mockResolvedValue([
      { id: character1Id, experience: 0, gold: 0 },
    ]);
    mockPrisma.character.update.mockResolvedValue({});
    mockPrisma.game.update.mockResolvedValue({
      id: gameId,
      status: 'COMPLETED',
      completedAt: new Date(),
    });
    mockPrisma.gameEvent.findFirst.mockResolvedValue({ sequenceNum: 5 });
    mockPrisma.gameEvent.create.mockResolvedValue({ id: 'event-6', sequenceNum: 6 });

    const result = await gameService.completeGame(gameId, false);

    expect(result.victory).toBe(false);
    expect(result.experienceGained).toBe(10); // (2 × 10) / 2
    expect(result.goldGained).toBe(5); // (2 × 5) / 2

    // Verify reduced rewards were applied
    expect(mockPrisma.character.update).toHaveBeenCalledWith({
      where: { id: character1Id },
      data: {
        experience: 10,
        gold: 5,
        currentGameId: null,
      },
    });
  });

  it('should prevent character from joining multiple games simultaneously', async () => {
    // Character already in a game
    mockPrisma.character.findUnique.mockResolvedValue({
      id: character1Id,
      userId: user1Id,
      currentGameId: 'existing-game',
    });
    mockPrisma.scenario.findUnique.mockResolvedValue({
      id: scenarioId,
      name: 'Black Barrow',
    });

    await expect(
      gameService.createGame(user1Id, {
        roomCode: 'TEST02',
        scenarioId,
        difficulty: 1,
        hostCharacterId: character1Id,
      })
    ).rejects.toThrow('Character is already in an active game');
  });
});
