/**
 * Shared Shop Types (Issue #328 - Campaign Shop System)
 * Types shared between frontend and backend for shop functionality
 */

import { ItemRarity, ItemSlot } from './entities';

export type ShopTransactionType = 'BUY' | 'SELL';

/**
 * Campaign shop configuration
 */
export interface CampaignShopConfig {
  itemUnlockMode: 'all_available' | 'prosperity_gated';
  prosperityUnlocks?: {
    [prosperityLevel: number]: ItemRarity[];
  };
  itemQuantityOverrides?: {
    [itemId: string]: number;
  };
  defaultItemQuantity?: number;
  allowSelling?: boolean;
  /** Sell price multiplier (0.0 - 1.0, default: 0.5 = half price) */
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
  rarity: ItemRarity;
  slot: ItemSlot;
  quantity: number;
  initialQuantity: number;
  isAvailable: boolean;
  lastRestockedAt?: Date | string;
}

/**
 * Campaign shop view
 */
export interface CampaignShopView {
  campaignId: string;
  inventory: ShopItem[];
  config: CampaignShopConfig;
  totalItems: number;
  availableItems: number;
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

/**
 * Transaction history with aggregates
 */
export interface ShopTransactionHistory {
  transactions: ShopTransaction[];
  totalCount: number;
  totalGoldSpent: number;
  totalGoldEarned: number;
}

/**
 * Purchase result response
 */
export interface PurchaseResult {
  success: boolean;
  item: ShopItem;
  goldSpent: number;
  characterGoldRemaining: number;
  transaction: ShopTransaction;
}

/**
 * Sell result response
 */
export interface SellResult {
  success: boolean;
  itemId: string;
  itemName: string;
  goldEarned: number;
  characterGoldRemaining: number;
  transaction: ShopTransaction;
}
