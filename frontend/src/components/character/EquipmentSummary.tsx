/**
 * EquipmentSummary Component
 *
 * Compact display of equipped items for character selection in lobby.
 * Shows slot icons with filled/empty state and item counts.
 * Includes optional "Manage" link to character detail page.
 */

import { Link } from 'react-router-dom';
import { ItemIcon } from '../inventory/ItemIcon';
import { SLOT_DISPLAY_INFO } from '../../../../shared/utils/inventory';
import { ItemSlot, type EquippedItems, type Item } from '../../../../shared/types/entities';
import styles from './EquipmentSummary.module.css';

interface EquipmentSummaryProps {
  /** Currently equipped item structure */
  equippedItems: EquippedItems;
  /** All owned items (for future item name display) */
  ownedItems?: Item[];
  /** Character ID for "Manage" link */
  characterId: string;
  /** Character level for small slots calculation */
  characterLevel?: number;
  /** Whether to show the "Manage" link */
  showManageLink?: boolean;
  /** Navigation source for back button context */
  from?: 'lobby' | 'characters';
  /** Compact mode for tighter spacing */
  compact?: boolean;
}

/**
 * Equipment slot display
 */
function SlotIndicator({
  slot,
  isEquipped,
  count,
  maxCount,
}: {
  slot: ItemSlot;
  isEquipped: boolean;
  count?: number;
  maxCount?: number;
}) {
  const info = SLOT_DISPLAY_INFO[slot];
  const showCount = count !== undefined && maxCount !== undefined && maxCount > 1;

  return (
    <div
      className={`${styles.slotIndicator} ${isEquipped ? styles.equipped : styles.empty}`}
      title={info.label}
    >
      <ItemIcon
        icon={info.icon}
        size={16}
        color={isEquipped ? '#4a9eff' : '#555'}
      />
      {showCount && (
        <span className={styles.slotCount}>{count}/{maxCount}</span>
      )}
    </div>
  );
}

export function EquipmentSummary({
  equippedItems,
  characterId,
  characterLevel = 1,
  showManageLink = true,
  from = 'lobby',
  compact = false,
}: EquipmentSummaryProps) {
  // Count equipped items
  const headEquipped = !!equippedItems.head;
  const bodyEquipped = !!equippedItems.body;
  const legsEquipped = !!equippedItems.legs;
  const handsCount = equippedItems.hands.filter(Boolean).length;
  const smallCount = equippedItems.small.filter(Boolean).length;
  const maxSmallSlots = Math.ceil(characterLevel / 2);

  // Total equipped count
  const totalEquipped = [
    equippedItems.head,
    equippedItems.body,
    equippedItems.legs,
    ...equippedItems.hands,
    ...equippedItems.small,
  ].filter(Boolean).length;

  // If nothing equipped, show empty state
  if (totalEquipped === 0) {
    return (
      <div className={`${styles.equipmentSummary} ${compact ? styles.compact : ''}`}>
        <span className={styles.emptyLabel}>No items equipped</span>
        {showManageLink && (
          <Link
            to={`/characters/${characterId}?from=${from}`}
            className={styles.manageLink}
            onClick={(e) => e.stopPropagation()}
          >
            Equip
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className={`${styles.equipmentSummary} ${compact ? styles.compact : ''}`}>
      <div className={styles.slots}>
        <SlotIndicator slot={ItemSlot.HEAD} isEquipped={headEquipped} />
        <SlotIndicator slot={ItemSlot.BODY} isEquipped={bodyEquipped} />
        <SlotIndicator slot={ItemSlot.LEGS} isEquipped={legsEquipped} />
        <SlotIndicator
          slot={ItemSlot.ONE_HAND}
          isEquipped={handsCount > 0}
          count={handsCount}
          maxCount={2}
        />
        <SlotIndicator
          slot={ItemSlot.SMALL}
          isEquipped={smallCount > 0}
          count={smallCount}
          maxCount={maxSmallSlots}
        />
      </div>
      {showManageLink && (
        <Link
          to={`/characters/${characterId}?from=${from}`}
          className={styles.manageLink}
          onClick={(e) => e.stopPropagation()}
        >
          Manage
        </Link>
      )}
    </div>
  );
}

export default EquipmentSummary;
