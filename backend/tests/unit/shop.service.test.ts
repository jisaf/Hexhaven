/**
 * ShopService Unit Tests (Issue #328)
 * Comprehensive tests for shop operations: purchase, sell, inventory, transactions
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ShopService } from '../../src/services/shop.service';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../../src/types/errors';
import { Rarity, TransactionType } from '@prisma/client';

describe('ShopService', () => {
  let service: ShopService;
  let mockPrisma: any;
  let mockTx: any;
  let mockInventoryService: any;

  const mockCampaign = {
    id: 'campaign-1',
    prosperityLevel: 3,
    shopConfig: {
      itemUnlockMode: 'all_available',
      allowSelling: true,
      sellPriceMultiplier: 0.5,
    },
    shopInventory: [],
    characters: [],
  };

  const mockCharacter = {
    id: 'char-1',
    userId: 'user-1',
    campaignId: 'campaign-1',
    gold: 100,
    ownedItems: [],
    equippedItems: [],
  };

  const mockItem = {
    id: 'item-1',
    name: 'Health Potion',
    cost: 20,
    rarity: Rarity.COMMON,
  };

  const mockShopInventory = {
    id: 'shop-inv-1',
    campaignId: 'campaign-1',
    itemId: 'item-1',
    quantity: 5,
    initialQuantity: 5,
    lastRestockedAt: new Date(),
    item: mockItem,
  };

  beforeEach(() => {
    // Create mock transaction context
    mockTx = {
      character: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      campaign: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      campaignShopInventory: {
        findUnique: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      characterInventory: {
        create: jest.fn(),
        delete: jest.fn(),
      },
      characterItemState: {
        deleteMany: jest.fn(),
      },
      shopTransaction: {
        create: jest.fn(),
      },
      item: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };

    mockPrisma = {
      campaign: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      campaignShopInventory: {
        findUnique: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      character: {
        findUnique: jest.fn(),
      },
      shopTransaction: {
        findMany: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
      item: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => {
        if (typeof callback === 'function') {
          return callback(mockTx);
        }
        return Promise.all(callback);
      }),
    };

    // Mock InventoryService
    mockInventoryService = {
      validateCanAddItem: jest.fn(),
      validateCanRemoveItem: jest.fn(),
      addItemToInventoryTx: jest.fn(),
      removeItemFromInventoryTx: jest.fn(),
    };

    service = new ShopService(mockPrisma, mockInventoryService);
  });

  describe('purchaseItem()', () => {
    it('should successfully purchase an item', async () => {
      mockTx.character.findUnique.mockResolvedValue({
        ...mockCharacter,
        ownedItems: [],
      });
      mockTx.campaign.findUnique.mockResolvedValue(mockCampaign);
      mockTx.campaignShopInventory.findUnique.mockResolvedValue(
        mockShopInventory,
      );
      mockTx.campaignShopInventory.update.mockResolvedValue({
        ...mockShopInventory,
        quantity: 4,
      });
      mockTx.characterInventory.create.mockResolvedValue({
        id: 'inv-1',
        characterId: 'char-1',
        itemId: 'item-1',
      });
      mockTx.character.update.mockResolvedValue({
        ...mockCharacter,
        gold: 80,
      });
      mockTx.shopTransaction.create.mockResolvedValue({
        id: 'tx-1',
        campaignId: 'campaign-1',
        characterId: 'char-1',
        itemId: 'item-1',
        transactionType: TransactionType.BUY,
        goldAmount: 20,
        quantity: 1,
        createdAt: new Date(),
      });

      const result = await service.purchaseItem(
        'campaign-1',
        'char-1',
        'item-1',
        1,
      );

      expect(result.success).toBe(true);
      expect(result.goldSpent).toBe(20);
      expect(result.characterGoldRemaining).toBe(80);
      expect(result.transaction.transactionType).toBe('BUY');
    });

    it('should reject purchase when character not found', async () => {
      mockTx.character.findUnique.mockResolvedValue(null);
      mockTx.campaign.findUnique.mockResolvedValue(mockCampaign);
      mockTx.campaignShopInventory.findUnique.mockResolvedValue(
        mockShopInventory,
      );

      await expect(
        service.purchaseItem('campaign-1', 'char-999', 'item-1', 1),
      ).rejects.toThrow(NotFoundError);
    });

    it('should reject purchase when character not in campaign', async () => {
      mockTx.character.findUnique.mockResolvedValue({
        ...mockCharacter,
        campaignId: 'other-campaign',
      });
      mockTx.campaign.findUnique.mockResolvedValue(mockCampaign);
      mockTx.campaignShopInventory.findUnique.mockResolvedValue(
        mockShopInventory,
      );

      await expect(
        service.purchaseItem('campaign-1', 'char-1', 'item-1', 1),
      ).rejects.toThrow(ForbiddenError);
    });

    it('should reject purchase when insufficient gold', async () => {
      mockTx.character.findUnique.mockResolvedValue({
        ...mockCharacter,
        gold: 10, // Less than item cost (20)
        ownedItems: [],
      });
      mockTx.campaign.findUnique.mockResolvedValue(mockCampaign);
      mockTx.campaignShopInventory.findUnique.mockResolvedValue(
        mockShopInventory,
      );

      await expect(
        service.purchaseItem('campaign-1', 'char-1', 'item-1', 1),
      ).rejects.toThrow(ForbiddenError);
    });

    it('should reject purchase when item out of stock', async () => {
      mockTx.character.findUnique.mockResolvedValue({
        ...mockCharacter,
        ownedItems: [],
      });
      mockTx.campaign.findUnique.mockResolvedValue(mockCampaign);
      mockTx.campaignShopInventory.findUnique.mockResolvedValue({
        ...mockShopInventory,
        quantity: 0,
      });

      await expect(
        service.purchaseItem('campaign-1', 'char-1', 'item-1', 1),
      ).rejects.toThrow(ForbiddenError);
    });

    it('should reject purchase when character already owns item', async () => {
      mockTx.character.findUnique.mockResolvedValue({
        ...mockCharacter,
        ownedItems: [{ itemId: 'item-1' }],
      });
      mockTx.campaign.findUnique.mockResolvedValue(mockCampaign);
      mockTx.campaignShopInventory.findUnique.mockResolvedValue(
        mockShopInventory,
      );

      // Mock InventoryService to throw ConflictError
      mockInventoryService.validateCanAddItem.mockImplementation(() => {
        throw new ConflictError('Character already owns this item');
      });

      await expect(
        service.purchaseItem('campaign-1', 'char-1', 'item-1', 1),
      ).rejects.toThrow(ConflictError);
    });

    it('should reject purchase when item not available at prosperity level', async () => {
      mockTx.character.findUnique.mockResolvedValue({
        ...mockCharacter,
        ownedItems: [],
      });
      mockTx.campaign.findUnique.mockResolvedValue({
        ...mockCampaign,
        prosperityLevel: 1,
        shopConfig: {
          itemUnlockMode: 'prosperity_gated',
          prosperityUnlocks: {
            3: ['COMMON'], // Only available at prosperity 3
          },
        },
      });
      mockTx.campaignShopInventory.findUnique.mockResolvedValue(
        mockShopInventory,
      );

      await expect(
        service.purchaseItem('campaign-1', 'char-1', 'item-1', 1),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('sellItem()', () => {
    it('should successfully sell an item', async () => {
      const ownedItem = { id: 'owned-1', itemId: 'item-1', characterId: 'char-1' };

      mockTx.campaign.findUnique.mockResolvedValue(mockCampaign);
      mockTx.character.findUnique.mockResolvedValue({
        ...mockCharacter,
        ownedItems: [ownedItem],
        equippedItems: [],
      });
      mockTx.item.findUnique.mockResolvedValue(mockItem);
      mockTx.character.update.mockResolvedValue({
        ...mockCharacter,
        gold: 110, // 100 + 10 (half of 20)
      });
      mockTx.shopTransaction.create.mockResolvedValue({
        id: 'tx-2',
        campaignId: 'campaign-1',
        characterId: 'char-1',
        itemId: 'item-1',
        transactionType: TransactionType.SELL,
        goldAmount: 10,
        quantity: 1,
        createdAt: new Date(),
      });
      mockTx.campaignShopInventory.findUnique.mockResolvedValue(
        mockShopInventory,
      );
      mockTx.campaignShopInventory.update.mockResolvedValue({
        ...mockShopInventory,
        quantity: 6,
      });

      // Mock InventoryService to return the owned item
      mockInventoryService.validateCanRemoveItem.mockReturnValue(ownedItem);

      const result = await service.sellItem(
        'campaign-1',
        'char-1',
        'item-1',
        1,
      );

      expect(result.success).toBe(true);
      expect(result.goldEarned).toBe(10); // Half of 20
      expect(result.characterGoldRemaining).toBe(110);
      expect(result.transaction.transactionType).toBe('SELL');
    });

    it('should reject sell when character does not own item', async () => {
      mockTx.campaign.findUnique.mockResolvedValue(mockCampaign);
      mockTx.character.findUnique.mockResolvedValue({
        ...mockCharacter,
        ownedItems: [], // No items owned
        equippedItems: [],
      });
      mockTx.item.findUnique.mockResolvedValue(mockItem);

      // Mock InventoryService to throw ValidationError
      mockInventoryService.validateCanRemoveItem.mockImplementation(() => {
        throw new ValidationError('Character does not own this item');
      });

      await expect(
        service.sellItem('campaign-1', 'char-1', 'item-1', 1),
      ).rejects.toThrow(ValidationError);
    });

    it('should reject sell when item is equipped', async () => {
      const ownedItem = { id: 'owned-1', itemId: 'item-1', characterId: 'char-1' };

      mockTx.campaign.findUnique.mockResolvedValue(mockCampaign);
      mockTx.character.findUnique.mockResolvedValue({
        ...mockCharacter,
        ownedItems: [ownedItem],
        equippedItems: [{ itemId: 'item-1' }], // Item is equipped
      });
      mockTx.item.findUnique.mockResolvedValue(mockItem);

      // Mock InventoryService to throw ValidationError
      mockInventoryService.validateCanRemoveItem.mockImplementation(() => {
        throw new ValidationError('Cannot sell equipped item. Unequip it first.');
      });

      await expect(
        service.sellItem('campaign-1', 'char-1', 'item-1', 1),
      ).rejects.toThrow(ValidationError);
    });

    it('should reject sell when selling is disabled', async () => {
      mockTx.campaign.findUnique.mockResolvedValue({
        ...mockCampaign,
        shopConfig: {
          ...mockCampaign.shopConfig,
          allowSelling: false,
        },
      });
      mockTx.character.findUnique.mockResolvedValue({
        ...mockCharacter,
        ownedItems: [{ id: 'owned-1', itemId: 'item-1' }],
        equippedItems: [],
      });
      mockTx.item.findUnique.mockResolvedValue(mockItem);

      await expect(
        service.sellItem('campaign-1', 'char-1', 'item-1', 1),
      ).rejects.toThrow(ForbiddenError);
    });

    it('should reject sell when character not in campaign', async () => {
      mockTx.campaign.findUnique.mockResolvedValue(mockCampaign);
      mockTx.character.findUnique.mockResolvedValue({
        ...mockCharacter,
        campaignId: 'other-campaign',
        ownedItems: [{ id: 'owned-1', itemId: 'item-1' }],
        equippedItems: [],
      });
      mockTx.item.findUnique.mockResolvedValue(mockItem);

      await expect(
        service.sellItem('campaign-1', 'char-1', 'item-1', 1),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('isItemAvailable()', () => {
    it('should return true for all_available mode', () => {
      const config = { itemUnlockMode: 'all_available' as const };
      expect(service.isItemAvailable(Rarity.LEGENDARY, 1, config)).toBe(true);
    });

    it('should check prosperity level for prosperity_gated mode', () => {
      const config = {
        itemUnlockMode: 'prosperity_gated' as const,
        prosperityUnlocks: {
          1: ['COMMON' as const],
          3: ['COMMON' as const, 'UNCOMMON' as const],
          5: ['COMMON' as const, 'UNCOMMON' as const, 'RARE' as const],
        },
      };

      // At prosperity 1, only COMMON available
      expect(service.isItemAvailable(Rarity.COMMON, 1, config)).toBe(true);
      expect(service.isItemAvailable(Rarity.UNCOMMON, 1, config)).toBe(false);

      // At prosperity 3, COMMON and UNCOMMON available
      expect(service.isItemAvailable(Rarity.COMMON, 3, config)).toBe(true);
      expect(service.isItemAvailable(Rarity.UNCOMMON, 3, config)).toBe(true);
      expect(service.isItemAvailable(Rarity.RARE, 3, config)).toBe(false);

      // At prosperity 5, COMMON, UNCOMMON, RARE available
      expect(service.isItemAvailable(Rarity.RARE, 5, config)).toBe(true);
      expect(service.isItemAvailable(Rarity.EPIC, 5, config)).toBe(false);
    });

    it('should return true if no prosperity unlocks defined', () => {
      const config = { itemUnlockMode: 'prosperity_gated' as const };
      expect(service.isItemAvailable(Rarity.LEGENDARY, 1, config)).toBe(true);
    });
  });

  describe('getShopInventory()', () => {
    it('should return shop inventory with availability info', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue({
        ...mockCampaign,
        shopInventory: [mockShopInventory],
      });

      const result = await service.getShopInventory('campaign-1');

      expect(result.campaignId).toBe('campaign-1');
      expect(result.inventory.length).toBe(1);
      expect(result.inventory[0].itemName).toBe('Health Potion');
      expect(result.inventory[0].isAvailable).toBe(true);
      expect(result.totalItems).toBe(1);
      expect(result.availableItems).toBe(1);
    });

    it('should throw NotFoundError for non-existent campaign', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(null);

      await expect(service.getShopInventory('non-existent')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('getTransactionHistory()', () => {
    it('should return transaction history with aggregates', async () => {
      const mockTransactions = [
        {
          id: 'tx-1',
          campaignId: 'campaign-1',
          characterId: 'char-1',
          itemId: 'item-1',
          transactionType: TransactionType.BUY,
          goldAmount: 20,
          quantity: 1,
          createdAt: new Date(),
          item: mockItem,
        },
      ];

      mockPrisma.campaign.findUnique.mockResolvedValue(mockCampaign);
      mockPrisma.shopTransaction.findMany.mockResolvedValue(mockTransactions);
      mockPrisma.shopTransaction.count.mockResolvedValue(1);
      mockPrisma.shopTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { goldAmount: 20 } }) // BUY
        .mockResolvedValueOnce({ _sum: { goldAmount: 0 } }); // SELL

      const result = await service.getTransactionHistory('campaign-1');

      expect(result.transactions.length).toBe(1);
      expect(result.totalCount).toBe(1);
      expect(result.totalGoldSpent).toBe(20);
      expect(result.totalGoldEarned).toBe(0);
    });
  });

  describe('updateShopConfig()', () => {
    it('should update shop configuration', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(mockCampaign);
      mockPrisma.campaign.update.mockResolvedValue({
        ...mockCampaign,
        shopConfig: {
          ...mockCampaign.shopConfig,
          sellPriceMultiplier: 0.75,
        },
      });

      const shopInventoryResult = {
        ...mockCampaign,
        shopInventory: [mockShopInventory],
        shopConfig: {
          ...mockCampaign.shopConfig,
          sellPriceMultiplier: 0.75,
        },
      };

      mockPrisma.campaign.findUnique
        .mockResolvedValueOnce(mockCampaign)
        .mockResolvedValueOnce(shopInventoryResult);

      const result = await service.updateShopConfig('campaign-1', {
        sellPriceMultiplier: 0.75,
      });

      expect(result.config.sellPriceMultiplier).toBe(0.75);
    });
  });

  describe('restockItems()', () => {
    it('should restock all items to initial quantity', async () => {
      const depletedInventory = {
        ...mockShopInventory,
        quantity: 2, // Depleted from 5
      };

      mockPrisma.campaign.findUnique.mockResolvedValue({
        ...mockCampaign,
        shopInventory: [depletedInventory],
      });

      mockPrisma.$transaction.mockResolvedValue([
        { ...depletedInventory, quantity: 5 },
      ]);

      // Mock the getShopInventory call after restock
      mockPrisma.campaign.findUnique
        .mockResolvedValueOnce({
          ...mockCampaign,
          shopInventory: [depletedInventory],
        })
        .mockResolvedValueOnce({
          ...mockCampaign,
          shopInventory: [
            {
              ...mockShopInventory,
              quantity: 5,
              lastRestockedAt: new Date(),
            },
          ],
        });

      const result = await service.restockItems('campaign-1');

      expect(result.inventory[0].quantity).toBe(5);
    });
  });
});
