/**
 * useShop Hook (Issue #331)
 *
 * Manages shop state for a campaign:
 * - Fetches shop inventory from API
 * - Handles purchase/sell actions
 * - Listens for shop update events via WebSocket
 * - Tracks loading, error, and optimistic update states
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { websocketService } from '../services/websocket.service';
import {
  shopService,
  type CampaignShopView,
  type ShopItem,
  type PurchaseResult,
  type SellResult,
} from '../services/shop.service';
import type { ItemRarity, ItemSlot } from '../../../shared/types/entities';
import { RARITY_ORDER } from '../constants/item';

// ========== Filter Types ==========

export interface ShopFilters {
  slot?: ItemSlot | 'ALL';
  rarity?: ItemRarity | 'ALL';
  searchQuery?: string;
  showSoldOut?: boolean;
  showUnaffordable?: boolean;
}

export interface ShopSortOption {
  field: 'name' | 'cost' | 'rarity' | 'quantity';
  direction: 'asc' | 'desc';
}

// ========== Hook Options ==========

interface UseShopOptions {
  /** Campaign ID to fetch shop for */
  campaignId: string | null;
  /** Currently selected character ID for purchases */
  characterId?: string | null;
  /** Character's current gold for affordability checks */
  characterGold?: number;
  /** Whether shop features are enabled */
  enabled?: boolean;
  /** Callback when another player purchases an item */
  onOtherPlayerPurchase?: (data: { characterName: string; itemName: string }) => void;
  /** Callback when another player sells an item */
  onOtherPlayerSell?: (data: { characterName: string; itemName: string }) => void;
}

interface UseShopReturn {
  /** Shop inventory with items */
  shop: CampaignShopView | null;
  /** Filtered and sorted items */
  filteredItems: ShopItem[];
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Current filters */
  filters: ShopFilters;
  /** Current sort option */
  sort: ShopSortOption;
  /** Set filters */
  setFilters: (filters: ShopFilters) => void;
  /** Set sort option */
  setSort: (sort: ShopSortOption) => void;
  /** Purchase an item */
  purchaseItem: (itemId: string, quantity?: number) => Promise<PurchaseResult | null>;
  /** Sell an item */
  sellItem: (itemId: string, quantity?: number) => Promise<SellResult | null>;
  /** Calculate sell price for an item */
  calculateSellPrice: (itemCost: number) => number;
  /** Check if character can afford an item */
  canAfford: (itemCost: number) => boolean;
  /** Refresh shop data */
  refreshShop: () => void;
  /** Check if an item is available (in stock and prosperity unlocked) */
  isItemAvailable: (item: ShopItem) => boolean;
  /** Whether a purchase is in progress */
  purchasing: boolean;
  /** Whether a sale is in progress */
  selling: boolean;
}

// ========== Default Filter/Sort ==========

const DEFAULT_FILTERS: ShopFilters = {
  slot: 'ALL',
  rarity: 'ALL',
  searchQuery: '',
  showSoldOut: false,
  showUnaffordable: true,
};

const DEFAULT_SORT: ShopSortOption = {
  field: 'cost',
  direction: 'asc',
};

// ========== Hook Implementation ==========

