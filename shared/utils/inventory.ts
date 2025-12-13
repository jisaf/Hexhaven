/**
 * Shared inventory utility functions (Issue #205)
 *
 * Used by both frontend and backend for consistent inventory calculations
 * and display formatting.
 */

import type { ItemSlot, ItemEffect } from '../types/entities';

/**
 * Calculate maximum small item slots by character level
 * Gloomhaven rule: ceil(level / 2)
 *
 * @param level - Character level (1-9)
 * @returns Maximum number of small item slots
 */
export function getMaxSmallSlots(level: number): number {
  return Math.ceil(level / 2);
}

/**
 * Slot display information for UI components
 * Maps ItemSlot enum values to human-readable labels and icon classes
 */
export const SLOT_DISPLAY_INFO: Record<
  string,
  { label: string; icon: string }
> = {
  HEAD: { label: 'Head', icon: 'ra-helmet' },
  BODY: { label: 'Body', icon: 'ra-vest' },
  LEGS: { label: 'Legs', icon: 'ra-boot-stomp' },
  ONE_HAND: { label: 'One Hand', icon: 'ra-sword' },
  TWO_HAND: { label: 'Two Hands', icon: 'ra-axe' },
  SMALL: { label: 'Small Items', icon: 'ra-potion' },
};

/**
 * Slot display order for consistent rendering
 */
export const SLOT_ORDER: ItemSlot[] = [
  'HEAD' as ItemSlot,
  'BODY' as ItemSlot,
  'LEGS' as ItemSlot,
  'ONE_HAND' as ItemSlot,
  'TWO_HAND' as ItemSlot,
  'SMALL' as ItemSlot,
];

/**
 * Short slot names for compact display
 */
export const SLOT_SHORT_NAMES: Record<string, string> = {
  HEAD: 'Head',
  BODY: 'Body',
  LEGS: 'Legs',
  ONE_HAND: '1-Hand',
  TWO_HAND: '2-Hand',
  SMALL: 'Small',
};

/**
 * Format an item effect for display
 *
 * @param effect - The item effect to format
 * @returns Human-readable effect description
 */
export function formatItemEffect(effect: ItemEffect): string {
  // Use description if provided
  if (effect.description) {
    return effect.description;
  }

  // Format numeric effects
  const formatMap: Record<string, (v: number) => string> = {
    attack_modifier: (v) => `+${v} Attack`,
    defense: (v) => `+${v} Defense`,
    heal: (v) => `Heal ${v}`,
    movement: (v) => `+${v} Move`,
    shield: (v) => `Shield ${v}`,
    retaliate: (v) => `Retaliate ${v}`,
    pierce: (v) => `Pierce ${v}`,
    range: (v) => `+${v} Range`,
  };

  if (effect.value !== undefined && formatMap[effect.type]) {
    return formatMap[effect.type](effect.value);
  }

  // Handle condition effects
  if (effect.type === 'condition' && effect.condition) {
    return `Apply ${effect.condition}`;
  }

  // Handle element effects
  if (effect.type === 'element' && effect.element) {
    return `Generate ${effect.element}`;
  }

  // Fallback to effect type
  return effect.type.replace(/_/g, ' ');
}

/**
 * Format multiple effects into a comma-separated summary
 *
 * @param effects - Array of item effects
 * @returns Formatted effects summary
 */
export function formatEffectsSummary(effects: ItemEffect[]): string {
  return effects.map(formatItemEffect).join(', ');
}
