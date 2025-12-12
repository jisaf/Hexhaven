/**
 * Items Controller (Issue #205)
 *
 * REST API endpoints for item management:
 * - GET /api/items - List all items (public)
 * - GET /api/items/:id - Get item details (public)
 * - POST /api/items - Create a new item (requires creator/admin role)
 * - PUT /api/items/:id - Update an item (requires creator/admin role)
 * - DELETE /api/items/:id - Delete an item (requires admin role)
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { ItemService } from '../services/item.service';
import { CreatorGuard, AdminGuard } from '../guards/creator.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import {
  CreateItemDto,
  UpdateItemDto,
  ItemFilters,
  ItemSlot,
  ItemUsageType,
  Rarity,
} from '../types/item.types';
import { JwtPayload } from '../types/auth.types';

// Extend Express Request to include user from JWT
interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

@Controller('api/items')
export class ItemsController {
  private itemService: ItemService;

  constructor() {
    this.itemService = new ItemService();
  }

  /**
   * GET /api/items
   * List all items with optional filters (public endpoint)
   *
   * Query params:
   * - slot: ItemSlot (HEAD, BODY, LEGS, ONE_HAND, TWO_HAND, SMALL)
   * - rarity: Rarity (COMMON, UNCOMMON, RARE, EPIC, LEGENDARY)
   * - usageType: ItemUsageType (PERSISTENT, SPENT, CONSUMED)
   * - minCost: number
   * - maxCost: number
   * - search: string (name search)
   */
  @Get()
  async listItems(
    @Query('slot') slot?: string,
    @Query('rarity') rarity?: string,
    @Query('usageType') usageType?: string,
    @Query('minCost') minCost?: string,
    @Query('maxCost') maxCost?: string,
    @Query('search') search?: string,
  ) {
    const filters: ItemFilters = {};

    // Parse slot filter
    if (slot && Object.values(ItemSlot).includes(slot as ItemSlot)) {
      filters.slot = slot as ItemSlot;
    }

    // Parse rarity filter
    if (rarity && Object.values(Rarity).includes(rarity as Rarity)) {
      filters.rarity = rarity as Rarity;
    }

    // Parse usageType filter
    if (usageType && Object.values(ItemUsageType).includes(usageType as ItemUsageType)) {
      filters.usageType = usageType as ItemUsageType;
    }

    // Parse cost filters
    if (minCost) {
      const min = parseInt(minCost, 10);
      if (!isNaN(min) && min >= 0) {
        filters.minCost = min;
      }
    }

    if (maxCost) {
      const max = parseInt(maxCost, 10);
      if (!isNaN(max) && max >= 0) {
        filters.maxCost = max;
      }
    }

    // Search filter
    if (search && search.trim()) {
      filters.search = search.trim();
    }

    const items = await this.itemService.listItems(filters);

    return {
      items: items.map((item) => this.itemService.toSharedItem(item)),
      count: items.length,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    };
  }

  /**
   * GET /api/items/:id
   * Get item details by ID (public endpoint)
   */
  @Get(':id')
  async getItem(@Param('id') id: string) {
    const item = await this.itemService.getItem(id);

    if (!item) {
      throw new NotFoundException(`Item with id ${id} not found`);
    }

    return {
      item: this.itemService.toSharedItem(item),
    };
  }

  /**
   * POST /api/items
   * Create a new item (requires creator/admin role)
   */
  @Post()
  @UseGuards(CreatorGuard)
  @HttpCode(HttpStatus.CREATED)
  async createItem(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateItemDto,
  ) {
    try {
      const item = await this.itemService.createItem(req.user.userId, dto);
      return {
        item: this.itemService.toSharedItem(item),
        message: 'Item created successfully',
      };
    } catch (error: any) {
      if (error.name === 'ValidationError') {
        throw new BadRequestException(error.message, {
          cause: error,
          description: error.errors ? JSON.stringify(error.errors) : undefined,
        });
      }
      throw error;
    }
  }

  /**
   * PUT /api/items/:id
   * Update an existing item (requires creator/admin role)
   */
  @Put(':id')
  @UseGuards(CreatorGuard)
  async updateItem(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateItemDto,
  ) {
    try {
      const item = await this.itemService.updateItem(req.user.userId, id, dto);
      return {
        item: this.itemService.toSharedItem(item),
        message: 'Item updated successfully',
      };
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        throw new NotFoundException(error.message);
      }
      if (error.name === 'ValidationError') {
        throw new BadRequestException(error.message, {
          cause: error,
          description: error.errors ? JSON.stringify(error.errors) : undefined,
        });
      }
      throw error;
    }
  }

  /**
   * DELETE /api/items/:id
   * Delete an item (requires admin role)
   */
  @Delete(':id')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteItem(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    try {
      await this.itemService.deleteItem(req.user.userId, id);
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
