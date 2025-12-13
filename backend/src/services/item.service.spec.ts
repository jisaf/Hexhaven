/**
 * Item Service Unit Tests (Issue #205 - Phase 5.1)
 *
 * Tests for item CRUD operations with role-based access:
 * - Listing and filtering items
 * - Getting item details
 * - Creating items (creator role)
 * - Updating items (creator role)
 * - Deleting items (admin only)
 */

import { ItemService } from './item.service';
import { NotFoundError, ValidationError, ForbiddenError } from '../types/errors';
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
const mockPrisma = {
  item: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  characterEquipment: {
    findFirst: jest.fn(),
  },
  characterInventory: {
    findFirst: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
} as unknown as PrismaClient;

// Helper to set up user with specific roles
// Note: service checks lowercase role names ('creator', 'admin', 'player')
const mockUserWithRoles = (roles: string[]) => {
  (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
    id: 'user-1',
    roles: roles.map((r) => r.toLowerCase()),
  });
};

describe('ItemService', () => {
  let itemService: ItemService;

  beforeEach(() => {
    jest.resetAllMocks();
    itemService = new ItemService(mockPrisma);
  });

  describe('listItems', () => {
    it('should return list of items', async () => {
      const mockItems = [
        {
          id: 'item-1',
          name: 'Healing Potion',
          slot: 'SMALL',
          usageType: 'CONSUMED',
          maxUses: 1,
          cost: 10,
          effects: [],
          triggers: [],
          isActive: true,
          rarity: 'COMMON',
          createdAt: new Date(),
        },
        {
          id: 'item-2',
          name: 'Iron Helmet',
          slot: 'HEAD',
          usageType: 'PERSISTENT',
          maxUses: null,
          cost: 20,
          effects: [],
          triggers: [],
          isActive: true,
          rarity: 'UNCOMMON',
          createdAt: new Date(),
        },
      ];

      (mockPrisma.item.findMany as jest.Mock).mockResolvedValue(mockItems);

      const result = await itemService.listItems();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Healing Potion');
    });

    it('should filter items by slot', async () => {
      const mockItems = [
        {
          id: 'item-1',
          name: 'Iron Helmet',
          slot: 'HEAD',
          usageType: 'PERSISTENT',
          isActive: true,
          rarity: 'COMMON',
          effects: [],
          triggers: [],
          createdAt: new Date(),
        },
      ];

      (mockPrisma.item.findMany as jest.Mock).mockResolvedValue(mockItems);

      const result = await itemService.listItems({ slot: 'HEAD' });

      expect(result).toHaveLength(1);
      expect(result[0].slot).toBe('HEAD');
      expect(mockPrisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            slot: 'HEAD',
          }),
        }),
      );
    });

    it('should filter items by usage type', async () => {
      (mockPrisma.item.findMany as jest.Mock).mockResolvedValue([]);

      await itemService.listItems({ usageType: 'CONSUMED' });

      expect(mockPrisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            usageType: 'CONSUMED',
          }),
        }),
      );
    });

    it('should filter items by rarity', async () => {
      (mockPrisma.item.findMany as jest.Mock).mockResolvedValue([]);

      await itemService.listItems({ rarity: 'RARE' });

      expect(mockPrisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            rarity: 'RARE',
          }),
        }),
      );
    });
  });

  describe('getItem', () => {
    it('should return item details by ID', async () => {
      const mockItem = {
        id: 'item-1',
        name: 'Healing Potion',
        slot: 'SMALL',
        usageType: 'CONSUMED',
        maxUses: 1,
        cost: 10,
        effects: [{ type: 'heal', value: 5 }],
        triggers: [],
        isActive: true,
        rarity: 'COMMON',
        createdAt: new Date(),
      };

      (mockPrisma.item.findUnique as jest.Mock).mockResolvedValue(mockItem);

      const result = await itemService.getItem('item-1');

      expect(result?.id).toBe('item-1');
      expect(result?.name).toBe('Healing Potion');
    });

    it('should return null for non-existent item', async () => {
      (mockPrisma.item.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await itemService.getItem('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('getItemOrThrow', () => {
    it('should throw NotFoundError for non-existent item', async () => {
      (mockPrisma.item.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(itemService.getItemOrThrow('invalid-id')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('createItem', () => {
    const validCreateDto = {
      name: 'New Potion',
      slot: 'SMALL' as const,
      usageType: 'CONSUMED' as const,
      rarity: 'COMMON' as const,
      maxUses: 1,
      cost: 15,
      effects: [{ type: 'heal', value: 3 }],
      triggers: [],
    };

    it('should create item with valid data when user has permission', async () => {
      const mockCreatedItem = {
        id: 'new-item',
        ...validCreateDto,
        isActive: true,
        createdBy: 'user-1',
        createdAt: new Date(),
      };

      mockUserWithRoles(['CREATOR']);
      (mockPrisma.item.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.item.create as jest.Mock).mockResolvedValue(mockCreatedItem);

      const result = await itemService.createItem('user-1', validCreateDto);

      expect(result.name).toBe('New Potion');
      expect(mockPrisma.item.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenError when user lacks permission', async () => {
      mockUserWithRoles(['PLAYER']);

      await expect(
        itemService.createItem('user-1', validCreateDto),
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ValidationError for invalid effect type', async () => {
      mockUserWithRoles(['CREATOR']);

      const invalidDto = {
        ...validCreateDto,
        effects: [{ type: 'invalid_effect_type', value: 5 }],
      };

      await expect(itemService.createItem('user-1', invalidDto)).rejects.toThrow(
        ValidationError,
      );
    });

    it('should throw ValidationError for missing name', async () => {
      mockUserWithRoles(['CREATOR']);

      const invalidDto = {
        ...validCreateDto,
        name: '',
      };

      await expect(itemService.createItem('user-1', invalidDto)).rejects.toThrow(
        ValidationError,
      );
    });

    it('should throw ValidationError for negative cost', async () => {
      mockUserWithRoles(['CREATOR']);

      const invalidDto = {
        ...validCreateDto,
        cost: -5,
      };

      await expect(itemService.createItem('user-1', invalidDto)).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe('updateItem', () => {
    const updateDto = {
      name: 'Updated Potion',
      cost: 20,
    };

    it('should update item when user has permission', async () => {
      const mockExistingItem = {
        id: 'item-1',
        name: 'Old Potion',
        slot: 'SMALL',
        usageType: 'CONSUMED',
        isActive: true,
        rarity: 'COMMON',
        effects: [],
        triggers: [],
        createdAt: new Date(),
      };

      const mockUpdatedItem = {
        ...mockExistingItem,
        name: 'Updated Potion',
        cost: 20,
      };

      mockUserWithRoles(['CREATOR']);
      // First call: getItemOrThrow returns existing item
      // Second call: duplicate check returns null (no duplicate)
      (mockPrisma.item.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockExistingItem) // getItemOrThrow
        .mockResolvedValueOnce(null); // duplicate check
      (mockPrisma.item.update as jest.Mock).mockResolvedValue(mockUpdatedItem);

      const result = await itemService.updateItem('user-1', 'item-1', updateDto);

      expect(result.name).toBe('Updated Potion');
    });

    it('should throw ForbiddenError when user lacks permission', async () => {
      mockUserWithRoles(['PLAYER']);

      await expect(
        itemService.updateItem('user-1', 'item-1', updateDto),
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw NotFoundError for non-existent item', async () => {
      mockUserWithRoles(['CREATOR']);
      (mockPrisma.item.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        itemService.updateItem('user-1', 'invalid-id', updateDto),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteItem', () => {
    it('should delete item when user is admin', async () => {
      mockUserWithRoles(['ADMIN']);
      (mockPrisma.item.findUnique as jest.Mock).mockResolvedValue({
        id: 'item-1',
        isActive: true,
        createdAt: new Date(),
      });
      (mockPrisma.item.delete as jest.Mock).mockResolvedValue({});

      await itemService.deleteItem('user-1', 'item-1');

      expect(mockPrisma.item.delete).toHaveBeenCalledWith({
        where: { id: 'item-1' },
      });
    });

    it('should throw ForbiddenError when non-admin tries to delete', async () => {
      mockUserWithRoles(['CREATOR']);

      await expect(itemService.deleteItem('user-1', 'item-1')).rejects.toThrow(
        ForbiddenError,
      );
    });

    it('should throw NotFoundError for non-existent item', async () => {
      mockUserWithRoles(['ADMIN']);
      (mockPrisma.item.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(itemService.deleteItem('user-1', 'invalid-id')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('toSharedItem', () => {
    it('should convert Prisma item to shared type', () => {
      const prismaItem = {
        id: 'item-1',
        name: 'Test Item',
        description: 'A test item',
        slot: 'HEAD',
        usageType: 'PERSISTENT',
        maxUses: null,
        cost: 50,
        imageUrl: '/images/item.png',
        effects: [{ type: 'defense', value: 1 }],
        triggers: [],
        isActive: true,
        rarity: 'UNCOMMON',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
        createdBy: 'user-1',
      };

      const result = itemService.toSharedItem(prismaItem as any);

      expect(result.id).toBe('item-1');
      expect(result.name).toBe('Test Item');
      expect(result.slot).toBe('HEAD');
      expect(result.effects).toHaveLength(1);
      expect(result.rarity).toBe('UNCOMMON');
      expect(result.createdAt).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should handle null optional fields', () => {
      const prismaItem = {
        id: 'item-1',
        name: 'Simple Item',
        slot: 'SMALL',
        usageType: 'CONSUMED',
        maxUses: 1,
        cost: 10,
        effects: [],
        triggers: [],
        isActive: true,
        rarity: 'COMMON',
        description: null,
        imageUrl: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
        createdBy: null,
      };

      const result = itemService.toSharedItem(prismaItem as any);

      expect(result.id).toBe('item-1');
      expect(result.description).toBeUndefined();
      expect(result.imageUrl).toBeUndefined();
      expect(result.createdBy).toBeUndefined();
    });
  });

  describe('validateEffects', () => {
    it('should validate correct effects', () => {
      const effects = [
        { type: 'heal', value: 5 },
        { type: 'shield', value: 2 },
      ];

      const result = itemService.validateEffects(effects);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid effect types', () => {
      const effects = [{ type: 'invalid_type', value: 5 }];

      const result = itemService.validateEffects(effects);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should require value for numeric effects', () => {
      const effects = [{ type: 'heal' }];

      const result = itemService.validateEffects(effects as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Effect 0: value is required for heal effects',
      );
    });
  });
});
