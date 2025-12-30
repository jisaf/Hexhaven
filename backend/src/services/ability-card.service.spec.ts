/**
 * Ability Card Service Unit Tests
 *
 * Tests for DB-driven ability card queries:
 * - Get cards by class
 * - Get card by ID
 * - Get all cards grouped by class
 * - Get cards by class and level
 * - Validate card selection
 */

import { AbilityCardService } from './ability-card.service';
import { PrismaService } from './prisma.service';
import { CharacterClass } from '../../../shared/types/entities';

// Mock Prisma Service
const mockPrisma = {
  abilityCard: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  characterClass: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
} as unknown as PrismaService;

// Sample DB ability card (matches Prisma schema)
const createMockDbCard = (overrides: Partial<{
  id: string;
  classId: string;
  className: string;
  name: string;
  level: number;
  initiative: number;
  topAction: object;
  bottomAction: object;
}> = {}) => ({
  id: overrides.id || 'card-uuid-1',
  classId: overrides.classId || 'class-uuid-brute',
  name: overrides.name || 'Trample',
  level: overrides.level ?? 1,
  initiative: overrides.initiative ?? 72,
  topAction: overrides.topAction || { type: 'attack', value: 3, modifiers: [] },
  bottomAction: overrides.bottomAction || { type: 'move', value: 3, modifiers: [] },
  layoutTemplateId: null,
  createdAt: new Date(),
  class: {
    id: overrides.classId || 'class-uuid-brute',
    name: overrides.className || 'Brute',
  },
});

// Sample character class from DB
const createMockDbClass = (name: string, id: string) => ({
  id,
  name,
  startingHealth: 10,
  maxHealthByLevel: [10, 12, 14],
  handSize: 10,
  perks: [],
  description: `The ${name} class`,
  imageUrl: null,
  baseMovement: 2,
  baseAttack: 2,
  baseRange: 1,
  color: '#666666',
  createdAt: new Date(),
});

