import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { GameGateway } from './websocket/game.gateway';
import { RoomsController } from './api/rooms.controller';
import { ScenariosController } from './api/scenarios.controller';
import { ScenarioService } from './services/scenario.service';

@Module({
  imports: [],
  controllers: [
    HealthController,
    AppController,
    RoomsController,
    ScenariosController,
    // AccountsController, // TODO: Re-enable once Prisma connection is fixed
  ],
  providers: [
    AppService,
    GameGateway,
    ScenarioService,
    // TODO: Re-enable once Prisma connection issue is resolved
    // AccountService,
    // ProgressionService,
    // PrismaService,
  ],
})
export class AppModule {}
