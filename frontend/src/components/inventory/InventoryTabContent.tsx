/**
 * InventoryTabContent Component (Issue #205)
 *
 * Content for the Inventory tab in the BottomSheet.
 * Displays:
 * - Equipped items at top
 * - Owned items below (grouped by slot)
 * - Item states: ready/spent/consumed visual indicators
 */

import React, { useState } from 'react';
import { ItemCard } from './ItemCard';
import { ItemIcon } from './ItemIcon';
import styles from './InventoryTabContent.module.css';
import {
  ItemSlot,
  type Item,
  type ItemState,
  type EquippedItems,
  type ItemRuntimeState,
} from '../../../../shared/types/entities';
import {
  getMaxSmallSlots,
  SLOT_DISPLAY_INFO,
  SLOT_ORDER,
} from '../../../../shared/utils/inventory';

interface InventoryTabContentProps {
  /** All items owned by the character */
  ownedItems: Item[];
  /** Currently equipped item IDs */
  equippedItems: EquippedItems;
  /** Runtime state for each item */
  itemStates: Record<string, ItemRuntimeState>;
  /** Character level (affects small item slots) */
  characterLevel: number;
  /** Handler when item is clicked for details */
  onItemClick?: (item: Item) => void;
  /** Handler to use an item */
  onUseItem?: (itemId: string) => void;
  /** Handler to equip an item */
  onEquipItem?: (itemId: string) => void;
  /** Handler to unequip an item */
  onUnequipItem?: (itemId: string) => void;
  /** Whether actions are disabled (e.g., not player's turn) */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Error message */
  error?: string;
}

// Use SLOT_DISPLAY_INFO as SLOT_INFO alias for backward compatibility in this file
const SLOT_INFO = SLOT_DISPLAY_INFO;

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
 * Group items by their slot type
 */
function groupItemsBySlot(items: Item[]): Record<ItemSlot, Item[]> {
  const grouped: Record<ItemSlot, Item[]> = {
    [ItemSlot.HEAD]: [],
    [ItemSlot.BODY]: [],
    [ItemSlot.LEGS]: [],
    [ItemSlot.ONE_HAND]: [],
    [ItemSlot.TWO_HAND]: [],
    [ItemSlot.SMALL]: [],
  };

  items.forEach((item) => {
    if (grouped[item.slot]) {
      grouped[item.slot].push(item);
    }
  });

  return grouped;
}

export const InventoryTabContent: React.FC<InventoryTabContentProps> = ({
  ownedItems,
  equippedItems,
  itemStates,
  characterLevel,
  onItemClick,
  onUseItem,
  onUnequipItem,
  onEquipItem,
  disabled = false,
  loading = false,
  error,
}) => {
  const [expandedSlot, setExpandedSlot] = useState<ItemSlot | null>(null);

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span>Loading inventory...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <span className={styles.errorIcon}>!</span>
        <span>{error}</span>
      </div>
    );
  }

  // Group items
  const itemsBySlot = groupItemsBySlot(ownedItems);
  const maxSmallSlots = getMaxSmallSlots(characterLevel);

  // Get equipped items for display
  const equippedItemsList: { item: Item; slot: ItemSlot }[] = [];
  ownedItems.forEach((item) => {
    if (isItemEquipped(item.id, equippedItems)) {
      equippedItemsList.push({ item, slot: item.slot });
    }
  });

  // Separate unequipped items
  const unequippedItems = ownedItems.filter((item) => !isItemEquipped(item.id, equippedItems));
  const unequippedBySlot = groupItemsBySlot(unequippedItems);

  return (
    <div className={styles.inventoryContent}>
      {/* Equipped Section */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <ItemIcon icon="ra-hand" size={16} />
          <span>Equipped</span>
        </h3>

        {equippedItemsList.length === 0 ? (
          <p className={styles.emptyMessage}>No items equipped</p>
        ) : (
          <div className={styles.equippedGrid}>
            {equippedItemsList.map(({ item }) => {
              const runtime = itemStates[item.id];
              return (
                <ItemCard
                  key={item.id}
                  item={item}
                  state={runtime?.state as ItemState}
                  usesRemaining={runtime?.usesRemaining}
                  isEquipped={true}
                  onClick={() => onItemClick?.(item)}
                  onUse={onUseItem ? () => onUseItem(item.id) : undefined}
                  onEquipToggle={onUnequipItem ? () => onUnequipItem(item.id) : undefined}
                  disabled={disabled}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Equipment Slots Overview */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <ItemIcon icon="ra-armor-upgrade" size={16} />
          <span>Equipment Slots</span>
        </h3>

        <div className={styles.slotsOverview}>
          {SLOT_ORDER.map((slot) => {
            const info = SLOT_INFO[slot];
            const slotItems = itemsBySlot[slot];
            const equippedCount = slotItems.filter((item) =>
              isItemEquipped(item.id, equippedItems)
            ).length;

            // Calculate max slots
            let maxSlots = 1;
            if (slot === ItemSlot.ONE_HAND) maxSlots = 2;
            if (slot === ItemSlot.SMALL) maxSlots = maxSmallSlots;
            // TWO_HAND and ONE_HAND share hand slots
            if (slot === ItemSlot.TWO_HAND) {
              const twoHandEquipped = equippedItems.hands.some((id) => {
                const item = ownedItems.find((i) => i.id === id);
                return item?.slot === ItemSlot.TWO_HAND;
              });
              maxSlots = twoHandEquipped ? 0 : 1;
            }

            const hasUnequipped = unequippedBySlot[slot]?.length > 0;
            const isExpanded = expandedSlot === slot;

            return (
              <div key={slot} className={styles.slotGroup}>
                <button
                  className={`${styles.slotHeader} ${isExpanded ? styles.expanded : ''}`}
                  onClick={() => setExpandedSlot(isExpanded ? null : slot)}
                  disabled={!hasUnequipped}
                >
                  <ItemIcon icon={info.icon} size={18} />
                  <span className={styles.slotLabel}>{info.label}</span>
                  <span className={styles.slotCount}>
                    {equippedCount}/{maxSlots}
                  </span>
                  {hasUnequipped && (
                    <span className={styles.expandIcon}>{isExpanded ? '-' : '+'}</span>
                  )}
                </button>

                {/* Expandable unequipped items */}
                {isExpanded && hasUnequipped && (
                  <div className={styles.slotItems}>
                    {unequippedBySlot[slot].map((item) => {
                      const runtime = itemStates[item.id];
                      return (
                        <ItemCard
                          key={item.id}
                          item={item}
                          state={runtime?.state as ItemState}
                          usesRemaining={runtime?.usesRemaining}
                          isEquipped={false}
                          onClick={onEquipItem ? () => onEquipItem(item.id) : () => onItemClick?.(item)}
                          disabled={disabled}
                          compact
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* All Items Section */}
      {ownedItems.length === 0 && (
        <div className={styles.emptyInventory}>
          <ItemIcon icon="ra-treasure-map" size={48} color="#9ab0c9" />
          <p>Your inventory is empty</p>
          <p className={styles.hint}>Complete scenarios to earn gold and buy items!</p>
        </div>
      )}
    </div>
  );
};

export default InventoryTabContent;
