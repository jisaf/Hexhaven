/**
 * SellItemCard Component (Issue #336)
 *
 * Displays a character's owned item for selling:
 * - Item name, rarity, sell price
 * - Equipped status indicator
 * - Sell button (with unequip warning if equipped)
 */

import { useMemo } from 'react';
import type { Item } from '../../../../shared/types/entities';
import { RARITY_COLORS, SLOT_LABELS } from '../../constants/item';
import styles from './SellItemCard.module.css';

interface SellItemCardProps {
  /** Item data */
  item: Item;
  /** Calculated sell price */
  sellPrice: number;
  /** Whether this item is currently equipped */
  isEquipped: boolean;
  /** Whether a sell operation is in progress */
  selling: boolean;
  /** Callback when sell button is clicked */
  onSell: (itemId: string) => void;
  /** Callback when card is clicked for details */
  onViewDetails?: (itemId: string) => void;
}

export function SellItemCard({
  item,
  sellPrice,
  isEquipped,
  selling,
  onSell,
  onViewDetails,
}: SellItemCardProps) {
  // Determine card state
  const cardState = useMemo(() => {
    if (selling) return 'selling';
    if (isEquipped) return 'equipped';
    return 'available';
  }, [selling, isEquipped]);

  // Handle sell click
  const handleSell = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selling) {
      onSell(item.id);
    }
  };

  // Handle card click
  const handleCardClick = () => {
    if (onViewDetails) {
      onViewDetails(item.id);
    }
  };

  // Handle keyboard activation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onViewDetails && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onViewDetails(item.id);
    }
  };

  return (
    <div
      className={`${styles.card} ${styles[cardState]}`}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      role={onViewDetails ? 'button' : undefined}
      tabIndex={onViewDetails ? 0 : undefined}
    >
      {/* Rarity indicator */}
      <div
        className={styles.rarityBar}
        style={{ backgroundColor: RARITY_COLORS[item.rarity] }}
      />

      {/* Equipped badge */}
      {isEquipped && (
        <div className={styles.equippedBadge}>Equipped</div>
      )}

      {/* Item header */}
      <div className={styles.header}>
        <h3 className={styles.name}>{item.name}</h3>
        <span className={styles.slot}>{SLOT_LABELS[item.slot]}</span>
      </div>

      {/* Rarity */}
      <span
        className={styles.rarity}
        style={{ color: RARITY_COLORS[item.rarity] }}
      >
        {item.rarity.charAt(0) + item.rarity.slice(1).toLowerCase()}
      </span>

      {/* Description preview */}
      {item.description && (
        <p className={styles.description}>
          {item.description.length > 60
            ? `${item.description.substring(0, 60)}...`
            : item.description}
        </p>
      )}

      {/* Sell price */}
      <div className={styles.footer}>
        <div className={styles.price}>
          <span className={styles.priceLabel}>Sell for:</span>
          <span className={styles.goldIcon}>$</span>
          <span className={styles.cost}>{sellPrice}</span>
        </div>
      </div>

      {/* Sell button */}
      <button
        className={styles.sellButton}
        onClick={handleSell}
        disabled={selling}
      >
        {selling
          ? 'Selling...'
          : isEquipped
          ? 'Unequip & Sell'
          : `Sell for ${sellPrice}g`}
      </button>
    </div>
  );
}

export default SellItemCard;
