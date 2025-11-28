import { Controller, Get } from '@nestjs/common';
import { AbilityCardService } from '../services/ability-card.service';
import { AbilityCard } from 'shared/types';

@Controller('cards')
export class AbilityCardController {
  constructor(private readonly abilityCardService: AbilityCardService) {}

  @Get()
  findAll(): AbilityCard[] {
    return this.abilityCardService.findAll();
  }
}
