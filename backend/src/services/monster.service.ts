
import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class MonsterService {
  private readonly monsterTypesPath = path.join(
    __dirname,
    '..',
    'data',
    'monster-types.json',
  );

  async getAvailableMonsterTypes(): Promise<any[]> {
    try {
      const data = await fs.readFile(this.monsterTypesPath, 'utf-8');
      const json = JSON.parse(data);
      return json.monsterTypes || [];
    } catch (error) {
      console.error('Error reading monster types:', error);
      return [];
    }
  }
}
