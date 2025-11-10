/**
 * MonsterSprite Component (US2 - T106)
 *
 * PixiJS sprite for rendering monsters on the hex grid.
 * Supports elite variants, health bars, and status effects.
 */

import * as PIXI from 'pixi.js';
import { Monster, Condition, AxialCoordinates } from '../../../shared/types/entities';

export class MonsterSprite extends PIXI.Container {
  private monster: Monster;
  private sprite: PIXI.Graphics;
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

  private createSprite(): PIXI.Graphics {
    const sprite = new PIXI.Graphics();

    // Monster body
    if (this.monster.isElite) {
      // Elite monsters - gold/yellow
      sprite.beginFill(0xf39c12);
    } else {
      // Normal monsters - red
      sprite.beginFill(0xe74c3c);
    }

    // Draw hexagon shape for monster
    const size = 30;
    sprite.drawPolygon([
      0, -size,
      size * 0.866, -size * 0.5,
      size * 0.866, size * 0.5,
      0, size,
      -size * 0.866, size * 0.5,
      -size * 0.866, -size * 0.5,
    ]);
    sprite.endFill();

    // Add border
    sprite.lineStyle(3, this.monster.isElite ? 0xffdc00 : 0xc0392b);
    sprite.drawPolygon([
      0, -size,
      size * 0.866, -size * 0.5,
      size * 0.866, size * 0.5,
      0, size,
      -size * 0.866, size * 0.5,
      -size * 0.866, -size * 0.5,
    ]);

    // Add eyes (scary!)
    sprite.beginFill(0xffffff);
    sprite.drawCircle(-8, -5, 4);
    sprite.drawCircle(8, -5, 4);
    sprite.endFill();

    sprite.beginFill(0x000000);
    sprite.drawCircle(-8, -5, 2);
    sprite.drawCircle(8, -5, 2);
    sprite.endFill();

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

    // Background
    bar.beginFill(0x000000, 0.5);
    bar.drawRect(x, y, width, height);
    bar.endFill();

    // Health fill
    const healthPercent = this.monster.health / this.monster.maxHealth;
    let color = 0x2ecc71; // Green
    if (healthPercent < 0.33) {
      color = 0xe74c3c; // Red
    } else if (healthPercent < 0.66) {
      color = 0xf39c12; // Orange
    }

    bar.beginFill(color);
    bar.drawRect(x, y, width * healthPercent, height);
    bar.endFill();

    // Border
    bar.lineStyle(1, 0xffffff, 0.5);
    bar.drawRect(x, y, width, height);
  }

  private createHealthText(): PIXI.Text {
    const text = new PIXI.Text('', {
      fontFamily: 'Arial',
      fontSize: 12,
      fill: 0xffffff,
      fontWeight: 'bold',
      stroke: 0x000000,
      strokeThickness: 3,
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
      stroke: 0x000000,
      strokeThickness: 3,
    });
    text.anchor.set(0.5);
    text.y = 45;
    return text;
  }

  private createEliteBadge(): PIXI.Graphics {
    const badge = new PIXI.Graphics();

    // Gold star background
    badge.beginFill(0xf39c12);
    badge.drawCircle(25, -25, 12);
    badge.endFill();

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
    const colors: Record<Condition, number> = {
      [Condition.POISON]: 0x8e44ad,
      [Condition.WOUND]: 0xe74c3c,
      [Condition.STUN]: 0xf39c12,
      [Condition.IMMOBILIZE]: 0x3498db,
      [Condition.DISARM]: 0x95a5a6,
      [Condition.MUDDLE]: 0x7f8c8d,
      [Condition.STRENGTHEN]: 0x2ecc71,
      [Condition.INVISIBLE]: 0xecf0f1,
    };

    icon.beginFill(colors[condition] || 0xffffff);
    icon.drawCircle(0, 0, size / 2);
    icon.endFill();

    icon.lineStyle(2, 0x000000);
    icon.drawCircle(0, 0, size / 2);

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
    ring.lineStyle(4, 0xffff00, 1);
    ring.drawCircle(0, 0, 42);
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
   * Check if monster is dead
   */
  public isDead(): boolean {
    return this.monster.isDead || this.monster.health <= 0;
  }

  /**
   * Animate hit effect
   */
  public animateHit(damage: number): Promise<void> {
    return new Promise((resolve) => {
      const originalAlpha = this.alpha;
      const originalScale = this.scale.x;

      // Flash red
      const flash = new PIXI.Graphics();
      flash.beginFill(0xff0000, 0.5);
      flash.drawCircle(0, 0, 40);
      flash.endFill();
      this.addChild(flash);

      // Shake and flash animation
      let time = 0;
      const duration = 0.5;
      const ticker = (delta: number) => {
        time += delta / 60;

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

      const ticker = (delta: number) => {
        time += delta / 60;

        if (time < duration) {
          // Fade and shrink
          this.alpha = 1 - time / duration;
          this.scale.set(1 - time / duration);
          this.rotation += delta * 0.1;
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
