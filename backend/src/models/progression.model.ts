/**
 * T200 [US7] Create Progression model with character XP, unlocked perks, completed scenarios
 *
 * Progression tracks player's game history across all characters:
 * - Total scenarios completed
 * - Total experience gained
 * - Characters played
 * - Per-character progression (level, XP, perks)
 * - Completed scenario IDs
 * - Scenario-character history
 */

export interface Progression {
  accountUuid: string;
  scenariosCompleted: number;
  totalExperience: number;
  charactersPlayed: string[];
  characterExperience: Record<string, CharacterExperience>;
  perksUnlocked: string[];
  completedScenarioIds: string[];
  scenarioCharacterHistory: ScenarioCharacterHistory[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CharacterExperience {
  level: number;
  xp: number;
  perksUnlocked: string[];
}

export interface ScenarioCharacterHistory {
  scenarioId: string;
  characterClass: string;
  completedAt?: Date;
}

export interface ProgressionUpdate {
  scenarioCompleted?: string;
  characterClass?: string;
  experienceGained?: number;
  perkUnlocked?: string;
}

export interface XPProgress {
  currentLevel: number;
  currentXP: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  xpNeeded: number;
  progressPercentage: number;
}

export class ProgressionModel {
  // Gloomhaven level thresholds (XP required to reach each level)
  private static readonly LEVEL_THRESHOLDS: number[] = [
    0, // Level 1: 0 XP
    45, // Level 2: 45 XP
    95, // Level 3: 95 XP
    150, // Level 4: 150 XP
    210, // Level 5: 210 XP
    275, // Level 6: 275 XP
    345, // Level 7: 345 XP
    420, // Level 8: 420 XP
    500, // Level 9: 500 XP
  ];

  private static readonly MAX_LEVEL = 9;

  /**
   * Calculate experience awarded for completing a scenario
   * Formula: base 30 XP + (difficulty * 5)
   */
  static calculateScenarioExperience(difficulty: number): number {
    return 30 + difficulty * 5;
  }

  /**
   * Determine character level from total experience
   */
  static calculateLevel(totalXP: number): number {
    for (let level = this.MAX_LEVEL; level >= 1; level--) {
      if (totalXP >= this.LEVEL_THRESHOLDS[level - 1]) {
        return level;
      }
    }
    return 1;
  }

  /**
   * Get XP threshold for a specific level
   */
  static getXPForLevel(level: number): number {
    if (level < 1 || level > this.MAX_LEVEL) {
      throw new Error(
        `Invalid level: ${level}. Must be between 1 and ${this.MAX_LEVEL}`,
      );
    }
    return this.LEVEL_THRESHOLDS[level - 1];
  }

  /**
   * Get XP needed to reach next level from current level
   */
  static getXPForNextLevel(currentLevel: number): number {
    if (currentLevel >= this.MAX_LEVEL) {
      return this.LEVEL_THRESHOLDS[this.MAX_LEVEL - 1]; // Max level, no next level
    }
    return this.LEVEL_THRESHOLDS[currentLevel];
  }

  /**
   * Calculate progress toward next level
   */
  static getXPProgress(currentXP: number, currentLevel: number): XPProgress {
    const xpForCurrentLevel = this.getXPForLevel(currentLevel);
    const xpForNextLevel = this.getXPForNextLevel(currentLevel);
    const xpNeeded = xpForNextLevel - currentXP;
    const levelRange = xpForNextLevel - xpForCurrentLevel;
    const levelProgress = currentXP - xpForCurrentLevel;
    const progressPercentage =
      levelRange > 0 ? (levelProgress / levelRange) * 100 : 100;

    return {
      currentLevel,
      currentXP,
      xpForCurrentLevel,
      xpForNextLevel,
      xpNeeded: Math.max(0, xpNeeded),
      progressPercentage: Math.min(100, Math.max(0, progressPercentage)),
    };
  }

  /**
   * Get number of available perk slots for a given level
   * Gloomhaven rules: Perks at levels 2-9
   * Level 1: 0 perks
   * Level 2: 1 perk
   * Level 3: 2 perks
   * ...
   * Level 9: 8 perks
   */
  static getAvailablePerks(level: number): number {
    if (level < 1 || level > this.MAX_LEVEL) {
      throw new Error(`Invalid level: ${level}`);
    }
    return Math.max(0, level - 1);
  }

  /**
   * Validate perk can be unlocked
   */
  static canUnlockPerk(level: number, perksAlreadyUnlocked: number): boolean {
    const availablePerks = this.getAvailablePerks(level);
    return perksAlreadyUnlocked < availablePerks;
  }

  /**
   * Create empty progression for new account
   */
  static createEmpty(accountUuid: string): Partial<Progression> {
    return {
      accountUuid,
      scenariosCompleted: 0,
      totalExperience: 0,
      charactersPlayed: [],
      characterExperience: {},
      perksUnlocked: [],
      completedScenarioIds: [],
      scenarioCharacterHistory: [],
    };
  }

  /**
   * Add character to progression if not already tracked
   */
  static addCharacter(
    progression: Progression,
    characterClass: string,
  ): Progression {
    if (!progression.charactersPlayed.includes(characterClass)) {
      return {
        ...progression,
        charactersPlayed: [...progression.charactersPlayed, characterClass],
        characterExperience: {
          ...progression.characterExperience,
          [characterClass]: {
            level: 1,
            xp: 0,
            perksUnlocked: [],
          },
        },
      };
    }
    return progression;
  }

  /**
   * Add experience to character and update level if threshold crossed
   */
  static addExperience(
    progression: Progression,
    characterClass: string,
    experienceGained: number,
  ): Progression {
    const characterExp = progression.characterExperience[characterClass] || {
      level: 1,
      xp: 0,
      perksUnlocked: [],
    };

    const newXP = characterExp.xp + experienceGained;
    const newLevel = this.calculateLevel(newXP);

    return {
      ...progression,
      totalExperience: progression.totalExperience + experienceGained,
      characterExperience: {
        ...progression.characterExperience,
        [characterClass]: {
          ...characterExp,
          xp: newXP,
          level: newLevel,
        },
      },
    };
  }

  /**
   * Mark scenario as completed
   */
  static completeScenario(
    progression: Progression,
    scenarioId: string,
    characterClass: string,
  ): Progression {
    if (progression.completedScenarioIds.includes(scenarioId)) {
      throw new Error('Scenario already completed');
    }

    return {
      ...progression,
      scenariosCompleted: progression.scenariosCompleted + 1,
      completedScenarioIds: [...progression.completedScenarioIds, scenarioId],
      scenarioCharacterHistory: [
        ...progression.scenarioCharacterHistory,
        {
          scenarioId,
          characterClass,
          completedAt: new Date(),
        },
      ],
    };
  }

  /**
   * Unlock a perk for a character
   */
  static unlockPerk(
    progression: Progression,
    characterClass: string,
    perkName: string,
  ): Progression {
    const characterExp = progression.characterExperience[characterClass];
    if (!characterExp) {
      throw new Error(`Character ${characterClass} not found in progression`);
    }

    const perksUnlocked = characterExp.perksUnlocked.length;
    if (!this.canUnlockPerk(characterExp.level, perksUnlocked)) {
      throw new Error('No available perk slots');
    }

    return {
      ...progression,
      characterExperience: {
        ...progression.characterExperience,
        [characterClass]: {
          ...characterExp,
          perksUnlocked: [...characterExp.perksUnlocked, perkName],
        },
      },
      perksUnlocked: [...progression.perksUnlocked, perkName],
    };
  }

  /**
   * Get scenarios played with a specific character
   */
  static getScenariosPlayedWithCharacter(
    progression: Progression,
    characterClass: string,
  ): string[] {
    return progression.scenarioCharacterHistory
      .filter((entry) => entry.characterClass === characterClass)
      .map((entry) => entry.scenarioId);
  }

  /**
   * Convert database Progression to domain model
   */
  static fromDatabase(dbProgression: any): Progression {
    return {
      accountUuid: dbProgression.accountUuid,
      scenariosCompleted: dbProgression.scenariosCompleted,
      totalExperience: dbProgression.totalExperience,
      charactersPlayed: Array.isArray(dbProgression.charactersPlayed)
        ? dbProgression.charactersPlayed
        : JSON.parse(dbProgression.charactersPlayed as string),
      characterExperience:
        typeof dbProgression.characterExperience === 'object'
          ? dbProgression.characterExperience
          : JSON.parse(dbProgression.characterExperience as string),
      perksUnlocked: Array.isArray(dbProgression.perksUnlocked)
        ? dbProgression.perksUnlocked
        : JSON.parse(dbProgression.perksUnlocked as string),
      completedScenarioIds: Array.isArray(dbProgression.completedScenarioIds)
        ? dbProgression.completedScenarioIds
        : JSON.parse(dbProgression.completedScenarioIds as string),
      scenarioCharacterHistory: Array.isArray(
        dbProgression.scenarioCharacterHistory,
      )
        ? dbProgression.scenarioCharacterHistory
        : JSON.parse(
            (dbProgression.scenarioCharacterHistory as string) || '[]',
          ),
      createdAt: new Date(dbProgression.createdAt),
      updatedAt: new Date(dbProgression.updatedAt),
    };
  }
}
