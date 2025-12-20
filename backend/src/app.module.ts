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
import { AbilityCardsController } from './api/ability-cards.controller';
import { GameHistoryController } from './api/game-history.controller';
import { ItemsController } from './api/items.controller';
import { InventoryController } from './api/inventory.controller';
import { CampaignsController } from './api/campaigns.controller';
import { ScenarioService } from './services/scenario.service';
import { CampaignService } from './services/campaign.service';
import { InventoryService } from './services/inventory.service';
import { ItemService } from './services/item.service';
import { MonsterService } from './services/monster.service';
import { PrismaService } from './services/prisma.service';
import { CardLayoutTemplateService } from './services/card-layout-template.service';
import { AbilityCardService } from './services/ability-card.service';
import { DeckManagementService } from './services/deck-management.service';
import { CardPileService } from './services/card-pile.service';
import { RestService } from './services/rest.service';
import { ExhaustionService } from './services/exhaustion.service';
import { BackgroundUploadService } from './services/background-upload.service';
import { AuthService } from './services/auth.service';
import { UserCharacterService } from './services/user-character.service';
import { GameStateService } from './services/game-state.service';
import { ConditionService } from './services/condition.service';
import { ActionDispatcherService } from './services/action-dispatcher.service';
import { ForcedMovementService } from './services/forced-movement.service';
import { ValidationService } from './services/validation.service';
import { ElementalStateService } from './services/elemental-state.service';

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
    AbilityCardsController, // Ability cards API endpoint
    GameHistoryController, // Phase 9: Match history and game statistics (186)
    ItemsController, // Issue #205: Items and inventory system
    InventoryController, // Issue #205 Sprint 2: Character inventory management
    CampaignsController, // Issue #244: Campaign mode management
    // AccountsController, // TODO: Re-enable once Prisma connection is fixed
  ],
  providers: [
    AppService,
    GameGateway,
    ScenarioService,
    MonsterService,
    PrismaService, // 002: Re-enabled for persistent character integration
    CardLayoutTemplateService, // Card layout template service
    AbilityCardService, // Ability card data service
    DeckManagementService, // Deck management facade (player deck rules implementation)
    CardPileService, // Card pile operations (hand, discard, lost)
    RestService, // Rest mechanics (short rest, long rest)
    ExhaustionService, // Exhaustion detection and execution
    BackgroundUploadService, // Issue #191: Background image upload handling
    InventoryService, // Issue #205 Sprint 2: Character inventory management
    ItemService, // Issue #205: Item CRUD operations
    AuthService, // User authentication service
    UserCharacterService, // Persistent character management
    GameStateService, // Game state and event sourcing
    ConditionService, // Issue #220: Condition application and tracking
    ActionDispatcherService, // Issue #220: Card action dispatcher
    ForcedMovementService, // Issue #220: Push/pull mechanics
    ValidationService, // Issue #220: Action validation
    ElementalStateService, // Issue #220: Element infusion/consumption
    CampaignService, // Issue #244: Campaign mode business logic
    // TODO: Re-enable once Prisma connection issue is resolved
    // AccountService,
    // ProgressionService,
  ],
})
export class AppModule {}
