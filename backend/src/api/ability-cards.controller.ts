/**
 * Ability Cards Controller
 * Public endpoints for ability card data
 */

import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import { AbilityCardService } from '../services/ability-card.service';
import { CharacterClass } from '../../../shared/types/entities';

@Controller('api/ability-cards')
export class AbilityCardsController {
  constructor(private readonly abilityCardService: AbilityCardService) {}

  /**
   * Get all ability cards grouped by class, or filter by class
   * GET /api/ability-cards - Returns all cards grouped by class
   * GET /api/ability-cards?characterClass=Brute - Returns cards for specific class
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  getCards(@Query('characterClass') characterClass?: string) {
    if (characterClass) {
      // Return cards for specific class
      return this.abilityCardService.getCardsByClass(
        characterClass as CharacterClass,
      );
    }
    // Return all cards grouped by class
    return this.abilityCardService.getAllCardsGroupedByClass();
  }

  /**
   * Get ability card by ID
   * GET /api/ability-cards/:cardId
   */
  @Get(':cardId')
  @HttpCode(HttpStatus.OK)
  getCardById(@Param('cardId') cardId: string) {
    const card = this.abilityCardService.getCardById(cardId);
    if (!card) {
      return { error: `Card not found: ${cardId}` };
    }
    return card;
  }
}
