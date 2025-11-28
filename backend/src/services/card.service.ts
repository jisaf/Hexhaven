import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { AbilityCard } from 'shared/types';

@Injectable()
export class CardService {
  private cards: AbilityCard[] = [];

  constructor() {
    this.loadCards();
  }

  private async loadCards() {
    try {
      // Use a path relative to the current file's directory
      const filePath = path.join(__dirname, '..', 'data', 'ability-cards.json');
      const data = await fs.readFile(filePath, 'utf8');
      this.cards = JSON.parse(data);
    } catch (error) {
      console.error('Failed to load ability cards:', error);
    }
  }

  findAll(): AbilityCard[] {
    return this.cards;
  }
}
