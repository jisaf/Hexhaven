/**
 * useFocusTrap Hook (Issue #343)
 *
 * Traps focus within a container element for accessibility.
 * Used in modals to prevent focus from escaping to background content.
 *
 * Features:
 * - Traps Tab/Shift+Tab within the container
 * - Focuses first focusable element on activation
 * - Restores focus to previously focused element on deactivation
 */

import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

// Focusable element selectors
const FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  isActive: boolean
): RefObject<T | null> {
  const containerRef = useRef<T>(null);
  const previousActiveElement = useRef<Element | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;

    // Store previously focused element
    previousActiveElement.current = document.activeElement;

    // Get all focusable elements within the container
    const getFocusableElements = (): HTMLElement[] => {
      return Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
      ).filter((el) => {
        // Filter out hidden elements
        return el.offsetParent !== null;
      });
    };

    // Focus first element (or container if none found)
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      // Small delay to ensure DOM is ready
      requestAnimationFrame(() => {
        focusableElements[0]?.focus();
      });
    } else {
      // Focus the container itself
      container.focus();
    }

    // Handle keydown for Tab trapping
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusables = getFocusableElements();
      if (focusables.length === 0) return;

      const firstElement = focusables[0];
      const lastElement = focusables[focusables.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: if on first element, go to last
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab: if on last element, go to first
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Add event listener
    container.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      container.removeEventListener('keydown', handleKeyDown);

      // Restore focus to previously focused element
      if (
        previousActiveElement.current &&
        previousActiveElement.current instanceof HTMLElement
      ) {
        previousActiveElement.current.focus();
      }
    };
  }, [isActive]);

  return containerRef;
}

export default useFocusTrap;
