/**
 * ContextMenu Component (US3 - T137)
 *
 * Displays context-sensitive actions for hex tiles, characters, monsters, etc.
 * Triggered by long-press gestures on mobile devices.
 */

import React, { useEffect, useRef, useState } from 'react';
import { MIN_TOUCH_TARGET_SIZE } from '../utils/responsive';
import type { AxialCoordinates } from '../../../shared/types/entities';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  action: () => void;
  disabled?: boolean;
}

export interface ContextMenuProps {
  /** Position to display the menu (screen coordinates) */
  x: number;
  y: number;

  /** Menu items to display */
  items: ContextMenuItem[];

  /** Called when menu is dismissed */
  onClose: () => void;

  /** Title to display at top of menu (optional) */
  title?: string;

  /** Additional CSS classes */
  className?: string;

  /** Test ID for E2E testing */
  'data-testid'?: string;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  items,
  onClose,
  title,
  className = '',
  'data-testid': dataTestId = 'context-menu',
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  useEffect(() => {
    // Adjust position to keep menu within viewport
    if (menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      let adjustedX = x;
      let adjustedY = y;

      // Keep within horizontal bounds
      if (x + rect.width > viewport.width) {
        adjustedX = viewport.width - rect.width - 8; // 8px margin
      }
      if (adjustedX < 8) {
        adjustedX = 8;
      }

      // Keep within vertical bounds
      if (y + rect.height > viewport.height) {
        adjustedY = viewport.height - rect.height - 8;
      }
      if (adjustedY < 8) {
        adjustedY = 8;
      }

      setPosition({ x: adjustedX, y: adjustedY });
    }
  }, [x, y]);

  useEffect(() => {
    // Close on click outside
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Close on escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleItemClick = (item: ContextMenuItem) => {
    if (!item.disabled) {
      item.action();
      onClose();
    }
  };

  return (
    <div
      ref={menuRef}
      data-testid={dataTestId}
      className={`context-menu ${className}`}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 1000,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '8px',
        padding: '8px 0',
        minWidth: '160px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
        color: 'white',
      }}
    >
      {title && (
        <div
          style={{
            padding: '8px 16px',
            fontSize: '12px',
            fontWeight: 'bold',
            color: 'rgba(255, 255, 255, 0.7)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            marginBottom: '4px',
          }}
        >
          {title}
        </div>
      )}

      {items.map((item) => (
        <button
          key={item.id}
          data-testid={`context-menu-item-${item.id}`}
          onClick={() => handleItemClick(item)}
          disabled={item.disabled}
          role="menuitem"
          style={{
            width: '100%',
            minHeight: `${MIN_TOUCH_TARGET_SIZE}px`,
            padding: '12px 16px',
            border: 'none',
            background: 'transparent',
            color: item.disabled ? 'rgba(255, 255, 255, 0.3)' : 'white',
            textAlign: 'left',
            fontSize: '14px',
            cursor: item.disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!item.disabled) {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {item.icon && <span style={{ fontSize: '18px' }}>{item.icon}</span>}
          <span>{item.label}</span>
        </button>
      ))}

      {items.length === 0 && (
        <div
          style={{
            padding: '12px 16px',
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '14px',
            textAlign: 'center',
          }}
        >
          No actions available
        </div>
      )}
    </div>
  );
};

/**
 * Hook to manage context menu state
 */
export function useContextMenu() {
  const [menuState, setMenuState] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    items: ContextMenuItem[];
    title?: string;
  } | null>(null);

  const openMenu = (
    x: number,
    y: number,
    items: ContextMenuItem[],
    title?: string
  ) => {
    setMenuState({ isOpen: true, x, y, items, title });
  };

  const closeMenu = () => {
    setMenuState(null);
  };

  return {
    isOpen: menuState?.isOpen ?? false,
    x: menuState?.x ?? 0,
    y: menuState?.y ?? 0,
    items: menuState?.items ?? [],
    title: menuState?.title,
    openMenu,
    closeMenu,
  };
}

/**
 * Helper to create context menu items for hex tiles
 */
export function createHexContextItems(
  coordinates: AxialCoordinates,
  canMove: boolean,
  canAttack: boolean,
  hasLoot: boolean,
  onMove?: () => void,
  onAttack?: () => void,
  onCollectLoot?: () => void
): ContextMenuItem[] {
  const items: ContextMenuItem[] = [];

  if (canMove && onMove) {
    items.push({
      id: 'move',
      label: 'Move here',
      icon: '👣',
      action: onMove,
    });
  }

  if (canAttack && onAttack) {
    items.push({
      id: 'attack',
      label: 'Attack',
      icon: '⚔️',
      action: onAttack,
    });
  }

  if (hasLoot && onCollectLoot) {
    items.push({
      id: 'collect-loot',
      label: 'Collect loot',
      icon: '💰',
      action: onCollectLoot,
    });
  }

  items.push({
    id: 'view-info',
    label: `Hex (${coordinates.q}, ${coordinates.r})`,
    icon: 'ℹ️',
    action: () => {
      console.log('View hex info:', coordinates);
    },
  });

  return items;
}

/**
 * Helper to create context menu items for characters
 */
export function createCharacterContextItems(
  characterId: string,
  characterName: string,
  canAct: boolean,
  onViewStats?: () => void,
  onUseAbility?: () => void,
  onRest?: () => void
): ContextMenuItem[] {
  const items: ContextMenuItem[] = [];

  if (onViewStats) {
    items.push({
      id: 'view-stats',
      label: 'View stats',
      icon: '📊',
      action: onViewStats,
    });
  }

  if (canAct && onUseAbility) {
    items.push({
      id: 'use-ability',
      label: 'Use ability',
      icon: '✨',
      action: onUseAbility,
      disabled: !canAct,
    });
  }

  if (onRest) {
    items.push({
      id: 'rest',
      label: 'Rest',
      icon: '💤',
      action: onRest,
      disabled: !canAct,
    });
  }

  return items;
}

/**
 * Helper to create context menu items for monsters
 */
export function createMonsterContextItems(
  monsterId: string,
  monsterType: string,
  isElite: boolean,
  canTarget: boolean,
  onViewStats?: () => void,
  onTarget?: () => void
): ContextMenuItem[] {
  const items: ContextMenuItem[] = [];

  if (onViewStats) {
    items.push({
      id: 'view-stats',
      label: 'View stats',
      icon: '📊',
      action: onViewStats,
    });
  }

  if (canTarget && onTarget) {
    items.push({
      id: 'target',
      label: 'Target for attack',
      icon: '🎯',
      action: onTarget,
      disabled: !canTarget,
    });
  }

  return items;
}
