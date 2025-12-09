/**
 * Deck Management Service (Facade)
 *
 * Coordinates card pile, rest, and exhaustion services.
 * Provides a simple, unified API for deck management operations.
 *
 * Architecture:
 * - Delegates to specialized services (CardPileService, RestService, ExhaustionService)
 * - Handles loading enhanced cards from database
 * - Single entry point for all deck operations
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CardPileService } from './card-pile.service';
import { RestService, ValidationResult, ShortRestResult } from './rest.service';
import { ExhaustionService, ExhaustionCheck, ExhaustionReason } from './exhaustion.service';
import { CardTemplateCache } from '../utils/card-template-cache';
import { CardUtils } from '../utils/card';
import type {
  Character,
  EnhancedAbilityCard,
  AbilityCard,
  CardEnhancement,
} from '../../../shared/types/entities';

@Injectable()
export class DeckManagementService {
  constructor(
    private prisma: PrismaService,
    private cardPile: CardPileService,
    private rest: RestService,
    private exhaustion: ExhaustionService
  ) {}

  /**
   * Load enhanced cards for a character
   *
   * Uses CardTemplateCache for base cards (fast),
   * queries enhancements per character (lightweight).
   *
   * @param characterId - Character ID
   * @returns Enhanced ability cards with enhancements merged
   */
  async loadEnhancedCards(characterId: string): Promise<EnhancedAbilityCard[]> {
    // Get character and their enhancements
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      throw new Error(`Character not found: ${characterId}`);
    }

    // Get enhancements for this character
    const enhancements = await this.prisma.cardEnhancement.findMany({
      where: { characterId },
    });

    // TODO: Prisma Character model needs abilityDeck field
    // For now, return empty array - this method isn't used yet
    // const enhancedCards: EnhancedAbilityCard[] = (character as any).abilityDeck.map(
    //   (cardId: string) => {
    //     const template = CardTemplateCache.get(cardId);
    //     const cardEnhancements = enhancements.filter(e => e.cardId === cardId);
    //     return CardUtils.enhanceCard(template, cardEnhancements);
    //   }
    // );

    return [];
  }

  /**
   * Play cards and move to appropriate piles
   *
   * @param character - Character state
   * @param topCard - Top card being played
   * @param bottomCard - Bottom card being played
   * @returns Updated character
   */
  playCards(
    character: Character,
    topCard: string,
    bottomCard: string
  ): Character {
    // Get card templates to check for loss icons
    const topTemplate = CardTemplateCache.get(topCard);
    const bottomTemplate = CardTemplateCache.get(bottomCard);

    const topHasLoss = CardUtils.hasLossIcon(topTemplate.topAction);
    const bottomHasLoss = CardUtils.hasLossIcon(bottomTemplate.bottomAction);

    return this.cardPile.playCards(
      character,
      topCard,
      bottomCard,
      topHasLoss,
      bottomHasLoss
    );
  }

  /**
   * Validate if character can rest
   *
   * @param character - Character state
   * @param type - Rest type
   * @returns Validation result
   */
  canRest(character: Character, type: 'short' | 'long'): ValidationResult {
    return this.rest.canRest(character, type);
  }

  /**
   * Execute short rest (server-side randomization)
   *
   * @param character - Character state
   * @returns Short rest result with random card
   */
  executeShortRest(character: Character): ShortRestResult {
    return this.rest.executeShortRest(character);
  }

  /**
   * Reroll short rest card selection
   *
   * @param character - Character with pending short rest
   * @returns Updated short rest result
   */
  rerollShortRest(character: Character): ShortRestResult {
    return this.rest.rerollShortRest(character);
  }

  /**
   * Finalize short rest after player decision
   *
   * @param character - Character with short rest decision
   * @returns Updated character
   */
  finalizeShortRest(character: Character): Character {
    return this.rest.finalizeShortRest(character);
  }

  /**
   * Declare long rest (sets rest type, initiative handled by turn order)
   *
   * @param character - Character state
   * @returns Character with rest type set
   */
  declareLongRest(character: Character): Character {
    return this.rest.declareLongRest(character);
  }

  /**
   * Execute long rest (player chooses card to lose)
   *
   * @param character - Character state
   * @param cardToLose - Card ID to lose
   * @returns Updated character
   */
  executeLongRest(character: Character, cardToLose: string): Character {
    return this.rest.executeLongRest(character, cardToLose);
  }

  /**
   * Check if character should be exhausted
   *
   * @param character - Character state
   * @returns Exhaustion check result
   */
  checkExhaustion(character: Character): ExhaustionCheck {
    return this.exhaustion.checkExhaustion(character);
  }

  /**
   * Execute exhaustion (move all cards to lost, remove from board)
   *
   * @param character - Character to exhaust
   * @param reason - Reason for exhaustion
   * @returns Exhausted character
   */
  executeExhaustion(
    character: Character,
    reason: ExhaustionReason
  ): Character {
    return this.exhaustion.executeExhaustion(character, reason);
  }

  /**
   * Check if all characters in party are exhausted
   *
   * @param characters - Array of characters
   * @returns True if all exhausted (scenario failed)
   */
  isPartyExhausted(characters: Character[]): boolean {
    return this.exhaustion.isPartyExhausted(characters);
  }

  /**
   * Get exhaustion risk level for UI indicator
   *
   * @param character - Character state
   * @returns Risk level
   */
  getExhaustionRisk(character: Character): 'safe' | 'warning' | 'critical' {
    return this.exhaustion.getExhaustionRisk(character);
  }

  /**
   * Move card between piles (low-level operation)
   *
   * @param character - Character state
   * @param cardId - Card to move
   * @param from - Source pile
   * @param to - Destination pile
   * @returns Updated character
   */
  moveCard(
    character: Character,
    cardId: string,
    from: 'hand' | 'discard' | 'lost',
    to: 'hand' | 'discard' | 'lost'
  ): Character {
    return this.cardPile.moveCard(character, cardId, from, to);
  }

  /**
   * Get card counts for each pile
   *
   * @param character - Character state
   * @returns Card counts
   */
  getCardCounts(character: Character): {
    hand: number;
    discard: number;
    lost: number;
    total: number;
  } {
    return this.cardPile.getCardCounts(character);
  }
}
