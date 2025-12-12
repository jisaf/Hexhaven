/**
 * BottomSheet Component (Issue #205)
 *
 * Generic slide-up panel with tabs for cards, inventory, effects, etc.
 * Mobile-first design with touch-friendly interactions:
 * - Swipe down to dismiss
 * - Touch-friendly drag handle
 * - Tab switching
 * - Slides up from bottom (portrait) or in from right (landscape)
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import styles from './BottomSheet.module.css';

export interface BottomSheetTab {
  id: string;
  label: string;
  icon?: string; // Optional icon class (e.g., 'ra ra-sword')
  content: React.ReactNode;
  badge?: number; // Optional notification badge count
}

interface BottomSheetProps {
  /** Array of tabs to display */
  tabs: BottomSheetTab[];
  /** Currently active tab ID */
  activeTabId: string;
  /** Callback when tab changes */
  onTabChange: (tabId: string) => void;
  /** Whether the sheet is open */
  isOpen: boolean;
  /** Callback when sheet is closed (swipe down or close button) */
  onClose: () => void;
  /** Optional title shown in drag handle area */
  title?: string;
  /** Whether to show close button */
  showCloseButton?: boolean;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  isOpen,
  onClose,
  title,
  showCloseButton = true,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);

  // Reset drag state when sheet opens/closes
  useEffect(() => {
    if (!isOpen) {
      setDragOffset(0);
      setIsDragging(false);
    }
  }, [isOpen]);

  // Touch/mouse event handlers for drag-to-close
  const handleDragStart = useCallback((clientY: number) => {
    setIsDragging(true);
    startYRef.current = clientY;
    currentYRef.current = clientY;
  }, []);

  const handleDragMove = useCallback((clientY: number) => {
    if (!isDragging) return;

    currentYRef.current = clientY;
    const delta = clientY - startYRef.current;

    // Only allow dragging down (positive delta)
    if (delta > 0) {
      setDragOffset(delta);
    }
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);

    // If dragged more than 100px or 30% of the sheet height, close
    const threshold = Math.min(100, (sheetRef.current?.offsetHeight || 400) * 0.3);

    if (dragOffset > threshold) {
      onClose();
    }

    setDragOffset(0);
  }, [isDragging, dragOffset, onClose]);

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientY);
  }, [handleDragStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientY);
  }, [handleDragMove]);

  const handleTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Mouse event handlers (for desktop testing)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    handleDragStart(e.clientY);
  }, [handleDragStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    handleDragMove(e.clientY);
  }, [handleDragMove]);

  const handleMouseUp = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      handleDragEnd();
    }
  }, [isDragging, handleDragEnd]);

  // Get active tab
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  if (!isOpen) {
    return null;
  }

  const sheetStyle: React.CSSProperties = {
    transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
    transition: isDragging ? 'none' : undefined,
  };

  return (
    <div
      ref={sheetRef}
      className={`${styles.bottomSheet} ${isDragging ? styles.dragging : ''}`}
      style={sheetStyle}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* Drag Handle */}
      <div
        className={styles.dragHandle}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        <div className={styles.dragBar} />
        {title && <span className={styles.title}>{title}</span>}
        {showCloseButton && (
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        )}
      </div>

      {/* Tab Bar */}
      {tabs.length > 1 && (
        <div className={styles.tabBar}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.tab} ${tab.id === activeTabId ? styles.activeTab : ''}`}
              onClick={() => onTabChange(tab.id)}
              aria-selected={tab.id === activeTabId}
            >
              {tab.icon && <i className={`${tab.icon} ${styles.tabIcon}`} />}
              <span className={styles.tabLabel}>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={styles.tabBadge}>{tab.badge}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Tab Content */}
      <div className={styles.content}>
        {activeTab?.content}
      </div>
    </div>
  );
};

export default BottomSheet;
