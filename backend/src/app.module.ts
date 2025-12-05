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
import { CardLayoutTemplatesController } from './api/card-layout-templates.controller';
import { ScenarioService } from './services/scenario.service';
import { MonsterService } from './services/monster.service';
import { PrismaService } from './services/prisma.service';
import { CardLayoutTemplateService } from './services/card-layout-template.service';
import { UserCharacterService } from './services/user-character.service.provider';

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
    CardLayoutTemplatesController, // Card layout template management
    // AccountsController, // TODO: Re-enable once Prisma connection is fixed
  ],
  providers: [
    AppService,
    GameGateway,
    ScenarioService,
    MonsterService,
    PrismaService, // 002: Re-enabled for persistent character integration
    CardLayoutTemplateService, // Card layout template service
    UserCharacterService,
    // TODO: Re-enable once Prisma connection issue is resolved
    // AccountService,
    // ProgressionService,
  ],
})
export class AppModule {}
