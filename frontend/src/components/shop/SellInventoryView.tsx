/**
 * SellInventoryView Component (Issue #336)
 *
 * Displays character's owned items for selling:
 * - Uses useInventory hook to fetch owned items
 * - Shows items in a grid layout using SellItemCard
 * - Handles auto-unequip for equipped items before selling
 * - Empty state when no items owned
 */

import { useCallback, useMemo } from 'react';
import { useInventory } from '../../hooks/useInventory';
import { useToast } from '../../contexts/ToastContext';
import { SellItemCard } from './SellItemCard';
import { RARITY_ORDER, UNEQUIP_DELAY_MS } from '../../constants/item';
import type { EquippedItems } from '../../../../shared/types/entities';
import styles from './SellInventoryView.module.css';

interface SellInventoryViewProps {
  /** Character ID to show inventory for */
  characterId: string;
  /** Sell price multiplier (e.g., 0.5 for 50%) */
  sellPriceMultiplier: number;
  /** Callback when selling an item */
  onSell: (itemId: string) => Promise<void>;
  /** Whether a sell operation is in progress */
  selling: boolean;
  /** Callback to view item details */
  onViewDetails?: (itemId: string) => void;
}

/**
 * Check if an item is currently equipped
 */
function isItemEquipped(itemId: string, equipped: EquippedItems): boolean {
  return (
    equipped.head === itemId ||
    equipped.body === itemId ||
    equipped.legs === itemId ||
    equipped.hands.includes(itemId) ||
    equipped.small.includes(itemId)
  );
}

/**
 * Calculate sell price for an item
 */
function calculateSellPrice(cost: number, multiplier: number): number {
  return Math.floor(cost * multiplier);
}

export function SellInventoryView({
  characterId,
  sellPriceMultiplier,
  onSell,
  selling,
  onViewDetails,
}: SellInventoryViewProps) {
  const { error: showError } = useToast();

  // Fetch character's inventory
  const {
    ownedItems,
    equippedItems,
    loading,
    error,
    unequipItem,
    refreshInventory,
  } = useInventory({
    characterId,
    enabled: true,
  });

  // Handle sell with auto-unequip
  const handleSell = useCallback(
    async (itemId: string) => {
      try {
        // Check if item is equipped
        if (isItemEquipped(itemId, equippedItems)) {
          // Unequip first
          await unequipItem(itemId);
          // Brief delay to ensure database is updated
          await new Promise((resolve) => setTimeout(resolve, UNEQUIP_DELAY_MS));
        }

        // Then sell
        await onSell(itemId);

        // Refresh inventory to reflect changes
        refreshInventory();
      } catch (err) {
        showError(
          err instanceof Error ? err.message : 'Failed to sell item'
        );
      }
    },
    [equippedItems, unequipItem, onSell, refreshInventory, showError]
  );

  // Sort items: equipped first, then by rarity, then by name
  const sortedItems = useMemo(() => {
    return [...ownedItems].sort((a, b) => {
      // Equipped items first
      const aEquipped = isItemEquipped(a.id, equippedItems);
      const bEquipped = isItemEquipped(b.id, equippedItems);
      if (aEquipped && !bEquipped) return -1;
      if (!aEquipped && bEquipped) return 1;

      // Then by rarity (higher first)
      const rarityDiff = RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity];
      if (rarityDiff !== 0) return rarityDiff;

      // Then by name
      return a.name.localeCompare(b.name);
    });
  }, [ownedItems, equippedItems]);

  // Loading state
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading inventory...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={refreshInventory} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (ownedItems.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No items to sell</p>
          <p className={styles.emptyHint}>
            Visit the shop to purchase items first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Info banner */}
      <div className={styles.infoBanner}>
        <span className={styles.infoIcon}>i</span>
        <span>
          Items sell for {Math.round(sellPriceMultiplier * 100)}% of their
          purchase price. Equipped items will be unequipped automatically.
        </span>
      </div>

      {/* Item count */}
      <div className={styles.itemCount}>
        {sortedItems.length} item{sortedItems.length !== 1 ? 's' : ''} in
        inventory
      </div>

      {/* Item grid */}
      <div className={styles.itemGrid}>
        {sortedItems.map((item) => (
          <SellItemCard
            key={item.id}
            item={item}
            sellPrice={calculateSellPrice(item.cost, sellPriceMultiplier)}
            isEquipped={isItemEquipped(item.id, equippedItems)}
            selling={selling}
            onSell={handleSell}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>
    </div>
  );
}

export default SellInventoryView;
