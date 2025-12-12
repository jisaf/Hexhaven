/**
 * Item Service Unit Tests (Issue #205 - Phase 5.1)
 *
 * Tests for item CRUD operations with role-based access:
 * - Listing and filtering items
 * - Getting item details
 * - Creating items (creator/admin only)
 * - Updating items (creator/admin only)
 * - Deleting items (admin only)
 */

import { ItemService } from './item.service';
import { NotFoundError, ForbiddenError, ValidationError } from '../types/errors';
import type { UserRole } from '../../../shared/types/entities';

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
  user: {
    findUnique: jest.fn(),
  },
};

describe('ItemService', () => {
  let itemService: ItemService;

  beforeEach(() => {
    jest.clearAllMocks();
    itemService = new ItemService(mockPrisma as any);
  });

  describe('listItems', () => {
    it('should return paginated list of items', async () => {
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
        },
      ];

      mockPrisma.item.findMany.mockResolvedValue(mockItems);
      mockPrisma.item.count.mockResolvedValue(2);

      const result = await itemService.listItems({}, 1, 10);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('should filter items by slot', async () => {
      const mockItems = [
        {
          id: 'item-1',
          name: 'Iron Helmet',
          slot: 'HEAD',
          usageType: 'PERSISTENT',
          isActive: true,
        },
      ];

      mockPrisma.item.findMany.mockResolvedValue(mockItems);
      mockPrisma.item.count.mockResolvedValue(1);

      const result = await itemService.listItems({ slot: 'HEAD' }, 1, 10);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].slot).toBe('HEAD');
    });

    it('should filter items by usage type', async () => {
      mockPrisma.item.findMany.mockResolvedValue([]);
      mockPrisma.item.count.mockResolvedValue(0);

      await itemService.listItems({ usageType: 'CONSUMED' }, 1, 10);

      expect(mockPrisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            usageType: 'CONSUMED',
          }),
        }),
      );
    });

    it('should filter items by name search', async () => {
      mockPrisma.item.findMany.mockResolvedValue([]);
      mockPrisma.item.count.mockResolvedValue(0);

      await itemService.listItems({ search: 'potion' }, 1, 10);

      expect(mockPrisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'potion', mode: 'insensitive' },
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
      };

      mockPrisma.item.findUnique.mockResolvedValue(mockItem);

      const result = await itemService.getItem('item-1');

      expect(result.id).toBe('item-1');
      expect(result.name).toBe('Healing Potion');
    });

    it('should throw NotFoundError for non-existent item', async () => {
      mockPrisma.item.findUnique.mockResolvedValue(null);

      await expect(itemService.getItem('invalid-id')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('createItem', () => {
    const createDto = {
      name: 'New Potion',
      slot: 'SMALL' as const,
      usageType: 'CONSUMED' as const,
      maxUses: 1,
      cost: 15,
      effects: [{ type: 'heal', value: 3 }],
    };

    it('should create item when user is creator', async () => {
      const mockCreatedItem = {
        id: 'new-item',
        ...createDto,
        isActive: true,
        triggers: [],
      };

      mockPrisma.item.create.mockResolvedValue(mockCreatedItem);

      const result = await itemService.createItem(createDto, 'creator');

      expect(result.name).toBe('New Potion');
      expect(mockPrisma.item.create).toHaveBeenCalled();
    });

    it('should create item when user is admin', async () => {
      mockPrisma.item.create.mockResolvedValue({
        id: 'new-item',
        ...createDto,
        isActive: true,
      });

      await itemService.createItem(createDto, 'admin');

      expect(mockPrisma.item.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenError for regular users', async () => {
      await expect(
        itemService.createItem(createDto, 'player'),
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ValidationError for invalid effect types', async () => {
      const invalidDto = {
        ...createDto,
        effects: [{ type: 'invalid_effect', value: 5 }],
      };

      await expect(
        itemService.createItem(invalidDto, 'creator'),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('updateItem', () => {
    const updateDto = {
      name: 'Updated Potion',
      cost: 20,
    };

    it('should update item when user is creator', async () => {
      const mockExistingItem = {
        id: 'item-1',
        name: 'Old Potion',
        slot: 'SMALL',
        usageType: 'CONSUMED',
        isActive: true,
      };

      const mockUpdatedItem = {
        ...mockExistingItem,
        name: 'Updated Potion',
        cost: 20,
      };

      mockPrisma.item.findUnique.mockResolvedValue(mockExistingItem);
      mockPrisma.item.update.mockResolvedValue(mockUpdatedItem);

      const result = await itemService.updateItem(
        'item-1',
        updateDto,
        'creator',
      );

      expect(result.name).toBe('Updated Potion');
    });

    it('should throw NotFoundError for non-existent item', async () => {
      mockPrisma.item.findUnique.mockResolvedValue(null);

      await expect(
        itemService.updateItem('invalid-id', updateDto, 'creator'),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError for regular users', async () => {
      mockPrisma.item.findUnique.mockResolvedValue({ id: 'item-1' });

      await expect(
        itemService.updateItem('item-1', updateDto, 'player'),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('deleteItem', () => {
    it('should delete item when user is admin', async () => {
      mockPrisma.item.findUnique.mockResolvedValue({ id: 'item-1' });
      mockPrisma.characterEquipment.findFirst.mockResolvedValue(null);
      mockPrisma.item.delete.mockResolvedValue({ id: 'item-1' });

      await itemService.deleteItem('item-1', 'admin');

      expect(mockPrisma.item.delete).toHaveBeenCalledWith({
        where: { id: 'item-1' },
      });
    });

    it('should throw ForbiddenError for creator role', async () => {
      mockPrisma.item.findUnique.mockResolvedValue({ id: 'item-1' });

      await expect(
        itemService.deleteItem('item-1', 'creator'),
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ValidationError if item is equipped by characters', async () => {
      mockPrisma.item.findUnique.mockResolvedValue({ id: 'item-1' });
      mockPrisma.characterEquipment.findFirst.mockResolvedValue({
        id: 'equip-1',
      });

      await expect(
        itemService.deleteItem('item-1', 'admin'),
      ).rejects.toThrow(ValidationError);
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
        effects: [{ type: 'bonus', value: { defense: 1 } }],
        triggers: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = itemService.toSharedItem(prismaItem as any);

      expect(result.id).toBe('item-1');
      expect(result.name).toBe('Test Item');
      expect(result.slot).toBe('HEAD');
      expect(result.effects).toHaveLength(1);
    });
  });
});
