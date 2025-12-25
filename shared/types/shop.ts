/**
 * Shared Shop Types (Issue #328 - Campaign Shop System)
 * Types shared between frontend and backend for shop functionality
 */

import { Rarity } from '@prisma/client';

export type ShopTransactionType = 'BUY' | 'SELL';

/**
 * Campaign shop configuration
 */
export interface CampaignShopConfig {
  itemUnlockMode: 'all_available' | 'prosperity_gated';
  prosperityUnlocks?: {
    [prosperityLevel: number]: Rarity[];
  };
  itemQuantityOverrides?: {
    [itemId: string]: number;
  };
  defaultItemQuantity?: number;
  allowSelling?: boolean;
  sellPriceMultiplier?: number;
}

/**
 * Shop item for display
 */
export interface ShopItem {
  id: string;
  itemId: string;
  itemName: string;
  cost: number;
  rarity: Rarity;
  quantity: number;
  isAvailable: boolean;
}

/**
 * Campaign shop view
 */
export interface CampaignShopView {
  campaignId: string;
  inventory: ShopItem[];
  config: CampaignShopConfig;
}

/**
 * Shop transaction record
 */
export interface ShopTransaction {
  id: string;
  campaignId: string;
  characterId: string;
  itemId: string;
  itemName: string;
  transactionType: ShopTransactionType;
  goldAmount: number;
  quantity: number;
  createdAt: string | Date;
}
