/**
 * BottomSheet Component (Issue #205)
 *
 * Generic slide-up panel for displaying content.
 * Mobile-first design with touch-friendly interactions:
 * - Swipe down to dismiss
 * - Touch-friendly drag handle
 * - Slides up from bottom (portrait) or in from right (landscape)
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import styles from './BottomSheet.module.css';

interface BottomSheetProps {
  /** Content to display in the sheet */
  children: React.ReactNode;
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
  children,
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

  // Reset drag state when sheet closes - use ref to track previous state
  const prevIsOpenRef = useRef(isOpen);
  useEffect(() => {
    // Only reset when transitioning from open to closed
    if (prevIsOpenRef.current && !isOpen) {
      // Use setTimeout to avoid synchronous setState in effect
      const timer = setTimeout(() => {
        setDragOffset(0);
        setIsDragging(false);
      }, 0);
      return () => clearTimeout(timer);
    }
    prevIsOpenRef.current = isOpen;
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
      {/* Header - drag handle for swipe-to-dismiss */}
      <div
        className={styles.header}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        {title && <span className={styles.title}>{title}</span>}
        {showCloseButton && (
          <button
            className={styles.closeButton}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close"
          >
            &times;
          </button>
        )}
      </div>

      {/* Content */}
      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
};

export default BottomSheet;
