/**
 * Shop Types (Issue #328 - Campaign Shop API)
 * Backend-specific DTOs for shop operations
 * Core types are imported from shared
 */

import {
  IsUUID,
  IsOptional,
  IsNumber,
  IsPositive,
  IsEnum,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';

// Re-export shared types for convenience
export type {
  ShopTransactionType,
  CampaignShopConfig,
  ShopItem,
  CampaignShopView,
  ShopTransaction,
  ShopTransactionHistory,
  PurchaseResult,
  SellResult,
} from '../../../shared/types/shop';

// ========== DTOs ==========

/**
 * DTO for purchasing an item from the shop
 */
export class PurchaseItemDto {
  @IsUUID()
  characterId!: string;

  @IsUUID()
  itemId!: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  quantity?: number; // Default: 1
}

/**
 * DTO for selling an item back to the shop
 */
export class SellItemDto {
  @IsUUID()
  characterId!: string;

  @IsUUID()
  itemId!: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  quantity?: number; // Default: 1
}

/**
 * DTO for updating campaign shop configuration
 */
export class UpdateShopConfigDto {
  @IsOptional()
  @IsEnum(['all_available', 'prosperity_gated'])
  itemUnlockMode?: 'all_available' | 'prosperity_gated';

  @IsOptional()
  @IsNumber()
  @IsPositive()
  defaultItemQuantity?: number;

  @IsOptional()
  @IsBoolean()
  allowSelling?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  sellPriceMultiplier?: number;
}
