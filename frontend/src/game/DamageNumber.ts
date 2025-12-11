/**
 * DamageNumber Component (US2 - T108)
 *
 * Pooled sprite system for displaying floating damage numbers.
 * Performance-optimized for multiple simultaneous damage displays.
 */

import * as PIXI from 'pixi.js';

interface DamageNumberOptions {
  value: number;
  position: PIXI.Point;
  color?: number;
  isCritical?: boolean;
  isMiss?: boolean;
  isHeal?: boolean;
}

class DamageNumberSprite extends PIXI.Container {
  private text: PIXI.Text;
  private background: PIXI.Graphics;
  private isActive: boolean = false;
  private startY: number = 0;

  constructor() {
    super();

    // Create background
    this.background = new PIXI.Graphics();
    this.addChild(this.background);

    // Create text
    this.text = new PIXI.Text('', {
      fontFamily: 'Arial',
      fontSize: 24,
      fill: 0xffffff,
      fontWeight: 'bold',
      stroke: { color: 0x000000, width: 4 },
    });
    this.text.anchor.set(0.5);
    this.addChild(this.text);

    this.visible = false;
  }

  /**
   * Activate this sprite with damage number options
   */
  public activate(options: DamageNumberOptions): void {
    this.isActive = true;
    this.visible = true;
    this.alpha = 1;
    this.scale.set(1);

    this.x = options.position.x;
    this.y = options.position.y;
    this.startY = options.position.y;

    // Set text content
    if (options.isMiss) {
      this.text.text = 'MISS';
    } else {
      const prefix = options.isHeal ? '+' : '-';
      this.text.text = `${prefix}${Math.abs(options.value)}`;
    }

    // Set colors
    let fillColor = options.color || 0xe74c3c; // Default red for damage
    if (options.isHeal) {
      fillColor = 0x2ecc71; // Green for healing
    } else if (options.isMiss) {
      fillColor = 0x95a5a6; // Gray for miss
    } else if (options.isCritical) {
      fillColor = 0xf39c12; // Orange for critical
    }

    this.text.style.fill = fillColor;

    // Scale for critical hits
    if (options.isCritical) {
      this.text.style.fontSize = 32;
    } else {
      this.text.style.fontSize = 24;
    }

    // Update background
    this.updateBackground();
  }

  /**
   * Update background shape
   */
  private updateBackground(): void {
    this.background.clear();

    const padding = 8;
    const width = this.text.width + padding * 2;
    const height = this.text.height + padding * 2;

    // PixiJS v8 API: draw then fill
    this.background.roundRect(
      -width / 2,
      -height / 2,
      width,
      height,
      6,
    );
    this.background.fill({ color: 0x000000, alpha: 0.7 });
  }

  /**
   * Update animation
   * @returns true if animation is complete
   */
  public update(): boolean {
    if (!this.isActive) return true;

    const duration = 1.5;
    const elapsed = (this.startY - this.y) / 60;

    if (elapsed < duration) {
      // Float upward
      this.y -= 1.5;

      // Fade out
      this.alpha = 1 - elapsed / duration;

      // Scale effect
      if (elapsed < 0.2) {
        // Pop in
        const scaleProgress = elapsed / 0.2;
        this.scale.set(1 + 0.3 * Math.sin(scaleProgress * Math.PI));
      } else {
        // Fade scale
        const scaleProgress = (elapsed - 0.2) / (duration - 0.2);
        this.scale.set(1 + 0.1 * (1 - scaleProgress));
      }

      return false;
    } else {
      // Animation complete
      this.deactivate();
      return true;
    }
  }

  /**
   * Deactivate and reset sprite
   */
  public deactivate(): void {
    this.isActive = false;
    this.visible = false;
    this.alpha = 1;
    this.scale.set(1);
  }

  public getIsActive(): boolean {
    return this.isActive;
  }
}

/**
 * DamageNumber Pool Manager
 */
export class DamageNumberPool {
  private container: PIXI.Container;
  private pool: DamageNumberSprite[] = [];
  private ticker: (ticker: PIXI.Ticker) => void;

  constructor(container: PIXI.Container, poolSize: number = 20) {
    this.container = container;

    // Pre-create sprites
    for (let i = 0; i < poolSize; i++) {
      const sprite = new DamageNumberSprite();
      this.pool.push(sprite);
      this.container.addChild(sprite);
    }

    // Setup update ticker
    this.ticker = () => {
      this.update();
    };
    PIXI.Ticker.shared.add(this.ticker);
  }

  /**
   * Show damage number
   */
  public showDamage(options: DamageNumberOptions): void {
    const sprite = this.getAvailableSprite();
    if (sprite) {
      sprite.activate(options);
    }
  }

  /**
   * Get an available sprite from pool
   */
  private getAvailableSprite(): DamageNumberSprite | null {
    // Find inactive sprite
    for (const sprite of this.pool) {
      if (!sprite.getIsActive()) {
        return sprite;
      }
    }

    // If all sprites are active, reuse oldest one
    // (This shouldn't happen often with proper pool size)
    return this.pool[0] || null;
  }

  /**
   * Update all active sprites
   */
  private update(): void {
    for (const sprite of this.pool) {
      if (sprite.getIsActive()) {
        sprite.update();
      }
    }
  }

  /**
   * Cleanup pool
   */
  public destroy(): void {
    PIXI.Ticker.shared.remove(this.ticker);

    for (const sprite of this.pool) {
      sprite.destroy();
    }

    this.pool = [];
  }

  /**
   * Static helper for common damage displays
   */
  public static showDamage(
    pool: DamageNumberPool,
    position: PIXI.Point,
    value: number,
  ): void {
    pool.showDamage({
      value,
      position,
      color: 0xe74c3c,
      isCritical: false,
      isMiss: false,
      isHeal: false,
    });
  }

  public static showCritical(
    pool: DamageNumberPool,
    position: PIXI.Point,
    value: number,
  ): void {
    pool.showDamage({
      value,
      position,
      color: 0xf39c12,
      isCritical: true,
      isMiss: false,
      isHeal: false,
    });
  }

  public static showMiss(pool: DamageNumberPool, position: PIXI.Point): void {
    pool.showDamage({
      value: 0,
      position,
      color: 0x95a5a6,
      isCritical: false,
      isMiss: true,
      isHeal: false,
    });
  }

  public static showHeal(
    pool: DamageNumberPool,
    position: PIXI.Point,
    value: number,
  ): void {
    pool.showDamage({
      value,
      position,
      color: 0x2ecc71,
      isCritical: false,
      isMiss: false,
      isHeal: true,
    });
  }
}
