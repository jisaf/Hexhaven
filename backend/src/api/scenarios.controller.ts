/**
 * Scenarios Controller (002 - Phase 6)
 *
 * REST API endpoints for scenario browsing using Prisma database:
 * - GET /api/scenarios - List available scenarios
 * - GET /api/scenarios/:id - Get scenario details
 */

import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import prisma from '../db/client';

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
}
