/**
 * Character Management Types
 * Type definitions for character CRUD operations
 */

export interface CreateCharacterDto {
  name: string;
  classId: string;
}

export interface UpdateCharacterDto {
  name?: string;
  experience?: number;
  gold?: number;
  health?: number;
  perks?: string[];
}

export interface LevelUpDto {
  healthIncrease: number;
  selectedPerk?: string;
}

export interface EquipItemDto {
  itemId: string;
}

export interface CreateEnhancementDto {
  cardId: string;
  slot: 'TOP' | 'BOTTOM';
  enhancementType: string;
}

export interface CharacterResponse {
  id: string;
  name: string;
  userId: string;
  classId: string;
  className: string;
  level: number;
  experience: number;
  gold: number;
  health: number;
  perks: string[];
  inventory: string[];
  currentGameId: string | null;
  campaignId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CharacterDetailResponse extends CharacterResponse {
  class: {
    id: string;
    name: string;
    startingHealth: number;
    maxHealthByLevel: number[];
    handSize: number;
    perks: string[];
    description: string;
    imageUrl: string | null;
  };
  abilityCards: Array<{
    id: string;
    name: string;
    level: number;
    initiative: number;
    topAction: any;
    bottomAction: any;
  }>;
  enhancements: Array<{
    id: string;
    cardId: string;
    slot: string;
    enhancementType: string;
    appliedAt: Date;
  }>;
}
