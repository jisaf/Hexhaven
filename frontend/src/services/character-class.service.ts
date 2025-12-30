/**
 * Character Class Service
 * Handles API calls for character class data with caching
 *
 * Provides cached access to character class definitions from the database.
 * This replaces the hardcoded character data in CharacterSelect.tsx and
 * EntityChipsPanel.tsx with dynamic data from the API.
 */

import { getApiUrl } from '../config/api';
import type { CharacterClass } from '../types/character.types';

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION_MS = 5 * 60 * 1000;

interface CacheEntry {
  data: CharacterClass[];
  timestamp: number;
}

class CharacterClassService {
  private cache: CacheEntry | null = null;
  private fetchPromise: Promise<CharacterClass[]> | null = null;

  /**
   * Get all character classes (cached)
   * Returns cached data if available and fresh, otherwise fetches from API
   */
  async getCharacterClasses(): Promise<CharacterClass[]> {
    // Return cached data if fresh
    if (this.cache && Date.now() - this.cache.timestamp < CACHE_DURATION_MS) {
      return this.cache.data;
    }

    // If already fetching, wait for that promise
    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    // Fetch fresh data
    this.fetchPromise = this.fetchCharacterClasses();

    try {
      const data = await this.fetchPromise;
      this.cache = {
        data,
        timestamp: Date.now(),
      };
      return data;
    } finally {
      this.fetchPromise = null;
    }
  }

  /**
   * Get a specific character class by name
   * @param name - The character class name (e.g., "Brute", "Tinkerer")
   */
  async getCharacterClassByName(name: string): Promise<CharacterClass | undefined> {
    const classes = await this.getCharacterClasses();
    return classes.find((c) => c.name === name);
  }

  /**
   * Get the color for a character class
   * @param name - The character class name
   * @param fallback - Fallback color if not found (default: '#666666')
   */
  async getCharacterColor(name: string, fallback: string = '#666666'): Promise<string> {
    const characterClass = await this.getCharacterClassByName(name);
    return characterClass?.color ?? fallback;
  }

  /**
   * Get character color synchronously from cache
   * Returns fallback if cache is empty (useful for initial render)
   * @param name - The character class name
   * @param fallback - Fallback color if not cached (default: '#666666')
   */
  getCharacterColorSync(name: string, fallback: string = '#666666'): string {
    if (!this.cache) {
      return fallback;
    }
    const characterClass = this.cache.data.find((c) => c.name === name);
    return characterClass?.color ?? fallback;
  }

  /**
   * Check if character classes are cached
   */
  isCached(): boolean {
    return this.cache !== null && Date.now() - this.cache.timestamp < CACHE_DURATION_MS;
  }

  /**
   * Clear the cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.cache = null;
  }

  /**
   * Preload character classes into cache
   * Call this early in app initialization for faster access
   */
  async preload(): Promise<void> {
    await this.getCharacterClasses();
  }

  /**
   * Fetch character classes from API
   */
  private async fetchCharacterClasses(): Promise<CharacterClass[]> {
    const response = await fetch(`${getApiUrl()}/character-classes`);

    if (!response.ok) {
      throw new Error(`Failed to fetch character classes: ${response.statusText}`);
    }

    return await response.json();
  }
}

export const characterClassService = new CharacterClassService();
