/**
 * AbilityCard2 Component (Issue #217)
 *
 * Layout:
 * - Left column (90%): Header + Top Action + Split + Bottom Action
 * - Right column (10%): Initiative (top) + Level (middle)
 *
 * Grid rows: header (small) | top action (4fr) | split (0.5fr) | bottom action (4fr)
 *
 * Features:
 * - Press and hold to show zoomed modal view
 * - Release to close modal
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CardDataProvider, abilityCardToCardData } from '../contexts/CardDataContext';
import { ActionRowLayout, CardIcons } from './layouts/ActionRowLayout';
import type { AbilityCard as AbilityCardType, Action } from '../../../shared/types/entities';
import 'rpg-awesome/css/rpg-awesome.min.css';
import './AbilityCard2.css';

export type CardVariant = 'full' | 'compact';

const LONG_PRESS_DURATION = 350; // ms before zoom activates

export interface AbilityCard2Props {
  card: AbilityCardType;
  variant?: CardVariant;
  isSelected?: boolean;
  isTop?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Action section - fills available space
 */
const ActionSection: React.FC<{
  action: Action;
  position: 'top' | 'bottom';
  variant: CardVariant;
}> = ({ action, position, variant }) => {
  return (
    <ActionRowLayout
      action={action}
      position={position}
      variant={variant}
    />
  );
};

/**
 * Split divider - minimal height
 */
const SplitDivider: React.FC = () => {
  return (
    <div className="card2-split">
      <div className="card2-split-line" />
    </div>
  );
};

/**
 * Right column - initiative at top, action icons for each section
 */
const RightColumn: React.FC<{
  initiative: number;
  topAction: Action;
  bottomAction: Action;
}> = ({ initiative, topAction, bottomAction }) => {
  return (
    <div className="card2-right-column">
      <div className="card2-initiative">{initiative}</div>
      <div className="card2-right-icons top">
        <CardIcons
          isLost={topAction.isLost}
          isPersistent={topAction.isPersistent}
          xp={topAction.xp}
        />
      </div>
      <div className="card2-right-icons bottom">
        <CardIcons
          isLost={bottomAction.isLost}
          isPersistent={bottomAction.isPersistent}
          xp={bottomAction.xp}
        />
      </div>
    </div>
  );
};

