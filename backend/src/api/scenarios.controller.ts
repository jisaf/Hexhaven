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
import { Prisma as PrismaErrors } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage, StorageEngine } from 'multer';
import { Request } from 'express';
import { extname, resolve } from 'path';
import { existsSync, unlinkSync } from 'fs';
import prisma from '../db/client';
import { Prisma } from '@prisma/client';

// Configure multer for file uploads
// Resolve to project root (one level up from backend) for consistent path resolution
const backgroundsDir = resolve(
  process.cwd(),
  '..',
  'frontend/public/backgrounds',
);
const backgroundStorage: StorageEngine = diskStorage({
  destination: backgroundsDir,
  filename: (
    req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, filename: string) => void,
  ) => {
    const scenarioId = req.params.id;
    const timestamp = Date.now();
    const ext = extname(file.originalname).toLowerCase();
    callback(null, `scenario-${scenarioId}-${timestamp}${ext}`);
  },
});

// File filter for images only
const imageFileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(
      new BadRequestException(
        'Only image files (JPEG, PNG, GIF, WebP) are allowed',
      ),
      false,
    );
  }
};

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
}

@Controller('api/scenarios')
export class ScenariosController {
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

    // Create objectives object
    const objectives = {
      primary: {
        type: 'custom',
        description: dto.objectivePrimary || 'Complete the scenario',
      },
      secondary: dto.objectiveSecondary
        ? [{ type: 'custom', description: dto.objectiveSecondary }]
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
      updateData.objectives = {
        primary: {
          type: 'custom',
          description:
            dto.objectivePrimary ||
            (existing.objectives as { primary?: { description?: string } })
              ?.primary?.description ||
            'Complete the scenario',
        },
        secondary: dto.objectiveSecondary
          ? [{ type: 'custom', description: dto.objectiveSecondary }]
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
   * POST /api/scenarios/:id/background
   * Upload a background image for a scenario
   */
  @Post(':id/background')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: backgroundStorage,
      fileFilter: imageFileFilter,
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
      },
    }),
  )
  async uploadBackground(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // Check if scenario exists
    const existing = await prisma.scenario.findUnique({
      where: { id },
    });

    if (!existing) {
      // Clean up uploaded file if scenario doesn't exist
      if (file && existsSync(file.path)) {
        unlinkSync(file.path);
      }
      throw new NotFoundException(`Scenario with id ${id} not found`);
    }

    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    // Delete old background image if it exists
    if (existing.backgroundImageUrl) {
      const oldPath = resolve(
        process.cwd(),
        '..',
        'frontend/public',
        existing.backgroundImageUrl,
      );
      if (existsSync(oldPath)) {
        try {
          unlinkSync(oldPath);
        } catch {
          // Ignore errors deleting old file
        }
      }
    }

    // Generate URL path for the uploaded file
    const url = `/backgrounds/${file.filename}`;

    // Update scenario with new background URL
    await prisma.scenario.update({
      where: { id },
      data: {
        backgroundImageUrl: url,
      },
    });

    return {
      success: true,
      url,
      filename: file.filename,
    };
  }

  /**
   * DELETE /api/scenarios/:id/background
   * Remove background image from a scenario
   */
  @Delete(':id/background')
  async deleteBackground(@Param('id') id: string) {
    const existing = await prisma.scenario.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Scenario with id ${id} not found`);
    }

    // Delete the background file if it exists
    if (existing.backgroundImageUrl) {
      const filePath = resolve(
        process.cwd(),
        '..',
        'frontend/public',
        existing.backgroundImageUrl,
      );
      if (existsSync(filePath)) {
        try {
          unlinkSync(filePath);
        } catch {
          // Ignore errors deleting file
        }
      }
    }

    // Clear background fields in database
    await prisma.scenario.update({
      where: { id },
      data: {
        backgroundImageUrl: null,
        backgroundOpacity: 1.0,
        backgroundOffsetX: 0,
        backgroundOffsetY: 0,
        backgroundScale: 1.0,
      },
    });

    return {
      success: true,
      message: 'Background removed',
    };
  }
}
