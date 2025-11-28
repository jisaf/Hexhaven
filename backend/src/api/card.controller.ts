import { Controller, Get } from '@nestjs/common';
import { CardService } from '../services/card.service';
import { AbilityCard } from 'shared/types';

@Controller('cards')
export class CardController {
  constructor(private readonly cardService: CardService) {}

  @Get()
  findAll(): AbilityCard[] {
    return this.cardService.findAll();
  }
}
