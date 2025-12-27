/**
 * ItemIcon Component (Issue #205)
 *
 * Renders RPG Awesome icons for item display.
 * Falls back to a default icon if the specified icon is invalid.
 *
 * Usage:
 * - Pass an icon class like "ra-sword" or "ra ra-sword"
 * - Component handles the "ra" prefix automatically
 */

import React from 'react';
import 'rpg-awesome/css/rpg-awesome.min.css';
import styles from './ItemIcon.module.css';
import type { ItemSlot, ItemRarity } from '../../../../shared/types/entities';
import { RARITY_COLORS, SLOT_DEFAULT_ICONS } from '../../constants/item';

interface ItemIconProps {
  /** Icon class name (e.g., "ra-sword", "sword", or "ra ra-sword") */
  icon?: string;
  /** Size in pixels (default: 24) */
  size?: number;
  /** Optional color override */
  color?: string;
  /** Item slot for fallback icon selection */
  slot?: ItemSlot;
  /** Item rarity for styling */
  rarity?: ItemRarity;
  /** Additional CSS class */
  className?: string;
}

/**
 * Normalize icon class to ensure proper "ra ra-xxx" format
 */
function normalizeIconClass(icon: string): string {
  const trimmed = icon.trim();

  // Already has "ra ra-" prefix
  if (trimmed.startsWith('ra ra-')) {
    return trimmed;
  }

  // Has "ra-" prefix but missing base "ra" class
  if (trimmed.startsWith('ra-')) {
    return `ra ${trimmed}`;
  }

  // Has base "ra" class with something else
  if (trimmed.startsWith('ra ')) {
    // Check if second part has ra- prefix
    const parts = trimmed.split(' ');
    if (parts.length >= 2 && !parts[1].startsWith('ra-')) {
      return `ra ra-${parts[1]}`;
    }
    return trimmed;
  }

  // Just the icon name without any prefix
  return `ra ra-${trimmed}`;
}

export const ItemIcon: React.FC<ItemIconProps> = ({
  icon,
  size = 24,
  color,
  slot,
  rarity,
  className = '',
}) => {
  // Determine icon class
  let iconClass: string;

  if (icon) {
    iconClass = normalizeIconClass(icon);
  } else if (slot) {
    iconClass = `ra ${SLOT_DEFAULT_ICONS[slot]}`;
  } else {
    iconClass = 'ra ra-gem'; // Ultimate fallback
  }

  // Determine color
  const iconColor = color || (rarity ? RARITY_COLORS[rarity] : undefined);

  const style: React.CSSProperties = {
    fontSize: `${size}px`,
    ...(iconColor && { color: iconColor }),
  };

  return (
    <i
      className={`${iconClass} ${styles.itemIcon} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
};

export default ItemIcon;
