/**
 * Ability Card Service
 *
 * Manages ability card data:
 * - Load ability cards from JSON file
 * - Get cards by character class
 * - Get card by ID
 * - Validate card selections
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { AbilityCard, CharacterClass } from '../../../shared/types/entities';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class AbilityCardService implements OnModuleInit {
  private abilityCards: AbilityCard[] = [];

  async onModuleInit() {
    await this.loadAbilityCardsFromFile();
  }

  private async loadAbilityCardsFromFile(): Promise<void> {
    try {
      const dataFilePath = path.join(
        process.cwd(),
        'backend',
        'src',
        'data',
        'ability-cards.json',
      );

      try {
        const fileContent = await fs.readFile(dataFilePath, 'utf-8');
        this.abilityCards = JSON.parse(fileContent) as AbilityCard[];
        console.log(
          `✅ Loaded ${this.abilityCards.length} ability cards from ${dataFilePath}`,
        );
      } catch {
        // Fallback for compiled version in dist
        const distDataFilePath = path.join(
          process.cwd(),
          'dist',
          'backend',
          'src',
          'data',
          'ability-cards.json',
        );
        const fileContent = await fs.readFile(distDataFilePath, 'utf-8');
        this.abilityCards = JSON.parse(fileContent) as AbilityCard[];
        console.log(
          `✅ Loaded ${this.abilityCards.length} ability cards from ${distDataFilePath}`,
        );
      }
    } catch (error) {
      console.error('Failed to load ability-cards.json:', error);
      this.abilityCards = [];
    }
  }

  /**
   * Get all ability cards
   */
  findAll(): AbilityCard[] {
    return this.abilityCards;
  }

  /**
   * Get ability card by ID
   */
  getCardById(cardId: string): AbilityCard | null {
    return this.abilityCards.find((c) => c.id === cardId) || null;
  }

  /**
   * Get all ability cards for a character class
   */
  getCardsByClass(characterClass: CharacterClass): AbilityCard[] {
    return this.abilityCards.filter((c) => c.characterClass === characterClass);
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
