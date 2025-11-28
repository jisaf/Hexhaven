/**
 * Game Data Service
 *
 * This service is responsible for loading all game data from JSON files
 * into memory on application startup. This provides a single source of truth
 * for static game data and avoids repeated file system access.
 */

import fs from 'fs';
import path from 'path';
import { Logger } from '@nestjs/common';

// Define interfaces for our data to ensure type safety
interface CharacterData {
  avatar?: string;
  // other properties...
}

interface MonsterTypeData {
  type: string;
  isElite: boolean;
  avatar?: string;
  // other properties...
}

class GameDataService {
  private readonly logger = new Logger(GameDataService.name);
  private characters: Record<string, CharacterData> = {};
  private monsterTypes: MonsterTypeData[] = [];

  constructor() {
    this.loadGameData();
  }

  private loadGameData(): void {
    try {
      this.logger.log('Loading game data from JSON files...');

      const dataPath = path.join(__dirname, '..', 'data');

      const charactersFilePath = path.join(dataPath, 'characters.json');
      const charactersFile = fs.readFileSync(charactersFilePath, 'utf-8');
      this.characters = JSON.parse(charactersFile).characters;

      const monsterTypesFilePath = path.join(dataPath, 'monster-types.json');
      const monsterTypesFile = fs.readFileSync(monsterTypesFilePath, 'utf-8');
      this.monsterTypes = JSON.parse(monsterTypesFile).monsterTypes;

      this.logger.log('Game data loaded successfully.');
    } catch (error) {
      this.logger.error('Failed to load game data', error);
      // In a real application, we might want to throw the error
      // to prevent the server from starting with invalid state.
    }
  }

  public getCharacters(): Record<string, CharacterData> {
    return this.characters;
  }

  public getCharacterByClass(characterClass: string): CharacterData | undefined {
    return this.characters[characterClass];
  }

  public getMonsterTypes(): MonsterTypeData[] {
    return this.monsterTypes;
  }

  public getMonsterType(type: string, isElite: boolean): MonsterTypeData | undefined {
    return this.monsterTypes.find(m => m.type === type && m.isElite === isElite);
  }
}

export const gameDataService = new GameDataService();
