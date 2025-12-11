/**
 * LootTokenSprite Component (US2 - T122)
 *
 * PixiJS sprite for rendering loot tokens on the hex grid.
 * Displays gold coins with visual feedback for collectible state.
 */

import * as PIXI from 'pixi.js';
import type { AxialCoordinates } from '../../../shared/types/entities';

export interface LootTokenData {
  id: string;
  coordinates: AxialCoordinates;
  value: number; // Gold value (1-3)
  isCollected: boolean;
}

export class LootTokenSprite extends PIXI.Container {
  private readonly tokenId: string;
  private readonly coordinates: AxialCoordinates;
  private readonly value: number;
  private isCollected: boolean;
  private readonly background: PIXI.Graphics;
  private readonly coinSprite: PIXI.Graphics;
  private readonly valueText: PIXI.Text;
  private readonly glowEffect: PIXI.Graphics;
  private isHovered: boolean = false;
  private pulseAnimation: number = 0;

  constructor(data: LootTokenData) {
    super();

    this.tokenId = data.id;
    this.coordinates = data.coordinates;
    this.value = data.value;
    this.isCollected = data.isCollected;

    // Create background glow
    this.glowEffect = new PIXI.Graphics();
    this.addChild(this.glowEffect);

    // Create background circle
    this.background = new PIXI.Graphics();
    this.addChild(this.background);

    // Create coin sprite
    this.coinSprite = new PIXI.Graphics();
    this.addChild(this.coinSprite);

    // Create value text
    this.valueText = new PIXI.Text(this.value.toString(), {
      fontFamily: 'Arial',
      fontSize: 16,
      fill: 0xffffff,
      fontWeight: 'bold',
      stroke: { color: 0x000000, width: 3 },
    });
    this.valueText.anchor.set(0.5);
    this.addChild(this.valueText);

    // Draw initial state
    this.draw();

    // Make interactive
    this.eventMode = 'static';
    this.cursor = 'pointer';

    // Setup interaction handlers
    this.on('pointerover', this.onPointerOver.bind(this));
    this.on('pointerout', this.onPointerOut.bind(this));
  }

  /**
   * Draw the loot token
   */
  private draw(): void {
    // Clear all graphics
    this.background.clear();
    this.coinSprite.clear();
    this.glowEffect.clear();

    if (this.isCollected) {
      // Faded appearance when collected
      this.alpha = 0.3;
      return;
    }

    this.alpha = 1;

    // Determine color based on value
    let goldColor = 0xffd700; // Gold
    if (this.value === 1) {
      goldColor = 0xc0c0c0; // Silver for 1 gold
    } else if (this.value === 3) {
      goldColor = 0xff8c00; // Orange-gold for 3 gold
    }

    // Draw glow effect (PixiJS v8 API)
    const glowAlpha = this.isHovered ? 0.4 : 0.2;
    const glowRadius = this.isHovered ? 35 : 30;
    this.glowEffect.circle(0, 0, glowRadius);
    this.glowEffect.fill({ color: goldColor, alpha: glowAlpha });

    // Draw background circle (PixiJS v8 API)
    this.background.circle(0, 0, 22);
    this.background.fill({ color: 0x000000, alpha: 0.3 });

    // Draw coin (PixiJS v8 API)
    this.coinSprite.circle(0, 0, 18);
    this.coinSprite.fill({ color: goldColor });

    // Add coin details (inner circle)
    this.coinSprite.circle(0, 0, 14);
    this.coinSprite.stroke({ width: 2, color: 0xffed4e, alpha: 0.8 });

    // Add shine effect
    const shineGradient = new PIXI.Graphics();
    shineGradient.ellipse(-6, -6, 8, 6);
    shineGradient.fill({ color: 0xffffff, alpha: 0.4 });
    this.coinSprite.addChild(shineGradient);

    // Position value text
    this.valueText.y = 0;
  }

  /**
   * Handle pointer over event
   */
  private onPointerOver(): void {
    if (this.isCollected) return;
    this.isHovered = true;
    this.draw();
  }

  /**
   * Handle pointer out event
   */
  private onPointerOut(): void {
    this.isHovered = false;
    this.draw();
  }

  /**
   * Update animation (call from game loop)
   */
  public update(delta: number): void {
    if (this.isCollected) return;

    // Pulse animation
    this.pulseAnimation += delta * 0.05;
    const pulse = Math.sin(this.pulseAnimation) * 0.1 + 1;
    this.scale.set(pulse);

    // Gentle rotation
    this.coinSprite.rotation += delta * 0.02;
  }

