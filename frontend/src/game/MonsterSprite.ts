/**
 * MonsterSprite Component (US2 - T106)
 *
 * PixiJS sprite for rendering monsters on the hex grid.
 * Supports elite variants, health bars, and status effects.
 */

import * as PIXI from 'pixi.js';
import type { Monster, Condition } from '../../../shared/types/entities';
import { type Axial, axialToScreen } from './hex-utils';

export class MonsterSprite extends PIXI.Container {
  private monster: Monster;
  private sprite: PIXI.Sprite;
  private healthBar: PIXI.Graphics;
  private healthText: PIXI.Text;
  private nameText: PIXI.Text;
  private eliteBadge?: PIXI.Graphics;
  private statusIcons: PIXI.Container;
  private selectionRing: PIXI.Graphics;
  private isSelected: boolean = false;

  constructor(monster: Monster) {
    super();
    this.monster = monster;

    // Create visual elements
    this.sprite = this.createSprite();
    this.healthBar = this.createHealthBar();
    this.healthText = this.createHealthText();
    this.nameText = this.createNameText();
    this.statusIcons = this.createStatusIcons();
    this.selectionRing = this.createSelectionRing();

    if (monster.isElite) {
      this.eliteBadge = this.createEliteBadge();
    }

    // Add to container
    this.addChild(this.selectionRing);
    this.addChild(this.sprite);
    this.addChild(this.healthBar);
    this.addChild(this.healthText);
    this.addChild(this.nameText);
    this.addChild(this.statusIcons);
    if (this.eliteBadge) {
      this.addChild(this.eliteBadge);
    }

    // Enable interactions
    this.eventMode = 'static';
    this.cursor = 'pointer';

    // Update position
    this.updateVisuals();
  }

  private createSprite(): PIXI.Sprite {
    // Load SVG avatar based on elite status
    const avatarPath = this.monster.isElite
      ? '/avatars/monsters/monster-elite.svg'
      : '/avatars/monsters/monster-normal.svg';

    const sprite = PIXI.Sprite.from(avatarPath);

    // Size the avatar sprite
    const avatarSize = 60;
    sprite.width = avatarSize;
    sprite.height = avatarSize;

    // Center the sprite
    sprite.anchor.set(0.5);

    return sprite;
  }

  private createHealthBar(): PIXI.Graphics {
    const bar = new PIXI.Graphics();
    bar.y = -50;
    return bar;
  }

  private updateHealthBar(): void {
    const bar = this.healthBar;
    bar.clear();

    const width = 60;
    const height = 8;
    const x = -width / 2;
    const y = 0;

    // Background - PixiJS v8 API
    bar.rect(x, y, width, height);
    bar.fill({ color: 0x000000, alpha: 0.5 });

    // Health fill
    const healthPercent = this.monster.health / this.monster.maxHealth;
    let color = 0x2ecc71; // Green
    if (healthPercent < 0.33) {
      color = 0xe74c3c; // Red
    } else if (healthPercent < 0.66) {
      color = 0xf39c12; // Orange
    }

    bar.rect(x, y, width * healthPercent, height);
    bar.fill({ color });

    // Border - PixiJS v8 API
    bar.rect(x, y, width, height);
    bar.stroke({ width: 1, color: 0xffffff, alpha: 0.5 });
  }

  private createHealthText(): PIXI.Text {
    const text = new PIXI.Text('', {
      fontFamily: 'Arial',
      fontSize: 12,
      fill: 0xffffff,
      fontWeight: 'bold',
      stroke: { color: 0x000000, width: 3 },
    });
    text.anchor.set(0.5);
    text.y = -60;
    return text;
  }

  private updateHealthText(): void {
    this.healthText.text = `${this.monster.health}/${this.monster.maxHealth}`;
  }

  private createNameText(): PIXI.Text {
    const text = new PIXI.Text(this.monster.monsterType, {
      fontFamily: 'Arial',
      fontSize: 10,
      fill: 0xffffff,
      fontWeight: 'bold',
      stroke: { color: 0x000000, width: 3 },
    });
    text.anchor.set(0.5);
    text.y = 45;
    return text;
  }

  private createEliteBadge(): PIXI.Graphics {
    const badge = new PIXI.Graphics();

    // Gold star background - PixiJS v8 API
    badge.circle(25, -25, 12);
    badge.fill({ color: 0xf39c12 });

    // Elite "E" text
    const text = new PIXI.Text('E', {
      fontFamily: 'Arial',
      fontSize: 14,
      fill: 0xffffff,
      fontWeight: 'bold',
    });
    text.anchor.set(0.5);
    text.x = 25;
    text.y = -25;
    badge.addChild(text);

    return badge;
  }

  private createStatusIcons(): PIXI.Container {
    const container = new PIXI.Container();
    container.y = -70;
    return container;
  }

