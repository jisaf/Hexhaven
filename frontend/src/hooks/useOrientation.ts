/**
 * useOrientation Hook (US3 - T141)
 *
 * React hook for detecting and handling device orientation changes.
 * Preserves viewport state (zoom and pan position) during orientation transitions.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getOrientation, getViewportSize, debounce, type Orientation } from '../utils/responsive';

export interface OrientationState {
  orientation: Orientation;
  width: number;
  height: number;
  isChanging: boolean;
}

export interface ViewportState {
  scale: number;
  x: number;
  y: number;
}

export interface UseOrientationOptions {
  /** Callback when orientation changes */
  onChange?: (state: OrientationState) => void;

  /** Callback to get current viewport state (for preservation) */
  getViewportState?: () => ViewportState;

  /** Callback to restore viewport state after orientation change */
  setViewportState?: (state: ViewportState) => void;

  /** Debounce delay in milliseconds (default: 150ms) */
  debounceDelay?: number;
}

/**
 * Hook to detect and handle orientation changes
 */
export function useOrientation(options: UseOrientationOptions = {}) {
  const {
    onChange,
    getViewportState,
    setViewportState,
    debounceDelay = 150,
  } = options;

  const [state, setState] = useState<OrientationState>(() => {
    const viewport = getViewportSize();
    return {
      orientation: getOrientation(),
      width: viewport.width,
      height: viewport.height,
      isChanging: false,
    };
  });

  // Store viewport state before orientation change
  const savedViewportState = useRef<ViewportState | null>(null);

  // Handle orientation change
  const handleOrientationChange = useCallback(() => {
    const viewport = getViewportSize();
    const newOrientation = getOrientation();

    // Check if orientation actually changed
    if (newOrientation !== state.orientation) {
      // Save current viewport state before transition
      if (getViewportState) {
        savedViewportState.current = getViewportState();
      }

      // Mark as changing
      setState({
        orientation: newOrientation,
        width: viewport.width,
        height: viewport.height,
        isChanging: true,
      });

      // Wait for layout to stabilize, then restore viewport
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Restore viewport state after orientation change
          if (setViewportState && savedViewportState.current) {
            setViewportState(savedViewportState.current);
          }

          // Mark as done changing
          setState(prev => ({
            ...prev,
            isChanging: false,
          }));

          // Notify callback
          if (onChange) {
            onChange({
              orientation: newOrientation,
              width: viewport.width,
              height: viewport.height,
              isChanging: false,
            });
          }
        });
      });
    } else {
      // Just a resize, not an orientation change
      setState(prev => ({
        ...prev,
        width: viewport.width,
        height: viewport.height,
      }));
    }
  }, [state.orientation, onChange, getViewportState, setViewportState]);

  // Debounced handler to avoid excessive updates
  const debouncedHandler = useCallback(
    debounce(handleOrientationChange, debounceDelay),
    [handleOrientationChange, debounceDelay]
  );

  useEffect(() => {
    // Listen for resize events (which fire on orientation change)
    window.addEventListener('resize', debouncedHandler);

    // iOS-specific orientation change event
    window.addEventListener('orientationchange', debouncedHandler);

    // Screen orientation API (modern browsers)
    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener('change', debouncedHandler);
    }

    return () => {
      window.removeEventListener('resize', debouncedHandler);
      window.removeEventListener('orientationchange', debouncedHandler);

      if (window.screen?.orientation) {
        window.screen.orientation.removeEventListener('change', debouncedHandler);
      }
    };
  }, [debouncedHandler]);

  return state;
}

/**
 * Hook to lock orientation (experimental, not widely supported)
 */
export function useOrientationLock(orientation?: OrientationLockType) {
  useEffect(() => {
    if (!orientation || !window.screen?.orientation?.lock) {
      return;
    }

    const lockOrientation = async () => {
      try {
        await window.screen.orientation.lock(orientation);
      } catch (error) {
        console.warn('Orientation lock failed:', error);
      }
    };

    lockOrientation();

    return () => {
      if (window.screen?.orientation?.unlock) {
        window.screen.orientation.unlock();
      }
    };
  }, [orientation]);
}

/**
 * Hook to get current orientation and dimensions
 * (Simpler version without state preservation)
 */
export function useOrientationInfo() {
  const [info, setInfo] = useState(() => {
    const viewport = getViewportSize();
    return {
      orientation: getOrientation(),
      ...viewport,
    };
  });

  useEffect(() => {
    const handleChange = debounce(() => {
      const viewport = getViewportSize();
      setInfo({
        orientation: getOrientation(),
        ...viewport,
      });
    }, 150);

    window.addEventListener('resize', handleChange);
    window.addEventListener('orientationchange', handleChange);

    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener('change', handleChange);
    }

    return () => {
      window.removeEventListener('resize', handleChange);
      window.removeEventListener('orientationchange', handleChange);

      if (window.screen?.orientation) {
        window.screen.orientation.removeEventListener('change', handleChange);
      }
    };
  }, []);

  return info;
}
