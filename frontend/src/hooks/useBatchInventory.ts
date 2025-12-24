/**
 * useBatchInventory Hook
 *
 * Fetches inventory data for multiple characters in parallel.
 * Used in lobby to avoid N+1 API calls when displaying equipment summaries.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getApiUrl } from '../config/api';
import type { EquippedItems } from '../../../shared/types/entities';

interface CharacterInventory {
  equippedItems: EquippedItems | null;
  loading: boolean;
  error: string | null;
}

// Default empty equipped items
const EMPTY_EQUIPPED: EquippedItems = {
  head: undefined,
  body: undefined,
  legs: undefined,
  hands: [],
  small: [],
};

interface UseBatchInventoryReturn {
  /** Map of characterId to inventory data */
  inventories: Map<string, CharacterInventory>;
  /** Get inventory for a specific character */
  getInventory: (characterId: string) => CharacterInventory;
  /** Refresh all inventories */
  refresh: () => void;
}

async function fetchInventoryForCharacter(
  characterId: string,
  signal: AbortSignal
): Promise<CharacterInventory> {
  try {
    const token = localStorage.getItem('hexhaven_access_token');
    if (!token) {
      return { equippedItems: null, loading: false, error: 'Not authenticated' };
    }

    const response = await fetch(
      `${getApiUrl()}/characters/${characterId}/inventory`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      }
    );

    if (!response.ok) {
      return { equippedItems: null, loading: false, error: 'Failed to fetch' };
    }

    const data = await response.json();
    return {
      equippedItems: data.equippedItems || EMPTY_EQUIPPED,
      loading: false,
      error: null,
    };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { equippedItems: null, loading: true, error: null };
    }
    return { equippedItems: null, loading: false, error: 'Failed to load' };
  }
}

export function useBatchInventory(characterIds: string[]): UseBatchInventoryReturn {
  const [inventories, setInventories] = useState<Map<string, CharacterInventory>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);
  const refreshCounterRef = useRef(0);

  // Fetch inventories when character IDs change
  useEffect(() => {
    let cancelled = false;

    const doFetch = async () => {
      // Abort previous requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      // Filter out empty/invalid IDs
      const validIds = characterIds.filter(id => id && id.length > 0);
      if (validIds.length === 0) {
        if (!cancelled) {
          setInventories(new Map());
        }
        return;
      }

      // Set loading state for new characters only
      if (!cancelled) {
        setInventories(prev => {
          const next = new Map(prev);
          for (const id of validIds) {
            if (!next.has(id)) {
              next.set(id, { equippedItems: null, loading: true, error: null });
            }
          }
          return next;
        });
      }

      // Fetch all in parallel
      const results = await Promise.all(
        validIds.map(async (id) => ({
          id,
          result: await fetchInventoryForCharacter(id, signal),
        }))
      );

      // Update state with results (only if not cancelled/aborted)
      if (!cancelled && !signal.aborted) {
        setInventories(prev => {
          const next = new Map(prev);
          for (const { id, result } of results) {
            next.set(id, result);
          }
          return next;
        });
      }
    };

    doFetch();

    return () => {
      cancelled = true;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterIds.join(','), refreshCounterRef.current]);

  const getInventory = useCallback((characterId: string): CharacterInventory => {
    return inventories.get(characterId) || {
      equippedItems: null,
      loading: true,
      error: null,
    };
  }, [inventories]);

  const refresh = useCallback(() => {
    refreshCounterRef.current += 1;
    // Force re-run of effect by updating state
    setInventories(new Map());
  }, []);

  return {
    inventories,
    getInventory,
    refresh,
  };
}

export default useBatchInventory;