export function useShop({
  campaignId,
  characterId,
  characterGold = 0,
  enabled = true,
  onOtherPlayerPurchase,
  onOtherPlayerSell,
}: UseShopOptions): UseShopReturn {
  const [shop, setShop] = useState<CampaignShopView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ShopFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<ShopSortOption>(DEFAULT_SORT);
  const [purchasing, setPurchasing] = useState(false);
  const [selling, setSelling] = useState(false);

  // Fetch shop inventory
  const fetchShop = useCallback(async () => {
    if (!campaignId || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      const data = await shopService.getShopInventory(campaignId);
      setShop(data);
    } catch (err) {
      console.error('[useShop] Failed to fetch shop:', err);
      setError(err instanceof Error ? err.message : 'Failed to load shop');
    } finally {
      setLoading(false);
    }
  }, [campaignId, enabled]);

  // Initial fetch
  useEffect(() => {
    fetchShop();
  }, [fetchShop]);

  // Listen for WebSocket events
  useEffect(() => {
    if (!enabled || !campaignId) return;

    // Shop inventory updated (purchase/sell by any player)
    const unsubShopUpdated = websocketService.on('shop_updated', (payload) => {
      if (payload.campaignId === campaignId) {
        // Update shop inventory with new data
        setShop((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            inventory: payload.inventory,
            availableItems: payload.availableItems,
            totalItems: payload.totalItems,
          };
        });
      }
    });

    // Item purchased event (for toast notifications)
    const unsubItemPurchased = websocketService.on('item_purchased', (payload) => {
      if (payload.campaignId === campaignId && payload.characterId !== characterId) {
        // Another player made a purchase - notify via callback
        onOtherPlayerPurchase?.({
          characterName: payload.characterName,
          itemName: payload.itemName,
        });
      }
    });

    // Item sold event
    const unsubItemSold = websocketService.on('item_sold', (payload) => {
      if (payload.campaignId === campaignId && payload.characterId !== characterId) {
        // Another player sold an item - notify via callback
        onOtherPlayerSell?.({
          characterName: payload.characterName,
          itemName: payload.itemName,
        });
      }
    });

    return () => {
      unsubShopUpdated();
      unsubItemPurchased();
      unsubItemSold();
    };
  }, [campaignId, characterId, enabled, onOtherPlayerPurchase, onOtherPlayerSell]);

  // Check if an item is available (in stock and unlocked)
  const isItemAvailable = useCallback((item: ShopItem): boolean => {
    return item.isAvailable && item.quantity > 0;
  }, []);

  // Check affordability
  const canAfford = useCallback(
    (itemCost: number): boolean => {
      return characterGold >= itemCost;
    },
    [characterGold]
  );

  // Calculate sell price
  const calculateSellPrice = useCallback(
    (itemCost: number): number => {
      if (!shop?.config) return Math.floor(itemCost * 0.5);
      return shopService.calculateSellPrice(itemCost, shop.config);
    },
    [shop?.config]
  );

  // Filter and sort items
  const filteredItems = useMemo(() => {
    if (!shop?.inventory) return [];

    let items = [...shop.inventory];

    // Apply filters
    if (filters.slot && filters.slot !== 'ALL') {
      items = items.filter((item) => item.slot === filters.slot);
    }

    if (filters.rarity && filters.rarity !== 'ALL') {
      items = items.filter((item) => item.rarity === filters.rarity);
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      items = items.filter((item) => item.itemName.toLowerCase().includes(query));
    }

    if (!filters.showSoldOut) {
      items = items.filter((item) => item.quantity > 0);
    }

    if (!filters.showUnaffordable) {
      items = items.filter((item) => canAfford(item.cost));
    }

    // Apply sort
    items.sort((a, b) => {
      let comparison = 0;

      switch (sort.field) {
        case 'name':
          comparison = a.itemName.localeCompare(b.itemName);
          break;
        case 'cost':
          comparison = a.cost - b.cost;
          break;
        case 'rarity':
          comparison = RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity];
          break;
        case 'quantity':
          comparison = a.quantity - b.quantity;
          break;
      }

      return sort.direction === 'asc' ? comparison : -comparison;
    });

    return items;
  }, [shop?.inventory, filters, sort, canAfford]);

  // Purchase item
  const purchaseItem = useCallback(
    async (itemId: string, quantity = 1): Promise<PurchaseResult | null> => {
      if (!campaignId || !characterId) {
        setError('No campaign or character selected');
        return null;
      }

      setPurchasing(true);
      setError(null);

      try {
        const result = await shopService.purchaseItem(campaignId, {
          characterId,
          itemId,
          quantity,
        });

        // Update local shop state optimistically
        setShop((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            inventory: prev.inventory.map((item) =>
              item.itemId === itemId
                ? { ...item, quantity: item.quantity - quantity }
                : item
            ),
          };
        });

        return result;
      } catch (err) {
        console.error('[useShop] Purchase failed:', err);
        const errorMessage = err instanceof Error ? err.message : 'Purchase failed';
        setError(errorMessage);
        // Don't call fetchShop() here - it would clear the error before toast shows
        // The shop state may be slightly stale but user needs to see the error
        return null;
      } finally {
        setPurchasing(false);
      }
    },
    [campaignId, characterId, fetchShop]
  );

  // Sell item
  const sellItem = useCallback(
    async (itemId: string, quantity = 1): Promise<SellResult | null> => {
      if (!campaignId || !characterId) {
        setError('No campaign or character selected');
        return null;
      }

      setSelling(true);
      setError(null);

      try {
        const result = await shopService.sellItem(campaignId, {
          characterId,
          itemId,
          quantity,
        });

        // Update local shop state optimistically
        setShop((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            inventory: prev.inventory.map((item) =>
              item.itemId === itemId
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          };
        });

        return result;
      } catch (err) {
        console.error('[useShop] Sell failed:', err);
        const errorMessage = err instanceof Error ? err.message : 'Sell failed';
        setError(errorMessage);
        // Don't call fetchShop() here - it would clear the error before toast shows
        return null;
      } finally {
        setSelling(false);
      }
    },
    [campaignId, characterId, fetchShop]
  );

  // Refresh shop
  const refreshShop = useCallback(() => {
    fetchShop();
  }, [fetchShop]);

  return {
    shop,
    filteredItems,
    loading,
    error,
    filters,
    sort,
    setFilters,
    setSort,
    purchaseItem,
    sellItem,
    calculateSellPrice,
    canAfford,
    refreshShop,
    isItemAvailable,
    purchasing,
    selling,
  };
}

export default useShop;
