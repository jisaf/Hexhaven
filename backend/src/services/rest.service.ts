/**
 * Rest Service
 *
 * Handles rest operations (short rest, long rest) for characters.
 * Implements Gloomhaven rest mechanics exactly per the rules.
 *
 * Short Rest:
 * - Requires 2+ cards in discard
 * - Randomly lose 1 card to lost pile
 * - Can reroll once for 1 HP damage
 * - Return rest to hand
 *
 * Long Rest:
 * - Requires 2+ cards in discard
 * - Player chooses 1 card to lose
 * - Return rest to hand
 * - Heal 2 HP
 * - Refresh all spent items (TODO: item integration)
 */

import { Injectable } from '@nestjs/common';
import type { Character, ShortRestState } from '../../../shared/types/entities';
import { CardPileService } from './card-pile.service';
import { RandomUtils } from '../utils/random';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export interface ShortRestResult {
  character: Character;
  randomCard: string;
  damageTaken?: number;
}

@Injectable()
export class RestService {
  constructor(private cardPile: CardPileService) {}

  /**
   * Validate if character can rest
   *
   * @param character - Character state
   * @param type - Rest type (short or long)
   * @returns Validation result
   */
  canRest(character: Character, type: 'short' | 'long'): ValidationResult {
    // Must have 2+ cards in discard
    if (character.discardPile.length < 2) {
      return {
        valid: false,
        reason: 'Need 2+ cards in discard pile to rest',
      };
    }

    // Cannot rest if already exhausted
    if (character.isExhausted) {
      return {
        valid: false,
        reason: 'Character is exhausted',
      };
    }

    return { valid: true };
  }

  /**
   * Execute short rest (server-side randomization)
   *
   * @param character - Character state
   * @returns Updated character with short rest state
   * @throws Error if validation fails
   */
  executeShortRest(character: Character): ShortRestResult {
    // Validate can rest
    const validation = this.canRest(character, 'short');
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    // Select random card from discard
    const randomCard = RandomUtils.selectRandom(character.discardPile);
    const seed = RandomUtils.generateSeed();

    // Set short rest state
    const shortRestState: ShortRestState = {
      randomCardId: randomCard,
      randomSeed: seed,
      hasRerolled: false,
      timestamp: Date.now(),
    };

    return {
      character: {
        ...character,
        shortRestState,
        restType: 'short',
      },
      randomCard,
    };
  }

  /**
   * Reroll short rest card selection (1 HP cost, once only)
   *
   * @param character - Character with pending short rest
   * @returns Updated character with new random card
   * @throws Error if cannot reroll
   */
  rerollShortRest(character: Character): ShortRestResult {
    if (!character.shortRestState) {
      throw new Error('No short rest in progress');
    }

    if (character.shortRestState.hasRerolled) {
      throw new Error('Already rerolled once (can only reroll once per rest)');
    }

    if (character.health <= 1) {
      throw new Error('Cannot reroll - would cause exhaustion (need >1 HP)');
    }

    // Select new random card
    const newCard = RandomUtils.selectRandom(character.discardPile);

    return {
      character: {
        ...character,
        health: character.health - 1,
        shortRestState: {
          ...character.shortRestState,
          randomCardId: newCard,
          hasRerolled: true,
        },
      },
      randomCard: newCard,
      damageTaken: 1,
    };
  }

  /**
   * Finalize short rest after player decision
   *
   * @param character - Character with short rest decision
   * @returns Updated character with cards moved
   * @throws Error if no short rest in progress
   */
  finalizeShortRest(character: Character): Character {
    if (!character.shortRestState) {
      throw new Error('No short rest in progress');
    }

    const { randomCardId } = character.shortRestState;

    // Move random card to lost
    let updated = this.cardPile.moveCard(
      character,
      randomCardId,
      'discard',
      'lost',
    );

    // Move remaining discard to hand
    updated = this.cardPile.moveAllCards(updated, 'discard', 'hand');

    // Clear rest state
    updated = {
      ...updated,
      shortRestState: null,
      restType: 'none',
      isResting: false,
    };

    return updated;
  }

  /**
   * Execute long rest (player chooses card to lose)
   *
   * @param character - Character state
   * @param cardToLose - Card ID to lose
   * @returns Updated character
   * @throws Error if validation fails
   */
  executeLongRest(character: Character, cardToLose: string): Character {
    // Validate can rest
    const validation = this.canRest(character, 'long');
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    // Validate card is in discard
    if (!character.discardPile.includes(cardToLose)) {
      throw new Error(`Card ${cardToLose} not in discard pile`);
    }

    // Move chosen card to lost
    let updated = this.cardPile.moveCard(
      character,
      cardToLose,
      'discard',
      'lost',
    );

    // Move remaining discard to hand
    updated = this.cardPile.moveAllCards(updated, 'discard', 'hand');

    // Heal 2 HP (up to max) - calculate for potential future logging/events
    const _healthGained = Math.min(2, updated.maxHealth - updated.health);

    updated = {
      ...updated,
      health: Math.min(updated.health + 2, updated.maxHealth),
      restType: 'none',
      isResting: false,
    };

    // TODO: Refresh items (coordinate with item system)
    // For now, this is a placeholder comment

    return updated;
  }

  /**
   * Declare long rest (sets initiative to 99)
   *
   * Per Gloomhaven rules (p. 17):
   * "A long rest is declared during the card selection step of a round
   *  and constitutes the player's entire turn for the round.
   *  Resting players are considered to have an initiative value of 99."
   *
   * @param character - Character state
   * @returns Character with rest type and initiative set
   * @throws Error if validation fails
   */
  declareLongRest(character: Character): Character {
    const validation = this.canRest(character, 'long');
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    return {
      ...character,
      isResting: true,
      restType: 'long',
      // Initiative 99 will be handled by turn order service
    };
  }
}
