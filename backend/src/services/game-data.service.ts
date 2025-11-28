/**
 * Game Data Service
 *
 * This service is responsible for loading all static game data from JSON files
 * into memory when the application starts. This avoids synchronous file reads
 * during the request cycle, which is a major performance bottleneck.
 *
 * The service is initialized in `main.ts` and can be accessed as a singleton
 * throughout the application.
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import type { CharacterClass } from '../../../shared/types/entities';

interface CharacterData {
  classType: CharacterClass;
  avatar: string;
  // Other properties...
}

interface MonsterTypeData {
  type: string;
  isElite: boolean;
  avatar: string;
  // Other properties...
}

class GameDataService {
  private characters: CharacterData[] = [];
  private monsterTypes: MonsterTypeData[] = [];

  async loadData() {
    try {
      const charactersPath = path.join(__dirname, '../data/characters.json');
      console.log(`Loading characters from: ${charactersPath}`);
      const charactersData = await fs.readFile(charactersPath, 'utf-8');
      this.characters = JSON.parse(charactersData).characters;
      console.log(`Loaded ${this.characters.length} characters.`);

      const monsterTypesPath = path.join(__dirname, '../data/monster-types.json');
      console.log(`Loading monster types from: ${monsterTypesPath}`);
      const monsterTypesData = await fs.readFile(monsterTypesPath, 'utf-8');
      this.monsterTypes = JSON.parse(monsterTypesData).monsterTypes;
      console.log(`Loaded ${this.monsterTypes.length} monster types.`);

      console.log('Game data loaded successfully.');
    } catch (error) {
      console.error('Failed to load game data:', error);
      // Exit the process if the core game data cannot be loaded.
      process.exit(1);
    }
  }

  getCharacterByClass(classType: CharacterClass): CharacterData | undefined {
    return this.characters.find((c) => c.classType === classType);
  }

  getMonsterType(type: string, isElite: boolean): MonsterTypeData | undefined {
    return this.monsterTypes.find((m) => m.type === type && m.isElite === isElite);
  }
}

export const gameDataService = new GameDataService();
