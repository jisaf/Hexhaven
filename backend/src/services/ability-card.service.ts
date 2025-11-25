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
  private async loadAbilityCardsFromFile(): Promise<AbilityCard[]> {
    if (this.abilityCards) {
      return this.abilityCards;
    }

    try {
      // Resolve path relative to the current module file.
      // This works in both development (`src`) and production (`dist`).
      const dataFilePath = path.join(__dirname, '..', 'data', 'ability-cards.json');


      if (!fs.existsSync(dataFilePath)) {
         throw new Error(`Ability cards data file not found at ${dataFilePath}`);
      }

      const fileContent = await fs.promises.readFile(dataFilePath, 'utf-8');

      const data = JSON.parse(fileContent) as { abilityCards: AbilityCard[] };
      this.abilityCards = data.abilityCards;
      console.log(
        `✅ Loaded ${this.abilityCards.length} ability cards from ${dataFilePath}`,
      );
      return this.abilityCards;
    } catch (error) {
      console.error('Failed to load ability-cards.json:', error);
      this.abilityCards = []; // Ensure we don't retry on subsequent calls
      return [];
    }
  }

  /**
   * Get ability card by ID
   */
  async getCardById(cardId: string): Promise<AbilityCard | null> {
    const cards = await this.loadAbilityCardsFromFile();
    return cards.find((c) => c.id === cardId) || null;
  }

  /**
   * Get all ability cards for a character class
   */
  async getCardsByClass(characterClass: CharacterClass): Promise<AbilityCard[]> {
    const cards = await this.loadAbilityCardsFromFile();
    return cards.filter((c) => c.characterClass === characterClass);
  }

  /**
   * Get cards by class and level (cards available at or below character level)
   */
  async getCardsByClassAndLevel(
    characterClass: CharacterClass,
    level: number,
  ): Promise<AbilityCard[]> {
    const cards = await this.getCardsByClass(characterClass);
    return cards.filter(
      (c) => c.level === 1 || (typeof c.level === 'number' && c.level <= level),
    );
  }

  /**
   * Validate that a card belongs to a character class
   */
  async validateCardForClass(
    cardId: string,
    characterClass: CharacterClass,
  ): Promise<boolean> {
    const card = await this.getCardById(cardId);
    if (!card) {
      return false;
    }
    return card.characterClass === characterClass;
  }

  /**
   * Validate that both cards are valid and belong to the character
   */
  async validateCardSelection(
    topCardId: string,
    bottomCardId: string,
    characterClass: CharacterClass,
  ): Promise<{
    valid: boolean;
    errors: string[];
    topCard?: AbilityCard;
    bottomCard?: AbilityCard;
  }> {
    const errors: string[] = [];

    // Check top card exists
    const topCard = await this.getCardById(topCardId);
    if (!topCard) {
      errors.push(`Top card not found: ${topCardId}`);
    }

    // Check bottom card exists
    const bottomCard = await this.getCardById(bottomCardId);
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
  async getCardInitiative(cardId: string): Promise<number | null> {
    const card = await this.getCardById(cardId);
    return card ? card.initiative : null;
  }
}
