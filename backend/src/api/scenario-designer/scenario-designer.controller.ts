
import { Controller, Get, Post, Put, Param, Body } from '@nestjs/common';
import { ScenarioDesignerService } from './scenario-designer.service';
import type { Scenario } from '../../../../shared/types';

@Controller('api/scenarios/designer')
export class ScenarioDesignerController {
  constructor(private readonly scenarioDesignerService: ScenarioDesignerService) {}

  @Get()
  findAll() {
    return this.scenarioDesignerService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.scenarioDesignerService.findOne(id);
  }

  @Post()
  create(@Body() scenarioData: Omit<Scenario, 'id'>) {
    return this.scenarioDesignerService.create(scenarioData);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() scenarioData: Scenario) {
    return this.scenarioDesignerService.update(id, scenarioData);
  }
}
