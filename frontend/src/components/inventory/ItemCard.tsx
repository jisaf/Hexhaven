/**
 * ItemCard Component (Issue #205)
 *
 * Displays a single item with:
 * - Icon (RPG Awesome)
 * - Name and rarity badge
 * - Effects list
 * - State indicator (ready/spent/consumed)
 * - Action button (use/equip/unequip)
 */

import React from 'react';
import { ItemIcon } from './ItemIcon';
import styles from './ItemCard.module.css';
import {
  ItemState,
  ItemUsageType,
  type Item,
  type ItemRarity,
} from '../../../../shared/types/entities';
import {
  SLOT_SHORT_NAMES,
  formatEffectsSummary,
} from '../../../../shared/utils/inventory';

interface ItemCardProps {
  /** The item to display */
  item: Item;
  /** Current runtime state of the item */
  state?: ItemState;
  /** Remaining uses (for limited-use items) */
  usesRemaining?: number;
  /** Whether this item is equipped */
  isEquipped?: boolean;
  /** Click handler for the card */
  onClick?: () => void;
  /** Handler for use button */
  onUse?: () => void;
  /** Handler for equip/unequip button */
  onEquipToggle?: () => void;
  /** Whether actions are disabled */
  disabled?: boolean;
  /** Compact mode for inline display */
  compact?: boolean;
}

// Use shared slot names
const SLOT_NAMES = SLOT_SHORT_NAMES;

// Rarity display names and CSS classes
const RARITY_INFO: Record<ItemRarity, { label: string; className: string }> = {
  COMMON: { label: 'Common', className: 'rarityCommon' },
  UNCOMMON: { label: 'Uncommon', className: 'rarityUncommon' },
  RARE: { label: 'Rare', className: 'rarityRare' },
  EPIC: { label: 'Epic', className: 'rarityEpic' },
  LEGENDARY: { label: 'Legendary', className: 'rarityLegendary' },
};

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  state = 'ready',
  usesRemaining,
  isEquipped = false,
  onClick,
  onUse,
  onEquipToggle,
  disabled = false,
  compact = false,
}) => {
  const rarityInfo = RARITY_INFO[item.rarity] || RARITY_INFO.COMMON;
  const slotName = SLOT_NAMES[item.slot] || item.slot;
  const isSpent = state === ItemState.SPENT;
  const isConsumed = state === ItemState.CONSUMED;
  const isUsable = item.usageType !== ItemUsageType.PERSISTENT && !isConsumed && !isSpent;

  // Build card class names
  const cardClasses = [
    styles.itemCard,
    isEquipped ? styles.equipped : '',
    isSpent ? styles.spent : '',
    isConsumed ? styles.consumed : '',
    compact ? styles.compact : '',
    onClick ? styles.clickable : '',
    disabled ? styles.disabled : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Format effects for display using shared utility
  const effectsSummary = formatEffectsSummary(item.effects);

  return (
    <div className={cardClasses} onClick={!disabled ? onClick : undefined}>
      {/* State Overlay for spent/consumed items */}
      {(isSpent || isConsumed) && (
        <div className={styles.stateOverlay}>
          <span className={styles.stateText}>
            {isConsumed ? 'Consumed' : 'Spent'}
          </span>
        </div>
      )}

      {/* Header: Icon + Name + Rarity */}
      <div className={styles.header}>
        <div className={styles.iconContainer}>
          <ItemIcon
            icon={item.imageUrl}
            slot={item.slot}
            rarity={item.rarity}
            size={compact ? 20 : 28}
          />
        </div>
        <div className={styles.titleArea}>
          <span className={styles.name}>{item.name}</span>
          <div className={styles.badges}>
            <span className={`${styles.rarityBadge} ${styles[rarityInfo.className]}`}>
              {rarityInfo.label}
            </span>
            <span className={styles.slotBadge}>{slotName}</span>
          </div>
        </div>
      </div>

      {/* Effects - shown when not compact */}
      {!compact && effectsSummary && (
        <div className={styles.effects}>
          {effectsSummary}
        </div>
      )}

      {/* Description - shown when not compact */}
      {!compact && item.description && (
        <div className={styles.description}>
          {item.description}
        </div>
      )}

      {/* Uses indicator */}
      {item.maxUses && (
        <div className={styles.usesIndicator}>
          Uses: {usesRemaining ?? item.maxUses}/{item.maxUses}
        </div>
      )}

      {/* Actions */}
      {!compact && (onUse || onEquipToggle) && (
        <div className={styles.actions}>
          {isUsable && onUse && (
            <button
              className={styles.useButton}
              onClick={(e) => {
                e.stopPropagation();
                onUse();
              }}
              disabled={disabled || isSpent || isConsumed}
            >
              Use
            </button>
          )}
          {onEquipToggle && (
            <button
              className={`${styles.equipButton} ${isEquipped ? styles.unequipButton : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onEquipToggle();
              }}
              disabled={disabled}
            >
              {isEquipped ? 'Unequip' : 'Equip'}
            </button>
          )}
        </div>
      )}

      {/* Equipped indicator */}
      {isEquipped && (
        <div className={styles.equippedBadge}>
          Equipped
        </div>
      )}
    </div>
  );
};

export default ItemCard;
