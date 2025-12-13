/**
 * Item-related type definitions for backend services
 * Issue #205 - Items and Inventory System
 */

import { ItemSlot, ItemUsageType, Rarity } from '@prisma/client';
import {
  ItemEffect,
  ItemTrigger,
  ItemRarity,
} from '../../../shared/types/entities';

// Re-export Prisma enums for convenience
export { ItemSlot, ItemUsageType, Rarity };

/**
 * DTO for creating a new item
 * Using class for NestJS decorator metadata support
 */
export class CreateItemDto {
  name!: string;
  slot!: ItemSlot;
  usageType!: ItemUsageType;
  maxUses?: number;
  rarity!: Rarity;
  effects!: ItemEffect[];
  triggers?: ItemTrigger[];
  modifierDeckImpact?: { adds: string[] };
  cost!: number;
  description?: string;
  imageUrl?: string;
}

/**
 * DTO for updating an existing item
 * Using class for NestJS decorator metadata support
 */
export class UpdateItemDto {
  name?: string;
  slot?: ItemSlot;
  usageType?: ItemUsageType;
  maxUses?: number | null;
  rarity?: Rarity;
  effects?: ItemEffect[];
  triggers?: ItemTrigger[] | null;
  modifierDeckImpact?: { adds: string[] } | null;
  cost?: number;
  description?: string | null;
  imageUrl?: string | null;
}

/**
 * Filters for listing items
 */
export interface ItemFilters {
  slot?: ItemSlot;
  rarity?: Rarity;
  usageType?: ItemUsageType;
  minCost?: number;
  maxCost?: number;
  search?: string; // Search by name
}

/**
 * Validation result for item operations
 */
export interface ItemValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Item Effect Types Reference (Issue #205)
 *
 * Effects define what an item does when used. Each effect has a type and optional parameters.
 *
 * Numeric Effects (require 'value' field):
 * - attack_modifier: Adds to attack damage (e.g., +2 attack from a sword)
 * - defense: Reduces incoming damage (e.g., -1 damage from armor)
 * - heal: Restores HP to self or ally (e.g., heal 3 from potion)
 * - shield: Blocks damage for the round (e.g., Shield 2 from heavy armor)
 * - retaliate: Deals damage to melee attackers (e.g., Retaliate 1 from spiked armor)
 * - pierce: Ignores enemy shield value (e.g., Pierce 2 from dagger)
 * - movement: Modifies movement range (e.g., +1 Move from boots)
 *
 * Special Effects (require specific fields):
 * - condition: Applies a status condition (requires 'condition' field)
 *   Example: { type: 'condition', condition: 'poison' }
 * - element: Generates or consumes an element (requires 'element' field)
 *   Example: { type: 'element', element: 'fire' }
 * - special: Custom effect with description (requires 'description' field)
 *   Example: { type: 'special', description: 'Teleport to any empty hex within range 3' }
 *
 * @see shared/types/entities.ts for full ItemEffect interface
 */
export const VALID_EFFECT_TYPES = [
  'attack_modifier',
  'defense',
  'heal',
  'shield',
  'retaliate',
  'pierce',
  'condition',
  'movement',
  'element',
  'special',
] as const;

/**
 * Item Trigger Events Reference (Issue #205)
 *
 * Triggers define WHEN an item's effects activate. Items can be:
 * 1. Manual use: Player chooses when to activate (no triggers)
 * 2. Reactive: Automatically activates on a game event (has triggers)
 *
 * Trigger Events:
 * - on_attack: When you perform an attack action
 *   Example: "Add +1 Attack to your next attack" (War Hammer)
 *
 * - when_attacked: When an enemy attacks you
 *   Example: "Gain Shield 1 when attacked" (Shield of Defense)
 *
 * - on_damage: When you take damage (after shield/defense)
 *   Example: "Heal 1 HP when you take damage" (Ring of Vitality)
 *
 * - on_move: When you perform a move action
 *   Example: "+1 Movement to all Move actions" (Boots of Striding)
 *
 * - start_of_turn: At the beginning of your turn
 *   Example: "Generate Fire element at start of turn" (Fire Staff)
 *
 * - end_of_turn: At the end of your turn
 *   Example: "Heal 1 HP at end of turn if below half health" (Amulet of Life)
 *
 * - on_rest: When you perform a rest action
 *   Example: "Recover 2 additional cards on long rest" (Stamina Potion)
 *
 * Triggers can have an optional 'condition' string for more specific activation:
 * Example: { event: 'when_attacked', condition: 'by adjacent enemy' }
 *
 * @see shared/types/entities.ts for full ItemTrigger interface
 */
export const VALID_TRIGGER_EVENTS = [
  'on_attack',
  'when_attacked',
  'on_damage',
  'on_move',
  'start_of_turn',
  'end_of_turn',
  'on_rest',
] as const;

/**
 * Convert Prisma Rarity enum to shared ItemRarity type
 */
export function toItemRarity(rarity: Rarity): ItemRarity {
  return rarity as ItemRarity;
}

/**
 * Convert shared ItemRarity to Prisma Rarity enum
 */
export function toPrismaRarity(rarity: ItemRarity): Rarity {
  return rarity as Rarity;
}
