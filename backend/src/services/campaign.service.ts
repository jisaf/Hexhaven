/**
 * Campaign Service (Issue #244 - Campaign Mode)
 * Business logic for campaign creation, management, and progression
 * Now uses database-driven templates for dynamic campaign creation
 */

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ScenarioService } from './scenario.service';
import {
  CreateCampaignDto,
  JoinCampaignDto,
  CreateCampaignCharacterDto,
} from '../types/campaign.types';
import type {
  DeathMode,
  CampaignTemplate,
  CampaignScenarioTemplate,
  CampaignWithDetails,
  CampaignCharacterSummary,
  CampaignScenarioInfo,
  CampaignScenarioCompletionResult,
  CampaignListItem,
} from '../types/campaign.types';

// Template cache TTL: 5 minutes
const TEMPLATE_CACHE_TTL_MS = 5 * 60 * 1000;

interface CachedTemplate {
  template: CampaignTemplate;
  cachedAt: number;
}

@Injectable()
export class CampaignService {
  // In-memory template cache
  private templateCache: Map<string, CachedTemplate> = new Map();
  private allTemplatesCache: {
    templates: CampaignTemplate[];
    cachedAt: number;
  } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly scenarioService: ScenarioService,
  ) {}

  /**
   * Get all available campaign templates from database
   * Uses caching and batch loading to avoid N+1 queries
   */
  async getAvailableTemplates(): Promise<CampaignTemplate[]> {
    // Check cache first
    if (
      this.allTemplatesCache &&
      Date.now() - this.allTemplatesCache.cachedAt < TEMPLATE_CACHE_TTL_MS
    ) {
      return this.allTemplatesCache.templates;
    }

    const templates = await this.prisma.campaignTemplate.findMany({
      where: { isActive: true },
      include: {
        scenarios: {
          orderBy: { sequence: 'asc' },
        },
      },
    });

    // Collect all scenario IDs that need name lookup (where name is not overridden)
    const scenarioIdsNeedingNames: string[] = [];
    for (const template of templates) {
      for (const s of template.scenarios) {
        if (!s.name) {
          scenarioIdsNeedingNames.push(s.scenarioId);
        }
      }
    }

    // Batch load all scenario names at once
    const scenarioMap = await this.scenarioService.loadScenariosByIds(
      scenarioIdsNeedingNames,
    );

    // Build templates with enriched scenario names
    const result: CampaignTemplate[] = templates.map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description || '',
      deathMode: template.deathMode as DeathMode | 'configurable',
      minPlayers: template.minPlayers,
      maxPlayers: template.maxPlayers,
      requireUniqueClasses: template.requireUniqueClasses,
      scenarios: template.scenarios.map((s) =>
        this.enrichScenarioWithName(s, scenarioMap),
      ),
    }));

    // Update cache
    this.allTemplatesCache = { templates: result, cachedAt: Date.now() };

    // Also cache individual templates
    for (const template of result) {
      this.templateCache.set(template.id, { template, cachedAt: Date.now() });
    }

    return result;
  }

  /**
   * Get a specific campaign template by ID from database
   * Uses caching and batch loading to avoid N+1 queries
   */
  async getTemplate(templateId: string): Promise<CampaignTemplate | null> {
    // Check cache first
    const cached = this.templateCache.get(templateId);
    if (cached && Date.now() - cached.cachedAt < TEMPLATE_CACHE_TTL_MS) {
      return cached.template;
    }

    const template = await this.prisma.campaignTemplate.findUnique({
      where: { id: templateId },
      include: {
        scenarios: {
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!template) return null;

    // Collect scenario IDs needing name lookup
    const scenarioIdsNeedingNames = template.scenarios
      .filter((s) => !s.name)
      .map((s) => s.scenarioId);

    // Batch load scenario names
    const scenarioMap = await this.scenarioService.loadScenariosByIds(
      scenarioIdsNeedingNames,
    );

    const result: CampaignTemplate = {
      id: template.id,
      name: template.name,
      description: template.description || '',
      deathMode: template.deathMode as DeathMode | 'configurable',
      minPlayers: template.minPlayers,
      maxPlayers: template.maxPlayers,
      requireUniqueClasses: template.requireUniqueClasses,
      scenarios: template.scenarios.map((s) =>
        this.enrichScenarioWithName(s, scenarioMap),
      ),
    };

    // Update cache
    this.templateCache.set(templateId, {
      template: result,
      cachedAt: Date.now(),
    });

    return result;
  }

  /**
   * Helper: Enrich a campaign scenario with its name from game scenario
   * Extracts duplicated logic for DRY compliance
   */
  private enrichScenarioWithName(
    s: {
      scenarioId: string;
      name: string | null;
      description: string | null;
      unlocksScenarios: unknown;
      isStarting: boolean;
      sequence: number;
    },
    scenarioMap: Map<string, { name: string }>,
  ): CampaignScenarioTemplate {
    const scenarioName =
      s.name || scenarioMap.get(s.scenarioId)?.name || s.scenarioId;
    const unlocksScenarios = s.unlocksScenarios as string[];
    return {
      scenarioId: s.scenarioId,
      name: scenarioName,
      description: s.description,
      unlocksScenarios,
      isStarting: s.isStarting,
      sequence: s.sequence,
      finalScenario: unlocksScenarios.length === 0,
    };
  }

  /**
   * Create a new campaign instance from a template
   */
  async createCampaign(
    userId: string,
    dto: CreateCampaignDto,
  ): Promise<CampaignWithDetails> {
    const template = await this.getTemplate(dto.templateId);
    if (!template) {
      throw new BadRequestException(
        `Campaign template '${dto.templateId}' not found`,
      );
    }

    // Validate death mode
    if (
      template.deathMode !== 'configurable' &&
      dto.deathMode &&
      dto.deathMode !== template.deathMode
    ) {
      throw new BadRequestException(
        `This campaign requires death mode '${template.deathMode}'`,
      );
    }

    // Find starting scenarios
    const startingScenarios = template.scenarios
      .filter((s) => s.isStarting)
      .map((s) => s.scenarioId);

    // If no isStarting flag, use first scenario (sequence 1) as fallback
    const initialUnlockedScenarios =
      startingScenarios.length > 0
        ? startingScenarios
        : template.scenarios
            .filter((s) => s.sequence === 1)
            .map((s) => s.scenarioId);

    const finalDeathMode =
      template.deathMode === 'configurable'
        ? dto.deathMode || 'healing'
        : template.deathMode;

    const campaign = await this.prisma.campaign.create({
      data: {
        templateId: dto.templateId,
        name: dto.name || template.name,
        description: template.description,
        deathMode: finalDeathMode,
        requireUniqueClasses: template.requireUniqueClasses,
        completedScenarios: [],
        retiredCharacterIds: [],
        unlockedScenarios: initialUnlockedScenarios,
        prosperityLevel: 1,
        reputation: 0,
        isCompleted: false,
      },
    });

    return this.getCampaignWithDetails(campaign.id);
  }

  /**
   * Get campaign with full details including characters and scenario info
   */
  async getCampaignWithDetails(
    campaignId: string,
  ): Promise<CampaignWithDetails> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        characters: {
          include: {
            class: true,
            user: {
              select: { id: true, username: true },
            },
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign '${campaignId}' not found`);
    }

    const completedScenarios = campaign.completedScenarios as string[];
    const unlockedScenarios = campaign.unlockedScenarios as string[];
    const retiredCharacterIds = campaign.retiredCharacterIds as string[];

    // Get the template for scenario info
    const template = campaign.templateId
      ? await this.getTemplate(campaign.templateId)
      : null;

    // Build character summaries
    const characters: CampaignCharacterSummary[] = campaign.characters.map(
      (char) => {
        const maxHealthByLevel = char.class.maxHealthByLevel as number[];
        const maxHealth =
          maxHealthByLevel[char.level - 1] || char.class.startingHealth;
        return {
          id: char.id,
          name: char.name,
          className: char.class.name,
          level: char.level,
          experience: char.experience,
          gold: char.gold,
          health: char.health,
          maxHealth,
          retired: char.retired,
          userId: char.userId,
          username: char.user.username,
        };
      },
    );

    // Build scenario info
    const availableScenarios: CampaignScenarioInfo[] = template
      ? template.scenarios.map((s) => ({
          scenarioId: s.scenarioId,
          name: s.name,
          description: s.description,
          isCompleted: completedScenarios.includes(s.scenarioId),
          isUnlocked: unlockedScenarios.includes(s.scenarioId),
          isFinalScenario: s.finalScenario || false,
        }))
      : [];

    return {
      id: campaign.id,
      templateId: campaign.templateId,
      name: campaign.name,
      description: campaign.description,
      prosperityLevel: campaign.prosperityLevel,
      reputation: campaign.reputation,
      completedScenarios,
      deathMode: campaign.deathMode as DeathMode,
      requireUniqueClasses: campaign.requireUniqueClasses,
      retiredCharacterIds,
      unlockedScenarios,
      isCompleted: campaign.isCompleted,
      completedAt: campaign.completedAt,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
      characters,
      availableScenarios,
    };
  }

  /**
   * Join a campaign with an existing character
   */
  async joinCampaign(
    userId: string,
    campaignId: string,
    dto: JoinCampaignDto,
  ): Promise<CampaignWithDetails> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign '${campaignId}' not found`);
    }

    if (campaign.isCompleted) {
      throw new BadRequestException('Cannot join a completed campaign');
    }

    // Verify the character belongs to the user and is not already in a campaign
    const character = await this.prisma.character.findUnique({
      where: { id: dto.characterId },
    });

    if (!character) {
      throw new NotFoundException(`Character '${dto.characterId}' not found`);
    }

    if (character.userId !== userId) {
      throw new ForbiddenException(
        'You can only add your own characters to campaigns',
      );
    }

    if (character.campaignId) {
      throw new BadRequestException(
        'Character is already in a campaign. Each character can only be in one campaign.',
      );
    }

    if (character.retired) {
      throw new BadRequestException(
        'Cannot add a retired character to a campaign',
      );
    }

    // Add character to campaign
    await this.prisma.character.update({
      where: { id: dto.characterId },
      data: { campaignId },
    });

    return this.getCampaignWithDetails(campaignId);
  }

  /**
   * Create a new character directly in a campaign (mid-campaign character creation)
   */
  async createCharacterInCampaign(
    userId: string,
    campaignId: string,
    dto: CreateCampaignCharacterDto,
  ): Promise<CampaignWithDetails> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign '${campaignId}' not found`);
    }

    if (campaign.isCompleted) {
      throw new BadRequestException(
        'Cannot add characters to a completed campaign',
      );
    }

    // Verify the class exists
    const characterClass = await this.prisma.characterClass.findUnique({
      where: { id: dto.classId },
    });

    if (!characterClass) {
      throw new NotFoundException(`Character class '${dto.classId}' not found`);
    }

    // Create new Level 1 character bound to campaign
    await this.prisma.character.create({
      data: {
        name: dto.name,
        userId,
        classId: dto.classId,
        campaignId,
        level: 1,
        experience: 0,
        gold: 0,
        health: characterClass.startingHealth,
        perks: [],
        retired: false,
      },
    });

    return this.getCampaignWithDetails(campaignId);
  }

  /**
   * Remove a character from a campaign (before any scenarios played)
   */
  async leaveCharacterFromCampaign(
    userId: string,
    campaignId: string,
    characterId: string,
  ): Promise<CampaignWithDetails> {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      throw new NotFoundException(`Character '${characterId}' not found`);
    }

    if (character.userId !== userId) {
      throw new ForbiddenException('You can only remove your own characters');
    }

    if (character.campaignId !== campaignId) {
      throw new BadRequestException('Character is not in this campaign');
    }

    // Remove character from campaign
    await this.prisma.character.update({
      where: { id: characterId },
      data: { campaignId: null },
    });

    return this.getCampaignWithDetails(campaignId);
  }

  /**
   * Get available scenarios for starting a new game in campaign
   */
  async getAvailableScenarios(
    campaignId: string,
  ): Promise<CampaignScenarioInfo[]> {
    const campaign = await this.getCampaignWithDetails(campaignId);
    return campaign.availableScenarios.filter(
      (s) => s.isUnlocked && !s.isCompleted,
    );
  }

  /**
   * Record scenario completion and handle unlocks/healing
   * Uses optimistic locking to handle concurrent completions safely
   */
  async recordScenarioCompletion(
    campaignId: string,
    scenarioId: string,
    victory: boolean,
    exhaustedCharacterIds: string[],
    characterResults: Array<{
      characterId: string;
      experienceGained: number;
      goldGained: number;
    }>,
  ): Promise<CampaignScenarioCompletionResult> {
    // Use a transaction with optimistic locking to prevent race conditions
    return await this.prisma.$transaction(async (tx) => {
      const campaign = await tx.campaign.findUnique({
        where: { id: campaignId },
        include: { characters: true },
      });

      if (!campaign) {
        throw new NotFoundException(`Campaign '${campaignId}' not found`);
      }

      // If already completed, return early (handles concurrent requests)
      if (campaign.isCompleted) {
        return {
          campaignId,
          scenarioId,
          victory,
          newlyUnlockedScenarios: [],
          healedCharacters: [],
          retiredCharacters: [],
          campaignCompleted: true,
          experienceGained: {},
          goldGained: {},
        };
      }

      const completedScenarios = [...(campaign.completedScenarios as string[])];
      const unlockedScenarios = [...(campaign.unlockedScenarios as string[])];
      const retiredCharacterIds = [
        ...(campaign.retiredCharacterIds as string[]),
      ];
      const deathMode = campaign.deathMode as DeathMode;

      // Get template for scenario unlock info
      const template = campaign.templateId
        ? await this.getTemplate(campaign.templateId)
        : null;
      const scenarioTemplate = template?.scenarios.find(
        (s) => s.scenarioId === scenarioId,
      );

      const newlyUnlockedScenarios: string[] = [];
      const healedCharacters: string[] = [];
      const newlyRetiredCharacters: string[] = [];

      // Handle victory
      if (victory) {
        // Add to completed scenarios if not already completed
        if (!completedScenarios.includes(scenarioId)) {
          completedScenarios.push(scenarioId);
        }

        // Unlock new scenarios
        if (scenarioTemplate?.unlocksScenarios) {
          for (const unlockId of scenarioTemplate.unlocksScenarios) {
            if (!unlockedScenarios.includes(unlockId)) {
              unlockedScenarios.push(unlockId);
              newlyUnlockedScenarios.push(unlockId);
            }
          }
        }
      }

      // Handle character healing and retirement based on death mode
      const activeCharacterIds = campaign.characters
        .filter((c) => !c.retired)
        .map((c) => c.id);

      for (const char of campaign.characters) {
        if (char.retired) continue;

        const isExhausted = exhaustedCharacterIds.includes(char.id);

        if (deathMode === 'permadeath' && isExhausted) {
          // In permadeath mode: exhausted characters retire
          retiredCharacterIds.push(char.id);
          newlyRetiredCharacters.push(char.id);
          await tx.character.update({
            where: { id: char.id },
            data: { retired: true },
          });
        } else {
          // Heal to full health (both modes for non-exhausted, healing mode for all)
          const charClass = await tx.characterClass.findUnique({
            where: { id: char.classId },
          });
          if (charClass) {
            const maxHealthByLevel = charClass.maxHealthByLevel as number[];
            const maxHealth =
              maxHealthByLevel[char.level - 1] || charClass.startingHealth;
            await tx.character.update({
              where: { id: char.id },
              data: { health: maxHealth },
            });
            healedCharacters.push(char.id);
          }
        }
      }

      // Apply experience and gold to characters
      const experienceGained: Record<string, number> = {};
      const goldGained: Record<string, number> = {};

      for (const result of characterResults) {
        experienceGained[result.characterId] = result.experienceGained;
        goldGained[result.characterId] = result.goldGained;

        await tx.character.update({
          where: { id: result.characterId },
          data: {
            experience: { increment: result.experienceGained },
            gold: { increment: result.goldGained },
          },
        });
      }

      // Check if campaign is completed
      const isCampaignCompleted =
        scenarioTemplate?.finalScenario && victory
          ? true
          : this.checkCampaignCompletion(
              template,
              completedScenarios,
              retiredCharacterIds,
              activeCharacterIds,
            );

      // Update campaign with optimistic locking (check updatedAt hasn't changed)
      const updated = await tx.campaign.updateMany({
        where: {
          id: campaignId,
          updatedAt: campaign.updatedAt, // Optimistic lock
        },
        data: {
          completedScenarios,
          unlockedScenarios,
          retiredCharacterIds,
          isCompleted: isCampaignCompleted,
          completedAt: isCampaignCompleted ? new Date() : null,
        },
      });

      // If no rows updated, another transaction beat us - refetch and return
      if (updated.count === 0) {
        const refreshed = await tx.campaign.findUnique({
          where: { id: campaignId },
        });
        return {
          campaignId,
          scenarioId,
          victory,
          newlyUnlockedScenarios: [],
          healedCharacters,
          retiredCharacters: newlyRetiredCharacters,
          campaignCompleted: refreshed?.isCompleted ?? false,
          experienceGained,
          goldGained,
        };
      }

      return {
        campaignId,
        scenarioId,
        victory,
        newlyUnlockedScenarios,
        healedCharacters,
        retiredCharacters: newlyRetiredCharacters,
        campaignCompleted: isCampaignCompleted,
        experienceGained,
        goldGained,
      };
    });
  }

  /**
   * Get all campaigns for a user (where user has characters)
   */
  async getUserCampaigns(userId: string): Promise<CampaignListItem[]> {
    const campaigns = await this.prisma.campaign.findMany({
      where: {
        characters: {
          some: { userId },
        },
      },
      include: {
        characters: true,
        template: {
          include: {
            scenarios: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return campaigns.map((campaign) => {
      const completedScenarios = campaign.completedScenarios as string[];

      return {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        deathMode: campaign.deathMode as DeathMode,
        prosperityLevel: campaign.prosperityLevel,
        reputation: campaign.reputation,
        isCompleted: campaign.isCompleted,
        characterCount: campaign.characters.length,
        completedScenariosCount: completedScenarios.length,
        totalScenariosCount: campaign.template?.scenarios.length || 0,
        createdAt: campaign.createdAt,
      };
    });
  }

  /**
   * Get active (non-retired) characters in a campaign for the user
   */
  async getActiveCharactersInCampaign(
    userId: string,
    campaignId: string,
  ): Promise<CampaignCharacterSummary[]> {
    const campaign = await this.getCampaignWithDetails(campaignId);
    return campaign.characters.filter((c) => c.userId === userId && !c.retired);
  }

  /**
   * Check if a campaign requires unique character classes
   * Used by game gateway to validate character selection
   */
  async getRequireUniqueClasses(campaignId: string): Promise<boolean> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { requireUniqueClasses: true },
    });
    return campaign?.requireUniqueClasses ?? false; // Default to false if not found
  }

  /**
   * Check if a user has access to a campaign
   * Access is granted if:
   * 1. User has a character in the campaign, OR
   * 2. Campaign has no characters yet (newly created - anyone can join)
   */
  async userHasAccessToCampaign(
    userId: string,
    campaignId: string,
  ): Promise<boolean> {
    // Check if user has a character in this campaign
    const userCharCount = await this.prisma.character.count({
      where: {
        campaignId,
        userId,
      },
    });
    if (userCharCount > 0) {
      return true;
    }

    // Allow access to campaigns with no characters (newly created)
    const totalCharCount = await this.prisma.character.count({
      where: { campaignId },
    });
    return totalCharCount === 0;
  }

  /**
   * Clear the template cache (useful for testing or after template updates)
   */
  clearTemplateCache(): void {
    this.templateCache.clear();
    this.allTemplatesCache = null;
  }

  // ========== Private Helper Methods ==========

  /**
   * Check if campaign is completed (all scenarios done or all characters retired)
   */
  private checkCampaignCompletion(
    template: CampaignTemplate | null,
    completedScenarios: string[],
    retiredCharacterIds: string[],
    activeCharacterIds: string[],
  ): boolean {
    if (!template) return false;

    // Check if final scenario completed
    const finalScenario = template.scenarios.find((s) => s.finalScenario);
    if (
      finalScenario &&
      completedScenarios.includes(finalScenario.scenarioId)
    ) {
      return true;
    }

    // In permadeath mode: campaign fails if all characters retired
    const remainingActiveCharacters = activeCharacterIds.filter(
      (id) => !retiredCharacterIds.includes(id),
    );
    if (
      remainingActiveCharacters.length === 0 &&
      activeCharacterIds.length > 0
    ) {
      return true; // Campaign over - all characters retired
    }

    return false;
  }
}
