/**
 * Item Service (Issue #205)
 *
 * Handles CRUD operations for items with role-based access control.
 * - List/get items (public)
 * - Create/update items (requires creator or admin role)
 * - Delete items (requires admin role)
 * - Validates item effects and triggers
 */

import { Injectable, Optional } from '@nestjs/common';
import { Item, PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../db/client';
import {
  CreateItemDto,
  UpdateItemDto,
  ItemFilters,
  ItemValidationResult,
  VALID_EFFECT_TYPES,
  VALID_TRIGGER_EVENTS,
} from '../types/item.types';
import {
  Item as SharedItem,
  ItemEffect,
  ItemTrigger,
  UserRole,
} from '../../../shared/types/entities';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '../types/errors';

@Injectable()
export class ItemService {
  private prisma: PrismaClient;

  constructor(@Optional() prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
  }

  // ========== AUTHORIZATION ==========

  /**
   * Check if a user has permission to create/edit items
   */
  async canUserCreateItems(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });

    if (!user) {
      return false;
    }

    const roles = (user.roles as UserRole[]) || [];
    return roles.includes('creator') || roles.includes('admin');
  }

  /**
   * Check if a user has admin role
   */
  async isUserAdmin(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });

    if (!user) {
      return false;
    }

    const roles = (user.roles as UserRole[]) || [];
    return roles.includes('admin');
  }

  // ========== VALIDATION ==========

  /**
   * Validate item effects
   */
  validateEffects(effects: ItemEffect[]): ItemValidationResult {
    const errors: string[] = [];

    if (!Array.isArray(effects)) {
      return { valid: false, errors: ['Effects must be an array'] };
    }

    effects.forEach((effect, index) => {
      if (!effect.type) {
        errors.push(`Effect ${index}: type is required`);
      } else if (!VALID_EFFECT_TYPES.includes(effect.type as any)) {
        errors.push(
          `Effect ${index}: invalid type '${effect.type}'. Valid types: ${VALID_EFFECT_TYPES.join(', ')}`,
        );
      }

      // Validate value for numeric effects
      if (
        effect.type &&
        [
          'attack_modifier',
          'defense',
          'heal',
          'shield',
          'retaliate',
          'pierce',
          'movement',
        ].includes(effect.type)
      ) {
        if (effect.value === undefined || effect.value === null) {
          errors.push(
            `Effect ${index}: value is required for ${effect.type} effects`,
          );
        } else if (typeof effect.value !== 'number') {
          errors.push(`Effect ${index}: value must be a number`);
        }
      }
    });

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate item triggers
   */
  validateTriggers(triggers: ItemTrigger[]): ItemValidationResult {
    const errors: string[] = [];

    if (!Array.isArray(triggers)) {
      return { valid: false, errors: ['Triggers must be an array'] };
    }

    triggers.forEach((trigger, index) => {
      if (!trigger.event) {
        errors.push(`Trigger ${index}: event is required`);
      } else if (!VALID_TRIGGER_EVENTS.includes(trigger.event as any)) {
        errors.push(
          `Trigger ${index}: invalid event '${trigger.event}'. Valid events: ${VALID_TRIGGER_EVENTS.join(', ')}`,
        );
      }
    });

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate complete item data
   */
  validateItem(data: CreateItemDto): ItemValidationResult {
    const errors: string[] = [];

    // Required fields
    if (!data.name || data.name.trim().length === 0) {
      errors.push('Name is required');
    } else if (data.name.length > 100) {
      errors.push('Name must be 100 characters or less');
    }

    if (!data.slot) {
      errors.push('Slot is required');
    }

    if (!data.usageType) {
      errors.push('Usage type is required');
    }

    if (!data.rarity) {
      errors.push('Rarity is required');
    }

    if (data.cost === undefined || data.cost === null) {
      errors.push('Cost is required');
    } else if (data.cost < 0) {
      errors.push('Cost must be non-negative');
    }

    // Validate effects
    if (data.effects) {
      const effectsResult = this.validateEffects(data.effects);
      errors.push(...effectsResult.errors);
    } else {
      errors.push('Effects array is required');
    }

    // Validate triggers (optional)
    if (data.triggers && data.triggers.length > 0) {
      const triggersResult = this.validateTriggers(data.triggers);
      errors.push(...triggersResult.errors);
    }

    // Validate maxUses for non-persistent items
    if (data.usageType !== 'PERSISTENT' && data.maxUses !== undefined) {
      if (data.maxUses < 1) {
        errors.push('Max uses must be at least 1');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // ========== CRUD OPERATIONS ==========

  /**
   * Create a new item
   */
  async createItem(userId: string, data: CreateItemDto): Promise<Item> {
    // Check authorization
    const canCreate = await this.canUserCreateItems(userId);
    if (!canCreate) {
      throw new ForbiddenError('You do not have permission to create items');
    }

    // Validate item data
    const validation = this.validateItem(data);
    if (!validation.valid) {
      throw new ValidationError('Invalid item data', {
        errors: validation.errors,
      });
    }

    // Check for duplicate name
    const existing = await this.prisma.item.findUnique({
      where: { name: data.name },
    });
    if (existing) {
      throw new ValidationError('An item with this name already exists', {
        name: ['Name must be unique'],
      });
    }

    // Create item
    return this.prisma.item.create({
      data: {
        name: data.name,
        slot: data.slot,
        usageType: data.usageType,
        maxUses: data.maxUses,
        rarity: data.rarity,
        effects: data.effects as any,
        triggers: data.triggers as any,
        modifierDeckImpact: data.modifierDeckImpact as any,
        cost: data.cost,
        description: data.description,
        imageUrl: data.imageUrl,
        createdBy: userId,
      },
    });
  }

  /**
   * Get item by ID
   */
  async getItem(id: string): Promise<Item | null> {
    return this.prisma.item.findUnique({
      where: { id },
    });
  }

  /**
   * Get item by ID (throws if not found)
   */
  async getItemOrThrow(id: string): Promise<Item> {
    const item = await this.getItem(id);
    if (!item) {
      throw new NotFoundError('Item not found');
    }
    return item;
  }

  /**
   * List items with optional filters
   */
  async listItems(filters?: ItemFilters): Promise<Item[]> {
    const where: any = {};

    if (filters) {
      if (filters.slot) {
        where.slot = filters.slot;
      }
      if (filters.rarity) {
        where.rarity = filters.rarity;
      }
      if (filters.usageType) {
        where.usageType = filters.usageType;
      }
      if (filters.minCost !== undefined) {
        where.cost = { ...where.cost, gte: filters.minCost };
      }
      if (filters.maxCost !== undefined) {
        where.cost = { ...where.cost, lte: filters.maxCost };
      }
      if (filters.search) {
        where.name = { contains: filters.search, mode: 'insensitive' };
      }
    }

    return this.prisma.item.findMany({
      where,
      orderBy: [{ slot: 'asc' }, { cost: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Update an existing item
   */
  async updateItem(
    userId: string,
    id: string,
    data: UpdateItemDto,
  ): Promise<Item> {
    // Check authorization
    const canCreate = await this.canUserCreateItems(userId);
    if (!canCreate) {
      throw new ForbiddenError('You do not have permission to update items');
    }

    // Check item exists
    const existing = await this.getItemOrThrow(id);

    // If name is being changed, check for duplicates
    if (data.name && data.name !== existing.name) {
      const duplicate = await this.prisma.item.findUnique({
        where: { name: data.name },
      });
      if (duplicate) {
        throw new ValidationError('An item with this name already exists', {
          name: ['Name must be unique'],
        });
      }
    }

    // Validate effects if provided
    if (data.effects) {
      const effectsResult = this.validateEffects(data.effects);
      if (!effectsResult.valid) {
        throw new ValidationError('Invalid effects', {
          effects: effectsResult.errors,
        });
      }
    }

    // Validate triggers if provided
    if (data.triggers && data.triggers.length > 0) {
      const triggersResult = this.validateTriggers(data.triggers);
      if (!triggersResult.valid) {
        throw new ValidationError('Invalid triggers', {
          triggers: triggersResult.errors,
        });
      }
    }

    // Update item
    return this.prisma.item.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slot !== undefined && { slot: data.slot }),
        ...(data.usageType !== undefined && { usageType: data.usageType }),
        ...(data.maxUses !== undefined && { maxUses: data.maxUses }),
        ...(data.rarity !== undefined && { rarity: data.rarity }),
        ...(data.effects !== undefined && { effects: data.effects as any }),
        ...(data.triggers !== undefined && { triggers: data.triggers as any }),
        ...(data.modifierDeckImpact !== undefined && {
          modifierDeckImpact: data.modifierDeckImpact as any,
        }),
        ...(data.cost !== undefined && { cost: data.cost }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
      },
    });
  }

  /**
   * Delete an item (admin only)
   */
  async deleteItem(userId: string, id: string): Promise<void> {
    // Check authorization - only admins can delete
    const isAdmin = await this.isUserAdmin(userId);
    if (!isAdmin) {
      throw new ForbiddenError('Only administrators can delete items');
    }

    // Check item exists
    await this.getItemOrThrow(id);

    // Delete item
    await this.prisma.item.delete({
      where: { id },
    });
  }

  // ========== HELPER METHODS ==========

  /**
   * Convert Prisma Item to shared Item type
   *
   * Note: effects/triggers/modifierDeckImpact are JSON fields validated on save,
   * so we use type assertions here. These are schema-validated structures.
   */
  toSharedItem(item: Item): SharedItem {
    return {
      id: item.id,
      name: item.name,
      slot: item.slot as SharedItem['slot'],
      usageType: item.usageType as SharedItem['usageType'],
      maxUses: item.maxUses ?? undefined,
      rarity: item.rarity as SharedItem['rarity'],
      effects: (item.effects as unknown as ItemEffect[]) || [],
      triggers: (item.triggers as unknown as ItemTrigger[] | null) ?? undefined,
      modifierDeckImpact:
        (item.modifierDeckImpact as unknown as { adds: string[] } | null) ??
        undefined,
      cost: item.cost,
      description: item.description ?? undefined,
      imageUrl: item.imageUrl ?? undefined,
      createdBy: item.createdBy ?? undefined,
      createdAt: item.createdAt.toISOString(),
    };
  }

  /**
   * Get multiple items by IDs
   */
  async getItemsByIds(ids: string[]): Promise<Item[]> {
    if (ids.length === 0) {
      return [];
    }

    return this.prisma.item.findMany({
      where: {
        id: { in: ids },
      },
    });
  }
}
