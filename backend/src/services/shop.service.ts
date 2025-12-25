/**
 * Shop Service (Issue #328 - Campaign Shop System)
 * Handles shop inventory management, purchases, sales, and transaction history
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { InventoryService } from './inventory.service';
import { ItemService } from './item.service';
import {
  CampaignShopConfig,
  InitializeShopDto,
  ShopInventoryItem,
  CampaignShop,
  ShopTransactionResponse,
  ShopTransactionHistory,
  PurchaseResult,
  SellResult,
  ShopTransactionType,
  UpdateShopConfigDto,
} from '../types/shop.types';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../types/errors';
import { Prisma, Rarity, TransactionType } from '@prisma/client';

interface PurchaseValidation {
  valid: boolean;
  reason?: string;
}

interface ShopInventoryRecord {
  id: string;
  campaignId: string;
  itemId: string;
  quantity: number;
  initialQuantity: number;
  lastRestockedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  item: {
    name: string;
    cost: number;
    rarity: Rarity;
  };
}

@Injectable()
export class ShopService {
  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
    private itemService: ItemService,
  ) {}

  /**
   * Initialize shop for a campaign
   * Creates shop inventory for all available items with default config
   */
  async initializeShopForCampaign(
    campaignId: string,
    customConfig?: CampaignShopConfig,
  ): Promise<CampaignShop> {
    // Verify campaign exists
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundError(`Campaign with ID ${campaignId} not found`);
    }

    // Default config
    const shopConfig: CampaignShopConfig = customConfig || {
      itemUnlockMode: 'all_available',
      defaultItemQuantity: 1,
      allowSelling: true,
      sellPriceMultiplier: 0.5,
    };

    // Get all items
    const items = await this.prisma.item.findMany();

    // Create shop inventory for each item
    const defaultQuantity = shopConfig.defaultItemQuantity || 1;

    // Use transaction to create all inventory records atomically
    await this.prisma.$transaction(
      items.map((item) => {
        const overrideQuantity =
          shopConfig.itemQuantityOverrides?.[item.id] ?? defaultQuantity;

        return this.prisma.campaignShopInventory.upsert({
          where: {
            campaignId_itemId: {
              campaignId,
              itemId: item.id,
            },
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

    // Update campaign config
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { shopConfig: shopConfig as unknown as Prisma.JsonValue },
    });

    return this.getShopInventory(campaignId);
  }

  /**
   * Get shop inventory for a campaign with availability info
   */
  async getShopInventory(campaignId: string): Promise<CampaignShop> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { shopInventory: { include: { item: true } } },
    });

    if (!campaign) {
      throw new NotFoundError(`Campaign with ID ${campaignId} not found`);
    }

    const config = campaign.shopConfig as CampaignShopConfig;
    const inventoryItems = campaign.shopInventory as ShopInventoryRecord[];

    // Map to response with availability info
    const inventory: ShopInventoryItem[] = inventoryItems.map((inv) => ({
      id: inv.id,
      itemId: inv.itemId,
      itemName: inv.item.name,
      cost: inv.item.cost,
      rarity: inv.item.rarity,
      quantity: inv.quantity,
      initialQuantity: inv.initialQuantity,
      isAvailable: this.isItemAvailable(
        inv.item,
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
    item: { rarity: Rarity },
    prosperityLevel: number,
    config: CampaignShopConfig,
  ): boolean {
    if (config.itemUnlockMode === 'all_available') {
      return true;
    }

    if (config.itemUnlockMode === 'prosperity_gated') {
      if (!config.prosperityUnlocks) {
        return true; // No unlocks defined, all available
      }

      // Find the highest prosperity level unlocks at or below current level
      const applicableLevels = Object.keys(config.prosperityUnlocks)
        .map(Number)
        .filter((level) => level <= prosperityLevel);

      if (applicableLevels.length === 0) {
        return false; // No unlock level matches
      }

      const highestLevel = Math.max(...applicableLevels);
      const unlockedRarities = config.prosperityUnlocks[highestLevel];

      return unlockedRarities.includes(item.rarity);
    }

    return false;
  }

  /**
   * Update campaign shop configuration
   */
  async updateShopConfig(
    campaignId: string,
    configUpdate: UpdateShopConfigDto,
  ): Promise<CampaignShop> {
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
   */
  async purchaseItem(
    campaignId: string,
    characterId: string,
    itemId: string,
    quantity = 1,
  ): Promise<PurchaseResult> {
    // Get character for gold check
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      throw new NotFoundError(`Character with ID ${characterId} not found`);
    }

    // Get shop inventory
    const shopInventory = await this.prisma.campaignShopInventory.findUnique({
      where: {
        campaignId_itemId: { campaignId, itemId },
      },
      include: { item: true },
    });

    if (!shopInventory) {
      throw new NotFoundError(
        `Item ${itemId} not found in shop for campaign ${campaignId}`,
      );
    }

    // Get campaign for config
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundError(`Campaign ${campaignId} not found`);
    }

    const config = campaign.shopConfig as CampaignShopConfig;

    // Validate availability
    if (
      !this.isItemAvailable(
        shopInventory.item,
        campaign.prosperityLevel,
        config,
      )
    ) {
      throw new ForbiddenError(
        `Item ${shopInventory.item.name} is not available at prosperity level ${campaign.prosperityLevel}`,
      );
    }

    // Validate purchase
    const totalCost = shopInventory.item.cost * quantity;
    const validation = this.validatePurchase(
      character,
      shopInventory,
      quantity,
    );

    if (!validation.valid) {
      throw new ValidationError(
        validation.reason || 'Purchase validation failed',
      );
    }

    // Execute purchase in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Reduce shop inventory
      await tx.campaignShopInventory.update({
        where: { id: shopInventory.id },
        data: { quantity: shopInventory.quantity - quantity },
      });

      // Add to character inventory
      await this.inventoryService.addToInventory(
        characterId,
        itemId,
        quantity,
        totalCost,
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
        include: { item: true },
      });

      return {
        character: updatedCharacter,
        transaction,
      };
    });

    const item = await this.itemService.getItemOrThrow(itemId);

    return {
      success: true,
      item: {
        id: shopInventory.id,
        itemId,
        itemName: item.name,
        cost: item.cost,
        rarity: item.rarity,
        quantity: shopInventory.quantity - quantity,
        initialQuantity: shopInventory.initialQuantity,
        isAvailable: this.isItemAvailable(
          item,
          campaign.prosperityLevel,
          config,
        ),
        lastRestockedAt: shopInventory.lastRestockedAt,
      },
      goldSpent: totalCost,
      characterGoldRemaining: result.character.gold,
      transaction: {
        id: result.transaction.id,
        campaignId,
        characterId,
        itemId,
        itemName: result.transaction.item.name,
        transactionType: ShopTransactionType.BUY,
        goldAmount: totalCost,
        quantity,
        createdAt: result.transaction.createdAt,
      },
    };
  }

  /**
   * Sell an item back to the shop
   */
  async sellItem(
    campaignId: string,
    characterId: string,
    itemId: string,
    quantity = 1,
  ): Promise<SellResult> {
    // Get campaign for config
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundError(`Campaign ${campaignId} not found`);
    }

    const config = campaign.shopConfig as CampaignShopConfig;

    if (!config.allowSelling) {
      throw new ForbiddenError('Selling items is not allowed in this campaign');
    }

    // Get character
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      throw new NotFoundError(`Character ${characterId} not found`);
    }

    // Get item
    const item = await this.itemService.getItemOrThrow(itemId);

    // Calculate sell price
    const sellPrice = this.calculateSellPrice(
      item.cost,
      config.sellPriceMultiplier || 0.5,
    );
    const totalGoldEarned = sellPrice * quantity;

    // Execute sale in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Remove from character inventory
      await this.inventoryService.removeFromInventory(
        characterId,
        itemId,
        quantity,
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
        include: { item: true },
      });

      // Increase shop inventory
      const shopInv = await tx.campaignShopInventory.findUnique({
        where: {
          campaignId_itemId: { campaignId, itemId },
        },
      });

      if (shopInv) {
        await tx.campaignShopInventory.update({
          where: { id: shopInv.id },
          data: { quantity: shopInv.quantity + quantity },
        });
      }

      return {
        character: updatedCharacter,
        transaction,
      };
    });

    return {
      success: true,
      itemId,
      itemName: item.name,
      goldEarned: totalGoldEarned,
      characterGoldRemaining: result.character.gold,
      transaction: {
        id: result.transaction.id,
        campaignId,
        characterId,
        itemId,
        itemName: result.transaction.item.name,
        transactionType: ShopTransactionType.SELL,
        goldAmount: totalGoldEarned,
        quantity,
        createdAt: result.transaction.createdAt,
      },
    };
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

    const transactions = await this.prisma.shopTransaction.findMany({
      where: { campaignId },
      include: { item: true },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 100,
      skip: options?.offset || 0,
    });

    const totalCount = await this.prisma.shopTransaction.count({
      where: { campaignId },
    });

    const totalGoldSpent = transactions
      .filter((t) => t.transactionType === TransactionType.BUY)
      .reduce((sum, t) => sum + t.goldAmount, 0);

    const totalGoldEarned = transactions
      .filter((t) => t.transactionType === TransactionType.SELL)
      .reduce((sum, t) => sum + t.goldAmount, 0);

    return {
      transactions: transactions.map((t) => ({
        id: t.id,
        campaignId: t.campaignId,
        characterId: t.characterId,
        itemId: t.itemId,
        itemName: t.item.name,
        transactionType:
          t.transactionType === TransactionType.BUY
            ? ShopTransactionType.BUY
            : ShopTransactionType.SELL,
        goldAmount: t.goldAmount,
        quantity: t.quantity,
        createdAt: t.createdAt,
      })),
      totalCount,
      totalGoldSpent,
      totalGoldEarned,
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

    const transactions = await this.prisma.shopTransaction.findMany({
      where: { characterId, campaignId },
      include: { item: true },
      orderBy: { createdAt: 'desc' },
    });

    const totalGoldSpent = transactions
      .filter((t) => t.transactionType === TransactionType.BUY)
      .reduce((sum, t) => sum + t.goldAmount, 0);

    const totalGoldEarned = transactions
      .filter((t) => t.transactionType === TransactionType.SELL)
      .reduce((sum, t) => sum + t.goldAmount, 0);

    return {
      transactions: transactions.map((t) => ({
        id: t.id,
        campaignId: t.campaignId,
        characterId: t.characterId,
        itemId: t.itemId,
        itemName: t.item.name,
        transactionType:
          t.transactionType === TransactionType.BUY
            ? ShopTransactionType.BUY
            : ShopTransactionType.SELL,
        goldAmount: t.goldAmount,
        quantity: t.quantity,
        createdAt: t.createdAt,
      })),
      totalCount: transactions.length,
      totalGoldSpent,
      totalGoldEarned,
    };
  }

  /**
   * Restock items to their initial quantities
   */
  async restockItems(campaignId: string): Promise<CampaignShop> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { shopInventory: true },
    });

    if (!campaign) {
      throw new NotFoundError(`Campaign ${campaignId} not found`);
    }

    // Reset all items to initial quantity
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
    character: { gold: number },
    shopInventory: { quantity: number; item: { cost: number } },
    quantity: number,
  ): PurchaseValidation {
    // Check quantity available
    if (quantity > shopInventory.quantity) {
      return {
        valid: false,
        reason: `Only ${shopInventory.quantity} items available, requested ${quantity}`,
      };
    }

    // Check gold
    const totalCost = shopInventory.item.cost * quantity;
    if (character.gold < totalCost) {
      return {
        valid: false,
        reason: `Insufficient gold: have ${character.gold}, need ${totalCost}`,
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
