import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { GameGateway } from './websocket/game.gateway';
import { RoomsController } from './api/rooms.controller';
import { ScenariosController } from './api/scenarios.controller';
import { MonstersController } from './api/monsters.controller';
import { AuthController } from './api/auth.controller';
import { UserCharacterController } from './api/user-character.controller';
import { CharacterClassesController } from './api/character-classes.controller';
import { GameManagementController } from './api/game-management.controller';
import { ScenarioService } from './services/scenario.service';
import { MonsterService } from './services/monster.service';

@Module({
  imports: [],
  controllers: [
    HealthController,
    AppController,
    RoomsController,
    ScenariosController,
    MonstersController,
    AuthController, // T085: Added auth routes
    UserCharacterController, // Phase 5: User character management routes (002)
    CharacterClassesController, // Phase 5: Public character classes endpoint
    GameManagementController, // Phase 6: Game state management with event sourcing (002)
    // AccountsController, // TODO: Re-enable once Prisma connection is fixed
  ],
  providers: [
    AppService,
    GameGateway,
    ScenarioService,
    MonsterService,
    // TODO: Re-enable once Prisma connection issue is resolved
    // AccountService,
    // ProgressionService,
    // PrismaService,
  ],
})
export class AppModule {}
