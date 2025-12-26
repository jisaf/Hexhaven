/**
 * Frontend Shop Service (Issue #331)
 * API client for campaign shop operations
 */

import { authService } from './auth.service';
import { getApiUrl } from '../config/api';

// Re-export shared types for components that import from this service
export type {
  CampaignShopConfig,
  ShopItem,
  CampaignShopView,
  ShopTransaction,
  ShopTransactionHistory,
  PurchaseResult,
  SellResult,
  ShopTransactionType,
} from '../../../shared/types/shop';

import type {
  CampaignShopConfig,
  CampaignShopView,
  ShopTransactionHistory,
  PurchaseResult,
  SellResult,
} from '../../../shared/types/shop';

// ========== DTO Types ==========

export interface PurchaseItemDto {
  characterId: string;
  itemId: string;
  quantity?: number;
}

export interface SellItemDto {
  characterId: string;
  itemId: string;
  quantity?: number;
}

export interface UpdateShopConfigDto {
  itemUnlockMode?: 'all_available' | 'prosperity_gated';
  defaultItemQuantity?: number;
  allowSelling?: boolean;
  sellPriceMultiplier?: number;
}

// ========== Service ==========

class ShopService {
  /**
   * Get shop inventory for a campaign
   */
  async getShopInventory(campaignId: string): Promise<CampaignShopView> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/campaigns/${campaignId}/shop`,
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch shop inventory');
    }

    return response.json();
  }

  /**
   * Update shop configuration
   */
  async updateShopConfig(
    campaignId: string,
    config: UpdateShopConfigDto,
  ): Promise<CampaignShopView> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/campaigns/${campaignId}/shop/config`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update shop config');
    }

    return response.json();
  }

  /**
   * Purchase an item from the shop
   */
  async purchaseItem(
    campaignId: string,
    dto: PurchaseItemDto,
  ): Promise<PurchaseResult> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/campaigns/${campaignId}/shop/purchase`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dto),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to purchase item');
    }

    return response.json();
  }

  /**
   * Sell an item back to the shop
   */
  async sellItem(campaignId: string, dto: SellItemDto): Promise<SellResult> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/campaigns/${campaignId}/shop/sell`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dto),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to sell item');
    }

    return response.json();
  }

  /**
   * Get transaction history for a campaign
   */
  async getTransactionHistory(
    campaignId: string,
  ): Promise<ShopTransactionHistory> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/campaigns/${campaignId}/shop/transactions`,
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch transaction history');
    }

    return response.json();
  }

  /**
   * Get transaction history for a specific character
   */
  async getCharacterTransactionHistory(
    campaignId: string,
    characterId: string,
  ): Promise<ShopTransactionHistory> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/campaigns/${campaignId}/shop/character/${characterId}/transactions`,
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch character transactions');
    }

    return response.json();
  }

  /**
   * Restock all items in the shop to initial quantities
   */
  async restockItems(campaignId: string): Promise<CampaignShopView> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/campaigns/${campaignId}/shop/restock`,
      {
        method: 'POST',
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to restock items');
    }

    return response.json();
  }

  /**
   * Calculate sell price for an item
   * (client-side calculation based on shop config)
   */
  calculateSellPrice(itemCost: number, config: CampaignShopConfig): number {
    const multiplier = config.sellPriceMultiplier ?? 0.5;
    return Math.floor(itemCost * multiplier);
  }
}

// Export singleton instance
export const shopService = new ShopService();
