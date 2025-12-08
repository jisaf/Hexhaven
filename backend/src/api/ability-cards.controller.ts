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
   * Get ability cards by character class
   * GET /api/ability-cards?characterClass=Brute
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  getCardsByClass(@Query('characterClass') characterClass?: string) {
    if (!characterClass) {
      return { error: 'characterClass query parameter is required' };
    }
    return this.abilityCardService.getCardsByClass(
      characterClass as CharacterClass,
    );
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
