import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { MonsterType } from '../../../shared/types/entities';

@Injectable()
export class MonsterService {
  private readonly monsterTypesPath = path.join(
    __dirname,
    '..',
    'data',
    'monster-types.json',
  );

  async getAvailableMonsterTypes(): Promise<MonsterType[]> {
    try {
      const data = await fs.promises.readFile(this.monsterTypesPath, 'utf-8');
      const json = JSON.parse(data) as { monsterTypes: MonsterType[] };
      return json.monsterTypes || [];
    } catch (error) {
      console.error('Error reading monster types:', error);
      return [];
    }
  }
}
