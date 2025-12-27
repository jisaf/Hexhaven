/**
 * ShopItemCard Component (Issue #333)
 *
 * Displays a single shop item with:
 * - Item name, cost, rarity, quantity
 * - Visual state (available, sold out, too expensive)
 * - Buy button with disabled states
 */

import { useMemo } from 'react';
import type { ShopItem } from '../../services/shop.service';
import type { ItemSlot } from '../../../../shared/types/entities';
import { RARITY_COLORS, SLOT_LABELS } from '../../constants/item';
import styles from './ShopItemCard.module.css';

interface ShopItemCardProps {
  /** Shop item data */
  item: ShopItem;
  /** Whether the current character can afford this item */
  canAfford: boolean;
  /** Whether a purchase is currently in progress */
  purchasing?: boolean;
  /** Callback when buy button is clicked */
  onBuy: (itemId: string) => void;
  /** Callback when item card is clicked (for details) */
  onViewDetails?: (itemId: string) => void;
  /** Item slot (if available from full item data) */
  slot?: ItemSlot;
  /** Item description (if available) */
  description?: string;
}

export function ShopItemCard({
  item,
  canAfford,
  purchasing = false,
  onBuy,
  onViewDetails,
  slot,
  description,
}: ShopItemCardProps) {
  // Determine card state
  const cardState = useMemo(() => {
    if (item.quantity === 0) return 'soldOut';
    if (!item.isAvailable) return 'locked';
    if (!canAfford) return 'tooExpensive';
    return 'available';
  }, [item.quantity, item.isAvailable, canAfford]);

  // Can the buy button be clicked?
  const canBuy = cardState === 'available' && !purchasing;

  // Handle buy click
  const handleBuy = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering card click
    if (canBuy) {
      onBuy(item.itemId);
    }
  };

  // Handle card click
  const handleCardClick = () => {
    if (onViewDetails) {
      onViewDetails(item.itemId);
    }
  };

  return (
    <div
      className={`${styles.card} ${styles[cardState]}`}
      onClick={handleCardClick}
      role={onViewDetails ? 'button' : undefined}
      tabIndex={onViewDetails ? 0 : undefined}
    >
      {/* Rarity indicator */}
      <div
        className={styles.rarityBar}
        style={{ backgroundColor: RARITY_COLORS[item.rarity] }}
      />

      {/* Item header */}
      <div className={styles.header}>
        <h3 className={styles.name}>{item.itemName}</h3>
        {slot && <span className={styles.slot}>{SLOT_LABELS[slot]}</span>}
      </div>

      {/* Rarity badge */}
      <span
        className={styles.rarity}
        style={{ color: RARITY_COLORS[item.rarity] }}
      >
        {item.rarity.charAt(0) + item.rarity.slice(1).toLowerCase()}
      </span>

      {/* Description preview */}
      {description && (
        <p className={styles.description}>{description}</p>
      )}

      {/* Price and quantity */}
      <div className={styles.footer}>
        <div className={styles.price}>
          <span className={styles.goldIcon}>$</span>
          <span className={styles.cost}>{item.cost}</span>
        </div>

        <div className={styles.quantity}>
          {item.quantity === 0 ? (
            <span className={styles.soldOut}>Sold Out</span>
          ) : (
            <span>Qty: {item.quantity}</span>
          )}
        </div>
      </div>

      {/* Status badges */}
      {cardState === 'locked' && (
        <div className={styles.statusBadge}>
          <span className={styles.lockedBadge}>Locked</span>
        </div>
      )}

      {cardState === 'tooExpensive' && (
        <div className={styles.statusBadge}>
          <span className={styles.expensiveBadge}>Not enough gold</span>
        </div>
      )}

      {/* Buy button */}
      <button
        className={styles.buyButton}
        onClick={handleBuy}
        disabled={!canBuy}
      >
        {purchasing ? 'Buying...' : cardState === 'soldOut' ? 'Sold Out' : 'Buy'}
      </button>
    </div>
  );
}

export default ShopItemCard;
