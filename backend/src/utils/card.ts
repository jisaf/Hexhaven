/**
 * Card Utility Functions
 *
 * Helper functions for card management and transformation
 */

import type { AbilityCard, Action } from '../../../shared/types/entities';

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
  static enhanceCard(
    template: AbilityCard,
    enhancements: CardEnhancement[]
  ): EnhancedAbilityCard {
    return {
      ...template,
      enhancements,
    };
  }

  /**
   * Check if card action has loss icon (card goes to lost pile)
   *
   * @param action - Top or bottom action
   * @returns True if action has loss icon
   */
  static hasLossIcon(action: Action): boolean {
    // Check if action has 'loss' in effects
    // This is a placeholder - actual implementation depends on
    // how loss icons are stored in Action type
    return action.effects?.some(effect =>
      typeof effect === 'string' && effect.toLowerCase().includes('loss')
    ) || false;
  }

  /**
   * Check if card has persistent bonus effect
   *
   * @param action - Top or bottom action
   * @returns True if action has persistent effect
   */
  static hasPersistentEffect(action: Action): boolean {
    // Check for persistent bonus indicators
    return action.effects?.some(effect =>
      typeof effect === 'string' &&
      (effect.includes('persistent') || effect.includes('until'))
    ) || false;
  }

  /**
   * Check if card has round bonus effect
   *
   * @param action - Top or bottom action
   * @returns True if action has round bonus
   */
  static hasRoundBonus(action: Action): boolean {
    // Check for round bonus indicators
    return action.effects?.some(effect =>
      typeof effect === 'string' && effect.includes('this round')
    ) || false;
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
