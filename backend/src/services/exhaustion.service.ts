/**
 * Exhaustion Service
 *
 * Handles character exhaustion detection and execution.
 * Implements Gloomhaven exhaustion rules exactly.
 *
 * Exhaustion Conditions:
 * 1. Health drops to 0 or below, OR
 * 2. At round start: Cannot play 2 cards AND cannot rest
 *    - Cannot play 2 cards = hand has < 2 cards
 *    - Cannot rest = discard has < 2 cards
 *
 * Exhaustion Effects:
 * - All cards (hand, discard, active effects) move to lost pile
 * - Character removed from board (currentHex = null)
 * - Cannot participate in scenario
 * - No recovery during scenario
 */

import { Injectable } from '@nestjs/common';
import type {
  Character,
  ActiveCardEffect,
} from '../../../shared/types/entities';

export type ExhaustionReason = 'damage' | 'insufficient_cards';

export interface ExhaustionCheck {
  isExhausted: boolean;
  reason: ExhaustionReason | null;
  message: string;
  details?: {
    health: number;
    cardsInHand: number;
    cardsInDiscard: number;
    canPlayCards: boolean;
    canRest: boolean;
  };
}

@Injectable()
export class ExhaustionService {
  /**
   * Check if character should be exhausted
   *
   * Per Gloomhaven rules (p. 28):
   * - Health <= 0, OR
   * - At round start: hand < 2 AND discard < 2
   *
   * @param character - Character state
   * @returns Exhaustion check result
   */
  checkExhaustion(character: Character): ExhaustionCheck {
    // Already exhausted
    if (character.isExhausted) {
      return {
        isExhausted: true,
        reason: character.exhaustionReason || 'damage',
        message: 'Character is already exhausted',
      };
    }

    // Health-based exhaustion
    if (character.health <= 0) {
      return {
        isExhausted: true,
        reason: 'damage',
        message: `Character dropped to ${character.health} HP`,
        details: {
          health: character.health,
          cardsInHand: character.hand.length,
          cardsInDiscard: character.discardPile.length,
          canPlayCards: false,
          canRest: false,
        },
      };
    }

    // Card-based exhaustion (round start only)
    const canPlayCards = character.hand.length >= 2;
    const canRest = character.discardPile.length >= 2;

    if (!canPlayCards && !canRest) {
      return {
        isExhausted: true,
        reason: 'insufficient_cards',
        message: `Cannot play 2 cards (${character.hand.length} in hand) and cannot rest (${character.discardPile.length} in discard)`,
        details: {
          health: character.health,
          cardsInHand: character.hand.length,
          cardsInDiscard: character.discardPile.length,
          canPlayCards,
          canRest,
        },
      };
    }

    // Not exhausted
    return {
      isExhausted: false,
      reason: null,
      message: 'Character is not exhausted',
      details: {
        health: character.health,
        cardsInHand: character.hand.length,
        cardsInDiscard: character.discardPile.length,
        canPlayCards,
        canRest,
      },
    };
  }

  /**
   * Execute exhaustion (move all cards to lost, remove from board)
   *
   * @param character - Character to exhaust
   * @param reason - Reason for exhaustion
   * @returns Exhausted character
   */
  executeExhaustion(character: Character, reason: ExhaustionReason): Character {
    // Collect all cards from all piles
    const allCards = [
      ...character.hand,
      ...character.discardPile,
      ...(character.activeEffects?.map((e) => e.cardId) || []),
    ];

    return {
      ...character,
      // Move all cards to lost pile
      hand: [],
      discardPile: [],
      lostPile: [...character.lostPile, ...allCards],
      activeEffects: [],
      activeCards: null,

      // Set exhaustion state
      isExhausted: true,
      exhaustionReason: reason,

      // Remove from board
      currentHex: null,

      // Clear rest state
      isResting: false,
      restType: 'none',
      shortRestState: null,
    };
  }

  /**
   * Check if all characters in a party are exhausted
   *
   * @param characters - Array of characters
   * @returns True if all exhausted (scenario failed)
   */
  isPartyExhausted(characters: Character[]): boolean {
    if (characters.length === 0) {
      return false;
    }

    return characters.every((char) => char.isExhausted);
  }

  /**
   * Get exhaustion risk level for character
   *
   * @param character - Character state
   * @returns Risk level (safe, warning, critical)
   */
  getExhaustionRisk(character: Character): 'safe' | 'warning' | 'critical' {
    if (character.isExhausted) {
      return 'critical';
    }

    const check = this.checkExhaustion(character);
    if (check.isExhausted) {
      return 'critical';
    }

    // Warning: Low on cards or health
    const lowHealth = character.health <= 2;
    const lowCards =
      character.hand.length <= 2 && character.discardPile.length <= 2;

    if (lowHealth || lowCards) {
      return 'warning';
    }

    return 'safe';
  }
}
