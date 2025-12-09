/**
 * useFullscreen Hook
 *
 * Manages fullscreen mode for the game page based on explicit user intent:
 * - Enters fullscreen on mount
 * - Exits on unmount
 * - Handles ESC key to exit fullscreen AND navigate back
 * - Does NOT navigate when fullscreen exits due to tab switching or visibility changes
 */

import { useEffect } from 'react';

export function useFullscreen(enabled: boolean = true, onUserExit?: () => void) {
  useEffect(() => {
    if (!enabled) return;

    let isInitialized = false;
    let userPressedEsc = false;

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

    // Track when user explicitly presses ESC key
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && document.fullscreenElement) {
        userPressedEsc = true;
      }
    };

    // Handle fullscreen change - only navigate if user explicitly pressed ESC
    const handleFullscreenChange = () => {
      // Only process if user explicitly pressed ESC to exit fullscreen
      // Do NOT navigate if fullscreen exited due to tab switching or visibility change
      if (isInitialized && !document.fullscreenElement && userPressedEsc && onUserExit) {
        userPressedEsc = false; // Reset the flag
        setTimeout(() => {
          onUserExit();
        }, 100);
      }
    };

    // Enter fullscreen on mount
    enterFullscreen();

    // Listen for keydown to detect ESC press
    document.addEventListener('keydown', handleKeyDown);
    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Exit fullscreen on unmount
    return () => {
      isInitialized = false; // Prevent navigation on unmount
      document.removeEventListener('keydown', handleKeyDown);
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
