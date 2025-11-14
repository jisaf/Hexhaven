import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import {
  AccountModel,
  CreateAccountDto,
  AnonymousProgress,
} from '../models/account.model';

/**
 * T201 [US7] Implement AccountService (createAccount, upgradeAnonymousAccount)
 *
 * Handles:
 * - Account creation from anonymous UUID
 * - Anonymous progress migration
 * - Account retrieval
 */

@Injectable()
export class AccountService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new account (MVP: UUID-based, no email required)
   * Production: Will require email + magic link
   */
  async createAccount(dto: CreateAccountDto) {
    // Validate DTO
    const validatedDto = AccountModel.createAccountDto(dto);

    // Check if account already exists
    const existing = await this.prisma.account.findUnique({
      where: { uuid: validatedDto.uuid },
    });

    if (existing) {
      throw new ConflictException('Account already exists for this UUID');
    }

    // Create account
    const account = await this.prisma.account.create({
      data: {
        uuid: validatedDto.uuid,
        email: validatedDto.email,
      },
    });

    // If anonymous progress provided, create progression record
    if (validatedDto.anonymousProgress) {
      await this.createProgressionFromAnonymous(
        account.uuid,
        validatedDto.anonymousProgress,
      );
    } else {
      // Create empty progression
      await this.createEmptyProgression(account.uuid);
    }

    return AccountModel.fromDatabase(account);
  }

  /**
   * Upgrade anonymous account (alias for createAccount with progress migration)
   */
  async upgradeAnonymousAccount(
    uuid: string,
    anonymousProgress: AnonymousProgress,
  ) {
    return this.createAccount({
      uuid,
      anonymousProgress,
    });
  }

  /**
   * Get account by UUID
   */
  async getAccount(uuid: string) {
    const account = await this.prisma.account.findUnique({
      where: { uuid },
      include: {
        progression: true,
      },
    });

    if (!account) {
      throw new NotFoundException(`Account with UUID ${uuid} not found`);
    }

    return AccountModel.fromDatabase(account);
  }

  /**
   * Check if account exists
   */
  async accountExists(uuid: string): Promise<boolean> {
    const count = await this.prisma.account.count({
      where: { uuid },
    });
    return count > 0;
  }

  /**
   * Create progression record from anonymous progress
   */
  private async createProgressionFromAnonymous(
    accountUuid: string,
    anonymousProgress: AnonymousProgress,
  ) {
    const characterExperience = anonymousProgress.characterExperience || {};

    // Convert character experience to proper format if needed
    const formattedCharacterExperience: Record<string, any> = {};
    for (const character of anonymousProgress.charactersPlayed) {
      if (characterExperience[character]) {
        formattedCharacterExperience[character] =
          characterExperience[character];
      } else {
        // If no character experience data, initialize with defaults
        formattedCharacterExperience[character] = {
          level: 1,
          xp: 0,
          perksUnlocked: [],
        };
      }
    }

    // Extract all perks from character experience
    const allPerks: string[] = [];
    for (const charExp of Object.values(characterExperience)) {
      allPerks.push(...(charExp.perksUnlocked || []));
    }

    await this.prisma.progression.create({
      data: {
        accountUuid,
        scenariosCompleted: anonymousProgress.scenariosCompleted,
        totalExperience: anonymousProgress.totalExperience,
        charactersPlayed: anonymousProgress.charactersPlayed,
        characterExperience: formattedCharacterExperience,
        perksUnlocked: allPerks,
        completedScenarioIds: anonymousProgress.completedScenarioIds,
        scenarioCharacterHistory: [],
      },
    });
  }

  /**
   * Create empty progression for new account
   */
  private async createEmptyProgression(accountUuid: string) {
    await this.prisma.progression.create({
      data: {
        accountUuid,
        scenariosCompleted: 0,
        totalExperience: 0,
        charactersPlayed: [],
        characterExperience: {},
        perksUnlocked: [],
        completedScenarioIds: [],
        scenarioCharacterHistory: [],
      },
    });
  }

  /**
   * Delete account and all associated data
   * Note: Cascade delete will remove progression automatically
   */
  async deleteAccount(uuid: string) {
    const account = await this.prisma.account.findUnique({
      where: { uuid },
    });

    if (!account) {
      throw new NotFoundException(`Account with UUID ${uuid} not found`);
    }

    await this.prisma.account.delete({
      where: { uuid },
    });

    return { deleted: true, uuid };
  }
}
