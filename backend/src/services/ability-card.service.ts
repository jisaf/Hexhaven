/**
 * Ability Card Service
 *
 * Manages ability card data:
 * - Load ability cards from JSON file
 * - Get cards by character class
 * - Get card by ID
 * - Validate card selections
 */

import { Injectable } from '@nestjs/common';
import { AbilityCard, CharacterClass } from '../../../shared/types/entities';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AbilityCardService {
  private abilityCards: AbilityCard[] | null = null;

  /**
   * Load all ability cards from JSON file (lazy load)
   */
  private loadAbilityCardsFromFile(): AbilityCard[] {
    if (this.abilityCards) {
      return this.abilityCards;
    }

    try {
      // Construct path relative to the service file location
      // __dirname will be backend/dist/backend/src/services when compiled
      // Need to go up 3 levels to reach backend/dist/
      const dataFilePath = path.resolve(
        __dirname,
        '../../..',
        'data',
        'ability-cards.json'
      );

      if (!fs.existsSync(dataFilePath)) {
         throw new Error(`Ability cards data file not found at ${dataFilePath}`);
      }

      const fileContent = fs.readFileSync(dataFilePath, 'utf-8');

      const data = JSON.parse(fileContent) as { abilityCards: AbilityCard[] };
      this.abilityCards = data.abilityCards;
      console.log(
        `✅ Loaded ${this.abilityCards.length} ability cards from ${dataFilePath}`,
      );
      return this.abilityCards;
    } catch (error) {
      console.error('Failed to load ability-cards.json:', error);
      return [];
    }
  }

  /**
   * Get ability card by ID
   */
  getCardById(cardId: string): AbilityCard | null {
    const cards = this.loadAbilityCardsFromFile();
    return cards.find((c) => c.id === cardId) || null;
  }

  /**
   * Get all ability cards for a character class
   */
  getCardsByClass(characterClass: CharacterClass): AbilityCard[] {
    const cards = this.loadAbilityCardsFromFile();
    return cards.filter((c) => c.characterClass === characterClass);
  }

  /**
   * Get cards by class and level (cards available at or below character level)
   */
  getCardsByClassAndLevel(
    characterClass: CharacterClass,
    level: number,
  ): AbilityCard[] {
    const cards = this.getCardsByClass(characterClass);
    return cards.filter(
      (c) => c.level === 1 || (typeof c.level === 'number' && c.level <= level),
    );
  }

  /**
   * Validate that a card belongs to a character class
   */
  validateCardForClass(
    cardId: string,
    characterClass: CharacterClass,
  ): boolean {
    const card = this.getCardById(cardId);
    if (!card) {
      return false;
    }
    return card.characterClass === characterClass;
  }

  /**
   * Validate that both cards are valid and belong to the character
   */
  validateCardSelection(
    topCardId: string,
    bottomCardId: string,
    characterClass: CharacterClass,
  ): {
    valid: boolean;
    errors: string[];
    topCard?: AbilityCard;
    bottomCard?: AbilityCard;
  } {
    const errors: string[] = [];

    // Check top card exists
    const topCard = this.getCardById(topCardId);
    if (!topCard) {
      errors.push(`Top card not found: ${topCardId}`);
    }

    // Check bottom card exists
    const bottomCard = this.getCardById(bottomCardId);
    if (!bottomCard) {
      errors.push(`Bottom card not found: ${bottomCardId}`);
    }

    // Check both cards belong to character class
    if (topCard && topCard.characterClass !== characterClass) {
      errors.push(`Top card ${topCardId} does not belong to ${characterClass}`);
    }

    if (bottomCard && bottomCard.characterClass !== characterClass) {
      errors.push(
        `Bottom card ${bottomCardId} does not belong to ${characterClass}`,
      );
    }

    // Check cards are different
    if (topCardId === bottomCardId) {
      errors.push('Cannot select the same card for both top and bottom');
    }

    return {
      valid: errors.length === 0,
      errors,
      topCard: topCard || undefined,
      bottomCard: bottomCard || undefined,
    };
  }

  /**
   * Get initiative value from a card
   */
  getCardInitiative(cardId: string): number | null {
    const card = this.getCardById(cardId);
    return card ? card.initiative : null;
  }
}
