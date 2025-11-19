import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { AccountService } from '../services/account.service';
import { ProgressionService } from '../services/progression.service';
import type { CreateAccountDto } from '../models/account.model';
import type { ProgressionUpdate } from '../models/progression.model';

/**
 * T203 [US7] Add REST POST /api/accounts endpoint for account creation
 * T204 [US7] Add REST GET /api/accounts/:uuid/progression endpoint
 * T205 [US7] Save progression on scenario completion (integrated in ProgressionService)
 */

@Controller('api/accounts')
export class AccountsController {
  constructor(
    private readonly accountService: AccountService,
    private readonly progressionService: ProgressionService,
  ) {}

  /**
   * T203: Create new account or upgrade anonymous account
   * POST /api/accounts
   *
   * Body:
   * {
   *   uuid: string,
   *   email?: string | null,
   *   anonymousProgress?: {
   *     scenariosCompleted: number,
   *     totalExperience: number,
   *     charactersPlayed: string[],
   *     completedScenarioIds: string[],
   *     characterExperience?: Record<string, { level, xp, perksUnlocked[] }>
   *   }
   * }
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createAccount(
    @Body(ValidationPipe) createAccountDto: CreateAccountDto,
  ) {
    const account = await this.accountService.createAccount(createAccountDto);
    return {
      uuid: account.uuid,
      email: account.email,
      createdAt: account.createdAt,
    };
  }

  /**
   * T204: Get progression for an account
   * GET /api/accounts/:uuid/progression
   */
  @Get(':uuid/progression')
  async getProgression(@Param('uuid') uuid: string) {
    const progression = await this.progressionService.getProgression(uuid);
    return {
      uuid: progression.accountUuid,
      scenariosCompleted: progression.scenariosCompleted,
      totalExperience: progression.totalExperience,
      charactersPlayed: progression.charactersPlayed,
      characterExperience: progression.characterExperience,
      perksUnlocked: progression.perksUnlocked,
      completedScenarioIds: progression.completedScenarioIds,
      scenarioCharacterHistory: progression.scenarioCharacterHistory,
      createdAt: progression.createdAt,
      updatedAt: progression.updatedAt,
    };
  }

  /**
   * Get progression summary (lightweight version)
   * GET /api/accounts/:uuid/progression/summary
   */
  @Get(':uuid/progression/summary')
  async getProgressionSummary(@Param('uuid') uuid: string) {
    return this.progressionService.getProgressionSummary(uuid);
  }

  /**
   * Update progression (scenario completion, experience gain, perk unlock)
   * POST /api/accounts/:uuid/progression
   *
   * Body:
   * {
   *   scenarioCompleted?: string,
   *   characterClass?: string,
   *   experienceGained?: number,
   *   perkUnlocked?: string
   * }
   */
  @Post(':uuid/progression')
  async updateProgression(
    @Param('uuid') uuid: string,
    @Body(ValidationPipe) update: ProgressionUpdate,
  ) {
    const progression = await this.progressionService.updateProgression(
      uuid,
      update,
    );
    return {
      uuid: progression.accountUuid,
      scenariosCompleted: progression.scenariosCompleted,
      totalExperience: progression.totalExperience,
      charactersPlayed: progression.charactersPlayed,
      characterExperience: progression.characterExperience,
      updatedAt: progression.updatedAt,
    };
  }

  /**
   * Track scenario completion (explicit endpoint for clarity)
   * POST /api/accounts/:uuid/progression/scenario
   *
   * Body:
   * {
   *   scenarioId: string,
   *   characterClass: string,
   *   difficulty: number
   * }
   */
  @Post(':uuid/progression/scenario')
  async trackScenarioCompletion(
    @Param('uuid') uuid: string,
    @Body(ValidationPipe)
    body: {
      scenarioId: string;
      characterClass: string;
      difficulty: number;
    },
  ) {
    const progression = await this.progressionService.trackScenarioCompletion(
      uuid,
      body.scenarioId,
      body.characterClass,
      body.difficulty,
    );
    return {
      uuid: progression.accountUuid,
      scenariosCompleted: progression.scenariosCompleted,
      totalExperience: progression.totalExperience,
      characterExperience: progression.characterExperience,
      updatedAt: progression.updatedAt,
    };
  }

  /**
   * Unlock perk for character
   * POST /api/accounts/:uuid/progression/perk
   *
   * Body:
   * {
   *   characterClass: string,
   *   perkName: string
   * }
   */
  @Post(':uuid/progression/perk')
  async unlockPerk(
    @Param('uuid') uuid: string,
    @Body(ValidationPipe)
    body: {
      characterClass: string;
      perkName: string;
    },
  ) {
    const progression = await this.progressionService.unlockPerk(
      uuid,
      body.characterClass,
      body.perkName,
    );
    return {
      uuid: progression.accountUuid,
      characterExperience: progression.characterExperience,
      perksUnlocked: progression.perksUnlocked,
      updatedAt: progression.updatedAt,
    };
  }

  /**
   * Get account details
   * GET /api/accounts/:uuid
   */
  @Get(':uuid')
  async getAccount(@Param('uuid') uuid: string) {
    const account = await this.accountService.getAccount(uuid);
    return {
      uuid: account.uuid,
      email: account.email,
      createdAt: account.createdAt,
    };
  }

  /**
   * Check if account exists
   * HEAD /api/accounts/:uuid
   */
  @Get(':uuid/exists')
  async checkAccountExists(@Param('uuid') uuid: string) {
    const exists = await this.accountService.accountExists(uuid);
    return { exists };
  }
}
