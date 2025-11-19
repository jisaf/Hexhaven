import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { GameGateway } from './websocket/game.gateway';
import { RoomsController } from './api/rooms.controller';
import { ScenariosController } from './api/scenarios.controller';
import { AccountsController } from './api/accounts.controller';
import { ScenarioService } from './services/scenario.service';
import { AccountService } from './services/account.service';
import { ProgressionService } from './services/progression.service';
import { PrismaService } from './services/prisma.service';

@Module({
  imports: [],
  controllers: [
    HealthController,
    AppController,
    RoomsController,
    ScenariosController,
    AccountsController,
  ],
  providers: [
    AppService,
    GameGateway,
    ScenarioService,
    AccountService,
    ProgressionService,
    PrismaService,
  ],
})
export class AppModule {}
