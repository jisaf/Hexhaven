/**
 * Character Service (002)
 * Handles API calls for user character management
 */

import { authService } from './auth.service';
import { getApiUrl } from '../config/api';
import type {
  CreateCharacterDto,
  UpdateCharacterDto,
  LevelUpDto,
  CreateEnhancementDto,
  CharacterResponse,
  CharacterDetailResponse,
} from '../types/character.types';

class CharacterService {
  /**
   * Create a new character
   */
  async createCharacter(dto: CreateCharacterDto): Promise<CharacterResponse> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/user-characters`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dto),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create character');
    }

    return await response.json();
  }

  /**
   * List all characters for authenticated user
   */
  async listCharacters(): Promise<CharacterResponse[]> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/user-characters`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch characters');
    }

    return await response.json();
  }

  /**
   * Get character details with full relations
   */
  async getCharacter(characterId: string): Promise<CharacterDetailResponse> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/user-characters/${characterId}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch character details');
    }

    return await response.json();
  }

  /**
   * Update character stats
   */
  async updateCharacter(
    characterId: string,
    dto: UpdateCharacterDto
  ): Promise<CharacterResponse> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/user-characters/${characterId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dto),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update character');
    }

    return await response.json();
  }

  /**
   * Level up a character
   */
  async levelUpCharacter(
    characterId: string,
    dto: LevelUpDto
  ): Promise<CharacterResponse> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/user-characters/${characterId}/level-up`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dto),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to level up character');
    }

    return await response.json();
  }

  /**
   * Delete/retire a character
   */
  async deleteCharacter(characterId: string): Promise<void> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/user-characters/${characterId}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete character');
    }
  }

  /**
   * Equip an item to character
   */
  async equipItem(
    characterId: string,
    itemId: string
  ): Promise<CharacterResponse> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/user-characters/${characterId}/items/${itemId}`,
      {
        method: 'POST',
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to equip item');
    }

    return await response.json();
  }

  /**
   * Unequip an item from character
   */
  async unequipItem(
    characterId: string,
    itemId: string
  ): Promise<CharacterResponse> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/user-characters/${characterId}/items/${itemId}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to unequip item');
    }

    return await response.json();
  }

  /**
   * Add card enhancement
   */
  async addEnhancement(
    characterId: string,
    dto: CreateEnhancementDto
  ): Promise<CharacterDetailResponse> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/user-characters/${characterId}/enhancements`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dto),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add enhancement');
    }

    return await response.json();
  }

  /**
   * Remove card enhancement
   */
  async removeEnhancement(
    characterId: string,
    enhancementId: string
  ): Promise<CharacterDetailResponse> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/user-characters/${characterId}/enhancements/${enhancementId}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to remove enhancement');
    }

    return await response.json();
  }
}

export const characterService = new CharacterService();
