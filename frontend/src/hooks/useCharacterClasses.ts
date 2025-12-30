/**
 * useCharacterClasses Hook
 *
 * React hook for accessing character class data from the API.
 * Handles loading state, error handling, and caching via the service.
 */

import { useState, useEffect, useCallback } from 'react';
import { characterClassService } from '../services/character-class.service';
import type { CharacterClass } from '../types/character.types';

interface UseCharacterClassesResult {
  /** All character classes from the database */
  classes: CharacterClass[];
  /** Loading state */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Refresh the data (bypasses cache) */
  refresh: () => Promise<void>;
  /** Get color for a character class name */
  getColor: (className: string, fallback?: string) => string;
}

export function useCharacterClasses(): UseCharacterClassesResult {
  const [classes, setClasses] = useState<CharacterClass[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClasses = useCallback(async (forceRefresh: boolean = false) => {
    setIsLoading(true);
    setError(null);

    try {
      if (forceRefresh) {
        characterClassService.clearCache();
      }
      const data = await characterClassService.getCharacterClasses();
      setClasses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load character classes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const refresh = useCallback(async () => {
    await fetchClasses(true);
  }, [fetchClasses]);

  const getColor = useCallback((className: string, fallback: string = '#666666'): string => {
    const found = classes.find((c) => c.name === className);
    return found?.color ?? fallback;
  }, [classes]);

  return {
    classes,
    isLoading,
    error,
    refresh,
    getColor,
  };
}