  private updateStatusIcons(): void {
    // Clear existing icons
    this.statusIcons.removeChildren();

    const iconSize = 16;
    const spacing = 18;
    const startX = -(this.monster.conditions.length * spacing) / 2;

    this.monster.conditions.forEach((condition, index) => {
      const icon = this.createConditionIcon(condition, iconSize);
      icon.x = startX + index * spacing;
      this.statusIcons.addChild(icon);
    });
  }

  private createConditionIcon(condition: Condition, size: number): PIXI.Graphics {
    const icon = new PIXI.Graphics();

    // Get condition color
    const colors: Record<string, number> = {
      'poison': 0x8e44ad,
      'wound': 0xe74c3c,
      'stun': 0xf39c12,
      'immobilize': 0x3498db,
      'disarm': 0x95a5a6,
      'muddle': 0x7f8c8d,
      'strengthen': 0x2ecc71,
      'invisible': 0xecf0f1,
    };

    // PixiJS v8 API: draw then fill/stroke
    icon.circle(0, 0, size / 2);
    icon.fill({ color: colors[condition] || 0xffffff });
    icon.circle(0, 0, size / 2);
    icon.stroke({ width: 2, color: 0x000000 });

    return icon;
  }

  private createSelectionRing(): PIXI.Graphics {
    const ring = new PIXI.Graphics();
    ring.visible = false;
    return ring;
  }

  private updateSelectionRing(): void {
    const ring = this.selectionRing;
    ring.clear();

    if (!this.isSelected) {
      ring.visible = false;
      return;
    }

    ring.visible = true;
    // PixiJS v8 API: draw then stroke
    ring.circle(0, 0, 42);
    ring.stroke({ width: 4, color: 0xffff00, alpha: 1 });
  }

  /**
   * Update monster data and refresh visuals
   */
  public updateMonster(monster: Monster): void {
    this.monster = monster;
    this.updateVisuals();
  }

  /**
   * Update all visual elements
   */
  private updateVisuals(): void {
    this.updateHealthBar();
    this.updateHealthText();
    this.updateStatusIcons();
    this.updateSelectionRing();
  }

  /**
   * Set selection state
   */
  public setSelected(selected: boolean): void {
    this.isSelected = selected;
    this.updateSelectionRing();
  }

  /**
   * Get monster data
   */
  public getMonster(): Monster {
    return this.monster;
  }

  /**
   * Update monster position on the grid
   *
   * This method updates both the visual sprite position and the internal
   * monster data to maintain consistency between rendering and game state.
   *
   * @param hex - The target hex coordinates in axial format
   */
  public updatePosition(hex: Axial): void {
    const pos = axialToScreen(hex);
    this.position.set(pos.x, pos.y);
    // Update internal data
    this.monster.currentHex = hex;
  }

  /**
   * Check if monster is dead
   */
  public isDead(): boolean {
    return this.monster.isDead || this.monster.health <= 0;
  }

  /**
   * Animate hit effect
   */
  public animateHit(): Promise<void> {
    return new Promise((resolve) => {
      const originalAlpha = this.alpha;
      const originalScale = this.scale.x;

      // Flash red - PixiJS v8 API
      const flash = new PIXI.Graphics();
      flash.circle(0, 0, 40);
      flash.fill({ color: 0xff0000, alpha: 0.5 });
      this.addChild(flash);

      // Shake and flash animation
      let time = 0;
      const duration = 0.5;
      const ticker = (tick: PIXI.Ticker) => {
        time += tick.deltaTime / 60;

        if (time < duration) {
          // Shake
          this.x += Math.sin(time * 50) * 3;
          this.y += Math.cos(time * 50) * 3;

          // Flash
          flash.alpha = 0.5 * (1 - time / duration);
          this.alpha = originalAlpha * (0.5 + 0.5 * Math.sin(time * 20));
        } else {
          // Reset
          this.alpha = originalAlpha;
          this.scale.set(originalScale);
          this.removeChild(flash);
          PIXI.Ticker.shared.remove(ticker);
          resolve();
        }
      };

      PIXI.Ticker.shared.add(ticker);
    });
  }

  /**
   * Animate death effect
   */
  public animateDeath(): Promise<void> {
    return new Promise((resolve) => {
      const duration = 1.0;
      let time = 0;

      const ticker = (tick: PIXI.Ticker) => {
        time += tick.deltaTime / 60;

        if (time < duration) {
          // Fade and shrink
          this.alpha = 1 - time / duration;
          this.scale.set(1 - time / duration);
          this.rotation += tick.deltaTime * 0.1;
        } else {
          this.visible = false;
          PIXI.Ticker.shared.remove(ticker);
          resolve();
        }
      };

      PIXI.Ticker.shared.add(ticker);
    });
  }
}
