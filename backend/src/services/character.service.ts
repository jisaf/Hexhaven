/**
 * Character Service (US1 - T050, Updated for #205)
 *
 * Manages character lifecycle: creation, selection, lookup, and state management.
 * Provides in-memory storage for game sessions.
 *
 * Updated for Issue #205: Added persistence bridge for loading/saving character
 * data between sessions and database (via UserCharacterService for inventory).
 */

import { Character } from '../models/character.model';
import { NotFoundError, ConflictError } from '../utils/error-handler';
import {
  CharacterClass,
  type AxialCoordinates,
} from '../../../shared/types/entities';
import type { PrismaClient } from '@prisma/client';

/**
 * Persistent character data loaded from database
 */
export interface PersistedCharacterData {
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
  equippedItemIds: string[];
}

export class CharacterService {
  private characters: Map<string, Character> = new Map(); // characterId -> Character
  private playerCharacters: Map<string, string> = new Map(); // playerId -> characterId

  // New: Track persistent character data for inventory lookups (Issue #205)
  private persistedData: Map<string, PersistedCharacterData> = new Map(); // characterId -> persisted data
  private prisma: PrismaClient | null = null;

  /**
   * Set Prisma client for database operations (optional, for persistence bridge)
   */
  setPrismaClient(prisma: PrismaClient): void {
    this.prisma = prisma;
  }

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

  // ========== PERSISTENCE BRIDGE (Issue #205) ==========

  /**
   * Load a persistent character from database into the session.
   * This bridges between UserCharacterService (database) and CharacterService (session).
   *
   * @param playerId - The player's UUID in the game session
   * @param persistentCharacterId - The character's ID in the database
   * @param startingPosition - The starting position for the game
   * @returns The session Character instance
   */
  async loadPersistedCharacter(
    playerId: string,
    persistentCharacterId: string,
    startingPosition: AxialCoordinates,
  ): Promise<Character> {
    if (!this.prisma) {
      throw new Error('Prisma client not set. Call setPrismaClient() first.');
    }

    // Load character from database with equipped items
    const dbCharacter = await this.prisma.character.findUnique({
      where: { id: persistentCharacterId },
      include: {
        class: true,
        equippedItems: {
          include: {
            item: true,
          },
        },
      },
    });

    if (!dbCharacter) {
      throw new NotFoundError('Persistent character not found');
    }

    // Map database class name to CharacterClass enum
    const characterClass = this.mapClassNameToEnum(dbCharacter.class.name);

    // Remove any existing character for this player
    const existingCharacterId = this.playerCharacters.get(playerId);
    if (existingCharacterId) {
      this.characters.delete(existingCharacterId);
      this.persistedData.delete(existingCharacterId);
    }

    // Create session character with persistent ID (so we can save back later)
    const character = Character.createWithId(
      persistentCharacterId, // Use the persistent ID
      playerId,
      characterClass,
      startingPosition,
      dbCharacter.health, // Use current health from DB
    );

    // Store session character
    this.characters.set(character.id, character);
    this.playerCharacters.set(playerId, character.id);

    // Store persistent data for inventory lookups
    this.persistedData.set(character.id, {
      id: dbCharacter.id,
      name: dbCharacter.name,
      userId: dbCharacter.userId,
      classId: dbCharacter.classId,
      className: dbCharacter.class.name,
      level: dbCharacter.level,
      experience: dbCharacter.experience,
      gold: dbCharacter.gold,
      health: dbCharacter.health,
      perks: dbCharacter.perks as string[],
      equippedItemIds: dbCharacter.equippedItems.map((eq) => eq.itemId),
    });

    return character;
  }

  /**
   * Get persistent character data for a session character.
   * Returns null if character wasn't loaded from database.
   */
  getPersistedData(characterId: string): PersistedCharacterData | null {
    return this.persistedData.get(characterId) || null;
  }

  /**
   * Check if a character was loaded from the database (has persistent data).
   */
  isPersistentCharacter(characterId: string): boolean {
    return this.persistedData.has(characterId);
  }

  /**
   * Get equipped item IDs for a character (from persistent data).
   * Returns empty array if character wasn't loaded from database.
   */
  getEquippedItemIds(characterId: string): string[] {
    const data = this.persistedData.get(characterId);
    return data?.equippedItemIds || [];
  }

  /**
   * Save character state back to database after game ends.
   * Updates health, XP, gold, etc.
   */
  async saveCharacterState(
    characterId: string,
    updates: {
      experience?: number;
      gold?: number;
      health?: number;
    },
  ): Promise<void> {
    if (!this.prisma) {
      throw new Error('Prisma client not set. Call setPrismaClient() first.');
    }

    const persistedData = this.persistedData.get(characterId);
    if (!persistedData) {
      // Not a persistent character, nothing to save
      return;
    }

    await this.prisma.character.update({
      where: { id: characterId },
      data: {
        ...(updates.experience !== undefined && {
          experience: updates.experience,
        }),
        ...(updates.gold !== undefined && { gold: updates.gold }),
        ...(updates.health !== undefined && { health: updates.health }),
      },
    });

    // Update local cached data
    if (updates.experience !== undefined) {
      persistedData.experience = updates.experience;
    }
    if (updates.gold !== undefined) {
      persistedData.gold = updates.gold;
    }
    if (updates.health !== undefined) {
      persistedData.health = updates.health;
    }
  }

  /**
   * Map character class name to CharacterClass enum
   */
  private mapClassNameToEnum(name: string): CharacterClass {
    const mapping: Record<string, CharacterClass> = {
      Brute: CharacterClass.BRUTE,
      Tinkerer: CharacterClass.TINKERER,
      Spellweaver: CharacterClass.SPELLWEAVER,
      Scoundrel: CharacterClass.SCOUNDREL,
      Cragheart: CharacterClass.CRAGHEART,
      Mindthief: CharacterClass.MINDTHIEF,
    };
    return mapping[name] || CharacterClass.BRUTE;
  }
}

// Singleton instance
export const characterService = new CharacterService();
