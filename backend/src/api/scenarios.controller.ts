/**
 * Scenarios Controller (US2 - T101, T102)
 *
 * REST API endpoints for scenario browsing:
 * - GET /api/scenarios - List available scenarios
 * - GET /api/scenarios/:id - Get scenario details
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { ScenarioService } from '../services/scenario.service';
import { Scenario } from '../../../shared/types/entities';

@Controller('api/scenarios')
export class ScenariosController {
  constructor(private readonly scenarioService: ScenarioService) {}

  @Post()
  async createScenario(@Body() scenario: Omit<Scenario, 'id'>) {
    const newScenario = await this.scenarioService.saveScenario(scenario);
    return {
      message: 'Scenario saved successfully',
      scenario: newScenario,
    };
  }

  /**
   * GET /api/scenarios
   * List all available scenarios
   */
  @Get()
  async listScenarios() {
    const scenarios = await this.scenarioService.getAvailableScenarios();
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
    const scenario = await this.scenarioService.loadScenario(id);

    if (!scenario) {
      throw new NotFoundException(`Scenario with id ${id} not found`);
    }

    // Validate scenario data
    const validation = this.scenarioService.validateScenario(scenario);
    if (!validation.valid) {
      console.warn(`Scenario ${id} validation failed:`, validation.errors);
    }

    return {
      scenario,
      validation,
    };
  }
}
