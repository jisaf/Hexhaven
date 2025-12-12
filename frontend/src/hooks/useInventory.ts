/**
 * useInventory Hook (Issue #205)
 *
 * Manages inventory state for the current character:
 * - Fetches owned items from API
 * - Tracks equipped items and runtime states
 * - Handles use/equip/unequip actions via WebSocket
 * - Listens for inventory update events
 */

import { useState, useEffect, useCallback } from 'react';
import { websocketService } from '../services/websocket.service';
import { getApiUrl } from '../config/api';
import {
  ItemState,
  type Item,
  type EquippedItems,
  type ItemRuntimeState,
} from '../../../shared/types/entities';

interface UseInventoryOptions {
  /** Character ID to fetch inventory for */
  characterId: string | null;
  /** Whether inventory features are enabled */
  enabled?: boolean;
}

interface UseInventoryReturn {
  /** All owned items */
  ownedItems: Item[];
  /** Currently equipped item structure */
  equippedItems: EquippedItems;
  /** Runtime state for each item */
  itemStates: Record<string, ItemRuntimeState>;
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Use an item (emits WebSocket event) */
  useItem: (itemId: string) => void;
  /** Equip an item (emits WebSocket event) */
  equipItem: (itemId: string) => void;
  /** Unequip an item (emits WebSocket event) */
  unequipItem: (itemId: string) => void;
  /** Refresh inventory from server */
  refreshInventory: () => void;
}

// Default empty equipped items
const EMPTY_EQUIPPED: EquippedItems = {
  head: undefined,
  body: undefined,
  legs: undefined,
  hands: [],
  small: [],
};

export function useInventory({
  characterId,
  enabled = true,
}: UseInventoryOptions): UseInventoryReturn {
  const [ownedItems, setOwnedItems] = useState<Item[]>([]);
  const [equippedItems, setEquippedItems] = useState<EquippedItems>(EMPTY_EQUIPPED);
  const [itemStates, setItemStates] = useState<Record<string, ItemRuntimeState>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch inventory from API
  const fetchInventory = useCallback(async () => {
    if (!characterId || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      // Get token from localStorage (key matches auth.service.ts)
      const token = localStorage.getItem('hexhaven_access_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${getApiUrl()}/characters/${characterId}/inventory`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch inventory');
      }

      const data = await response.json();

      setOwnedItems(data.ownedItems || []);
      setEquippedItems(data.equippedItems || EMPTY_EQUIPPED);
      setItemStates(data.itemStates || {});
    } catch (err) {
      console.error('[useInventory] Failed to fetch inventory:', err);
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [characterId, enabled]);

  // Initial fetch
  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Listen for WebSocket events
  useEffect(() => {
    if (!enabled) return;

    // Item used event - update the state of the used item
    const unsubItemUsed = websocketService.on('item_used', (payload) => {
      if (payload.characterId === characterId) {
        setItemStates((prev) => ({
          ...prev,
          [payload.itemId]: {
            state: payload.newState,
            usesRemaining: payload.usesRemaining,
          },
        }));
      }
    });

    // Items refreshed event (after rest or scenario) - reset all refreshed items to ready
    const unsubItemsRefreshed = websocketService.on('items_refreshed', (payload) => {
      if (payload.characterId === characterId) {
        setItemStates((prev) => {
          const newStates = { ...prev };
          payload.refreshedItems.forEach(({ itemId }) => {
            newStates[itemId] = { state: ItemState.READY };
          });
          return newStates;
        });
      }
    });

    // Item equipped event
    const unsubEquipmentChanged = websocketService.on('equipment_changed', (payload) => {
      if (payload.characterId === characterId) {
        setEquippedItems(payload.equipped);
      }
    });

    // Inventory updated (items added/removed)
    const unsubInventoryUpdated = websocketService.on('inventory_updated', (payload) => {
      if (payload.characterId === characterId) {
        setOwnedItems(payload.items);
      }
    });

    return () => {
      unsubItemUsed();
      unsubItemsRefreshed();
      unsubEquipmentChanged();
      unsubInventoryUpdated();
    };
  }, [characterId, enabled]);

  // Use item action
  const useItem = useCallback(
    (itemId: string) => {
      if (!characterId) return;

      websocketService.emit('use_item', {
        characterId,
        itemId,
      });
    },
    [characterId]
  );

  // Equip item action
  const equipItem = useCallback(
    (itemId: string) => {
      if (!characterId) return;

      websocketService.emit('equip_item', {
        characterId,
        itemId,
      });
    },
    [characterId]
  );

  // Unequip item action
  const unequipItem = useCallback(
    (itemId: string) => {
      if (!characterId) return;

      websocketService.emit('unequip_item', {
        characterId,
        itemId,
      });
    },
    [characterId]
  );

  // Refresh inventory
  const refreshInventory = useCallback(() => {
    fetchInventory();
  }, [fetchInventory]);

  return {
    ownedItems,
    equippedItems,
    itemStates,
    loading,
    error,
    useItem,
    equipItem,
    unequipItem,
    refreshInventory,
  };
}

export default useInventory;
