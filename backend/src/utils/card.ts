/**
 * Card Utility Functions
 *
 * Helper functions for card management and transformation
 * Updated for Issue #220 - uses new modifier-based actions
 */

import type { AbilityCard, CardAction } from '../../../shared/types/entities';
import { isLostAction, isPersistent, getXPValue } from '../../../shared/types/modifiers';

export interface CardEnhancement {
  id: string;
  characterId: string;
  cardId: string;
  slot: 'TOP' | 'BOTTOM';
  enhancementType: string;
  appliedAt: Date;
}

export interface EnhancedAbilityCard extends AbilityCard {
  enhancements: CardEnhancement[];
}

export class CardUtils {
  /**
   * Merge base card template with character-specific enhancements
   *
   * @param template - Base card from CardTemplateCache
   * @param enhancements - Character's enhancements for this card
   * @returns Enhanced card with enhancements applied
   */
  static enhanceCard(template: AbilityCard, enhancements: CardEnhancement[]): EnhancedAbilityCard {
    return {
      ...template,
      enhancements,
    };
  }

  /**
   * Check if card action has loss icon (card goes to lost pile)
   * Uses new modifier system
   *
   * @param action - Top or bottom action
   * @returns True if action has loss icon
   */
  static hasLossIcon(action: CardAction): boolean {
    // Check for lost modifier in the new format
    return isLostAction(action.modifiers || []);
  }

  /**
   * Check if card has persistent bonus effect
   * Uses new modifier system
   *
   * @param action - Top or bottom action
   * @returns True if action has persistent effect
   */
  static hasPersistentEffect(action: CardAction): boolean {
    // Check for persistent modifier in the new format
    return isPersistent(action.modifiers || []);
  }

  /**
   * Check if card has round bonus effect
   *
   * @param action - Top or bottom action
   * @returns True if action has round bonus
   */
  static hasRoundBonus(action: CardAction): boolean {
    // Check for round modifier in the new format
    const modifiers = action.modifiers || [];
    return modifiers.some((m) => m.type === 'round');
  }

  /**
   * Get XP value for an action
   *
   * @param action - Top or bottom action
   * @returns XP value (0 if none)
   */
  static getXP(action: CardAction): number {
    return getXPValue(action.modifiers || []);
  }

  /**
   * Get card display name with level
   *
   * @param card - Ability card
   * @returns Formatted name like "Trample (L1)"
   */
  static getDisplayName(card: AbilityCard): string {
    return `${card.name} (L${card.level})`;
  }
}
