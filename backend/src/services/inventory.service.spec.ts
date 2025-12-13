/**
 * Inventory Service Unit Tests (Issue #205 - Phase 5.1)
 *
 * Tests for character inventory management:
 * - Getting inventory
 * - Equipping/unequipping items
 * - Using items
 * - Item state management
 */

import { InventoryService } from './inventory.service';
import { ItemService } from './item.service';
import { NotFoundError, ValidationError, ConflictError } from '../types/errors';
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
const mockPrisma = {
  character: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  item: {
    findUnique: jest.fn(),
  },
  characterInventory: {
    findFirst: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  characterEquipment: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  characterItemState: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
  $transaction: jest.fn((callback) => callback(mockPrisma)),
} as unknown as PrismaClient;

// Mock ItemService
const mockItemService = {
  toSharedItem: jest.fn((item) => ({
    id: item.id,
    name: item.name,
    slot: item.slot,
    usageType: item.usageType,
    maxUses: item.maxUses,
    effects: item.effects || [],
    triggers: item.triggers || [],
    cost: item.cost,
    imageUrl: item.imageUrl,
    rarity: item.rarity || 'COMMON',
    description: item.description,
  })),
} as unknown as ItemService;

describe('InventoryService', () => {
  let inventoryService: InventoryService;

  beforeEach(() => {
    jest.resetAllMocks();
    // Restore the toSharedItem mock implementation after reset
    (mockItemService.toSharedItem as jest.Mock).mockImplementation((item) => ({
      id: item.id,
      name: item.name,
      slot: item.slot,
      usageType: item.usageType,
      maxUses: item.maxUses,
      effects: item.effects || [],
      triggers: item.triggers || [],
      cost: item.cost,
      imageUrl: item.imageUrl,
      rarity: item.rarity || 'COMMON',
      description: item.description,
    }));
    inventoryService = new InventoryService(mockPrisma, mockItemService);
  });

  describe('getInventory', () => {
    it('should return character inventory with owned and equipped items', async () => {
      const mockCharacter = {
        id: 'char-1',
        userId: 'user-1',
        level: 2,
        ownedItems: [
          {
            itemId: 'item-1',
            item: {
              id: 'item-1',
              name: 'Healing Potion',
              slot: 'SMALL',
              usageType: 'CONSUMED',
              maxUses: 1,
              cost: 10,
              effects: [],
              triggers: [],
              rarity: 'COMMON',
            },
          },
        ],
        equippedItems: [
          {
            id: 'equip-1',
            itemId: 'item-1',
            slot: 'SMALL',
            slotIndex: 0,
            item: {
              id: 'item-1',
              name: 'Healing Potion',
              slot: 'SMALL',
              usageType: 'CONSUMED',
              maxUses: 1,
              cost: 10,
              rarity: 'COMMON',
            },
          },
        ],
        itemStates: [
          {
            itemId: 'item-1',
            state: 'READY',
            usesRemaining: 1,
          },
        ],
      };

      (mockPrisma.character.findUnique as jest.Mock).mockResolvedValue(
        mockCharacter,
      );

      const result = await inventoryService.getInventory('char-1');

      expect(result.ownedItems).toHaveLength(1);
      expect(result.ownedItems[0].name).toBe('Healing Potion');
      expect(result.itemStates['item-1']).toBeDefined();
      expect(result.itemStates['item-1'].state).toBe('ready');
    });

    it('should throw NotFoundError for non-existent character', async () => {
      (mockPrisma.character.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(inventoryService.getInventory('invalid-id')).rejects.toThrow(
        NotFoundError,
      );
    });

    it('should throw NotFoundError when userId does not match', async () => {
      const mockCharacter = {
        id: 'char-1',
        userId: 'user-1',
        ownedItems: [],
        equippedItems: [],
        itemStates: [],
      };

      (mockPrisma.character.findUnique as jest.Mock).mockResolvedValue(
        mockCharacter,
      );

      await expect(
        inventoryService.getInventory('char-1', 'different-user'),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getEquippedItemsWithDetails', () => {
    it('should return equipped items with details for a character', async () => {
      const mockEquipment = [
        {
          id: 'equip-1',
          characterId: 'char-1',
          itemId: 'item-1',
          slot: 'HEAD',
          slotIndex: 0,
          item: {
            id: 'item-1',
            name: 'Iron Helmet',
            slot: 'HEAD',
            usageType: 'PERSISTENT',
            effects: [],
            triggers: [],
            rarity: 'COMMON',
          },
        },
      ];

      (mockPrisma.characterEquipment.findMany as jest.Mock).mockResolvedValue(
        mockEquipment,
      );
      (mockPrisma.characterItemState.findMany as jest.Mock).mockResolvedValue([
        { itemId: 'item-1', state: 'READY', usesRemaining: null },
      ]);

      const result =
        await inventoryService.getEquippedItemsWithDetails('char-1');

      expect(result).toHaveLength(1);
      expect(result[0].slot).toBe('head');
      expect(result[0].item.id).toBe('item-1');
      expect(result[0].state.state).toBe('ready');
    });

    it('should return empty array for character with no equipment', async () => {
      (mockPrisma.characterEquipment.findMany as jest.Mock).mockResolvedValue(
        [],
      );
      (mockPrisma.characterItemState.findMany as jest.Mock).mockResolvedValue(
        [],
      );

      const result =
        await inventoryService.getEquippedItemsWithDetails('char-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('equipItem', () => {
    it('should throw error when character not found', async () => {
      (mockPrisma.character.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        inventoryService.equipItem('char-1', 'user-1', 'item-1'),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw error when user does not own character', async () => {
      const mockCharacter = {
        id: 'char-1',
        userId: 'different-user',
        currentGameId: null,
        ownedItems: [],
        equippedItems: [],
      };

      (mockPrisma.character.findUnique as jest.Mock).mockResolvedValue(
        mockCharacter,
      );

      await expect(
        inventoryService.equipItem('char-1', 'user-1', 'item-1'),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw error when item is not owned', async () => {
      const mockCharacter = {
        id: 'char-1',
        userId: 'user-1',
        currentGameId: null,
        ownedItems: [],
        equippedItems: [],
      };

      (mockPrisma.character.findUnique as jest.Mock).mockResolvedValue(
        mockCharacter,
      );

      await expect(
        inventoryService.equipItem('char-1', 'user-1', 'item-1'),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw error when character is in active game', async () => {
      const mockCharacter = {
        id: 'char-1',
        userId: 'user-1',
        currentGameId: 'game-1',
        ownedItems: [{ itemId: 'item-1', item: { id: 'item-1', slot: 'HEAD' } }],
        equippedItems: [],
      };

      (mockPrisma.character.findUnique as jest.Mock).mockResolvedValue(
        mockCharacter,
      );

      await expect(
        inventoryService.equipItem('char-1', 'user-1', 'item-1'),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('unequipItemById', () => {
    it('should throw error when character not found', async () => {
      (mockPrisma.character.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        inventoryService.unequipItemById('char-1', 'user-1', 'item-1'),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw error when item is not equipped', async () => {
      const mockCharacter = {
        id: 'char-1',
        userId: 'user-1',
        currentGameId: null,
        equippedItems: [],
      };

      (mockPrisma.character.findUnique as jest.Mock).mockResolvedValue(
        mockCharacter,
      );

      await expect(
        inventoryService.unequipItemById('char-1', 'user-1', 'item-1'),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('useItem', () => {
    it('should throw error when item is not equipped', async () => {
      (mockPrisma.characterEquipment.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        inventoryService.useItem('char-1', 'item-1'),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw error when item is already consumed', async () => {
      const mockEquipment = {
        characterId: 'char-1',
        itemId: 'item-1',
        item: {
          id: 'item-1',
          name: 'Healing Potion',
          usageType: 'CONSUMED',
          effects: [],
          triggers: [],
          rarity: 'COMMON',
        },
      };

      const mockItemState = {
        characterId: 'char-1',
        itemId: 'item-1',
        state: 'CONSUMED',
        usesRemaining: 0,
      };

      (mockPrisma.characterEquipment.findFirst as jest.Mock).mockResolvedValue(
        mockEquipment,
      );
      (mockPrisma.characterItemState.findUnique as jest.Mock).mockResolvedValue(
        mockItemState,
      );

      await expect(
        inventoryService.useItem('char-1', 'item-1'),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw error when item is already spent', async () => {
      const mockEquipment = {
        characterId: 'char-1',
        itemId: 'item-1',
        item: {
          id: 'item-1',
          name: 'Shield',
          usageType: 'SPENT',
          effects: [],
          triggers: [],
          rarity: 'COMMON',
        },
      };

      const mockItemState = {
        characterId: 'char-1',
        itemId: 'item-1',
        state: 'SPENT',
        usesRemaining: 0,
      };

      (mockPrisma.characterEquipment.findFirst as jest.Mock).mockResolvedValue(
        mockEquipment,
      );
      (mockPrisma.characterItemState.findUnique as jest.Mock).mockResolvedValue(
        mockItemState,
      );

      await expect(
        inventoryService.useItem('char-1', 'item-1'),
      ).rejects.toThrow(ValidationError);
    });

    it('should allow using persistent items (they stay READY)', async () => {
      const mockEquipment = {
        characterId: 'char-1',
        itemId: 'item-1',
        item: {
          id: 'item-1',
          name: 'Permanent Armor',
          usageType: 'PERSISTENT',
          effects: [{ type: 'defense', value: 1 }],
          triggers: [],
          rarity: 'COMMON',
        },
      };

      const mockItemState = {
        characterId: 'char-1',
        itemId: 'item-1',
        state: 'READY',
        usesRemaining: null,
      };

      (mockPrisma.characterEquipment.findFirst as jest.Mock).mockResolvedValue(
        mockEquipment,
      );
      (mockPrisma.characterItemState.findUnique as jest.Mock).mockResolvedValue(
        mockItemState,
      );
      (mockPrisma.characterItemState.update as jest.Mock).mockResolvedValue({
        ...mockItemState,
        state: 'READY',
      });

      const result = await inventoryService.useItem('char-1', 'item-1');

      // Persistent items can be used but stay in READY state
      expect(result.newState.state).toBe('ready');
      expect(result.item.name).toBe('Permanent Armor');
    });
  });

  describe('refreshSpentItems', () => {
    it('should refresh spent items back to ready', async () => {
      const mockItemStates = [
        {
          id: 'state-1',
          characterId: 'char-1',
          itemId: 'item-1',
          state: 'SPENT',
          usesRemaining: 0,
          item: {
            id: 'item-1',
            name: 'Shield',
            maxUses: 1,
            usageType: 'SPENT',
          },
        },
      ];

      (mockPrisma.characterItemState.findMany as jest.Mock).mockResolvedValue(
        mockItemStates,
      );
      (mockPrisma.characterItemState.update as jest.Mock).mockResolvedValue({
        ...mockItemStates[0],
        state: 'READY',
        usesRemaining: 1,
      });

      const result = await inventoryService.refreshSpentItems('char-1');

      expect(result.refreshedItems).toHaveLength(1);
      expect(result.refreshedItems[0].itemName).toBe('Shield');
    });

    it('should not refresh consumed items', async () => {
      const mockItemStates = [
        {
          id: 'state-1',
          characterId: 'char-1',
          itemId: 'item-1',
          state: 'SPENT',
          usesRemaining: 0,
          item: {
            id: 'item-1',
            name: 'Potion',
            maxUses: 1,
            usageType: 'CONSUMED', // Not SPENT, so won't refresh
          },
        },
      ];

      (mockPrisma.characterItemState.findMany as jest.Mock).mockResolvedValue(
        mockItemStates,
      );

      const result = await inventoryService.refreshSpentItems('char-1');

      expect(result.refreshedItems).toHaveLength(0);
    });

    it('should return empty array when no items to refresh', async () => {
      (mockPrisma.characterItemState.findMany as jest.Mock).mockResolvedValue(
        [],
      );

      const result = await inventoryService.refreshSpentItems('char-1');

      expect(result.refreshedItems).toHaveLength(0);
    });
  });

  describe('refreshAllItems', () => {
    it('should refresh all non-ready items', async () => {
      const mockItemStates = [
        {
          id: 'state-1',
          characterId: 'char-1',
          itemId: 'item-1',
          state: 'SPENT',
          usesRemaining: 0,
          item: { id: 'item-1', name: 'Shield', maxUses: 1, usageType: 'SPENT' },
        },
        {
          id: 'state-2',
          characterId: 'char-1',
          itemId: 'item-2',
          state: 'CONSUMED',
          usesRemaining: 0,
          item: {
            id: 'item-2',
            name: 'Potion',
            maxUses: 1,
            usageType: 'CONSUMED',
          },
        },
      ];

      (mockPrisma.characterItemState.findMany as jest.Mock).mockResolvedValue(
        mockItemStates,
      );
      (mockPrisma.characterItemState.update as jest.Mock).mockResolvedValue({});

      const result = await inventoryService.refreshAllItems('char-1');

      // Both items should be refreshed
      expect(result.refreshedItems).toHaveLength(2);
      expect(mockPrisma.characterItemState.update).toHaveBeenCalledTimes(2);
    });
  });
});
