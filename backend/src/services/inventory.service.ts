/**
 * Inventory Service (Issue #205 - Sprint 2)
 *
 * Handles character inventory management using proper relational tables:
 * - CharacterInventory: Items owned by a character
 * - CharacterEquipment: Items currently equipped
 * - CharacterItemState: Runtime state of items during gameplay
 */

import { Injectable, Optional } from '@nestjs/common';
import {
  PrismaClient,
  Item,
  CharacterEquipment,
  ItemSlot,
  ItemState,
} from '@prisma/client';
import { prisma as defaultPrisma } from '../db/client';
import { ItemService } from './item.service';
import {
  EquippedItems,
  ItemRuntimeState,
  Item as SharedItem,
  ItemState as SharedItemState,
} from '../../../shared/types/entities';
import { NotFoundError, ValidationError, ConflictError } from '../types/errors';
import { getMaxSmallSlots } from '../../../shared/utils/inventory';

/**
 * Convert Prisma ItemState to shared ItemState
 */
function toSharedItemState(state: ItemState): SharedItemState {
  switch (state) {
    case 'READY':
      return SharedItemState.READY;
    case 'SPENT':
      return SharedItemState.SPENT;
    case 'CONSUMED':
      return SharedItemState.CONSUMED;
    default:
      return SharedItemState.READY;
  }
}

@Injectable()
export class InventoryService {
  private prisma: PrismaClient;
  private itemService: ItemService;

  constructor(
    @Optional() prismaClient?: PrismaClient,
    @Optional() itemServiceInstance?: ItemService,
  ) {
    this.prisma = prismaClient || defaultPrisma;
    this.itemService = itemServiceInstance || new ItemService(this.prisma);
  }

  // ========== INVENTORY QUERY METHODS ==========