  /**
   * Mark loot as collected with animation
   */
  public async collect(): Promise<void> {
    this.isCollected = true;

    // Animate collection
    return new Promise((resolve) => {
      let animationTime = 0;
      const duration = 0.5;

      const ticker = (tick: PIXI.Ticker) => {
        animationTime += tick.deltaTime / 60;

        if (animationTime < duration) {
          const progress = animationTime / duration;

          // Scale up and fade out
          const scale = 1 + progress * 2;
          this.scale.set(scale);
          this.alpha = 1 - progress;

          // Move up
          this.y -= 3;
        } else {
          // Animation complete
          this.visible = false;
          PIXI.Ticker.shared.remove(ticker);
          resolve();
        }
      };

      PIXI.Ticker.shared.add(ticker);
    });
  }

  /**
   * Highlight the loot token (when player is adjacent)
   */
  public highlight(enabled: boolean): void {
    if (enabled && !this.isCollected) {
      this.glowEffect.clear();
      // PixiJS v8 API: draw then stroke
      this.glowEffect.circle(0, 0, 32);
      this.glowEffect.stroke({ width: 3, color: 0x4ade80, alpha: 0.8 });
    } else {
      this.draw();
    }
  }

  // Getters
  public get id(): string {
    return this.tokenId;
  }

  public get position2D(): AxialCoordinates {
    return { ...this.coordinates };
  }

  public get goldValue(): number {
    return this.value;
  }

  public get collected(): boolean {
    return this.isCollected;
  }

  /**
   * Cleanup
   */
  public destroy(options?: boolean | PIXI.DestroyOptions): void {
    this.removeAllListeners();
    super.destroy(options);
  }
}

/**
 * Loot Token Pool Manager for efficient sprite reuse
 */
export class LootTokenPool {
  private readonly container: PIXI.Container;
  private readonly tokens: Map<string, LootTokenSprite> = new Map();
  private readonly ticker: (ticker: PIXI.Ticker) => void;

  constructor(container: PIXI.Container) {
    this.container = container;

    // Setup update ticker
    this.ticker = (tick: PIXI.Ticker) => {
      this.update(tick.deltaTime);
    };
    PIXI.Ticker.shared.add(this.ticker);
  }

  /**
   * Add loot token to the pool
   */
  public addToken(data: LootTokenData, screenPosition: PIXI.Point): LootTokenSprite {
    const token = new LootTokenSprite(data);
    token.x = screenPosition.x;
    token.y = screenPosition.y;

    this.tokens.set(data.id, token);
    this.container.addChild(token);

    return token;
  }

  /**
   * Remove loot token from pool
   */
  public removeToken(tokenId: string): void {
    const token = this.tokens.get(tokenId);
    if (token) {
      this.container.removeChild(token);
      token.destroy();
      this.tokens.delete(tokenId);
    }
  }

  /**
   * Get token by ID
   */
  public getToken(tokenId: string): LootTokenSprite | undefined {
    return this.tokens.get(tokenId);
  }

  /**
   * Collect loot token with animation
   */
  public async collectToken(tokenId: string): Promise<void> {
    const token = this.tokens.get(tokenId);
    if (token && !token.collected) {
      await token.collect();
      this.removeToken(tokenId);
    }
  }

  /**
   * Highlight tokens that are collectible by a character
   */
  public highlightCollectibleTokens(characterPosition: AxialCoordinates, range: number = 1): void {
    for (const token of this.tokens.values()) {
      if (token.collected) continue;

      // Calculate distance (cube coordinates)
      const tokenPos = token.position2D;
      const distance = Math.max(
        Math.abs(characterPosition.q - tokenPos.q),
        Math.abs(characterPosition.r - tokenPos.r),
        Math.abs((characterPosition.q + characterPosition.r) - (tokenPos.q + tokenPos.r))
      );

      token.highlight(distance <= range);
    }
  }

  /**
   * Clear all highlights
   */
  public clearHighlights(): void {
    for (const token of this.tokens.values()) {
      token.highlight(false);
    }
  }

  /**
   * Update all tokens
   */
  private update(delta: number): void {
    for (const token of this.tokens.values()) {
      token.update(delta);
    }
  }

  /**
   * Clear all tokens
   */
  public clear(): void {
    for (const [tokenId] of this.tokens) {
      this.removeToken(tokenId);
    }
  }

  /**
   * Cleanup pool
   */
  public destroy(): void {
    PIXI.Ticker.shared.remove(this.ticker);
    this.clear();
  }

  /**
   * Get all tokens
   */
  public getAllTokens(): LootTokenSprite[] {
    return Array.from(this.tokens.values());
  }
}
