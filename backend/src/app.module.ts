import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { GameGateway } from './websocket/game.gateway';
import { RoomsController } from './api/rooms.controller';
import { ScenariosController } from './api/scenarios.controller';
import { MonstersController } from './api/monsters.controller';
import { CardController } from './api/card.controller';
import { ScenarioService } from './services/scenario.service';
import { MonsterService } from './services/monster.service';
import { CardService } from './services/card.service';

@Module({
  imports: [],
  controllers: [
    HealthController,
    AppController,
    RoomsController,
    ScenariosController,
    MonstersController,
    CardController,
    // AccountsController, // TODO: Re-enable once Prisma connection is fixed
  ],
  providers: [
    AppService,
    GameGateway,
    ScenarioService,
    MonsterService,
    CardService,
    // TODO: Re-enable once Prisma connection issue is resolved
    // AccountService,
    // ProgressionService,
    // PrismaService,
  ],
})
export class AppModule {}
