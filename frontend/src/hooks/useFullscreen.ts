/**
 * useFullscreen Hook
 *
 * Manages fullscreen mode for the game page based on explicit user intent:
 * - Enters fullscreen on mount
 * - Exits on unmount
 * - Handles ESC key to exit fullscreen AND navigate back
 * - No automatic navigation on system fullscreen changes
 */

import { useEffect } from 'react';

export function useFullscreen(enabled: boolean = true, onUserExit?: () => void) {
  useEffect(() => {
    if (!enabled) return;

    let isInitialized = false;

    const enterFullscreen = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
          // Mark as initialized after successfully entering fullscreen
          setTimeout(() => {
            isInitialized = true;
          }, 500); // Give time for fullscreen to stabilize
        }
      } catch (error) {
        console.warn('Failed to enter fullscreen:', error);
      }
    };

    const exitFullscreen = async () => {
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
      } catch (error) {
        console.warn('Failed to exit fullscreen:', error);
      }
    };

    // Handle fullscreen change - only navigate if user initiated it
    const handleFullscreenChange = () => {
      // Only process if we're initialized and exiting fullscreen
      if (isInitialized && !document.fullscreenElement && onUserExit) {
        // User exited fullscreen (via ESC or browser UI) - navigate back
        setTimeout(() => {
          onUserExit();
        }, 100);
      }
    };

    // Enter fullscreen on mount
    enterFullscreen();

    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Exit fullscreen on unmount
    return () => {
      isInitialized = false; // Prevent navigation on unmount
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      exitFullscreen();
    };
  }, [enabled, onUserExit]);
}

export async function exitFullscreen() {
  if (document.fullscreenElement) {
    try {
      await document.exitFullscreen();
    } catch (error) {
      console.warn('Failed to exit fullscreen:', error);
    }
  }
}
