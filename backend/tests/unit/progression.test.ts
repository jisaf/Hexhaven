import { Test, TestingModule } from '@nestjs/testing';
import { ProgressionService } from '../../src/services/progression.service';
import { PrismaService } from '../../src/services/prisma.service';

/**
 * T198 [US7] Unit test: Character progression tracking (experience, perks)
 *
 * Tests:
 * - Experience gain calculation
 * - Level-up thresholds
 * - Perk unlocking logic
 * - Scenario completion tracking
 */

describe('ProgressionService (T198)', () => {
  let service: ProgressionService;
  let prisma: PrismaService;

  const mockPrisma = {
    progression: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressionService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<ProgressionService>(ProgressionService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Experience Gain and Level Calculation', () => {
    it('should calculate correct experience for scenario completion', () => {
      // Experience formula: base 30 XP + (difficulty * 5)
      const difficulty0XP = service.calculateScenarioExperience(0);
      const difficulty3XP = service.calculateScenarioExperience(3);
      const difficulty7XP = service.calculateScenarioExperience(7);

      expect(difficulty0XP).toBe(30); // 30 + (0 * 5)
      expect(difficulty3XP).toBe(45); // 30 + (3 * 5)
      expect(difficulty7XP).toBe(65); // 30 + (7 * 5)
    });

    it('should determine character level from total experience', () => {
      // Level thresholds (Gloomhaven rules):
      // Level 1: 0-44 XP
      // Level 2: 45-94 XP
      // Level 3: 95-149 XP
      // Level 4: 150-209 XP
      // ...
      // Level 9: 500+ XP

      expect(service.calculateLevel(0)).toBe(1);
      expect(service.calculateLevel(44)).toBe(1);
      expect(service.calculateLevel(45)).toBe(2);
      expect(service.calculateLevel(94)).toBe(2);
      expect(service.calculateLevel(95)).toBe(3);
      expect(service.calculateLevel(150)).toBe(4);
      expect(service.calculateLevel(500)).toBe(9);
      expect(service.calculateLevel(1000)).toBe(9); // Level 9 is max
    });

    it('should calculate XP needed for next level', () => {
      expect(service.getXPForNextLevel(1)).toBe(45); // Level 1 needs 45 total for level 2
      expect(service.getXPForNextLevel(2)).toBe(95); // Level 2 needs 95 total for level 3
      expect(service.getXPForNextLevel(3)).toBe(150);
      expect(service.getXPForNextLevel(9)).toBe(500); // Level 9 is max, no next level
    });

    it('should calculate XP progress toward next level', () => {
      const progress = service.getXPProgress(70, 2); // 70 XP at level 2

      expect(progress).toMatchObject({
        currentLevel: 2,
        currentXP: 70,
        xpForCurrentLevel: 45, // Level 2 starts at 45
        xpForNextLevel: 95,    // Level 3 starts at 95
        xpNeeded: 25,          // 95 - 70
        progressPercentage: 50 // (70 - 45) / (95 - 45) = 25/50 = 50%
      });
    });
  });

  describe('Perk Unlocking', () => {
    it('should grant perk checkmarks based on level', () => {
      // Gloomhaven rules: Characters gain perks at certain level milestones
      // Level 2: 1 perk
      // Level 3: 2 perks (cumulative)
      // Level 4: 3 perks
      // ...
      // Level 9: 8 perks

      expect(service.getAvailablePerks(1)).toBe(0);
      expect(service.getAvailablePerks(2)).toBe(1);
      expect(service.getAvailablePerks(3)).toBe(2);
      expect(service.getAvailablePerks(4)).toBe(3);
      expect(service.getAvailablePerks(9)).toBe(8);
    });

    it('should track which perks have been unlocked', async () => {
      const accountUuid = 'test-uuid';
      const progression = {
        accountUuid: accountUuid,
        totalExperience: 150,
        scenariosCompleted: 5,
        charactersPlayed: ['Brute'],
        characterExperience: {
          'Brute': {
            level: 4,
            xp: 150,
            perksUnlocked: ['Remove two -1 cards', 'Replace one -1 with +1']
          }
        },
        perksUnlocked: ['Remove two -1 cards', 'Replace one -1 with +1'],
        completedScenarioIds: ['scenario-1', 'scenario-2', 'scenario-3', 'scenario-4', 'scenario-5'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.progression.findUnique.mockResolvedValue(progression);

      const result = await service.getProgression(accountUuid);

      expect(result.characterExperience['Brute'].perksUnlocked).toHaveLength(2);
      expect(result.perksUnlocked).toContain('Remove two -1 cards');
      expect(result.perksUnlocked).toContain('Replace one -1 with +1');
    });

    it('should prevent unlocking more perks than available for level', async () => {
      const accountUuid = 'test-uuid';

      // Level 2 character (1 perk available) trying to unlock 2 perks
      await expect(
        service.unlockPerk(accountUuid, 'Brute', 'Second Perk', {
          currentLevel: 2,
          perksAlreadyUnlocked: 1
        })
      ).rejects.toThrow('No available perk slots');
    });

    it('should allow unlocking perks up to available limit', async () => {
      const accountUuid = 'test-uuid';
      const progression = {
        accountUuid: accountUuid,
        totalExperience: 95,
        scenariosCompleted: 3,
        charactersPlayed: ['Spellweaver'],
        characterExperience: {
          'Spellweaver': {
            level: 3,
            xp: 95,
            perksUnlocked: ['Add one +1 card']
          }
        },
        perksUnlocked: ['Add one +1 card'],
        completedScenarioIds: ['scenario-1', 'scenario-2', 'scenario-3'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.progression.findUnique.mockResolvedValue(progression);
      mockPrisma.progression.update.mockResolvedValue({
        ...progression,
        characterExperience: {
          'Spellweaver': {
            level: 3,
            xp: 95,
            perksUnlocked: ['Add one +1 card', 'Add one +2 card']
          }
        },
        perksUnlocked: ['Add one +1 card', 'Add one +2 card']
      });

      // Level 3 has 2 perk slots, 1 used, 1 available
      await service.unlockPerk(accountUuid, 'Spellweaver', 'Add one +2 card');

      expect(mockPrisma.progression.update).toHaveBeenCalled();
    });
  });

  describe('Scenario Completion Tracking', () => {
    it('should add experience when scenario is completed', async () => {
      const accountUuid = 'test-uuid';
      const existingProgression = {
        accountUuid: accountUuid,
        totalExperience: 90,
        scenariosCompleted: 3,
        charactersPlayed: ['Brute'],
        characterExperience: {
          'Brute': { level: 2, xp: 90, perksUnlocked: [] }
        },
        perksUnlocked: [],
        completedScenarioIds: ['scenario-1', 'scenario-2', 'scenario-3'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.progression.findUnique.mockResolvedValue(existingProgression);
      mockPrisma.progression.update.mockResolvedValue({
        ...existingProgression,
        totalExperience: 135, // 90 + 45 (difficulty 3)
        scenariosCompleted: 4,
        characterExperience: {
          'Brute': { level: 3, xp: 135, perksUnlocked: ['Remove two -1 cards'] }
        },
        completedScenarioIds: ['scenario-1', 'scenario-2', 'scenario-3', 'scenario-4']
      });

      const result = await service.trackScenarioCompletion(accountUuid, 'scenario-4', 'Brute', 3);

      expect(result.scenariosCompleted).toBe(4);
      expect(result.totalExperience).toBe(135);
      expect(result.characterExperience['Brute'].xp).toBe(135);
      expect(result.characterExperience['Brute'].level).toBe(3); // Leveled up from 2 to 3
    });

    it('should not add duplicate scenario completions', async () => {
      const accountUuid = 'test-uuid';
      const progression = {
        accountUuid: accountUuid,
        totalExperience: 90,
        scenariosCompleted: 3,
        charactersPlayed: ['Brute'],
        characterExperience: {
          'Brute': { level: 2, xp: 90, perksUnlocked: [] }
        },
        perksUnlocked: [],
        completedScenarioIds: ['scenario-1', 'scenario-2', 'scenario-3'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.progression.findUnique.mockResolvedValue(progression);

      // Attempt to complete scenario-2 again
      await expect(
        service.trackScenarioCompletion(accountUuid, 'scenario-2', 'Brute', 0)
      ).rejects.toThrow('Scenario already completed');
    });

    it('should track multiple characters playing same scenario', async () => {
      const accountUuid = 'test-uuid';
      const progression = {
        accountUuid: accountUuid,
        totalExperience: 180,
        scenariosCompleted: 6,
        charactersPlayed: ['Brute', 'Tinkerer'],
        characterExperience: {
          'Brute': { level: 3, xp: 95, perksUnlocked: ['Remove two -1 cards'] },
          'Tinkerer': { level: 2, xp: 85, perksUnlocked: [] }
        },
        perksUnlocked: ['Remove two -1 cards'],
        completedScenarioIds: ['scenario-1', 'scenario-2', 'scenario-3', 'scenario-4', 'scenario-5', 'scenario-6'],
        scenarioCharacterHistory: [
          { scenarioId: 'scenario-1', characterClass: 'Brute' },
          { scenarioId: 'scenario-2', characterClass: 'Brute' },
          { scenarioId: 'scenario-3', characterClass: 'Tinkerer' },
          { scenarioId: 'scenario-4', characterClass: 'Brute' },
          { scenarioId: 'scenario-5', characterClass: 'Tinkerer' },
          { scenarioId: 'scenario-6', characterClass: 'Tinkerer' }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.progression.findUnique.mockResolvedValue(progression);

      const bruteScenarios = service.getScenariosPlayedWithCharacter(progression, 'Brute');
      const tinkererScenarios = service.getScenariosPlayedWithCharacter(progression, 'Tinkerer');

      expect(bruteScenarios).toEqual(['scenario-1', 'scenario-2', 'scenario-4']);
      expect(tinkererScenarios).toEqual(['scenario-3', 'scenario-5', 'scenario-6']);
    });

    it('should handle character level-up on scenario completion', async () => {
      const accountUuid = 'test-uuid';
      const progression = {
        accountUuid: accountUuid,
        totalExperience: 140,
        scenariosCompleted: 4,
        charactersPlayed: ['Spellweaver'],
        characterExperience: {
          'Spellweaver': { level: 3, xp: 140, perksUnlocked: ['Add one +1 card', 'Add one +2 card'] }
        },
        perksUnlocked: ['Add one +1 card', 'Add one +2 card'],
        completedScenarioIds: ['scenario-1', 'scenario-2', 'scenario-3', 'scenario-4'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.progression.findUnique.mockResolvedValue(progression);
      mockPrisma.progression.update.mockResolvedValue({
        ...progression,
        totalExperience: 180, // 140 + 40 (difficulty 2)
        scenariosCompleted: 5,
        characterExperience: {
          'Spellweaver': { level: 4, xp: 180, perksUnlocked: ['Add one +1 card', 'Add one +2 card'] }
        },
        completedScenarioIds: ['scenario-1', 'scenario-2', 'scenario-3', 'scenario-4', 'scenario-5']
      });

      const result = await service.trackScenarioCompletion(accountUuid, 'scenario-5', 'Spellweaver', 2);

      expect(result.characterExperience['Spellweaver'].level).toBe(4); // Leveled up from 3 to 4 (150 XP threshold crossed)
      expect(result.totalExperience).toBe(180);
    });
  });

  describe('Multi-Character Progression', () => {
    it('should track separate progression for each character', async () => {
      const accountUuid = 'test-uuid';
      const progression = {
        accountUuid: accountUuid,
        totalExperience: 450,
        scenariosCompleted: 15,
        charactersPlayed: ['Brute', 'Tinkerer', 'Spellweaver'],
        characterExperience: {
          'Brute': { level: 5, xp: 180, perksUnlocked: ['Remove two -1 cards', 'Replace one -1 with +1', 'Add one +2 card'] },
          'Tinkerer': { level: 3, xp: 120, perksUnlocked: ['Add two +1 cards', 'Add one +1 card'] },
          'Spellweaver': { level: 4, xp: 150, perksUnlocked: ['Add one +1 card', 'Add one +2 card', 'Add one +2 card (fire)'] }
        },
        perksUnlocked: [
          'Remove two -1 cards',
          'Replace one -1 with +1',
          'Add one +2 card',
          'Add two +1 cards',
          'Add one +1 card',
          'Add one +2 card (fire)'
        ],
        completedScenarioIds: Array.from({ length: 15 }, (_, i) => `scenario-${i + 1}`),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.progression.findUnique.mockResolvedValue(progression);

      const result = await service.getProgression(accountUuid);

      expect(result.charactersPlayed).toHaveLength(3);
      expect(result.characterExperience['Brute'].level).toBe(5);
      expect(result.characterExperience['Tinkerer'].level).toBe(3);
      expect(result.characterExperience['Spellweaver'].level).toBe(4);
    });

    it('should add new character to existing progression', async () => {
      const accountUuid = 'test-uuid';
      const progression = {
        accountUuid: accountUuid,
        totalExperience: 90,
        scenariosCompleted: 3,
        charactersPlayed: ['Brute'],
        characterExperience: {
          'Brute': { level: 2, xp: 90, perksUnlocked: [] }
        },
        perksUnlocked: [],
        completedScenarioIds: ['scenario-1', 'scenario-2', 'scenario-3'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.progression.findUnique.mockResolvedValue(progression);
      mockPrisma.progression.update.mockResolvedValue({
        ...progression,
        totalExperience: 130,
        scenariosCompleted: 4,
        charactersPlayed: ['Brute', 'Scoundrel'],
        characterExperience: {
          'Brute': { level: 2, xp: 90, perksUnlocked: [] },
          'Scoundrel': { level: 1, xp: 40, perksUnlocked: [] }
        },
        completedScenarioIds: ['scenario-1', 'scenario-2', 'scenario-3', 'scenario-4']
      });

      const result = await service.trackScenarioCompletion(accountUuid, 'scenario-4', 'Scoundrel', 2);

      expect(result.charactersPlayed).toContain('Scoundrel');
      expect(result.characterExperience['Scoundrel']).toBeDefined();
      expect(result.characterExperience['Scoundrel'].level).toBe(1);
    });
  });
});
