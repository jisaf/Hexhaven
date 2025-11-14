import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import {
  ProgressionModel,
  Progression,
  ProgressionUpdate,
} from '../models/progression.model';

/**
 * T202 [US7] Implement ProgressionService (trackScenarioCompletion, addExperience, unlockPerk)
 *
 * Handles:
 * - Scenario completion tracking
 * - Experience gain and level calculation
 * - Perk unlocking
 * - Multi-character progression
 */

@Injectable()
export class ProgressionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get progression for an account
   */
  async getProgression(accountUuid: string): Promise<Progression> {
    const progression = await this.prisma.progression.findUnique({
      where: { accountUuid },
    });

    if (!progression) {
      throw new NotFoundException(
        `Progression not found for account ${accountUuid}`,
      );
    }

    return ProgressionModel.fromDatabase(progression);
  }

  /**
   * Track scenario completion and award experience
   * T205: Save progression on scenario completion
   */
  async trackScenarioCompletion(
    accountUuid: string,
    scenarioId: string,
    characterClass: string,
    difficulty: number,
  ): Promise<Progression> {
    const progression = await this.getProgression(accountUuid);

    // Check if scenario already completed
    if (progression.completedScenarioIds.includes(scenarioId)) {
      throw new BadRequestException('Scenario already completed');
    }

    // Calculate experience for this scenario
    const experienceGained =
      ProgressionModel.calculateScenarioExperience(difficulty);

    // Add character if not already tracked
    let updatedProgression = ProgressionModel.addCharacter(
      progression,
      characterClass,
    );

    // Complete the scenario
    updatedProgression = ProgressionModel.completeScenario(
      updatedProgression,
      scenarioId,
      characterClass,
    );

    // Add experience to character
    updatedProgression = ProgressionModel.addExperience(
      updatedProgression,
      characterClass,
      experienceGained,
    );

    // Save to database
    const updated = await this.prisma.progression.update({
      where: { accountUuid },
      data: {
        scenariosCompleted: updatedProgression.scenariosCompleted,
        totalExperience: updatedProgression.totalExperience,
        charactersPlayed: updatedProgression.charactersPlayed,
        characterExperience: updatedProgression.characterExperience as any,
        completedScenarioIds: updatedProgression.completedScenarioIds,
        scenarioCharacterHistory:
          updatedProgression.scenarioCharacterHistory as any,
        updatedAt: new Date(),
      },
    });

    return ProgressionModel.fromDatabase(updated);
  }

  /**
   * Add experience to a character (can be called independently of scenario completion)
   */
  async addExperience(
    accountUuid: string,
    characterClass: string,
    experienceGained: number,
  ): Promise<Progression> {
    const progression = await this.getProgression(accountUuid);

    // Add character if not already tracked
    let updatedProgression = ProgressionModel.addCharacter(
      progression,
      characterClass,
    );

    // Add experience
    updatedProgression = ProgressionModel.addExperience(
      updatedProgression,
      characterClass,
      experienceGained,
    );

    // Save to database
    const updated = await this.prisma.progression.update({
      where: { accountUuid },
      data: {
        totalExperience: updatedProgression.totalExperience,
        characterExperience: updatedProgression.characterExperience as any,
        charactersPlayed: updatedProgression.charactersPlayed,
        updatedAt: new Date(),
      },
    });

    return ProgressionModel.fromDatabase(updated);
  }

  /**
   * Unlock a perk for a character
   */
  async unlockPerk(
    accountUuid: string,
    characterClass: string,
    perkName: string,
    options?: { currentLevel?: number; perksAlreadyUnlocked?: number },
  ): Promise<Progression> {
    const progression = await this.getProgression(accountUuid);

    const characterExp = progression.characterExperience[characterClass];
    if (!characterExp) {
      throw new BadRequestException(
        `Character ${characterClass} not found in progression`,
      );
    }

    // Validate perk can be unlocked
    const currentLevel = options?.currentLevel ?? characterExp.level;
    const perksUnlocked =
      options?.perksAlreadyUnlocked ?? characterExp.perksUnlocked.length;

    if (!ProgressionModel.canUnlockPerk(currentLevel, perksUnlocked)) {
      throw new BadRequestException('No available perk slots');
    }

    // Unlock the perk
    const updatedProgression = ProgressionModel.unlockPerk(
      progression,
      characterClass,
      perkName,
    );

    // Save to database
    const updated = await this.prisma.progression.update({
      where: { accountUuid },
      data: {
        characterExperience: updatedProgression.characterExperience as any,
        perksUnlocked: updatedProgression.perksUnlocked,
        updatedAt: new Date(),
      },
    });

    return ProgressionModel.fromDatabase(updated);
  }

  /**
   * Get scenarios played with a specific character
   */
  getScenariosPlayedWithCharacter(
    progression: Progression,
    characterClass: string,
  ): string[] {
    return ProgressionModel.getScenariosPlayedWithCharacter(
      progression,
      characterClass,
    );
  }

  /**
   * Calculate scenario experience based on difficulty
   * Exposed for use in other services
   */
  calculateScenarioExperience(difficulty: number): number {
    return ProgressionModel.calculateScenarioExperience(difficulty);
  }

  /**
   * Calculate level from total XP
   * Exposed for use in other services
   */
  calculateLevel(totalXP: number): number {
    return ProgressionModel.calculateLevel(totalXP);
  }

  /**
   * Get XP thresholds for levels
   * Exposed for use in other services
   */
  getXPForLevel(level: number): number {
    return ProgressionModel.getXPForLevel(level);
  }

  /**
   * Get XP needed for next level
   * Exposed for use in other services
   */
  getXPForNextLevel(currentLevel: number): number {
    return ProgressionModel.getXPForNextLevel(currentLevel);
  }

  /**
   * Get XP progress toward next level
   * Exposed for use in other services
   */
  getXPProgress(currentXP: number, currentLevel: number) {
    return ProgressionModel.getXPProgress(currentXP, currentLevel);
  }

  /**
   * Get available perks for a level
   * Exposed for use in other services
   */
  getAvailablePerks(level: number): number {
    return ProgressionModel.getAvailablePerks(level);
  }

  /**
   * Update progression with multiple changes (batch update)
   */
  async updateProgression(
    accountUuid: string,
    update: ProgressionUpdate,
  ): Promise<Progression> {
    await this.getProgression(accountUuid);

    // Apply scenario completion if provided
    if (update.scenarioCompleted && update.characterClass) {
      const difficulty = 0; // Default difficulty if not provided in update
      return this.trackScenarioCompletion(
        accountUuid,
        update.scenarioCompleted,
        update.characterClass,
        difficulty,
      );
    }

    // Apply experience gain if provided
    if (update.experienceGained && update.characterClass) {
      return this.addExperience(
        accountUuid,
        update.characterClass,
        update.experienceGained,
      );
    }

    // Apply perk unlock if provided
    if (update.perkUnlocked && update.characterClass) {
      return this.unlockPerk(
        accountUuid,
        update.characterClass,
        update.perkUnlocked,
      );
    }

    // No specific update provided, return current progression
    return this.getProgression(accountUuid);
  }

  /**
   * Get progression summary for display
   */
  async getProgressionSummary(accountUuid: string) {
    const progression = await this.getProgression(accountUuid);

    return {
      accountUuid: progression.accountUuid,
      scenariosCompleted: progression.scenariosCompleted,
      totalExperience: progression.totalExperience,
      charactersPlayed: progression.charactersPlayed.length,
      perksUnlockedCount: progression.perksUnlocked.length,
      highestLevelCharacter: this.getHighestLevelCharacter(progression),
    };
  }

  /**
   * Get highest level character from progression
   */
  private getHighestLevelCharacter(progression: Progression): {
    characterClass: string;
    level: number;
    xp: number;
  } | null {
    let highest: { characterClass: string; level: number; xp: number } | null =
      null;

    for (const [characterClass, exp] of Object.entries(
      progression.characterExperience,
    )) {
      if (
        !highest ||
        exp.level > highest.level ||
        (exp.level === highest.level && exp.xp > highest.xp)
      ) {
        highest = {
          characterClass,
          level: exp.level,
          xp: exp.xp,
        };
      }
    }

    return highest;
  }
}