describe('AbilityCardService', () => {
  let service: AbilityCardService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new AbilityCardService(mockPrisma);
  });

  describe('getCardById', () => {
    it('should return ability card by ID from database', async () => {
      const mockCard = createMockDbCard({ id: 'card-1', name: 'Trample' });
      (mockPrisma.abilityCard.findFirst as jest.Mock).mockResolvedValue(mockCard);

      const result = await service.getCardById('card-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('card-1');
      expect(result?.name).toBe('Trample');
      expect(result?.characterClass).toBe('Brute');
      expect(mockPrisma.abilityCard.findFirst).toHaveBeenCalledWith({
        where: { id: 'card-1' },
        include: { class: true },
      });
    });

    it('should return null for non-existent card', async () => {
      (mockPrisma.abilityCard.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.getCardById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getCardsByClass', () => {
    it('should return all cards for a character class', async () => {
      const mockCards = [
        createMockDbCard({ id: 'card-1', name: 'Trample', level: 1 }),
        createMockDbCard({ id: 'card-2', name: 'Eye for an Eye', level: 1, initiative: 51 }),
        createMockDbCard({ id: 'card-3', name: 'Balanced Measure', level: 2, initiative: 20 }),
      ];
      const mockClass = createMockDbClass('Brute', 'class-uuid-brute');

      (mockPrisma.characterClass.findUnique as jest.Mock).mockResolvedValue(mockClass);
      (mockPrisma.abilityCard.findMany as jest.Mock).mockResolvedValue(mockCards);

      const result = await service.getCardsByClass(CharacterClass.BRUTE);

      expect(result).toHaveLength(3);
      expect(result[0].characterClass).toBe('Brute');
      expect(mockPrisma.characterClass.findUnique).toHaveBeenCalledWith({
        where: { name: 'Brute' },
      });
      expect(mockPrisma.abilityCard.findMany).toHaveBeenCalledWith({
        where: { classId: 'class-uuid-brute' },
        include: { class: true },
        orderBy: [{ level: 'asc' }, { initiative: 'asc' }],
      });
    });

    it('should return empty array for unknown class', async () => {
      (mockPrisma.characterClass.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getCardsByClass('UnknownClass' as CharacterClass);

      expect(result).toEqual([]);
      expect(mockPrisma.abilityCard.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getAllCardsGroupedByClass', () => {
    it('should return all cards grouped by class name', async () => {
      const bruteCard = createMockDbCard({ id: 'card-1', name: 'Trample', className: 'Brute' });
      const spellweaverCard = createMockDbCard({
        id: 'card-2',
        name: 'Fire Orbs',
        className: 'Spellweaver',
        classId: 'class-uuid-spellweaver',
      });

      (mockPrisma.abilityCard.findMany as jest.Mock).mockResolvedValue([
        bruteCard,
        spellweaverCard,
      ]);

      const result = await service.getAllCardsGroupedByClass();

      expect(result['Brute']).toHaveLength(1);
      expect(result['Spellweaver']).toHaveLength(1);
      expect(result['Brute'][0].name).toBe('Trample');
      expect(result['Spellweaver'][0].name).toBe('Fire Orbs');
    });

    it('should return empty object when no cards exist', async () => {
      (mockPrisma.abilityCard.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getAllCardsGroupedByClass();

      expect(result).toEqual({});
    });
  });

  describe('getCardsByClassAndLevel', () => {
    it('should return cards at or below specified level', async () => {
      const mockCards = [
        createMockDbCard({ id: 'card-1', name: 'Trample', level: 1 }),
        createMockDbCard({ id: 'card-2', name: 'Eye for an Eye', level: 1 }),
        createMockDbCard({ id: 'card-3', name: 'Balanced Measure', level: 2 }),
      ];
      const mockClass = createMockDbClass('Brute', 'class-uuid-brute');

      (mockPrisma.characterClass.findUnique as jest.Mock).mockResolvedValue(mockClass);
      (mockPrisma.abilityCard.findMany as jest.Mock).mockResolvedValue(mockCards);

      const result = await service.getCardsByClassAndLevel(CharacterClass.BRUTE, 2);

      expect(result).toHaveLength(3);
      expect(mockPrisma.abilityCard.findMany).toHaveBeenCalledWith({
        where: {
          classId: 'class-uuid-brute',
          level: { lte: 2 },
        },
        include: { class: true },
        orderBy: [{ level: 'asc' }, { initiative: 'asc' }],
      });
    });

    it('should only return level 1 cards for level 1 characters', async () => {
      const mockCards = [
        createMockDbCard({ id: 'card-1', name: 'Trample', level: 1 }),
      ];
      const mockClass = createMockDbClass('Brute', 'class-uuid-brute');

      (mockPrisma.characterClass.findUnique as jest.Mock).mockResolvedValue(mockClass);
      (mockPrisma.abilityCard.findMany as jest.Mock).mockResolvedValue(mockCards);

      const result = await service.getCardsByClassAndLevel(CharacterClass.BRUTE, 1);

      expect(result).toHaveLength(1);
      expect(mockPrisma.abilityCard.findMany).toHaveBeenCalledWith({
        where: {
          classId: 'class-uuid-brute',
          level: { lte: 1 },
        },
        include: { class: true },
        orderBy: [{ level: 'asc' }, { initiative: 'asc' }],
      });
    });
  });

  describe('validateCardForClass', () => {
    it('should return true if card belongs to class', async () => {
      const mockCard = createMockDbCard({ id: 'card-1', className: 'Brute' });
      (mockPrisma.abilityCard.findFirst as jest.Mock).mockResolvedValue(mockCard);

      const result = await service.validateCardForClass('card-1', CharacterClass.BRUTE);

      expect(result).toBe(true);
    });

    it('should return false if card does not belong to class', async () => {
      const mockCard = createMockDbCard({ id: 'card-1', className: 'Spellweaver' });
      (mockPrisma.abilityCard.findFirst as jest.Mock).mockResolvedValue(mockCard);

      const result = await service.validateCardForClass('card-1', CharacterClass.BRUTE);

      expect(result).toBe(false);
    });

    it('should return false if card does not exist', async () => {
      (mockPrisma.abilityCard.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.validateCardForClass('non-existent', CharacterClass.BRUTE);

      expect(result).toBe(false);
    });
  });

  describe('validateCardSelection', () => {
    it('should validate valid card selection', async () => {
      const topCard = createMockDbCard({ id: 'card-1', name: 'Trample' });
      const bottomCard = createMockDbCard({ id: 'card-2', name: 'Eye for an Eye' });

      (mockPrisma.abilityCard.findFirst as jest.Mock)
        .mockResolvedValueOnce(topCard)
        .mockResolvedValueOnce(bottomCard);

      const result = await service.validateCardSelection('card-1', 'card-2', CharacterClass.BRUTE);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.topCard).toBeDefined();
      expect(result.bottomCard).toBeDefined();
    });

    it('should return error if top card not found', async () => {
      const bottomCard = createMockDbCard({ id: 'card-2', name: 'Eye for an Eye' });

      (mockPrisma.abilityCard.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(bottomCard);

      const result = await service.validateCardSelection('non-existent', 'card-2', CharacterClass.BRUTE);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Top card not found: non-existent');
    });

    it('should return error if bottom card not found', async () => {
      const topCard = createMockDbCard({ id: 'card-1', name: 'Trample' });

      (mockPrisma.abilityCard.findFirst as jest.Mock)
        .mockResolvedValueOnce(topCard)
        .mockResolvedValueOnce(null);

      const result = await service.validateCardSelection('card-1', 'non-existent', CharacterClass.BRUTE);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Bottom card not found: non-existent');
    });

    it('should return error if card does not belong to class', async () => {
      const topCard = createMockDbCard({ id: 'card-1', className: 'Spellweaver' });
      const bottomCard = createMockDbCard({ id: 'card-2', className: 'Brute' });

      (mockPrisma.abilityCard.findFirst as jest.Mock)
        .mockResolvedValueOnce(topCard)
        .mockResolvedValueOnce(bottomCard);

      const result = await service.validateCardSelection('card-1', 'card-2', CharacterClass.BRUTE);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Top card card-1 does not belong to Brute');
    });

    it('should return error if same card selected for both', async () => {
      const card = createMockDbCard({ id: 'card-1', name: 'Trample' });

      (mockPrisma.abilityCard.findFirst as jest.Mock)
        .mockResolvedValueOnce(card)
        .mockResolvedValueOnce(card);

      const result = await service.validateCardSelection('card-1', 'card-1', CharacterClass.BRUTE);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Cannot select the same card for both top and bottom');
    });
  });

  describe('getCardInitiative', () => {
    it('should return initiative value from card', async () => {
      const mockCard = createMockDbCard({ id: 'card-1', initiative: 72 });
      (mockPrisma.abilityCard.findFirst as jest.Mock).mockResolvedValue(mockCard);

      const result = await service.getCardInitiative('card-1');

      expect(result).toBe(72);
    });

    it('should return null for non-existent card', async () => {
      (mockPrisma.abilityCard.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.getCardInitiative('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('mapDbCardToAbilityCard', () => {
    it('should correctly map database card to shared type', async () => {
      const dbCard = createMockDbCard({
        id: 'card-1',
        name: 'Trample',
        className: 'Brute',
        level: 1,
        initiative: 72,
        topAction: { type: 'attack', value: 3, modifiers: [{ type: 'xp', value: 1 }] },
        bottomAction: { type: 'move', value: 3, modifiers: [{ type: 'push', distance: 1 }] },
      });

      (mockPrisma.abilityCard.findFirst as jest.Mock).mockResolvedValue(dbCard);

      const result = await service.getCardById('card-1');

      expect(result).toMatchObject({
        id: 'card-1',
        name: 'Trample',
        characterClass: 'Brute',
        level: 1,
        initiative: 72,
        topAction: { type: 'attack', value: 3, modifiers: [{ type: 'xp', value: 1 }] },
        bottomAction: { type: 'move', value: 3, modifiers: [{ type: 'push', distance: 1 }] },
      });
    });
  });
});
