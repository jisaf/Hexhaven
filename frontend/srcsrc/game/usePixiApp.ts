
import { Application } from 'pixi.js';

/**
 * Hook to access the PixiJS application instance
 * Use this within components that are children of PixiApp
 */
export function usePixiApp(): Application | null {
  // This would need a context provider to work properly
  // For now, return null - implement with Context API if needed
  return null;
}
