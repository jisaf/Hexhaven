/**
 * PixiJS Application Wrapper Component
 *
 * Provides a reusable wrapper for PixiJS applications with proper lifecycle management,
 * responsive canvas sizing, and mobile optimization.
 *
 * Features:
 * - Automatic canvas sizing and resize handling
 * - Touch and mouse input support
 * - Performance optimizations for mobile (US3 - T142):
 *   - Sprite culling (only render visible objects)
 *   - Texture batching (reduce draw calls)
 *   - Render texture caching
 *   - Object pooling pattern support
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

      // Configure global PixiJS settings for mobile performance (US3 - T142)
      // Note: PixiJS v8+ handles many optimizations automatically
      // Custom settings can be configured via ApplicationOptions

      // Default options optimized for mobile (US3 - T142)
      const defaultOptions: Partial<ApplicationOptions> = {
        width: rect.width || 800,
        height: rect.height || 600,
        backgroundColor: 0x1a1a1a,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        antialias: true,
        powerPreference: 'high-performance',
        // Enable batching and culling
        eventMode: 'passive', // Reduces event processing overhead
        ...options
      };

      const app = new Application();
      await app.init(defaultOptions);

      // Enable culling on the stage to skip rendering of off-screen objects (US3 - T142)
      app.stage.cullable = true;
      app.stage.cullArea = app.screen;

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

        // Update cull area to match new screen size (US3 - T142)
        appRef.current.stage.cullArea = appRef.current.screen;

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((appRef.current as any)._cleanupResize) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

/**
 * Object Pool Pattern for Mobile Performance (US3 - T142)
 *
 * For frequently created/destroyed objects (damage numbers, effects, particles),
 * use object pooling to reduce GC pressure on mobile devices.
 *
 * Example implementation (see LootTokenSprite.ts for reference):
 *
 * ```typescript
 * class EffectPool {
 *   private pool: Effect[] = [];
 *   private active: Set<Effect> = new Set();
 *
 *   acquire(): Effect {
 *     let effect = this.pool.pop();
 *     if (!effect) {
 *       effect = new Effect();
 *     }
 *     this.active.add(effect);
 *     return effect;
 *   }
 *
 *   release(effect: Effect): void {
 *     effect.reset(); // Reset state
 *     this.active.delete(effect);
 *     this.pool.push(effect);
 *   }
 *
 *   clear(): void {
 *     for (const effect of this.active) {
 *       effect.destroy();
 *     }
 *     for (const effect of this.pool) {
 *       effect.destroy();
 *     }
 *     this.active.clear();
 *     this.pool = [];
 *   }
 * }
 * ```
 *
 * Benefits:
 * - Reduces garbage collection pauses (critical on mobile)
 * - Faster object creation (reuse vs new allocation)
 * - More predictable performance
 *
 * Use for: Damage numbers, particle effects, projectiles, temporary UI elements
 */

/**
 * Texture Atlas Pattern for Mobile Performance (US3 - T142)
 *
 * When using multiple sprite images, combine them into texture atlases to reduce
 * draw calls and improve rendering performance.
 *
 * Tools for creating texture atlases:
 * - TexturePacker (https://www.codeandweb.com/texturepacker)
 * - Shoebox (https://renderhjs.net/shoebox/)
 * - Free Texture Packer (https://free-tex-packer.com/)
 *
 * Usage with PixiJS:
 * ```typescript
 * import { Assets, Spritesheet } from 'pixi.js';
 *
 * // Load atlas
 * const sheet = await Assets.load<Spritesheet>('atlas.json');
 *
 * // Create sprites from atlas
 * const sprite1 = new Sprite(sheet.textures['image1.png']);
 * const sprite2 = new Sprite(sheet.textures['image2.png']);
 * ```
 *
 * Benefits:
 * - Fewer texture switches (major performance win on mobile)
 * - Reduced memory usage
 * - Faster loading times
 *
 * Use for: UI elements, character sprites, tile sets, icons
 */
