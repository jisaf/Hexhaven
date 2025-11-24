
import { Controller, Get } from '@nestjs/common';
import { MonsterService } from '../services/monster.service';

@Controller('api/monsters')
export class MonstersController {
  constructor(private readonly monsterService: MonsterService) {}

  @Get()
  async listMonsterTypes() {
    const monsterTypes = await this.monsterService.getAvailableMonsterTypes();
    return {
      monsterTypes,
      count: monsterTypes.length,
    };
  }
}
