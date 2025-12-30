/**
 * Character Management Types (002)
 * Frontend types for persistent user-owned characters
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
  retired: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterClass {
  id: string;
  name: string;
  startingHealth: number;
  maxHealthByLevel: number[];
  handSize: number;
  perks: string[];
  description: string;
  imageUrl: string | null;
  baseMovement: number;
  baseAttack: number;
  baseRange: number;
  color: string;
}

export interface AbilityCard {
  id: string;
  characterClass: string;
  name: string;
  level: number | 'X';
  initiative: number;
  topAction: unknown;
  bottomAction: unknown;
  imageUrl?: string;
}

export interface CardEnhancement {
  id: string;
  cardId: string;
  slot: string;
  enhancementType: string;
  appliedAt: string;
}

export interface CharacterDetailResponse extends CharacterResponse {
  class: CharacterClass;
  abilityCards: AbilityCard[];
  enhancements: CardEnhancement[];
}
