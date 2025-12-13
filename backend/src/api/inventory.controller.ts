/**
 * Inventory Controller (Issue #205 - Sprint 2)
 *
 * REST API endpoints for character inventory management:
 * - GET /api/characters/:characterId/inventory - Get inventory with equipped items
 * - POST /api/characters/:characterId/inventory/:itemId - Add item to inventory (purchase)
 * - DELETE /api/characters/:characterId/inventory/:itemId - Remove item from inventory (sell)
 * - POST /api/characters/:characterId/equip/:itemId - Equip an item
 * - DELETE /api/characters/:characterId/equip/:slot - Unequip an item
 * - POST /api/characters/:characterId/use-item/:itemId - Use an equipped item
 *
 * Note: Error handling is delegated to the global HttpExceptionFilter which handles
 * NotFoundError, ValidationError, ConflictError, etc. from types/errors.ts
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { InventoryService } from '../services/inventory.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { JwtPayload } from '../types/auth.types';
import { ItemSlot } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

@Controller('api/characters')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  /**
   * GET /api/characters/:characterId/inventory
   * Get character's full inventory with item details
   */
  @Get(':characterId/inventory')
  @UseGuards(JwtAuthGuard)
  async getInventory(
    @Req() req: AuthenticatedRequest,
    @Param('characterId') characterId: string,
  ) {
    return await this.inventoryService.getInventory(
      characterId,
      req.user.userId,
    );
  }

  /**
   * GET /api/characters/:characterId/equipped
   * Get all equipped items with their current states
   */
  @Get(':characterId/equipped')
  @UseGuards(JwtAuthGuard)
  async getEquippedItems(@Param('characterId') characterId: string) {
    const equipped =
      await this.inventoryService.getEquippedItemsWithDetails(characterId);
    return { equipped };
  }

  /**
   * POST /api/characters/:characterId/inventory/:itemId
   * Add an item to character's inventory (purchase)
   *
   * Query params:
   * - deductGold: boolean (default true) - Whether to deduct gold for purchase
   */
  @Post(':characterId/inventory/:itemId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async addToInventory(
    @Req() req: AuthenticatedRequest,
    @Param('characterId') characterId: string,
    @Param('itemId') itemId: string,
    @Query('deductGold') deductGold?: string,
  ) {
    const shouldDeductGold = deductGold !== 'false';
    const result = await this.inventoryService.addToInventory(
      characterId,
      req.user.userId,
      itemId,
      shouldDeductGold,
    );
    return {
      ...result,
      message: 'Item added to inventory',
    };
  }

  /**
   * DELETE /api/characters/:characterId/inventory/:itemId
   * Remove an item from character's inventory (sell)
   *
   * Query params:
   * - refundGold: boolean (default true) - Whether to refund half the gold
   */
  @Delete(':characterId/inventory/:itemId')
  @UseGuards(JwtAuthGuard)
  async removeFromInventory(
    @Req() req: AuthenticatedRequest,
    @Param('characterId') characterId: string,
    @Param('itemId') itemId: string,
    @Query('refundGold') refundGold?: string,
  ) {
    const shouldRefundGold = refundGold !== 'false';
    const result = await this.inventoryService.removeFromInventory(
      characterId,
      req.user.userId,
      itemId,
      shouldRefundGold,
    );
    return {
      ...result,
      message: 'Item removed from inventory',
    };
  }

  /**
   * POST /api/characters/:characterId/equip/:itemId
   * Equip an item from inventory
   */
  @Post(':characterId/equip/:itemId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async equipItem(
    @Req() req: AuthenticatedRequest,
    @Param('characterId') characterId: string,
    @Param('itemId') itemId: string,
  ) {
    const result = await this.inventoryService.equipItem(
      characterId,
      req.user.userId,
      itemId,
    );
    return {
      equippedItems: result.equippedItems,
      unequippedItemId: result.unequippedItemId,
      message: result.unequippedItemId
        ? 'Item equipped (previous item unequipped)'
        : 'Item equipped',
    };
  }

  /**
   * DELETE /api/characters/:characterId/equip/:slot
   * Unequip an item from a slot
   *
   * Query params:
   * - index: number (for hands/small slots with multiple items)
   */
  @Delete(':characterId/equip/:slot')
  @UseGuards(JwtAuthGuard)
  async unequipItem(
    @Req() req: AuthenticatedRequest,
    @Param('characterId') characterId: string,
    @Param('slot') slot: string,
    @Query('index') index?: string,
  ) {
    // Validate slot (this is input validation, not service-level error)
    const slotUpper = slot.toUpperCase();
    if (!Object.values(ItemSlot).includes(slotUpper as ItemSlot)) {
      throw new BadRequestException(
        `Invalid slot: ${slot}. Valid slots: ${Object.values(ItemSlot).join(', ')}`,
      );
    }

    const slotIndex = index !== undefined ? parseInt(index, 10) : undefined;

    const result = await this.inventoryService.unequipItem(
      characterId,
      req.user.userId,
      slotUpper as ItemSlot,
      slotIndex,
    );
    return {
      equippedItems: result.equippedItems,
      unequippedItemId: result.unequippedItemId,
      message: 'Item unequipped',
    };
  }

  /**
   * POST /api/characters/:characterId/use-item/:itemId
   * Use an equipped item during gameplay
   */
  @Post(':characterId/use-item/:itemId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async useItem(
    @Param('characterId') characterId: string,
    @Param('itemId') itemId: string,
  ) {
    const result = await this.inventoryService.useItem(characterId, itemId);
    return {
      item: result.item,
      newState: result.newState,
      effects: result.effects,
      message: 'Item used',
    };
  }

  /**
   * POST /api/characters/:characterId/refresh-items
   * Refresh spent items (for long rest or scenario end)
   *
   * Query params:
   * - trigger: 'long_rest' | 'scenario_end' (default 'long_rest')
   */
  @Post(':characterId/refresh-items')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async refreshItems(
    @Param('characterId') characterId: string,
    @Query('trigger') trigger?: string,
  ) {
    const isScenarioEnd = trigger === 'scenario_end';
    const result = isScenarioEnd
      ? await this.inventoryService.refreshAllItems(characterId)
      : await this.inventoryService.refreshSpentItems(characterId);

    return {
      refreshedItems: result.refreshedItems,
      trigger: isScenarioEnd ? 'scenario_end' : 'long_rest',
      message: `${result.refreshedItems.length} item(s) refreshed`,
    };
  }
}
