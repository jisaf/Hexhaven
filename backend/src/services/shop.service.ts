/**
 * Shop Service (Issue #328 - Campaign Shop System)
 * Handles shop inventory management, purchases, sales, and transaction history
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { InventoryService } from './inventory.service';
import {
  CampaignShopConfig,
  ShopItem,
  CampaignShopView,
  ShopTransaction,
  ShopTransactionHistory,
  PurchaseResult,
  SellResult,
} from '../types/shop.types';
import { UpdateShopConfigDto } from '../types/shop.types';
import { NotFoundError, ForbiddenError } from '../types/errors';
import { Prisma, PrismaClient, Rarity, TransactionType } from '@prisma/client';
import { ItemRarity } from 'shared/types/entities';

// Map Prisma Rarity to shared ItemRarity
const toItemRarity = (rarity: Rarity): ItemRarity => rarity as ItemRarity;

interface PurchaseValidation {
  valid: boolean;
  reason?: string;
}

@Injectable()
export class ShopService {
  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
  ) {}

  /**
   * Initialize shop for a campaign
   * Creates shop inventory for all available items with default config
   */
  async initializeShopForCampaign(
    campaignId: string,
    customConfig?: Partial<CampaignShopConfig>,
  ): Promise<CampaignShopView> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundError(`Campaign with ID ${campaignId} not found`);
    }

    const shopConfig: CampaignShopConfig = {
      itemUnlockMode: 'all_available',
      defaultItemQuantity: 1,
      allowSelling: true,
      sellPriceMultiplier: 0.5,
      ...customConfig,
    };

    const items = await this.prisma.item.findMany();
    const defaultQuantity = shopConfig.defaultItemQuantity || 1;

    await this.prisma.$transaction(
      items.map((item) => {
        const overrideQuantity =
          shopConfig.itemQuantityOverrides?.[item.id] ?? defaultQuantity;

        return this.prisma.campaignShopInventory.upsert({
          where: {
            campaignId_itemId: { campaignId, itemId: item.id },
          },
          update: {
            quantity: overrideQuantity,
            initialQuantity: overrideQuantity,
          },
          create: {
            campaignId,
            itemId: item.id,
            quantity: overrideQuantity,
            initialQuantity: overrideQuantity,
          },
        });
      }),
    );

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { shopConfig: shopConfig as unknown as Prisma.JsonValue },
    });

    return this.getShopInventory(campaignId);
  }

  /**
   * Get shop inventory for a campaign with availability info
   * Auto-initializes shop if empty
   */
  async getShopInventory(campaignId: string): Promise<CampaignShopView> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { shopInventory: { include: { item: true } } },
    });

    if (!campaign) {
      throw new NotFoundError(`Campaign with ID ${campaignId} not found`);
    }

    // Auto-initialize shop if empty
    if (campaign.shopInventory.length === 0) {
      return this.initializeShopForCampaign(campaignId);
    }

    const config = (campaign.shopConfig || {
      itemUnlockMode: 'all_available',
      allowSelling: true,
      sellPriceMultiplier: 0.5,
    }) as CampaignShopConfig;

    const inventory: ShopItem[] = campaign.shopInventory.map((inv) => ({
      id: inv.id,
      itemId: inv.itemId,
      itemName: inv.item.name,
      cost: inv.item.cost,
      rarity: toItemRarity(inv.item.rarity),
      quantity: inv.quantity,
      initialQuantity: inv.initialQuantity,
      isAvailable: this.isItemAvailable(
        inv.item.rarity,
        campaign.prosperityLevel,
        config,
      ),
      lastRestockedAt: inv.lastRestockedAt,
    }));

    const availableCount = inventory.filter((item) => item.isAvailable).length;

    return {
      campaignId,
      config,
      inventory,
      totalItems: inventory.length,
      availableItems: availableCount,
    };
  }

  /**
   * Check if an item is available based on prosperity level and config
   */
  isItemAvailable(
    rarity: Rarity,
    prosperityLevel: number,
    config: CampaignShopConfig,
  ): boolean {
    if (config.itemUnlockMode === 'all_available') {
      return true;
    }

    if (config.itemUnlockMode === 'prosperity_gated') {
      if (!config.prosperityUnlocks) {
        return true;
      }

      const applicableLevels = Object.keys(config.prosperityUnlocks)
        .map(Number)
        .filter((level) => level <= prosperityLevel);

      if (applicableLevels.length === 0) {
        return false;
      }

      const highestLevel = Math.max(...applicableLevels);
      const unlockedRarities = config.prosperityUnlocks[highestLevel];

      return unlockedRarities.includes(rarity as ItemRarity);
    }

    return false;
  }

  /**
   * Update campaign shop configuration
   */
  async updateShopConfig(
    campaignId: string,
    configUpdate: UpdateShopConfigDto,
  ): Promise<CampaignShopView> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundError(`Campaign with ID ${campaignId} not found`);
    }

    const currentConfig = (campaign.shopConfig || {}) as CampaignShopConfig;
    const newConfig: CampaignShopConfig = {
      ...currentConfig,
      ...configUpdate,
    };

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { shopConfig: newConfig as unknown as Prisma.JsonValue },
    });

    return this.getShopInventory(campaignId);
  }

  /**
   * Purchase an item from the shop
   * All validation and mutations happen inside a single transaction
   */
  async purchaseItem(
    campaignId: string,
    characterId: string,
    itemId: string,
    quantity = 1,
  ): Promise<PurchaseResult> {
    return this.prisma.$transaction(async (tx) => {
      // Fetch all required data inside transaction for consistency
      const [character, shopInventory, campaign] = await Promise.all([
        tx.character.findUnique({
          where: { id: characterId },
          include: { ownedItems: true },
        }),
        tx.campaignShopInventory.findUnique({
          where: { campaignId_itemId: { campaignId, itemId } },
          include: { item: true },
        }),
        tx.campaign.findUnique({
          where: { id: campaignId },
        }),
      ]);

      if (!character) {
        throw new NotFoundError(`Character with ID ${characterId} not found`);
      }

      if (!campaign) {
        throw new NotFoundError(`Campaign ${campaignId} not found`);
      }

      // Verify character belongs to this campaign
      if (character.campaignId !== campaignId) {
        throw new ForbiddenError('Character is not part of this campaign');
      }

      if (!shopInventory) {
        throw new NotFoundError(
          `Item ${itemId} not found in shop for campaign ${campaignId}`,
        );
      }

      const config = (campaign.shopConfig || {}) as CampaignShopConfig;

      // Validate item availability
      if (
        !this.isItemAvailable(
          shopInventory.item.rarity,
          campaign.prosperityLevel,
          config,
        )
      ) {
        throw new ForbiddenError(
          `Item ${shopInventory.item.name} is not available at prosperity level ${campaign.prosperityLevel}`,
        );
      }

      // Validate purchase (stock and gold)
      const totalCost = shopInventory.item.cost * quantity;
      const validation = this.validatePurchase(
        character.gold,
        shopInventory.quantity,
        shopInventory.item.cost,
        quantity,
      );

      if (!validation.valid) {
        throw new ForbiddenError(
          validation.reason || 'Purchase validation failed',
        );
      }

      // Use InventoryService validation (DRY - shared with direct inventory operations)
      this.inventoryService.validateCanAddItem(character.ownedItems, itemId);

      // Execute purchase: reduce shop inventory
      await tx.campaignShopInventory.update({
        where: { id: shopInventory.id },
        data: { quantity: shopInventory.quantity - quantity },
      });

      // Add to character inventory using InventoryService (DRY)
      await this.inventoryService.addItemToInventoryTx(
        tx as unknown as PrismaClient,
        characterId,
        itemId,
      );

      // Deduct gold from character
      const updatedCharacter = await tx.character.update({
        where: { id: characterId },
        data: { gold: character.gold - totalCost },
      });

      // Create transaction record
      const transaction = await tx.shopTransaction.create({
        data: {
          campaignId,
          characterId,
          itemId,
          transactionType: TransactionType.BUY,
          goldAmount: totalCost,
          quantity,
        },
      });

      const shopItem: ShopItem = {
        id: shopInventory.id,
        itemId,
        itemName: shopInventory.item.name,
        cost: shopInventory.item.cost,
        rarity: toItemRarity(shopInventory.item.rarity),
        quantity: shopInventory.quantity - quantity,
        initialQuantity: shopInventory.initialQuantity,
        isAvailable: this.isItemAvailable(
          shopInventory.item.rarity,
          campaign.prosperityLevel,
          config,
        ),
        lastRestockedAt: shopInventory.lastRestockedAt,
      };

      const transactionResponse: ShopTransaction = {
        id: transaction.id,
        campaignId,
        characterId,
        itemId,
        itemName: shopInventory.item.name,
        transactionType: 'BUY',
        goldAmount: totalCost,
        quantity,
        createdAt: transaction.createdAt,
      };

      return {
        success: true,
        item: shopItem,
        goldSpent: totalCost,
        characterGoldRemaining: updatedCharacter.gold,
        transaction: transactionResponse,
      };
    });
  }

  /**
   * Sell an item back to the shop
   * All validation and mutations happen inside a single transaction
   */
  async sellItem(
    campaignId: string,
    characterId: string,
    itemId: string,
    quantity = 1,
  ): Promise<SellResult> {
    return this.prisma.$transaction(async (tx) => {
      // Fetch all required data inside transaction
      const [campaign, character, item] = await Promise.all([
        tx.campaign.findUnique({ where: { id: campaignId } }),
        tx.character.findUnique({
          where: { id: characterId },
          include: { ownedItems: true, equippedItems: true },
        }),
        tx.item.findUnique({ where: { id: itemId } }),
      ]);

      if (!campaign) {
        throw new NotFoundError(`Campaign ${campaignId} not found`);
      }

      if (!character) {
        throw new NotFoundError(`Character ${characterId} not found`);
      }

      // Verify character belongs to this campaign
      if (character.campaignId !== campaignId) {
        throw new ForbiddenError('Character is not part of this campaign');
      }

      if (!item) {
        throw new NotFoundError(`Item ${itemId} not found`);
      }

      const config = (campaign.shopConfig || {}) as CampaignShopConfig;

      if (config.allowSelling === false) {
        throw new ForbiddenError(
          'Selling items is not allowed in this campaign',
        );
      }

      // Use InventoryService validation (DRY - shared with direct inventory operations)
      // Allows selling during game for shop transactions
      const ownedItem = this.inventoryService.validateCanRemoveItem(
        character.ownedItems,
        character.equippedItems,
        itemId,
        { allowDuringGame: true },
      );

      // Calculate sell price
      const sellPrice = this.calculateSellPrice(
        item.cost,
        config.sellPriceMultiplier ?? 0.5,
      );
      const totalGoldEarned = sellPrice * quantity;

      // Remove from character inventory using InventoryService (DRY)
      await this.inventoryService.removeItemFromInventoryTx(
        tx as unknown as PrismaClient,
        ownedItem.id,
        characterId,
        itemId,
      );

      // Add gold to character
      const updatedCharacter = await tx.character.update({
        where: { id: characterId },
        data: { gold: character.gold + totalGoldEarned },
      });

      // Create transaction record
      const transaction = await tx.shopTransaction.create({
        data: {
          campaignId,
          characterId,
          itemId,
          transactionType: TransactionType.SELL,
          goldAmount: totalGoldEarned,
          quantity,
        },
      });

      // Increase shop inventory (item goes back into shop stock)
      const shopInv = await tx.campaignShopInventory.findUnique({
        where: { campaignId_itemId: { campaignId, itemId } },
      });

      if (shopInv) {
        await tx.campaignShopInventory.update({
          where: { id: shopInv.id },
          data: { quantity: shopInv.quantity + quantity },
        });
      }

      const transactionResponse: ShopTransaction = {
        id: transaction.id,
        campaignId,
        characterId,
        itemId,
        itemName: item.name,
        transactionType: 'SELL',
        goldAmount: totalGoldEarned,
        quantity,
        createdAt: transaction.createdAt,
      };

      return {
        success: true,
        itemId,
        itemName: item.name,
        goldEarned: totalGoldEarned,
        characterGoldRemaining: updatedCharacter.gold,
        transaction: transactionResponse,
      };
    });
  }

  /**
   * Get shop transaction history for a campaign
   */
  async getTransactionHistory(
    campaignId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<ShopTransactionHistory> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundError(`Campaign ${campaignId} not found`);
    }

    const [transactions, totalCount, buyStats, sellStats] = await Promise.all([
      this.prisma.shopTransaction.findMany({
        where: { campaignId },
        include: { item: true },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 100,
        skip: options?.offset || 0,
      }),
      this.prisma.shopTransaction.count({ where: { campaignId } }),
      this.prisma.shopTransaction.aggregate({
        where: { campaignId, transactionType: TransactionType.BUY },
        _sum: { goldAmount: true },
      }),
      this.prisma.shopTransaction.aggregate({
        where: { campaignId, transactionType: TransactionType.SELL },
        _sum: { goldAmount: true },
      }),
    ]);

    return {
      transactions: transactions.map((t) => ({
        id: t.id,
        campaignId: t.campaignId,
        characterId: t.characterId,
        itemId: t.itemId,
        itemName: t.item.name,
        transactionType:
          t.transactionType === TransactionType.BUY ? 'BUY' : 'SELL',
        goldAmount: t.goldAmount,
        quantity: t.quantity,
        createdAt: t.createdAt,
      })),
      totalCount,
      totalGoldSpent: buyStats._sum.goldAmount || 0,
      totalGoldEarned: sellStats._sum.goldAmount || 0,
    };
  }

  /**
   * Get transaction history for a specific character in a campaign
   */
  async getCharacterTransactionHistory(
    characterId: string,
    campaignId: string,
  ): Promise<ShopTransactionHistory> {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      throw new NotFoundError(`Character ${characterId} not found`);
    }

    const [transactions, buyStats, sellStats] = await Promise.all([
      this.prisma.shopTransaction.findMany({
        where: { characterId, campaignId },
        include: { item: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.shopTransaction.aggregate({
        where: {
          characterId,
          campaignId,
          transactionType: TransactionType.BUY,
        },
        _sum: { goldAmount: true },
      }),
      this.prisma.shopTransaction.aggregate({
        where: {
          characterId,
          campaignId,
          transactionType: TransactionType.SELL,
        },
        _sum: { goldAmount: true },
      }),
    ]);

    return {
      transactions: transactions.map((t) => ({
        id: t.id,
        campaignId: t.campaignId,
        characterId: t.characterId,
        itemId: t.itemId,
        itemName: t.item.name,
        transactionType:
          t.transactionType === TransactionType.BUY ? 'BUY' : 'SELL',
        goldAmount: t.goldAmount,
        quantity: t.quantity,
        createdAt: t.createdAt,
      })),
      totalCount: transactions.length,
      totalGoldSpent: buyStats._sum.goldAmount || 0,
      totalGoldEarned: sellStats._sum.goldAmount || 0,
    };
  }

  /**
   * Restock items to their initial quantities
   */
  async restockItems(campaignId: string): Promise<CampaignShopView> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { shopInventory: true },
    });

    if (!campaign) {
      throw new NotFoundError(`Campaign ${campaignId} not found`);
    }

    await this.prisma.$transaction(
      campaign.shopInventory.map((inv) =>
        this.prisma.campaignShopInventory.update({
          where: { id: inv.id },
          data: {
            quantity: inv.initialQuantity,
            lastRestockedAt: new Date(),
          },
        }),
      ),
    );

    return this.getShopInventory(campaignId);
  }

  /**
   * Validate a purchase
   */
  private validatePurchase(
    characterGold: number,
    shopQuantity: number,
    itemCost: number,
    quantity: number,
  ): PurchaseValidation {
    if (quantity > shopQuantity) {
      return {
        valid: false,
        reason: `Only ${shopQuantity} items available, requested ${quantity}`,
      };
    }

    const totalCost = itemCost * quantity;
    if (characterGold < totalCost) {
      return {
        valid: false,
        reason: `Insufficient gold: have ${characterGold}, need ${totalCost}`,
      };
    }

    return { valid: true };
  }

  /**
   * Calculate sell price based on item cost and multiplier
   */
  private calculateSellPrice(cost: number, multiplier: number): number {
    return Math.floor(cost * multiplier);
  }
}
