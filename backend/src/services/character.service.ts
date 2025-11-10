/**
 * Character Service (US1 - T050)
 *
 * Manages character lifecycle: creation, selection, lookup, and state management.
 * Provides in-memory storage for MVP (will be replaced with database later).
 */

import { Character } from '../models/character.model';
import { NotFoundError, ConflictError } from '../utils/error-handler';
import {
  CharacterClass,
  type AxialCoordinates,
} from '../../../shared/types/entities';

export class CharacterService {
  private characters: Map<string, Character> = new Map(); // characterId -> Character
  private playerCharacters: Map<string, string> = new Map(); // playerId -> characterId

  /**
   * Create a new character for a player
   */
  createCharacter(
    playerId: string,
    characterClass: CharacterClass,
    startingPosition: AxialCoordinates,
  ): Character {
    // Check if player already has a character
    const existingCharacterId = this.playerCharacters.get(playerId);
    if (existingCharacterId) {
      throw new ConflictError('Player already has a character');
    }

    // Create character
    const character = Character.create(
      playerId,
      characterClass,
      startingPosition,
    );

    // Store character
    this.characters.set(character.id, character);
    this.playerCharacters.set(playerId, character.id);

    return character;
  }

  /**
   * Select or update character class for a player
   * If character doesn't exist, create it; if it exists, update the class
   */
  selectCharacter(
    playerId: string,
    characterClass: CharacterClass,
    startingPosition: AxialCoordinates,
  ): Character {
    // Get existing character or create new one
    const existingCharacterId = this.playerCharacters.get(playerId);

    if (existingCharacterId) {
      // Remove old character and create new one with updated class
      this.characters.delete(existingCharacterId);
    }

    // Create new character with selected class
    const character = Character.create(
      playerId,
      characterClass,
      startingPosition,
    );

    this.characters.set(character.id, character);
    this.playerCharacters.set(playerId, character.id);

    return character;
  }

  /**
   * Get character by ID
   */
  getCharacterById(characterId: string): Character | null {
    return this.characters.get(characterId) || null;
  }

  /**
   * Get character by player ID
   */
  getCharacterByPlayerId(playerId: string): Character | null {
    const characterId = this.playerCharacters.get(playerId);
    if (!characterId) {
      return null;
    }
    return this.characters.get(characterId) || null;
  }

  /**
   * Get all characters for multiple players
   */
  getCharactersByPlayerIds(playerIds: string[]): Character[] {
    return playerIds
      .map((playerId) => this.getCharacterByPlayerId(playerId))
      .filter((char): char is Character => char !== null);
  }

  /**
   * Move character to new position
   */
  moveCharacter(characterId: string, newPosition: AxialCoordinates): Character {
    const character = this.characters.get(characterId);
    if (!character) {
      throw new NotFoundError('Character not found');
    }

    character.moveTo(newPosition);
    return character;
  }

  /**
   * Apply damage to character
   */
  damageCharacter(characterId: string, amount: number): Character {
    const character = this.characters.get(characterId);
    if (!character) {
      throw new NotFoundError('Character not found');
    }

    character.takeDamage(amount);

    // Check if character should be exhausted
    if (character.isDead && !character.exhausted) {
      character.exhaust();
    }

    return character;
  }

  /**
   * Heal character
   */
  healCharacter(characterId: string, amount: number): Character {
    const character = this.characters.get(characterId);
    if (!character) {
      throw new NotFoundError('Character not found');
    }

    character.heal(amount);
    return character;
  }

  /**
   * Remove character (when player leaves)
   */
  removeCharacter(playerId: string): boolean {
    const characterId = this.playerCharacters.get(playerId);
    if (!characterId) {
      return false;
    }

    this.characters.delete(characterId);
    this.playerCharacters.delete(playerId);
    return true;
  }

  /**
   * Get all characters (for debugging/admin)
   */
  getAllCharacters(): Character[] {
    return Array.from(this.characters.values());
  }

  /**
   * Clear all characters (for testing)
   */
  clearAllCharacters(): void {
    this.characters.clear();
    this.playerCharacters.clear();
  }

  /**
   * Get character count
   */
  getCharacterCount(): number {
    return this.characters.size;
  }

  /**
   * Check if player has a character
   */
  hasCharacter(playerId: string): boolean {
    return this.playerCharacters.has(playerId);
  }

  /**
   * Get available character classes
   */
  getAvailableClasses(): CharacterClass[] {
    return [
      CharacterClass.BRUTE,
      CharacterClass.TINKERER,
      CharacterClass.SPELLWEAVER,
      CharacterClass.SCOUNDREL,
      CharacterClass.CRAGHEART,
      CharacterClass.MINDTHIEF,
    ];
  }
}

// Singleton instance
export const characterService = new CharacterService();
