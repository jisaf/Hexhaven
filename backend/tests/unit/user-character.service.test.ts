/**
 * UserCharacterService Unit Tests (Phase 7)
 * Comprehensive tests for character CRUD operations
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { UserCharacterService } from '../../src/services/user-character.service';
import { ValidationError, NotFoundError, ConflictError } from '../../src/types/errors';

describe('UserCharacterService', () => {
  let service: UserCharacterService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      character: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      characterClass: {
        findUnique: jest.fn(),
      },
      abilityCard: {
        findMany: jest.fn(),
      },
      cardEnhancement: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      item: {
        findUnique: jest.fn(),
      },
    };

    service = new UserCharacterService(mockPrisma);
  });

  describe('createCharacter()', () => {
    it('should create a character with valid data', async () => {
      const userId = 'user-123';
      const dto = { name: 'Thorgar', classId: 'class-brute' };

      mockPrisma.characterClass.findUnique.mockResolvedValue({
        id: 'class-brute',
        name: 'Brute',
        startingHealth: 10,
        handSize: 10,
      });

      mockPrisma.character.findFirst.mockResolvedValue(null); // No active character

      mockPrisma.character.create.mockResolvedValue({
        id: 'char-123',
        name: 'Thorgar',
        userId: 'user-123',
        classId: 'class-brute',
        level: 1,
        experience: 0,
        gold: 0,
        health: 10,
        perks: [],
        inventory: [],
        currentGameId: null,
        campaignId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        class: {
          id: 'class-brute',
          name: 'Brute',
        },
      });

      const result = await service.createCharacter(userId, dto);

      expect(result.name).toBe('Thorgar');
      expect(result.className).toBe('Brute');
      expect(result.level).toBe(1);
      expect(result.health).toBe(10);
      expect(mockPrisma.character.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Thorgar',
          userId: 'user-123',
          classId: 'class-brute',
          level: 1,
          health: 10,
        }),
        include: { class: true },
      });
    });

    it('should reject name shorter than 1 character', async () => {
      const dto = { name: '', classId: 'class-123' };

      await expect(service.createCharacter('user-123', dto))
        .rejects
        .toThrow(ValidationError);
    });

    it('should reject name longer than 30 characters', async () => {
      const dto = {
        name: 'A'.repeat(31),
        classId: 'class-123',
      };

      await expect(service.createCharacter('user-123', dto))
        .rejects
        .toThrow(ValidationError);
    });

    it('should reject non-existent character class', async () => {
      const dto = { name: 'Test', classId: 'invalid-class' };

      mockPrisma.characterClass.findUnique.mockResolvedValue(null);

      await expect(service.createCharacter('user-123', dto))
        .rejects
        .toThrow(NotFoundError);
    });

    it('should reject if user has character in active game', async () => {
      const dto = { name: 'Test', classId: 'class-123' };

      mockPrisma.characterClass.findUnique.mockResolvedValue({
        id: 'class-123',
        startingHealth: 10,
      });

      mockPrisma.character.findFirst.mockResolvedValue({
        id: 'existing-char',
        currentGameId: 'game-123', // In active game
      });

      await expect(service.createCharacter('user-123', dto))
        .rejects
        .toThrow(ConflictError);
    });
  });

  describe('listCharacters()', () => {
    it('should return all characters for a user', async () => {
      mockPrisma.character.findMany.mockResolvedValue([
        {
          id: 'char-1',
          name: 'Character 1',
          userId: 'user-123',
          level: 1,
          class: { name: 'Brute' },
          experience: 0,
          gold: 0,
          health: 10,
          perks: [],
          inventory: [],
          currentGameId: null,
          campaignId: null,
          classId: 'class-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'char-2',
          name: 'Character 2',
          userId: 'user-123',
          level: 2,
          class: { name: 'Spellweaver' },
          experience: 50,
          gold: 20,
          health: 8,
          perks: ['Remove two -1 cards'],
          inventory: [],
          currentGameId: null,
          campaignId: null,
          classId: 'class-2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.listCharacters('user-123');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Character 1');
      expect(result[1].name).toBe('Character 2');
      expect(mockPrisma.character.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        include: { class: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array if user has no characters', async () => {
      mockPrisma.character.findMany.mockResolvedValue([]);

      const result = await service.listCharacters('user-123');

      expect(result).toHaveLength(0);
    });
  });

  describe('deleteCharacter()', () => {
    it('should delete character if user owns it', async () => {
      mockPrisma.character.findUnique.mockResolvedValue({
        id: 'char-123',
        userId: 'user-123',
        currentGameId: null,
      });

      mockPrisma.character.delete.mockResolvedValue({ id: 'char-123' });

      await service.deleteCharacter('char-123', 'user-123');

      expect(mockPrisma.character.delete).toHaveBeenCalledWith({
        where: { id: 'char-123' },
      });
    });

    it('should reject if character does not exist', async () => {
      mockPrisma.character.findUnique.mockResolvedValue(null);

      await expect(service.deleteCharacter('invalid-id', 'user-123'))
        .rejects
        .toThrow(NotFoundError);
    });

    it('should reject if user does not own character', async () => {
      mockPrisma.character.findUnique.mockResolvedValue({
        id: 'char-123',
        userId: 'other-user',
      });

      await expect(service.deleteCharacter('char-123', 'user-123'))
        .rejects
        .toThrow(NotFoundError);
    });

    it('should reject if character is in active game', async () => {
      mockPrisma.character.findUnique.mockResolvedValue({
        id: 'char-123',
        userId: 'user-123',
        currentGameId: 'game-123', // In game
      });

      await expect(service.deleteCharacter('char-123', 'user-123'))
        .rejects
        .toThrow(ConflictError);
    });
  });

  describe('levelUpCharacter()', () => {
    it('should level up character and increase health', async () => {
      mockPrisma.character.findUnique.mockResolvedValue({
        id: 'char-123',
        userId: 'user-123',
        level: 1,
        health: 10,
        perks: [],
        currentGameId: null,
        class: {
          maxHealthByLevel: [10, 12, 14, 16, 18, 20, 22, 24, 26],
        },
      });

      mockPrisma.character.update.mockResolvedValue({
        id: 'char-123',
        level: 2,
        health: 13, // 12 (new max) + 1 (healthIncrease)
        perks: ['Remove two -1 cards'],
        class: { name: 'Brute' },
        userId: 'user-123',
        classId: 'class-1',
        name: 'Test',
        experience: 0,
        gold: 0,
        inventory: [],
        currentGameId: null,
        campaignId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.levelUpCharacter('char-123', 'user-123', {
        healthIncrease: 1,
        selectedPerk: 'Remove two -1 cards',
      });

      expect(result.level).toBe(2);
      expect(result.health).toBe(13);
      expect(result.perks).toContain('Remove two -1 cards');
    });

    it('should reject leveling up at max level (9)', async () => {
      mockPrisma.character.findUnique.mockResolvedValue({
        id: 'char-123',
        userId: 'user-123',
        level: 9, // Max level
        currentGameId: null,
        class: {},
      });

      await expect(
        service.levelUpCharacter('char-123', 'user-123', { healthIncrease: 1 })
      ).rejects.toThrow(ValidationError);
    });

    it('should reject leveling up during active game', async () => {
      mockPrisma.character.findUnique.mockResolvedValue({
        id: 'char-123',
        userId: 'user-123',
        level: 1,
        currentGameId: 'game-123', // In game
        class: {},
      });

      await expect(
        service.levelUpCharacter('char-123', 'user-123', { healthIncrease: 1 })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('equipItem()', () => {
    it('should add item to character inventory', async () => {
      mockPrisma.character.findUnique.mockResolvedValue({
        id: 'char-123',
        userId: 'user-123',
        inventory: [],
        class: { name: 'Brute' },
        classId: 'class-1',
        name: 'Test',
        level: 1,
        experience: 0,
        gold: 0,
        health: 10,
        perks: [],
        currentGameId: null,
        campaignId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.item.findUnique.mockResolvedValue({
        id: 'item-123',
        name: 'Leather Armor',
      });

      mockPrisma.character.update.mockResolvedValue({
        id: 'char-123',
        inventory: ['item-123'],
        class: { name: 'Brute' },
        userId: 'user-123',
        classId: 'class-1',
        name: 'Test',
        level: 1,
        experience: 0,
        gold: 0,
        health: 10,
        perks: [],
        currentGameId: null,
        campaignId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.equipItem('char-123', 'user-123', 'item-123');

      expect(result.inventory).toContain('item-123');
    });

    it('should reject if item already in inventory', async () => {
      mockPrisma.character.findUnique.mockResolvedValue({
        id: 'char-123',
        userId: 'user-123',
        inventory: ['item-123'], // Already has item
        class: {},
      });

      mockPrisma.item.findUnique.mockResolvedValue({
        id: 'item-123',
      });

      await expect(service.equipItem('char-123', 'user-123', 'item-123'))
        .rejects
        .toThrow(ConflictError);
    });

    it('should reject if item does not exist', async () => {
      mockPrisma.character.findUnique.mockResolvedValue({
        id: 'char-123',
        userId: 'user-123',
        inventory: [],
        class: {},
      });

      mockPrisma.item.findUnique.mockResolvedValue(null);

      await expect(service.equipItem('char-123', 'user-123', 'invalid-item'))
        .rejects
        .toThrow(NotFoundError);
    });
  });
});
