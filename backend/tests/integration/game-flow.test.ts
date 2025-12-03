/**
 * Full Game Flow Integration Test (Phase 7)
 * Tests complete game lifecycle with character creation, game management, and progression
 */

import prisma from '../../src/db/client';
import { AuthService } from '../../src/services/auth.service';
import { UserCharacterService } from '../../src/services/user-character.service';
import { GameStateService } from '../../src/services/game-state.service';

const authService = new AuthService(prisma);
const characterService = new UserCharacterService(prisma);
const gameService = new GameStateService(prisma);

describe('Full Game Flow Integration Test', () => {
  let user1Id: string;
  let user2Id: string;
  let character1Id: string;
  let character2Id: string;
  let gameId: string;
  let bruteClassId: string;
  let spellweaverClassId: string;
  let scenarioId: string;

  beforeAll(async () => {
    // Get character classes
    const classes = await prisma.characterClass.findMany({
      where: {
        name: {
          in: ['Brute', 'Spellweaver'],
        },
      },
    });

    const brute = classes.find((c) => c.name === 'Brute');
    const spellweaver = classes.find((c) => c.name === 'Spellweaver');

    if (!brute || !spellweaver) {
      throw new Error('Required character classes not found in database');
    }

    bruteClassId = brute.id;
    spellweaverClassId = spellweaver.id;

    // Get a scenario
    const scenario = await prisma.scenario.findFirst();
    if (!scenario) {
      throw new Error('No scenarios found in database');
    }
    scenarioId = scenario.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (gameId) {
      await prisma.gameEvent.deleteMany({ where: { gameId } });
      await prisma.gameState.deleteMany({ where: { gameId } });
      await prisma.game.delete({ where: { id: gameId } });
    }

    if (character1Id) {
      await prisma.character.delete({ where: { id: character1Id } });
    }

    if (character2Id) {
      await prisma.character.delete({ where: { id: character2Id } });
    }

    if (user1Id) {
      await prisma.refreshToken.deleteMany({ where: { userId: user1Id } });
      await prisma.user.delete({ where: { id: user1Id } });
    }

    if (user2Id) {
      await prisma.refreshToken.deleteMany({ where: { userId: user2Id } });
      await prisma.user.delete({ where: { id: user2Id } });
    }
  });

  it('should complete full game flow: register → create characters → create game → join → start → complete → verify progression', async () => {
    // Step 1: Register two users
    const user1 = await authService.register(
      `gf1_${Date.now().toString().slice(-8)}`,
      'TestPassword123!'
    );
    user1Id = user1.user.id;

    const user2 = await authService.register(
      `gf2_${Date.now().toString().slice(-8)}`,
      'TestPassword123!'
    );
    user2Id = user2.user.id;

    expect(user1.tokens.accessToken).toBeTruthy();
    expect(user2.tokens.accessToken).toBeTruthy();

    // Step 2: Create characters for both users
    const character1 = await characterService.createCharacter(user1Id, {
      name: 'Thorgar',
      classId: bruteClassId,
    });
    character1Id = character1.id;

    const character2 = await characterService.createCharacter(user2Id, {
      name: 'Mystica',
      classId: spellweaverClassId,
    });
    character2Id = character2.id;

    expect(character1.name).toBe('Thorgar');
    expect(character1.className).toBe('Brute');
    expect(character1.level).toBe(1);
    expect(character1.experience).toBe(0);
    expect(character1.gold).toBe(0);

    expect(character2.name).toBe('Mystica');
    expect(character2.className).toBe('Spellweaver');
    expect(character2.level).toBe(1);
    expect(character2.experience).toBe(0);
    expect(character2.gold).toBe(0);

    // Step 3: User 1 creates a game
    const game = await gameService.createGame(user1Id, {
      roomCode: `GF${Date.now().toString().slice(-4)}`,
      scenarioId,
      difficulty: 3,
      hostCharacterId: character1Id,
    });
    gameId = game.id;

    expect(game.status).toBe('LOBBY');
    expect(game.difficulty).toBe(3);
    expect(game.characters).toHaveLength(1);
    expect(game.characters[0].id).toBe(character1Id);

    // Step 4: User 2 joins the game
    const updatedGame = await gameService.joinGame(user2Id, gameId, {
      characterId: character2Id,
    });

    expect(updatedGame.characters).toHaveLength(2);
    expect(updatedGame.characters.find((c) => c.id === character2Id)).toBeTruthy();

    // Step 5: Start the game
    const activeGame = await gameService.startGame(gameId);

    expect(activeGame.status).toBe('ACTIVE');
    expect(activeGame.startedAt).toBeTruthy();

    // Step 6: Verify characters cannot be modified during active game
    await expect(
      characterService.levelUpCharacter(character1Id, user1Id, {
        healthIncrease: 1,
      })
    ).rejects.toThrow();

    // Step 7: Record some game events
    await gameService.recordEvent(gameId, 'CARD_PLAYED', {
      characterId: character1Id,
      cardId: 'brute-attack-1',
    });

    await gameService.recordEvent(gameId, 'ATTACK_EXECUTED', {
      characterId: character1Id,
      targetId: 'monster-1',
      damage: 5,
    });

    await gameService.recordEvent(gameId, 'MONSTER_DEFEATED', {
      monsterId: 'monster-1',
    });

    // Step 8: Complete the game with victory
    const completionResult = await gameService.completeGame(gameId, true);

    expect(completionResult.victory).toBe(true);
    expect(completionResult.experienceGained).toBe(30); // difficulty 3 × 10
    expect(completionResult.goldGained).toBe(15); // difficulty 3 × 5
    expect(completionResult.charactersUpdated).toHaveLength(2);

    // Step 9: Verify character progression
    const updatedChar1 = await characterService.getCharacter(character1Id, user1Id);
    const updatedChar2 = await characterService.getCharacter(character2Id, user2Id);

    expect(updatedChar1.experience).toBe(30);
    expect(updatedChar1.gold).toBe(15);
    expect(updatedChar1.currentGameId).toBeNull(); // Released from game

    expect(updatedChar2.experience).toBe(30);
    expect(updatedChar2.gold).toBe(15);
    expect(updatedChar2.currentGameId).toBeNull(); // Released from game

    // Step 10: Verify game events were recorded
    const events = await gameService.getGameEvents(gameId);
    expect(events.length).toBeGreaterThan(0);

    // Should have GAME_STARTED, PLAYER_JOINED, TURN_STARTED, and game action events
    const eventTypes = events.map((e) => e.eventType);
    expect(eventTypes).toContain('GAME_STARTED');
    expect(eventTypes).toContain('PLAYER_JOINED');
    expect(eventTypes).toContain('TURN_STARTED');
    expect(eventTypes).toContain('CARD_PLAYED');
    expect(eventTypes).toContain('ATTACK_EXECUTED');
    expect(eventTypes).toContain('MONSTER_DEFEATED');
    expect(eventTypes).toContain('GAME_COMPLETED');

    // Step 11: Verify event sequence numbers
    events.forEach((event, index) => {
      expect(event.sequenceNum).toBe(index + 1);
    });

    // Step 12: Verify final game state
    const finalGame = await gameService.getGameWithCharacters(gameId);
    expect(finalGame.status).toBe('COMPLETED');
    expect(finalGame.completedAt).toBeTruthy();
  });

  it('should handle game completion with defeat and reduced rewards', async () => {
    // Register user
    const user = await authService.register(
      `def_${Date.now().toString().slice(-8)}`,
      'TestPassword123!'
    );
    const userId = user.user.id;

    // Create character
    const character = await characterService.createCharacter(userId, {
      name: 'TestDefeat',
      classId: bruteClassId,
    });

    // Create game
    const game = await gameService.createGame(userId, {
      roomCode: `DF${Date.now().toString().slice(-4)}`,
      scenarioId,
      difficulty: 2,
      hostCharacterId: character.id,
    });

    // Start game
    await gameService.startGame(game.id);

    // Complete with defeat
    const result = await gameService.completeGame(game.id, false);

    expect(result.victory).toBe(false);
    expect(result.experienceGained).toBe(10); // (2 × 10) / 2
    expect(result.goldGained).toBe(5); // (2 × 5) / 2

    // Verify character received reduced rewards
    const updatedChar = await characterService.getCharacter(character.id, userId);
    expect(updatedChar.experience).toBe(10);
    expect(updatedChar.gold).toBe(5);

    // Cleanup
    await prisma.gameEvent.deleteMany({ where: { gameId: game.id } });
    await prisma.gameState.deleteMany({ where: { gameId: game.id } });
    await prisma.game.delete({ where: { id: game.id } });
    await prisma.character.delete({ where: { id: character.id } });
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  it('should prevent character from joining multiple games simultaneously', async () => {
    // Register user
    const user = await authService.register(
      `mul_${Date.now().toString().slice(-8)}`,
      'TestPassword123!'
    );
    const userId = user.user.id;

    // Create character
    const character = await characterService.createCharacter(userId, {
      name: 'MultiGame',
      classId: bruteClassId,
    });

    // Create first game
    const game1 = await gameService.createGame(userId, {
      roomCode: `GM${Date.now().toString().slice(-4)}`,
      scenarioId,
      difficulty: 1,
      hostCharacterId: character.id,
    });

    // Try to create second game with same character (should fail)
    await expect(
      gameService.createGame(userId, {
        roomCode: `GM2${Date.now().toString().slice(-5)}`,
        scenarioId,
        difficulty: 1,
        hostCharacterId: character.id,
      })
    ).rejects.toThrow('Character is already in an active game');

    // Cleanup
    await prisma.gameEvent.deleteMany({ where: { gameId: game1.id } });
    await prisma.gameState.deleteMany({ where: { gameId: game1.id } });
    await prisma.game.delete({ where: { id: game1.id } });
    await prisma.character.delete({ where: { id: character.id } });
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  });
});