  /**
   * Get character's full inventory with item details
   * @param characterId - The character's database ID
   * @param userId - Optional user ID for ownership verification (required for API calls)
   */
  async getInventory(
    characterId: string,
    userId?: string,
  ): Promise<{
    ownedItems: SharedItem[];
    equippedItems: EquippedItems;
    itemStates: Record<string, ItemRuntimeState>;
  }> {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      include: {
        ownedItems: { include: { item: true } },
        equippedItems: { include: { item: true } },
        itemStates: true,
      },
    });

    if (!character) {
      throw new NotFoundError('Character not found');
    }

    // Verify ownership if userId is provided
    if (userId && character.userId !== userId) {
      throw new NotFoundError('Character not found');
    }

    // Convert owned items
    const ownedItems = character.ownedItems.map((inv) =>
      this.itemService.toSharedItem(inv.item),
    );

    // Convert equipped items to EquippedItems structure
    const equippedItems = this.buildEquippedItems(character.equippedItems);

    // Convert item states
    const itemStates: Record<string, ItemRuntimeState> = {};
    for (const state of character.itemStates) {
      itemStates[state.itemId] = {
        state: toSharedItemState(state.state),
        usesRemaining: state.usesRemaining ?? undefined,
      };
    }

    return { ownedItems, equippedItems, itemStates };
  }

  /**
   * Build EquippedItems structure from database records
   */
  private buildEquippedItems(
    equipment: (CharacterEquipment & { item: Item })[],
  ): EquippedItems {
    const result: EquippedItems = {
      head: undefined,
      body: undefined,
      legs: undefined,
      hands: [],
      small: [],
    };

    for (const eq of equipment) {
      switch (eq.slot) {
        case 'HEAD':
          result.head = eq.itemId;
          break;
        case 'BODY':
          result.body = eq.itemId;
          break;
        case 'LEGS':
          result.legs = eq.itemId;
          break;
        case 'ONE_HAND':
        case 'TWO_HAND':
          // Sort by slotIndex to maintain order
          result.hands[eq.slotIndex] = eq.itemId;
          break;
        case 'SMALL':
          result.small[eq.slotIndex] = eq.itemId;
          break;
      }
    }

    // Filter out any undefined slots from sparse arrays
    result.hands = result.hands.filter(Boolean);
    result.small = result.small.filter(Boolean);

    return result;
  }

  /**
   * Get all equipped items with their details
   */
  async getEquippedItemsWithDetails(
    characterId: string,
  ): Promise<{ slot: string; item: SharedItem; state: ItemRuntimeState }[]> {
    const equipment = await this.prisma.characterEquipment.findMany({
      where: { characterId },
      include: { item: true },
      orderBy: [{ slot: 'asc' }, { slotIndex: 'asc' }],
    });

    const states = await this.prisma.characterItemState.findMany({
      where: { characterId },
    });
    const stateMap = new Map(states.map((s) => [s.itemId, s]));

    return equipment.map((eq) => {
      const state = stateMap.get(eq.itemId);
      let slotName: string;
      switch (eq.slot) {
        case 'ONE_HAND':
        case 'TWO_HAND':
          slotName = `hand${eq.slotIndex + 1}`;
          break;
        case 'SMALL':
          slotName = `small${eq.slotIndex + 1}`;
          break;
        default:
          slotName = eq.slot.toLowerCase();
      }

      return {
        slot: slotName,
        item: this.itemService.toSharedItem(eq.item),
        state: state
          ? {
              state: toSharedItemState(state.state),
              usesRemaining: state.usesRemaining ?? undefined,
            }
          : { state: SharedItemState.READY },
      };
    });
  }

  // ========== EQUIP/UNEQUIP METHODS ==========

  /**
   * Equip an item from inventory to the appropriate slot
   */
  async equipItem(
    characterId: string,
    userId: string,
    itemId: string,
  ): Promise<{
    equippedItems: EquippedItems;
    unequippedItemId?: string;
  }> {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      include: {
        ownedItems: true,
        equippedItems: { include: { item: true } },
      },
    });

    if (!character) {
      throw new NotFoundError('Character not found');
    }

    if (character.userId !== userId) {
      throw new NotFoundError('Character not found');
    }

    if (character.currentGameId) {
      throw new ConflictError('Cannot modify equipment during active game');
    }

    // Check item is owned
    const ownsItem = character.ownedItems.some((inv) => inv.itemId === itemId);
    if (!ownsItem) {
      throw new ValidationError('Item is not in character inventory');
    }

    // Check item isn't already equipped
    const alreadyEquipped = character.equippedItems.some(
      (eq) => eq.itemId === itemId,
    );
    if (alreadyEquipped) {
      throw new ValidationError('Item is already equipped');
    }

    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundError('Item not found');
    }

    let unequippedItemId: string | undefined;

    // Handle slot-specific equip logic
    await this.prisma.$transaction(async (tx) => {
      switch (item.slot) {
        case 'HEAD':
        case 'BODY':
        case 'LEGS': {
          // These slots only allow one item
          const existing = character.equippedItems.find(
            (eq) => eq.slot === item.slot,
          );
          if (existing) {
            unequippedItemId = existing.itemId;
            await tx.characterEquipment.delete({ where: { id: existing.id } });
          }
          await tx.characterEquipment.create({
            data: { characterId, itemId, slot: item.slot, slotIndex: 0 },
          });
          break;
        }

        case 'ONE_HAND': {
          // Check if two-hand item is equipped
          const twoHand = character.equippedItems.find(
            (eq) => eq.slot === 'TWO_HAND',
          );
          if (twoHand) {
            unequippedItemId = twoHand.itemId;
            await tx.characterEquipment.delete({ where: { id: twoHand.id } });
          }

          const hands = character.equippedItems.filter(
            (eq) => eq.slot === 'ONE_HAND',
          );
          if (hands.length >= 2) {
            // Replace first hand slot
            unequippedItemId = hands[0].itemId;
            await tx.characterEquipment.delete({ where: { id: hands[0].id } });
            await tx.characterEquipment.create({
              data: { characterId, itemId, slot: 'ONE_HAND', slotIndex: 0 },
            });
          } else {
            // Add to next available slot
            const slotIndex = hands.length;
            await tx.characterEquipment.create({
              data: { characterId, itemId, slot: 'ONE_HAND', slotIndex },
            });
          }
          break;
        }

        case 'TWO_HAND': {
          // Unequip any hand items
          const hands = character.equippedItems.filter(
            (eq) => eq.slot === 'ONE_HAND' || eq.slot === 'TWO_HAND',
          );
          if (hands.length > 0) {
            unequippedItemId = hands[0].itemId;
            for (const hand of hands) {
              await tx.characterEquipment.delete({ where: { id: hand.id } });
            }
          }
          await tx.characterEquipment.create({
            data: { characterId, itemId, slot: 'TWO_HAND', slotIndex: 0 },
          });
          break;
        }

        case 'SMALL': {
          const maxSmall = getMaxSmallSlots(character.level);
          const smalls = character.equippedItems.filter(
            (eq) => eq.slot === 'SMALL',
          );

          if (smalls.length >= maxSmall) {
            // Replace first small slot
            unequippedItemId = smalls[0].itemId;
            await tx.characterEquipment.delete({ where: { id: smalls[0].id } });
          }

          const slotIndex = smalls.length >= maxSmall ? 0 : smalls.length;
          await tx.characterEquipment.create({
            data: { characterId, itemId, slot: 'SMALL', slotIndex },
          });
          break;
        }
      }
    });

    // Fetch updated equipment
    const updatedEquipment = await this.prisma.characterEquipment.findMany({
      where: { characterId },
      include: { item: true },
    });

    return {
      equippedItems: this.buildEquippedItems(updatedEquipment),
      unequippedItemId,
    };
  }

  /**
   * Unequip an item from a slot
   */
  async unequipItem(
    characterId: string,
    userId: string,
    slot: ItemSlot,
    index?: number,
  ): Promise<{
    equippedItems: EquippedItems;
    unequippedItemId: string;
  }> {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      include: { equippedItems: { include: { item: true } } },
    });

    if (!character) {
      throw new NotFoundError('Character not found');
    }

    if (character.userId !== userId) {
      throw new NotFoundError('Character not found');
    }

    if (character.currentGameId) {
      throw new ConflictError('Cannot modify equipment during active game');
    }

    const slotIndex = index ?? 0;
    const equipment = character.equippedItems.find((eq) => {
      if (slot === 'ONE_HAND' || slot === 'TWO_HAND') {
        return (
          (eq.slot === 'ONE_HAND' || eq.slot === 'TWO_HAND') &&
          eq.slotIndex === slotIndex
        );
      }
      if (slot === 'SMALL') {
        return eq.slot === 'SMALL' && eq.slotIndex === slotIndex;
      }
      return eq.slot === slot;
    });

    if (!equipment) {
      throw new ValidationError(`No item equipped in ${slot} slot`);
    }

    await this.prisma.characterEquipment.delete({
      where: { id: equipment.id },
    });

    // Fetch updated equipment
    const updatedEquipment = await this.prisma.characterEquipment.findMany({
      where: { characterId },
      include: { item: true },
    });

    return {
      equippedItems: this.buildEquippedItems(updatedEquipment),
      unequippedItemId: equipment.itemId,
    };
  }

  /**
   * Unequip an item by its ID (finds the slot automatically)
   */
  async unequipItemById(
    characterId: string,
    userId: string,
    itemId: string,
  ): Promise<{
    equippedItems: EquippedItems;
    unequippedItemId: string;
    slot: ItemSlot;
  }> {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      include: { equippedItems: { include: { item: true } } },
    });

    if (!character) {
      throw new NotFoundError('Character not found');
    }

    if (character.userId !== userId) {
      throw new NotFoundError('Character not found');
    }

    if (character.currentGameId) {
      throw new ConflictError('Cannot modify equipment during active game');
    }

    // Find the equipment record by itemId
    const equipment = character.equippedItems.find(
      (eq) => eq.itemId === itemId,
    );

    if (!equipment) {
      throw new ValidationError('Item is not equipped');
    }

    await this.prisma.characterEquipment.delete({
      where: { id: equipment.id },
    });

    // Fetch updated equipment
    const updatedEquipment = await this.prisma.characterEquipment.findMany({
      where: { characterId },
      include: { item: true },
    });

    return {
      equippedItems: this.buildEquippedItems(updatedEquipment),
      unequippedItemId: equipment.itemId,
      slot: equipment.slot,
    };
  }

  // ========== ITEM USAGE METHODS ==========

  /**
   * Use an equipped item, transitioning its state
   */
  async useItem(
    characterId: string,
    itemId: string,
  ): Promise<{
    item: SharedItem;
    newState: ItemRuntimeState;
    effects: SharedItem['effects'];
  }> {
    // Verify item is equipped
    const equipment = await this.prisma.characterEquipment.findFirst({
      where: { characterId, itemId },
      include: { item: true },
    });

    if (!equipment) {
      throw new ValidationError('Item is not equipped');
    }

    const item = equipment.item;

    // Get or create item state
    let itemState = await this.prisma.characterItemState.findUnique({
      where: { characterId_itemId: { characterId, itemId } },
    });

    if (!itemState) {
      itemState = await this.prisma.characterItemState.create({
        data: {
          characterId,
          itemId,
          state: 'READY',
          usesRemaining: item.maxUses,
        },
      });
    }

    // Check if item can be used
    if (itemState.state === 'CONSUMED') {
      throw new ValidationError('Item has already been consumed this scenario');
    }
    if (itemState.state === 'SPENT') {
      throw new ValidationError(
        'Item has been spent and needs to be refreshed',
      );
    }

    // Determine new state based on usage type
    let newState: ItemState;
    let usesRemaining = itemState.usesRemaining;

    switch (item.usageType) {
      case 'PERSISTENT':
        newState = 'READY';
        break;

      case 'SPENT':
        if (item.maxUses && usesRemaining !== null) {
          usesRemaining = usesRemaining - 1;
          newState = usesRemaining > 0 ? 'READY' : 'SPENT';
        } else {
          newState = 'SPENT';
        }
        break;

      case 'CONSUMED':
        newState = 'CONSUMED';
        break;

      default:
        newState = 'SPENT';
    }

    // Update item state
    await this.prisma.characterItemState.update({
      where: { characterId_itemId: { characterId, itemId } },
      data: { state: newState, usesRemaining },
    });

    const sharedItem = this.itemService.toSharedItem(item);

    return {
      item: sharedItem,
      newState: {
        state: toSharedItemState(newState),
        usesRemaining: usesRemaining ?? undefined,
      },
      effects: sharedItem.effects,
    };
  }

  /**
   * Refresh spent items (called on long rest)
   */
  async refreshSpentItems(characterId: string): Promise<{
    refreshedItems: { itemId: string; itemName: string }[];
  }> {
    const spentStates = await this.prisma.characterItemState.findMany({
      where: { characterId, state: 'SPENT' },
      include: { item: true },
    });

    const refreshedItems: { itemId: string; itemName: string }[] = [];

    for (const state of spentStates) {
      // Only refresh SPENT usage type items
      if (state.item.usageType === 'SPENT') {
        await this.prisma.characterItemState.update({
          where: { id: state.id },
          data: { state: 'READY', usesRemaining: state.item.maxUses },
        });
        refreshedItems.push({
          itemId: state.itemId,
          itemName: state.item.name,
        });
      }
    }

    return { refreshedItems };
  }

  /**
   * Refresh all items (called at scenario end)
   */
  async refreshAllItems(characterId: string): Promise<{
    refreshedItems: { itemId: string; itemName: string }[];
  }> {
    const itemStates = await this.prisma.characterItemState.findMany({
      where: { characterId, state: { not: 'READY' } },
      include: { item: true },
    });

    const refreshedItems: { itemId: string; itemName: string }[] = [];

    for (const state of itemStates) {
      await this.prisma.characterItemState.update({
        where: { id: state.id },
        data: { state: 'READY', usesRemaining: state.item.maxUses },
      });
      refreshedItems.push({ itemId: state.itemId, itemName: state.item.name });
    }

    return { refreshedItems };
  }

  // ========== INVENTORY MANAGEMENT ==========

  /**
   * Add an item to character's inventory (purchase or loot)
   */
  async addToInventory(
    characterId: string,
    userId: string,
    itemId: string,
    deductGold = true,
  ): Promise<{ inventory: string[]; gold: number }> {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      include: { ownedItems: true },
    });

    if (!character) {
      throw new NotFoundError('Character not found');
    }

    if (character.userId !== userId) {
      throw new NotFoundError('Character not found');
    }

    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundError('Item not found');
    }

    // Check if already owned
    if (character.ownedItems.some((inv) => inv.itemId === itemId)) {
      throw new ConflictError('Item already in inventory');
    }

    let newGold = character.gold;
    if (deductGold) {
      if (character.gold < item.cost) {
        throw new ValidationError('Not enough gold to purchase this item');
      }
      newGold = character.gold - item.cost;
    }

    await this.prisma.$transaction([
      this.prisma.characterInventory.create({
        data: { characterId, itemId },
      }),
      this.prisma.character.update({
        where: { id: characterId },
        data: { gold: newGold },
      }),
    ]);

    const updatedInventory = await this.prisma.characterInventory.findMany({
      where: { characterId },
    });

    return {
      inventory: updatedInventory.map((inv) => inv.itemId),
      gold: newGold,
    };
  }

  /**
   * Remove an item from character's inventory (sell)
   */
  async removeFromInventory(
    characterId: string,
    userId: string,
    itemId: string,
    refundGold = true,
  ): Promise<{ inventory: string[]; gold: number }> {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      include: { ownedItems: true, equippedItems: true },
    });

    if (!character) {
      throw new NotFoundError('Character not found');
    }

    if (character.userId !== userId) {
      throw new NotFoundError('Character not found');
    }

    if (character.currentGameId) {
      throw new ConflictError('Cannot modify inventory during active game');
    }

    // Check if owned
    const inventoryItem = character.ownedItems.find(
      (inv) => inv.itemId === itemId,
    );
    if (!inventoryItem) {
      throw new NotFoundError('Item not in inventory');
    }

    // Check if equipped
    if (character.equippedItems.some((eq) => eq.itemId === itemId)) {
      throw new ValidationError(
        'Cannot remove equipped item. Unequip it first.',
      );
    }

    let newGold = character.gold;
    if (refundGold) {
      const item = await this.prisma.item.findUnique({
        where: { id: itemId },
      });
      if (item) {
        // Sell for half price per Gloomhaven rules
        newGold = character.gold + Math.floor(item.cost / 2);
      }
    }

    await this.prisma.$transaction([
      this.prisma.characterInventory.delete({
        where: { id: inventoryItem.id },
      }),
      this.prisma.characterItemState.deleteMany({
        where: { characterId, itemId },
      }),
      this.prisma.character.update({
        where: { id: characterId },
        data: { gold: newGold },
      }),
    ]);

    const updatedInventory = await this.prisma.characterInventory.findMany({
      where: { characterId },
    });

    return {
      inventory: updatedInventory.map((inv) => inv.itemId),
      gold: newGold,
    };
  }

  // ========== HELPER METHODS ==========

  /**
   * Initialize item states for equipped items at game start
   */
  async initializeItemStates(characterId: string): Promise<void> {
    const equipment = await this.prisma.characterEquipment.findMany({
      where: { characterId },
      include: { item: true },
    });

    if (equipment.length === 0) return;

    // Upsert item states for all equipped items
    for (const eq of equipment) {
      await this.prisma.characterItemState.upsert({
        where: { characterId_itemId: { characterId, itemId: eq.itemId } },
        create: {
          characterId,
          itemId: eq.itemId,
          state: 'READY',
          usesRemaining: eq.item.maxUses,
        },
        update: {
          state: 'READY',
          usesRemaining: eq.item.maxUses,
        },
      });
    }
  }

  /**
   * Get persistent bonuses from equipped items (Issue #205 - Phase 4.1)
   * Returns bonuses that should be auto-applied to combat calculations.
   * Only includes PERSISTENT usage type items that are in READY state.
   *
   * @param characterId - The character's ID
   * @returns Object with bonus values by type
   */
  async getEquippedBonuses(characterId: string): Promise<{
    attackBonus: number;
    defenseBonus: number;
    movementBonus: number;
    rangeBonus: number;
  }> {
    const equipment = await this.prisma.characterEquipment.findMany({
      where: { characterId },
      include: { item: true },
    });

    if (equipment.length === 0) {
      return {
        attackBonus: 0,
        defenseBonus: 0,
        movementBonus: 0,
        rangeBonus: 0,
      };
    }

    // Get item states to check which items are ready
    const states = await this.prisma.characterItemState.findMany({
      where: { characterId },
    });
    const stateMap = new Map(states.map((s) => [s.itemId, s.state]));

    let attackBonus = 0;
    let defenseBonus = 0;
    let movementBonus = 0;
    let rangeBonus = 0;

    for (const eq of equipment) {
      const item = eq.item;

      // Only apply bonuses from PERSISTENT items (always active) or READY items
      const itemState = stateMap.get(eq.itemId) || 'READY';
      if (item.usageType !== 'PERSISTENT' && itemState !== 'READY') {
        continue;
      }

      // Parse effects (stored as JSON in database)
      const effects = item.effects as any[];
      if (!effects || !Array.isArray(effects)) continue;

      for (const effect of effects) {
        if (!effect.type || typeof effect.value !== 'number') continue;

        switch (effect.type) {
          case 'attack_modifier':
            attackBonus += effect.value;
            break;
          case 'defense':
            defenseBonus += effect.value;
            break;
          case 'movement':
            movementBonus += effect.value;
            break;
          case 'range':
            rangeBonus += effect.value;
            break;
        }
      }
    }

    return { attackBonus, defenseBonus, movementBonus, rangeBonus };
  }
}
