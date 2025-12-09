/**
 * Card Pile Service
 *
 * Pure card pile operations (no business logic).
 * Handles moving cards between hand, discard, lost, and active piles.
 *
 * Principles:
 * - Immutable updates (returns new character, doesn't mutate)
 * - Validation (throws on invalid operations)
 * - Single Responsibility (only card pile management)
 */

import { Injectable } from '@nestjs/common';
import type { Character } from '../../../shared/types/entities';
import { CardTemplateCache } from '../utils/card-template-cache';

export type CardPile = 'hand' | 'discard' | 'lost';

@Injectable()
export class CardPileService {
  /**
   * Move card from one pile to another
   *
   * @param character - Character state
   * @param cardId - Card template ID to move
   * @param from - Source pile
   * @param to - Destination pile
   * @returns Updated character with card moved
   * @throws Error if card not in source pile
   */
  moveCard(
    character: Character,
    cardId: string,
    from: CardPile,
    to: CardPile,
  ): Character {
    // Get source and destination piles
    const sourcePile = this.getPile(character, from);
    const destPile = this.getPile(character, to);

    // Validate card exists in source pile
    if (!sourcePile.includes(cardId)) {
      throw new Error(`Card ${cardId} not in ${from} pile`);
    }

    // Remove from source
    const updatedSource = sourcePile.filter((id) => id !== cardId);

    // Add to destination
    const updatedDest = [...destPile, cardId];

    // Return updated character with both piles updated
    return {
      ...character,
      hand:
        from === 'hand'
          ? updatedSource
          : to === 'hand'
            ? updatedDest
            : character.hand,
      discardPile:
        from === 'discard'
          ? updatedSource
          : to === 'discard'
            ? updatedDest
            : character.discardPile,
      lostPile:
        from === 'lost'
          ? updatedSource
          : to === 'lost'
            ? updatedDest
            : character.lostPile,
    };
  }

  /**
   * Get pile array from character by pile name
   */
  private getPile(character: Character, pile: CardPile): string[] {
    switch (pile) {
      case 'hand':
        return character.hand;
      case 'discard':
        return character.discardPile;
      case 'lost':
        return character.lostPile;
    }
  }

  /**
   * Move multiple cards from one pile to another
   *
   * @param character - Character state
   * @param cardIds - Array of card IDs to move
   * @param from - Source pile
   * @param to - Destination pile
   * @returns Updated character
   */
  moveCards(
    character: Character,
    cardIds: string[],
    from: CardPile,
    to: CardPile,
  ): Character {
    let updated = character;

    for (const cardId of cardIds) {
      updated = this.moveCard(updated, cardId, from, to);
    }

    return updated;
  }

  /**
   * Play cards and move to appropriate piles based on loss icons
   *
   * @param character - Character state
   * @param topCardId - Top card being played
   * @param bottomCardId - Bottom card being played
   * @param topHasLoss - True if top action has loss icon
   * @param bottomHasLoss - True if bottom action has loss icon
   * @returns Updated character with cards in discard/lost
   * @throws Error if cards not in hand
   */
  playCards(
    character: Character,
    topCardId: string,
    bottomCardId: string,
    topHasLoss: boolean = false,
    bottomHasLoss: boolean = false,
  ): Character {
    // Validate both cards are in hand
    if (!character.hand.includes(topCardId)) {
      throw new Error(`Top card ${topCardId} not in hand`);
    }
    if (!character.hand.includes(bottomCardId)) {
      throw new Error(`Bottom card ${bottomCardId} not in hand`);
    }

    // Remove both cards from hand
    const hand = character.hand.filter(
      (id) => id !== topCardId && id !== bottomCardId,
    );

    // Add to appropriate piles
    const discardPile = [...character.discardPile];
    const lostPile = [...character.lostPile];

    if (topHasLoss) {
      lostPile.push(topCardId);
    } else {
      discardPile.push(topCardId);
    }

    if (bottomHasLoss) {
      lostPile.push(bottomCardId);
    } else {
      discardPile.push(bottomCardId);
    }

    return {
      ...character,
      hand,
      discardPile,
      lostPile,
    };
  }

  /**
   * Move all cards from one pile to another
   *
   * @param character - Character state
   * @param from - Source pile
   * @param to - Destination pile
   * @returns Updated character
   */
  moveAllCards(character: Character, from: CardPile, to: CardPile): Character {
    const sourcePile = this.getPile(character, from);
    const destPile = this.getPile(character, to);
    const cards = [...sourcePile];

    return {
      ...character,
      hand:
        from === 'hand'
          ? []
          : to === 'hand'
            ? [...destPile, ...cards]
            : character.hand,
      discardPile:
        from === 'discard'
          ? []
          : to === 'discard'
            ? [...destPile, ...cards]
            : character.discardPile,
      lostPile:
        from === 'lost'
          ? []
          : to === 'lost'
            ? [...destPile, ...cards]
            : character.lostPile,
    };
  }

  /**
   * Get card counts for each pile
   *
   * @param character - Character state
   * @returns Object with counts for each pile
   */
  getCardCounts(character: Character): {
    hand: number;
    discard: number;
    lost: number;
    total: number;
  } {
    return {
      hand: character.hand.length,
      discard: character.discardPile.length,
      lost: character.lostPile.length,
      total: character.abilityDeck.length,
    };
  }

  /**
   * Validate character has minimum cards to play
   *
   * @param character - Character state
   * @param required - Number of cards required (default 2)
   * @returns True if character can play cards
   */
  canPlayCards(character: Character, required: number = 2): boolean {
    return character.hand.length >= required;
  }

  /**
   * Check if character has enough cards in discard to rest
   *
   * @param character - Character state
   * @param required - Number of cards required (default 2)
   * @returns True if character can rest
   */
  canRest(character: Character, required: number = 2): boolean {
    return character.discardPile.length >= required;
  }
}
