import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Scenario } from '../../../../shared/types';
import { v4 as uuidv4 } from 'uuid';
import { createNewScenario } from '../../../../shared/data/scenarios';

@Injectable()
export class ScenarioDesignerService {
  private readonly scenariosPath = path.join(
    __dirname,
    '..',
    '..',
    'data',
    'scenarios.json',
  );

  private async readScenariosFile(): Promise<{ scenarios: Scenario[] }> {
    try {
      const data = await fs.readFile(this.scenariosPath, 'utf-8');
      return JSON.parse(data);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return { scenarios: [] };
      }
      throw error;
    }
  }

  private async writeScenariosFile(data: {
    scenarios: Scenario[];
  }): Promise<void> {
    await fs.writeFile(this.scenariosPath, JSON.stringify(data, null, 2));
  }

  async findAll(): Promise<Omit<Scenario, 'mapLayout' | 'monsterGroups'>[]> {
    const { scenarios } = await this.readScenariosFile();
    return scenarios.map(
      ({ mapLayout: _mapLayout, monsterGroups: _monsterGroups, ...rest }) =>
        rest,
    );
  }

  async findOne(id: string): Promise<Scenario> {
    const { scenarios } = await this.readScenariosFile();
    const scenario = scenarios.find((s) => s.id === id);
    if (!scenario) {
      throw new NotFoundException(`Scenario with ID "${id}" not found`);
    }
    return scenario;
  }

  async create(scenarioData: Omit<Scenario, 'id'>): Promise<Scenario> {
    const { scenarios } = await this.readScenariosFile();
    const newScenario: Scenario = {
      ...scenarioData,
      id: `scenario-${uuidv4()}`,
    };
    scenarios.push(newScenario);
    await this.writeScenariosFile({ scenarios });
    return newScenario;
  }

  async update(id: string, scenarioData: Scenario): Promise<Scenario> {
    const { scenarios } = await this.readScenariosFile();
    const index = scenarios.findIndex((s) => s.id === id);
    if (index === -1) {
      throw new NotFoundException(`Scenario with ID "${id}" not found`);
    }
    const updatedScenario = { ...scenarioData, id };
    scenarios[index] = updatedScenario;
    await this.writeScenariosFile({ scenarios });
    return updatedScenario;
  }
}
