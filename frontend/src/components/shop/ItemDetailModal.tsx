/**
 * ItemDetailModal Component (Issue #343)
 *
 * Full-screen modal showing detailed item information:
 * - Item name, rarity, slot, cost
 * - Full effect descriptions
 * - Usage type and triggers
 * - Buy/Sell actions
 */

import { useMemo } from 'react';
import type { Item, ItemRarity, ItemSlot, ItemUsageType } from '../../../../shared/types/entities';
import type { ShopItem } from '../../services/shop.service';
import styles from './ItemDetailModal.module.css';

// Rarity color mapping
const RARITY_COLORS: Record<ItemRarity, string> = {
  COMMON: '#9ab0c9',
  UNCOMMON: '#2ecc71',
  RARE: '#3498db',
  EPIC: '#9b59b6',
  LEGENDARY: '#f1c40f',
};

// Slot display names
const SLOT_LABELS: Record<ItemSlot, string> = {
  HEAD: 'Head',
  BODY: 'Body',
  LEGS: 'Legs',
  ONE_HAND: 'One Hand',
  TWO_HAND: 'Two Hands',
  SMALL: 'Small Item',
};

// Usage type display
const USAGE_LABELS: Record<ItemUsageType, string> = {
  PERSISTENT: 'Persistent (always active)',
  SPENT: 'Spent (refreshes on rest)',
  CONSUMED: 'Consumed (single use)',
};

interface ItemDetailModalProps {
  /** Shop item data */
  shopItem: ShopItem;
  /** Full item details (if available) */
  fullItem?: Item;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close modal callback */
  onClose: () => void;
  /** Character's current gold */
  characterGold?: number;
  /** Whether buying is possible */
  canBuy?: boolean;
  /** Whether selling is possible (item owned by character) */
  canSell?: boolean;
  /** Sell price if selling */
  sellPrice?: number;
  /** Buy callback */
  onBuy?: () => void;
  /** Sell callback */
  onSell?: () => void;
  /** Whether an action is in progress */
  actionInProgress?: boolean;
}

export function ItemDetailModal({
  shopItem,
  fullItem,
  isOpen,
  onClose,
  characterGold = 0,
  canBuy = false,
  canSell = false,
  sellPrice = 0,
  onBuy,
  onSell,
  actionInProgress = false,
}: ItemDetailModalProps) {
  // Use full item data if available, otherwise derive from shop item
  // Note: useMemo must be called unconditionally (before early return)
  const itemData = useMemo(() => {
    if (fullItem) {
      return {
        name: fullItem.name,
        rarity: fullItem.rarity,
        slot: fullItem.slot,
        usageType: fullItem.usageType,
        cost: fullItem.cost,
        description: fullItem.description,
        effects: fullItem.effects,
        triggers: fullItem.triggers,
      };
    }
    // Fallback to shop item data
    return {
      name: shopItem.itemName,
      rarity: shopItem.rarity,
      slot: undefined,
      usageType: undefined,
      cost: shopItem.cost,
      description: undefined,
      effects: [],
      triggers: [],
    };
  }, [shopItem, fullItem]);

  // Don't render if not open (early return after hooks)
  if (!isOpen) return null;

  const affordsItem = characterGold >= itemData.cost;
  const buyDisabled = !canBuy || !affordsItem || shopItem.quantity === 0 || actionInProgress;

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className={styles.backdrop}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="item-modal-title"
    >
      <div className={styles.modal}>
        {/* Close button */}
        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        {/* Rarity bar */}
        <div
          className={styles.rarityBar}
          style={{ backgroundColor: RARITY_COLORS[itemData.rarity] }}
        />

        {/* Header */}
        <div className={styles.header}>
          <h2 id="item-modal-title" className={styles.title}>
            {itemData.name}
          </h2>
          <div className={styles.badges}>
            <span
              className={styles.rarityBadge}
              style={{
                backgroundColor: RARITY_COLORS[itemData.rarity] + '20',
                color: RARITY_COLORS[itemData.rarity],
              }}
            >
              {itemData.rarity.charAt(0) + itemData.rarity.slice(1).toLowerCase()}
            </span>
            {itemData.slot && (
              <span className={styles.slotBadge}>{SLOT_LABELS[itemData.slot]}</span>
            )}
          </div>
        </div>

        {/* Description */}
        {itemData.description && (
          <p className={styles.description}>{itemData.description}</p>
        )}

        {/* Effects */}
        {itemData.effects && itemData.effects.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Effects</h3>
            <ul className={styles.effectsList}>
              {itemData.effects.map((effect, index) => (
                <li key={index} className={styles.effect}>
                  <span className={styles.effectType}>
                    {effect.type.replace(/_/g, ' ')}
                  </span>
                  {effect.value !== undefined && (
                    <span className={styles.effectValue}>+{effect.value}</span>
                  )}
                  {effect.description && (
                    <span className={styles.effectDesc}>{effect.description}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Triggers */}
        {itemData.triggers && itemData.triggers.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Triggers</h3>
            <ul className={styles.triggersList}>
              {itemData.triggers.map((trigger, index) => (
                <li key={index} className={styles.trigger}>
                  <span className={styles.triggerEvent}>
                    {trigger.event.replace(/_/g, ' ')}
                  </span>
                  {trigger.condition && (
                    <span className={styles.triggerCondition}>
                      : {trigger.condition}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Usage type */}
        {itemData.usageType && (
          <div className={styles.usageType}>
            {USAGE_LABELS[itemData.usageType]}
          </div>
        )}

        {/* Shop info */}
        <div className={styles.shopInfo}>
          <div className={styles.priceSection}>
            <span className={styles.priceLabel}>Price</span>
            <span className={styles.price}>
              <span className={styles.goldIcon}>$</span>
              {itemData.cost}
            </span>
          </div>

          <div className={styles.stockSection}>
            <span className={styles.stockLabel}>In Stock</span>
            <span className={`${styles.stock} ${shopItem.quantity === 0 ? styles.soldOut : ''}`}>
              {shopItem.quantity === 0 ? 'Sold Out' : `${shopItem.quantity} available`}
            </span>
          </div>

          {canSell && (
            <div className={styles.sellSection}>
              <span className={styles.sellLabel}>Sell Price</span>
              <span className={styles.sellPrice}>
                <span className={styles.goldIcon}>$</span>
                {sellPrice}
              </span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className={styles.actions}>
          {onBuy && (
            <button
              className={`${styles.actionButton} ${styles.buyButton}`}
              onClick={onBuy}
              disabled={buyDisabled}
            >
              {actionInProgress ? 'Processing...' : `Buy for ${itemData.cost}g`}
            </button>
          )}

          {onSell && canSell && (
            <button
              className={`${styles.actionButton} ${styles.sellButton}`}
              onClick={onSell}
              disabled={actionInProgress}
            >
              {actionInProgress ? 'Processing...' : `Sell for ${sellPrice}g`}
            </button>
          )}
        </div>

        {/* Affordability warning */}
        {onBuy && !affordsItem && shopItem.quantity > 0 && (
          <p className={styles.warning}>
            You need {itemData.cost - characterGold} more gold to purchase this item.
          </p>
        )}
      </div>
    </div>
  );
}

export default ItemDetailModal;
