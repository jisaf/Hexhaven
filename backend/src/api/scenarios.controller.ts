/**
 * Scenarios Controller (002 - Phase 6 + Issue #191)
 *
 * REST API endpoints for scenario management using Prisma database:
 * - GET /api/scenarios - List available scenarios
 * - GET /api/scenarios/:id - Get scenario details
 * - POST /api/scenarios - Create a new scenario
 * - PUT /api/scenarios/:id - Update an existing scenario
 * - POST /api/scenarios/:id/background - Upload background image
 * - DELETE /api/scenarios/:id/background - Remove background image
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { Prisma as PrismaErrors, Prisma } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import prisma from '../db/client';
import {
  BackgroundUploadService,
  backgroundUploadConfig,
  standaloneBackgroundUploadConfig,
} from '../services/background-upload.service';

// DTO for creating/updating scenarios
interface CreateScenarioDto {
  name: string;
  difficulty: number;
  objectivePrimary: string;
  objectiveSecondary?: string;
  mapLayout: Prisma.InputJsonValue;
  monsterGroups: Prisma.InputJsonValue;
  playerStartPositions?: Prisma.InputJsonValue;
  treasures?: Prisma.InputJsonValue;
  backgroundImageUrl?: string;
  backgroundOpacity?: number;
  backgroundOffsetX?: number;
  backgroundOffsetY?: number;
  backgroundScale?: number;
  backgroundAnchors?: Prisma.InputJsonValue;
}

@Controller('api/scenarios')
export class ScenariosController {
  constructor(
    private readonly backgroundUploadService: BackgroundUploadService,
  ) {}
  /**
   * GET /api/scenarios
   * List all available scenarios from database
   */
  @Get()
  async listScenarios() {
    const scenarios = await prisma.scenario.findMany({
      select: {
        id: true,
        name: true,
        difficulty: true,
        backgroundImageUrl: true,
        backgroundOpacity: true,
      },
      orderBy: {
        difficulty: 'asc',
      },
    });

    return {
      scenarios,
      count: scenarios.length,
    };
  }

  /**
   * GET /api/scenarios/:id
   * Get detailed information about a specific scenario
   */
  @Get(':id')
  async getScenario(@Param('id') id: string) {
    const scenario = await prisma.scenario.findUnique({
      where: { id },
    });

    if (!scenario) {
      throw new NotFoundException(`Scenario with id ${id} not found`);
    }

    return {
      scenario,
    };
  }

  /**
   * POST /api/scenarios
   * Create a new scenario
   */
  @Post()
  async createScenario(@Body() dto: CreateScenarioDto) {
    // Validate required fields
    if (!dto.name || dto.name.trim().length === 0) {
      throw new BadRequestException('Scenario name is required');
    }

    if (
      !dto.mapLayout ||
      !Array.isArray(dto.mapLayout) ||
      (dto.mapLayout as unknown[]).length === 0
    ) {
      throw new BadRequestException(
        'Map layout is required and must have at least one hex',
      );
    }

    // Create objectives object with proper ObjectiveDefinition structure
    const objectives = {
      primary: {
        id: 'primary-kill-all',
        type: 'kill_all_monsters',
        description: dto.objectivePrimary || 'Defeat all enemies',
        trackProgress: true,
        milestones: [25, 50, 75, 100],
      },
      secondary: dto.objectiveSecondary
        ? [
            {
              id: 'secondary-bonus',
              type: 'custom',
              description: dto.objectiveSecondary,
              trackProgress: false,
              rewards: { experience: 5 },
            },
          ]
        : [],
    };

    // Validate background transform values
    const backgroundOpacity =
      dto.backgroundOpacity !== undefined
        ? Math.max(0, Math.min(1, dto.backgroundOpacity))
        : undefined;
    const backgroundScale =
      dto.backgroundScale !== undefined
        ? Math.max(0.5, Math.min(3, dto.backgroundScale))
        : undefined;

    try {
      const scenario = await prisma.scenario.create({
        data: {
          name: dto.name.trim(),
          difficulty: dto.difficulty || 1,
          mapLayout: dto.mapLayout,
          monsterGroups: dto.monsterGroups || [],
          objectives,
          playerStartPositions: dto.playerStartPositions || {},
          treasures: dto.treasures || [],
          backgroundImageUrl: dto.backgroundImageUrl,
          backgroundOpacity,
          backgroundOffsetX: dto.backgroundOffsetX,
          backgroundOffsetY: dto.backgroundOffsetY,
          backgroundScale,
          backgroundAnchors: dto.backgroundAnchors,
        },
      });

      return {
        success: true,
        scenario,
      };
    } catch (error) {
      // Handle unique constraint violation (duplicate scenario name)
      if (
        error instanceof PrismaErrors.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `A scenario with the name "${dto.name.trim()}" already exists`,
        );
      }
      throw error;
    }
  }

  /**
   * PUT /api/scenarios/:id
   * Update an existing scenario
   */
  @Put(':id')
  async updateScenario(
    @Param('id') id: string,
    @Body() dto: Partial<CreateScenarioDto>,
  ) {
    // Check if scenario exists
    const existing = await prisma.scenario.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Scenario with id ${id} not found`);
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name.trim();
    }

    if (dto.difficulty !== undefined) {
      updateData.difficulty = dto.difficulty;
    }

    if (dto.mapLayout !== undefined) {
      updateData.mapLayout = dto.mapLayout;
    }

    if (dto.monsterGroups !== undefined) {
      updateData.monsterGroups = dto.monsterGroups;
    }

    if (
      dto.objectivePrimary !== undefined ||
      dto.objectiveSecondary !== undefined
    ) {
      const existingPrimary = (
        existing.objectives as { primary?: { description?: string } }
      )?.primary;
      updateData.objectives = {
        primary: {
          id: 'primary-kill-all',
          type: 'kill_all_monsters',
          description:
            dto.objectivePrimary ||
            existingPrimary?.description ||
            'Defeat all enemies',
          trackProgress: true,
          milestones: [25, 50, 75, 100],
        },
        secondary: dto.objectiveSecondary
          ? [
              {
                id: 'secondary-bonus',
                type: 'custom',
                description: dto.objectiveSecondary,
                trackProgress: false,
                rewards: { experience: 5 },
              },
            ]
          : (existing.objectives as { secondary?: unknown[] })?.secondary || [],
      };
    }

    if (dto.playerStartPositions !== undefined) {
      updateData.playerStartPositions = dto.playerStartPositions;
    }

    if (dto.treasures !== undefined) {
      updateData.treasures = dto.treasures;
    }

    // Background image fields
    if (dto.backgroundImageUrl !== undefined) {
      updateData.backgroundImageUrl = dto.backgroundImageUrl;
    }

    if (dto.backgroundOpacity !== undefined) {
      updateData.backgroundOpacity = Math.max(
        0,
        Math.min(1, dto.backgroundOpacity),
      );
    }

    if (dto.backgroundOffsetX !== undefined) {
      updateData.backgroundOffsetX = dto.backgroundOffsetX;
    }

    if (dto.backgroundOffsetY !== undefined) {
      updateData.backgroundOffsetY = dto.backgroundOffsetY;
    }

    if (dto.backgroundScale !== undefined) {
      updateData.backgroundScale = Math.max(
        0.5,
        Math.min(3, dto.backgroundScale),
      );
    }

    if (dto.backgroundAnchors !== undefined) {
      updateData.backgroundAnchors = dto.backgroundAnchors;
    }

    const scenario = await prisma.scenario.update({
      where: { id },
      data: updateData,
    });

    return {
      success: true,
      scenario,
    };
  }

  /**
   * POST /api/backgrounds
   * Upload a standalone background image (not tied to a scenario)
   * Used for immediate uploads when scenario doesn't exist yet
   */
  @Post('backgrounds')
  @UseInterceptors(FileInterceptor('image', standaloneBackgroundUploadConfig))
  uploadStandaloneBackground(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    return this.backgroundUploadService.uploadStandaloneBackground(file);
  }

  /**
   * POST /api/scenarios/:id/background
   * Upload a background image for a scenario
   */
  @Post(':id/background')
  @UseInterceptors(FileInterceptor('image', backgroundUploadConfig))
  async uploadBackground(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    return this.backgroundUploadService.uploadBackground(id, file);
  }

  /**
   * DELETE /api/scenarios/:id/background
   * Remove background image from a scenario
   */
  @Delete(':id/background')
  async deleteBackground(@Param('id') id: string) {
    return this.backgroundUploadService.deleteBackground(id);
  }
}
