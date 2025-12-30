/**
 * Ability Card Service
 *
 * Manages ability card data from database:
 * - Get cards by character class
 * - Get card by ID
 * - Validate card selections
 *
 * All ability cards are stored in the database (seeded from seed-data/ability-cards.json).
 * This service queries the database instead of loading from a local JSON file.
 */

import { Injectable } from '@nestjs/common';
import {
  AbilityCard as PrismaAbilityCard,
  CharacterClass as PrismaCharacterClass,
} from '@prisma/client';
import { AbilityCard, CharacterClass } from '../../../shared/types/entities';
import { PrismaService } from './prisma.service';

// Type for ability card with class relation included
type AbilityCardWithClass = PrismaAbilityCard & {
  class: PrismaCharacterClass;
};

@Injectable()
export class AbilityCardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Map a database ability card to the shared AbilityCard type
   */
  private mapDbCardToAbilityCard(dbCard: AbilityCardWithClass): AbilityCard {
    return {
      id: dbCard.id,
      characterClass: dbCard.class.name as CharacterClass,
      name: dbCard.name,
      level: dbCard.level,
      initiative: dbCard.initiative,
      topAction: dbCard.topAction as AbilityCard['topAction'],
      bottomAction: dbCard.bottomAction as AbilityCard['bottomAction'],
    };
  }

  /**
   * Get ability card by ID
   */
  async getCardById(cardId: string): Promise<AbilityCard | null> {
    const dbCard = await this.prisma.abilityCard.findFirst({
      where: { id: cardId },
      include: { class: true },
    });

    if (!dbCard) {
      return null;
    }

    return this.mapDbCardToAbilityCard(dbCard);
  }

  /**
   * Get all ability cards for a character class
   */
  async getCardsByClass(
    characterClass: CharacterClass | string,
  ): Promise<AbilityCard[]> {
    // First, find the character class to get its ID
    const charClass = await this.prisma.characterClass.findUnique({
      where: { name: characterClass },
    });

    if (!charClass) {
      console.warn(`Character class "${characterClass}" not found in database`);
      return [];
    }

    const dbCards = await this.prisma.abilityCard.findMany({
      where: { classId: charClass.id },
      include: { class: true },
      orderBy: [{ level: 'asc' }, { initiative: 'asc' }],
    });

    return dbCards.map((card) => this.mapDbCardToAbilityCard(card));
  }

  /**
   * Get all ability cards grouped by class
   */
  async getAllCardsGroupedByClass(): Promise<Record<string, AbilityCard[]>> {
    const dbCards = await this.prisma.abilityCard.findMany({
      include: { class: true },
      orderBy: [{ level: 'asc' }, { initiative: 'asc' }],
    });

    const grouped: Record<string, AbilityCard[]> = {};

    for (const dbCard of dbCards) {
      const card = this.mapDbCardToAbilityCard(dbCard);
      const className = card.characterClass;

      if (!grouped[className]) {
        grouped[className] = [];
      }
      grouped[className].push(card);
    }

    return grouped;
  }

  /**
   * Get cards by class and level (cards available at or below character level)
   */
  async getCardsByClassAndLevel(
    characterClass: CharacterClass | string,
    level: number,
  ): Promise<AbilityCard[]> {
    // First, find the character class to get its ID
    const charClass = await this.prisma.characterClass.findUnique({
      where: { name: characterClass },
    });

    if (!charClass) {
      console.warn(`Character class "${characterClass}" not found in database`);
      return [];
    }

    const dbCards = await this.prisma.abilityCard.findMany({
      where: {
        classId: charClass.id,
        level: { lte: level },
      },
      include: { class: true },
      orderBy: [{ level: 'asc' }, { initiative: 'asc' }],
    });

    return dbCards.map((card) => this.mapDbCardToAbilityCard(card));
  }

  /**
   * Validate that a card belongs to a character class
   */
  async validateCardForClass(
    cardId: string,
    characterClass: CharacterClass | string,
  ): Promise<boolean> {
    const card = await this.getCardById(cardId);
    if (!card) {
      return false;
    }
    // Compare as strings to handle both enum and string inputs
    return String(card.characterClass) === String(characterClass);
  }

  /**
   * Validate that both cards are valid and belong to the character
   */
  async validateCardSelection(
    topCardId: string,
    bottomCardId: string,
    characterClass: CharacterClass | string,
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

    // Check both cards belong to character class (compare as strings)
    const classStr = String(characterClass);
    if (topCard && String(topCard.characterClass) !== classStr) {
      errors.push(`Top card ${topCardId} does not belong to ${characterClass}`);
    }

    if (bottomCard && String(bottomCard.characterClass) !== classStr) {
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