export const AbilityCard2: React.FC<AbilityCard2Props> = ({
  card,
  variant = 'full',
  isSelected = false,
  isTop,
  onClick,
  disabled = false,
  className = '',
}) => {
  const cardData = abilityCardToCardData(card);
  const [isZoomed, setIsZoomed] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  // Clear any text selection
  const clearSelection = useCallback(() => {
    const selection = document.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
  }, []);

  // Cancel long press timer
  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Close zoom modal
  const closeZoom = useCallback(() => {
    setIsZoomed(false);
    clearSelection();
  }, [clearSelection]);

  // Native touch event handlers - must use passive: false to preventDefault
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Don't prevent default to allow scrolling
      clearSelection();

      // Store touch position to detect movement
      const touch = e.touches[0];
      touchStartPos.current = { x: touch.clientX, y: touch.clientY };

      isLongPress.current = false;
      longPressTimer.current = setTimeout(() => {
        isLongPress.current = true;
        // Prevent further default behavior once long press activates
        clearSelection();
        setIsZoomed(true);
      }, LONG_PRESS_DURATION);
    };

    const handleTouchMove = (e: TouchEvent) => {
      // If user moves finger significantly, cancel long press
      if (touchStartPos.current && e.touches[0]) {
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - touchStartPos.current.x);
        const dy = Math.abs(touch.clientY - touchStartPos.current.y);
        if (dx > 10 || dy > 10) {
          cancelLongPress();
          touchStartPos.current = null;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      cancelLongPress();
      touchStartPos.current = null;

      if (isZoomed) {
        setTimeout(closeZoom, 50);
      } else if (!isLongPress.current && !disabled && onClick) {
        onClick();
      }
      clearSelection();
    };

    const handleTouchCancel = () => {
      cancelLongPress();
      touchStartPos.current = null;
      closeZoom();
    };

    // Prevent context menu on long press
    const handleContextMenu = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // Use passive: false to allow preventDefault
    card.addEventListener('touchstart', handleTouchStart, { passive: false });
    card.addEventListener('touchmove', handleTouchMove, { passive: false });
    card.addEventListener('touchend', handleTouchEnd, { passive: false });
    card.addEventListener('touchcancel', handleTouchCancel, { passive: false });
    card.addEventListener('contextmenu', handleContextMenu, { capture: true });

    return () => {
      card.removeEventListener('touchstart', handleTouchStart);
      card.removeEventListener('touchmove', handleTouchMove);
      card.removeEventListener('touchend', handleTouchEnd);
      card.removeEventListener('touchcancel', handleTouchCancel);
      card.removeEventListener('contextmenu', handleContextMenu, { capture: true });
    };
  }, [disabled, onClick, isZoomed, cancelLongPress, clearSelection, closeZoom]);

  // Mouse event handlers for desktop
  const handleMouseDown = useCallback(() => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setIsZoomed(true);
    }, LONG_PRESS_DURATION);
  }, []);

  const handleMouseUp = useCallback(() => {
    cancelLongPress();
    if (isZoomed) {
      setTimeout(closeZoom, 50);
    }
  }, [isZoomed, cancelLongPress, closeZoom]);

  const handleMouseLeave = useCallback(() => {
    cancelLongPress();
  }, [cancelLongPress]);

  const handleClick = useCallback(() => {
    // Only handle click if it wasn't a long press (for mouse)
    if (!isLongPress.current && !disabled && onClick) {
      onClick();
    }
  }, [disabled, onClick]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    return false;
  }, []);

  return (
    <CardDataProvider data={cardData}>
      <div
        ref={cardRef}
        className={`ability-card2 ${variant} ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''} ${isTop !== undefined ? (isTop ? 'highlight-top' : 'highlight-bottom') : ''} ${className}`}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-pressed={isSelected}
        data-card-id={card.id}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
      >
        {/* Main content area */}
        <div className="card2-content">
          {/* Header row - card name only */}
          <div className="card2-header">
            <span className="card2-name">{card.name}</span>
          </div>

          {/* Top action section */}
          <div className={`card2-top-section ${isTop === true ? 'highlighted' : ''}`}>
            <ActionSection
              action={card.topAction}
              position="top"
              variant={variant}
            />
          </div>

          {/* Split divider */}
          <SplitDivider />

          {/* Bottom action section */}
          <div className={`card2-bottom-section ${isTop === false ? 'highlighted' : ''}`}>
            <ActionSection
              action={card.bottomAction}
              position="bottom"
              variant={variant}
            />
          </div>
        </div>

        {/* Right column - initiative and action icons */}
        <RightColumn
          initiative={card.initiative}
          topAction={card.topAction}
          bottomAction={card.bottomAction}
        />

        {/* Level indicator - top left, faded */}
        <div className="card2-level-indicator">
          {card.level === 'X' ? 'X' : card.level}
        </div>

        {/* Selection indicator */}
        {isSelected && (
          <div className="card2-selection-indicator">
            <span className="card2-checkmark">✓</span>
          </div>
        )}

        {/* Zoom modal - rendered via portal */}
        {isZoomed && createPortal(
          <div
            className="card-zoom-overlay"
            onMouseUp={handleMouseUp}
            onTouchEnd={(e) => {
              e.preventDefault();
              setTimeout(closeZoom, 50);
            }}
          >
            <div className="card-zoom-modal">
              <div className="ability-card2 zoomed full">
                {/* Main content area */}
                <div className="card2-content">
                  <div className="card2-header">
                    <span className="card2-name">{card.name}</span>
                  </div>
                  <div className="card2-top-section">
                    <ActionRowLayout action={card.topAction} position="top" variant="full" />
                  </div>
                  <SplitDivider />
                  <div className="card2-bottom-section">
                    <ActionRowLayout action={card.bottomAction} position="bottom" variant="full" />
                  </div>
                </div>
                <RightColumn
                  initiative={card.initiative}
                  topAction={card.topAction}
                  bottomAction={card.bottomAction}
                />
                <div className="card2-level-indicator">
                  {card.level === 'X' ? 'X' : card.level}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </CardDataProvider>
  );
};

export default AbilityCard2;
