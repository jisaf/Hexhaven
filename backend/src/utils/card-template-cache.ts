/**
 * Card Template Cache
 *
 * Application-level cache for ability card templates.
 * Loads all card templates once at startup to avoid repeated DB queries.
 *
 * Performance: Reduces 40 DB queries per game load to 1 enhancement query.
 */

import { PrismaClient } from '@prisma/client';
import type { AbilityCard } from '../../../shared/types/entities';

export class CardTemplateCache {
  private static templates = new Map<string, AbilityCard>();
  private static initialized = false;
  private static initPromise: Promise<void> | null = null;

  /**
   * Initialize cache by loading all card templates from database
   *
   * @param prisma - Prisma client instance
   * @returns Promise that resolves when cache is loaded
   */
  static async initialize(prisma: PrismaClient): Promise<void> {
    // Prevent multiple simultaneous initializations
    if (this.initPromise) {
      return this.initPromise;
    }

    if (this.initialized) {
      return;
    }

    this.initPromise = this.doInitialize(prisma);
    return this.initPromise;
  }

  private static async doInitialize(prisma: PrismaClient): Promise<void> {
    try {
      console.log('[CardTemplateCache] Loading card templates...');
      const startTime = Date.now();

      const cards = await prisma.abilityCard.findMany({
        include: {
          class: true,
          layoutTemplate: true,
        },
      });

      // Convert database records to AbilityCard type
      cards.forEach((card) => {
        const abilityCard: AbilityCard = {
          id: card.id,
          characterClass: card.class.name as any, // Map to CharacterClass enum
          name: card.name,
          level: card.level === 0 ? 'X' : card.level,
          initiative: card.initiative,
          topAction: card.topAction as any,
          bottomAction: card.bottomAction as any,
          imageUrl: undefined, // TODO: Add imageUrl to schema if needed
        };

        this.templates.set(card.id, abilityCard);
      });

      const duration = Date.now() - startTime;
      console.log(
        `[CardTemplateCache] Loaded ${this.templates.size} card templates in ${duration}ms`,
      );

      this.initialized = true;
      this.initPromise = null;
    } catch (error) {
      console.error('[CardTemplateCache] Failed to initialize:', error);
      this.initPromise = null;
      throw error;
    }
  }

  /**
   * Get card template by ID
   *
   * @param cardId - Card template ID
   * @returns Card template
   * @throws Error if cache not initialized or card not found
   */
  static get(cardId: string): AbilityCard {
    if (!this.initialized) {
      throw new Error(
        'CardTemplateCache not initialized. Call initialize() first.',
      );
    }

    const card = this.templates.get(cardId);
    if (!card) {
      throw new Error(`Card template not found: ${cardId}`);
    }

    return card;
  }

  /**
   * Get multiple card templates by IDs
   *
   * @param cardIds - Array of card template IDs
   * @returns Array of card templates
   */
  static getMany(cardIds: string[]): AbilityCard[] {
    return cardIds.map((id) => this.get(id));
  }

  /**
   * Check if cache is initialized
   *
   * @returns True if cache is ready
   */
  static isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get number of cached templates
   *
   * @returns Count of templates in cache
   */
  static size(): number {
    return this.templates.size;
  }

  /**
   * Clear cache (for testing)
   */
  static clear(): void {
    this.templates.clear();
    this.initialized = false;
    this.initPromise = null;
  }

  /**
   * Reload cache from database
   *
   * @param prisma - Prisma client instance
   */
  static async reload(prisma: PrismaClient): Promise<void> {
    this.clear();
    await this.initialize(prisma);
  }
}
