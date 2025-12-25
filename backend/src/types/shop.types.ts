/**
 * Shop Types (Issue #328 - Campaign Shop System)
 * Backend-specific DTOs and interfaces for shop operations
 */

import {
  IsUUID,
  IsOptional,
  IsNumber,
  IsPositive,
  IsEnum,
  ValidateNested,
  Type,
} from 'class-validator';
import { Rarity } from '@prisma/client';

// ========== ENUMS ==========

export enum ShopTransactionType {
  BUY = 'BUY',
  SELL = 'SELL',
}

// ========== SHOP CONFIG TYPE ==========

/**
 * Campaign Shop Configuration
 * Controls how items are available in the campaign shop
 */
export interface CampaignShopConfig {
  // Item unlock mode: 'all_available' or 'prosperity_gated'
  itemUnlockMode: 'all_available' | 'prosperity_gated';

  // Prosperity-based item availability (only used if itemUnlockMode === 'prosperity_gated')
  // Maps prosperity level (1-9) to available item rarities
  // Example: { 1: ['COMMON'], 3: ['COMMON', 'UNCOMMON'], 5: ['COMMON', 'UNCOMMON', 'RARE'] }
  prosperityUnlocks?: {
    [prosperityLevel: number]: Rarity[];
  };

  // Global item quantity overrides
  // Override base item quantities in shop inventory
  // Example: { 'item-uuid-1': 2, 'item-uuid-2': 1 }
  itemQuantityOverrides?: {
    [itemId: string]: number;
  };

  // Optional: Default quantity for items not in overrides (default: 1)
  defaultItemQuantity?: number;

  // Optional: Whether to allow selling items back to the shop
  allowSelling?: boolean;

  // Optional: Sell price multiplier (default: 0.5 = half price)
  sellPriceMultiplier?: number;
}

// ========== DTOs ==========

/**
 * DTO for initializing campaign shop inventory
 * Called when campaign is created or shop is first accessed
 */
export class InitializeShopDto {
  @IsUUID()
  campaignId!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  shopConfig?: CampaignShopConfig;
}

/**
 * DTO for updating shop inventory item quantity
 */
export class UpdateShopInventoryDto {
  @IsUUID()
  itemId!: string;

  @IsNumber()
  @IsPositive()
  quantity!: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  initialQuantity?: number;
}

/**
 * DTO for purchasing an item from the shop
 */
export class PurchaseItemDto {
  @IsUUID()
  itemId!: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  quantity?: number; // Default: 1, for future bulk purchases
}

/**
 * DTO for selling an item back to the shop
 */
export class SellItemDto {
  @IsUUID()
  itemId!: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  quantity?: number; // Default: 1, for future bulk sales
}

/**
 * DTO for updating campaign shop configuration
 */
export class UpdateShopConfigDto {
  @IsOptional()
  @IsEnum(['all_available', 'prosperity_gated'])
  itemUnlockMode?: 'all_available' | 'prosperity_gated';

  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  prosperityUnlocks?: { [key: number]: Rarity[] };

  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  itemQuantityOverrides?: { [itemId: string]: number };

  @IsOptional()
  @IsNumber()
  @IsPositive()
  defaultItemQuantity?: number;

  @IsOptional()
  allowSelling?: boolean;

  @IsOptional()
  @IsNumber()
  sellPriceMultiplier?: number;
}

// ========== RESPONSE TYPES ==========

/**
 * Shop inventory item response
 */
export interface ShopInventoryItem {
  id: string;
  itemId: string;
  itemName: string;
  cost: number;
  rarity: Rarity;
  quantity: number;
  initialQuantity: number;
  isAvailable: boolean; // Based on prosperity level and config
  lastRestockedAt: Date;
}

/**
 * Campaign shop response
 */
export interface CampaignShop {
  campaignId: string;
  config: CampaignShopConfig;
  inventory: ShopInventoryItem[];
  totalItems: number;
  availableItems: number;
}

/**
 * Shop transaction response
 */
export interface ShopTransactionResponse {
  id: string;
  campaignId: string;
  characterId: string;
  itemId: string;
  itemName: string;
  transactionType: ShopTransactionType;
  goldAmount: number;
  quantity: number;
  createdAt: Date;
}

/**
 * Transaction history response
 */
export interface ShopTransactionHistory {
  transactions: ShopTransactionResponse[];
  totalCount: number;
  totalGoldSpent: number;
  totalGoldEarned: number;
}

/**
 * Purchase result response
 */
export interface PurchaseResult {
  success: boolean;
  item: ShopInventoryItem;
  goldSpent: number;
  characterGoldRemaining: number;
  transaction: ShopTransactionResponse;
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
  transaction: ShopTransactionResponse;
}
