/**
 * PixiJS Application Wrapper Component
 *
 * Provides a reusable wrapper for PixiJS applications with proper lifecycle management,
 * responsive canvas sizing, and mobile optimization.
 *
 * Features:
 * - Automatic canvas sizing and resize handling
 * - Touch and mouse input support
 * - Performance optimizations for mobile
 * - Clean mount/unmount lifecycle
 */

import { useEffect, useRef, useState } from 'react';
import { Application, Container, type ApplicationOptions } from 'pixi.js';

export interface PixiAppProps {
  /**
   * Called when the PixiJS application is initialized
   * Use this to add your game objects to the stage
   */
  onInit?: (app: Application, stage: Container) => void | Promise<void>;

  /**
   * Called every frame with delta time
   */
  onUpdate?: (app: Application, delta: number) => void;

  /**
   * Called when the canvas is resized
   */
  onResize?: (app: Application, width: number, height: number) => void;

  /**
   * PixiJS application options (width, height, etc.)
   * If not provided, will use container dimensions
   */
  options?: Partial<ApplicationOptions>;

  /**
   * CSS class name for the container div
   */
  className?: string;

  /**
   * Inline styles for the container div
   */
  style?: React.CSSProperties;
}

/**
 * PixiJS Application Wrapper Component
 *
 * Usage:
 * ```tsx
 * <PixiApp
 *   onInit={(app, stage) => {
 *     const sprite = Sprite.from('image.png');
 *     stage.addChild(sprite);
 *   }}
 *   onUpdate={(app, delta) => {
 *     // Animation logic
 *   }}
 * />
 * ```
 */
export function PixiApp({
  onInit,
  onUpdate,
  onResize,
  options = {},
  className = '',
  style = {}
}: PixiAppProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize PixiJS Application
    const initApp = async () => {
      const container = containerRef.current!;
      const rect = container.getBoundingClientRect();

      // Default options optimized for mobile
      const defaultOptions: Partial<ApplicationOptions> = {
        width: rect.width || 800,
        height: rect.height || 600,
        backgroundColor: 0x1a1a1a,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        antialias: true,
        powerPreference: 'high-performance',
        ...options
      };

      const app = new Application();
      await app.init(defaultOptions);

      appRef.current = app;

      // Append canvas to container
      container.appendChild(app.canvas);

      // Setup resize handler
      const handleResize = () => {
        if (!containerRef.current || !appRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const newWidth = rect.width || 800;
        const newHeight = rect.height || 600;

        appRef.current.renderer.resize(newWidth, newHeight);

        if (onResize) {
          onResize(appRef.current, newWidth, newHeight);
        }
      };

      // Setup render loop with update callback
      if (onUpdate) {
        app.ticker.add((ticker) => {
          if (appRef.current) {
            onUpdate(appRef.current, ticker.deltaTime);
          }
        });
      }

      // Add resize listener
      window.addEventListener('resize', handleResize);

      // Store cleanup function
      (app as any)._cleanupResize = () => {
        window.removeEventListener('resize', handleResize);
      };

      // Call onInit callback
      if (onInit) {
        await onInit(app, app.stage);
      }

      setIsReady(true);
    };

    initApp().catch(console.error);

    // Cleanup
    return () => {
      if (appRef.current) {
        if ((appRef.current as any)._cleanupResize) {
          (appRef.current as any)._cleanupResize();
        }

        appRef.current.destroy(true, {
          children: true,
          texture: true
        });
        appRef.current = null;
      }
      setIsReady(false);
    };
  }, [onInit, onUpdate, onResize, options]);

  return (
    <div
      ref={containerRef}
      className={`pixi-container ${className}`}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        touchAction: 'none', // Prevent default touch actions
        ...style
      }}
      data-testid="pixi-app-container"
      data-ready={isReady}
    />
  );
}

/**
 * Hook to access the PixiJS application instance
 * Use this within components that are children of PixiApp
 */
export function usePixiApp(): Application | null {
  // This would need a context provider to work properly
  // For now, return null - implement with Context API if needed
  return null;
}
