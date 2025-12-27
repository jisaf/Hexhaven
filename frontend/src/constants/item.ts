/**
 * Item Constants
 *
 * Shared constants for item display across the application.
 * Centralizes rarity colors and slot labels to avoid duplication.
 */

import type { ItemRarity, ItemSlot, ItemUsageType } from '../../../shared/types/entities';

/**
 * Color mapping for item rarities (from PRD design spec)
 */
export const RARITY_COLORS: Record<ItemRarity, string> = {
  COMMON: '#9ab0c9',
  UNCOMMON: '#2ecc71',
  RARE: '#3498db',
  EPIC: '#9b59b6',
  LEGENDARY: '#f1c40f',
};

/**
 * Sort order for rarities (higher = more rare)
 */
export const RARITY_ORDER: Record<ItemRarity, number> = {
  COMMON: 1,
  UNCOMMON: 2,
  RARE: 3,
  EPIC: 4,
  LEGENDARY: 5,
};

/**
 * Short display labels for item slots (for compact UIs like cards)
 */
export const SLOT_LABELS: Record<ItemSlot, string> = {
  HEAD: 'Head',
  BODY: 'Body',
  LEGS: 'Legs',
  ONE_HAND: 'Hand',
  TWO_HAND: '2-Hand',
  SMALL: 'Small',
};

/**
 * Full display labels for item slots (for detailed views like modals)
 */
export const SLOT_LABELS_FULL: Record<ItemSlot, string> = {
  HEAD: 'Head',
  BODY: 'Body',
  LEGS: 'Legs',
  ONE_HAND: 'One Hand',
  TWO_HAND: 'Two Hands',
  SMALL: 'Small Item',
};

/**
 * Display labels for item usage types
 */
export const USAGE_LABELS: Record<ItemUsageType, string> = {
  PERSISTENT: 'Persistent (always active)',
  SPENT: 'Spent (refreshes on rest)',
  CONSUMED: 'Consumed (single use)',
};

/**
 * Default icons for each slot type (RPG Awesome icon classes)
 */
export const SLOT_DEFAULT_ICONS: Record<ItemSlot, string> = {
  HEAD: 'ra-helmet',
  BODY: 'ra-vest',
  LEGS: 'ra-boot-stomp',
  ONE_HAND: 'ra-sword',
  TWO_HAND: 'ra-axe',
  SMALL: 'ra-potion',
};

/**
 * Delay in ms before selling an item after unequip
 * Allows database to update before proceeding with sale
 */
export const UNEQUIP_DELAY_MS = 150;
