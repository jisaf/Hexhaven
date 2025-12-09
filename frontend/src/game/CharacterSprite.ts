/**
 * CharacterSprite Component
 *
 * Represents a playable character on the game board with:
 * - Visual representation (colored circle with class icon)
 * - Tap-to-select interaction
 * - Health bar display
 * - Status effects visualization
 * - Animation support (movement, damage, etc.)
 */

import * as PIXI from 'pixi.js';
import { ColorMatrixFilter } from 'pixi.js';
import { type Axial, axialToScreen, HEX_SIZE } from './hex-utils';

export type CharacterClass = 'Brute' | 'Tinkerer' | 'Spellweaver' | 'Scoundrel' | 'Cragheart' | 'Mindthief';

export interface CharacterData {
  id: string;
  playerId: string;
  classType: CharacterClass;
  health: number;
  maxHealth: number;
  currentHex: Axial;
  conditions: string[];
  isExhausted: boolean;
}

export interface CharacterSpriteOptions {
  interactive?: boolean;
  onSelect?: (characterId: string) => void;
}

export class CharacterSprite extends PIXI.Container {
  public readonly characterId: string;
  public readonly classType: CharacterClass;

  private data: CharacterData;
  private options: CharacterSpriteOptions;

  private body: PIXI.Graphics;
  private healthBar: PIXI.Graphics;
  private selectionRing: PIXI.Graphics;
  private conditionIcons: PIXI.Container;
  private exhaustedOverlay: PIXI.Graphics | null = null;

  private _isSelected: boolean = false;
  private _isHovered: boolean = false;

  constructor(data: CharacterData, options: CharacterSpriteOptions = {}) {
    super();

    this.name = `character-sprite-${data.classType}`;
    this.characterId = data.id;
    this.classType = data.classType;
    this.data = data;
    this.options = options;

    // Position the sprite
    this.updatePosition(data.currentHex);

    // Create visual elements
    this.selectionRing = this.createSelectionRing();
    this.body = this.createBody();
    this.healthBar = this.createHealthBar();
    this.conditionIcons = this.createConditionIcons();

    this.addChild(this.selectionRing);
    this.addChild(this.body);
    this.addChild(this.healthBar);
    this.addChild(this.conditionIcons);

    // Hide selection ring by default
    this.selectionRing.visible = false;

    // Setup interactivity
    if (options.interactive) {
      this.setupInteractivity();
    }

    // Apply exhaustion visual effects
    if (data.isExhausted) {
      this.setExhausted(true);
    }
  }

  /**
   * Set exhaustion visual state
   */
  public setExhausted(exhausted: boolean): void {
    if (exhausted) {
      // Add grayscale filter
      const colorMatrix = new ColorMatrixFilter();
      colorMatrix.desaturate();
      this.body.filters = [colorMatrix];

      // Reduce opacity
      this.alpha = 0.5;

      // Add X overlay
      if (!this.exhaustedOverlay) {
        this.exhaustedOverlay = this.createExhaustedOverlay();
        this.addChild(this.exhaustedOverlay);
      }
      this.exhaustedOverlay.visible = true;
    } else {
      // Remove filters
      this.body.filters = null;

      // Restore opacity
      this.alpha = 1.0;

      // Hide X overlay
      if (this.exhaustedOverlay) {
        this.exhaustedOverlay.visible = false;
      }
    }
  }

  /**
   * Create exhausted overlay (X mark)
   */
  private createExhaustedOverlay(): PIXI.Graphics {
    const graphic = new PIXI.Graphics();
    const size = HEX_SIZE * 0.6;
    const thickness = 4;

    graphic.lineStyle(thickness, 0xFF0000, 0.8);

    // Draw X
    graphic.moveTo(-size / 2, -size / 2);
    graphic.lineTo(size / 2, size / 2);
    graphic.moveTo(size / 2, -size / 2);
    graphic.lineTo(-size / 2, size / 2);

    return graphic;
  }

  /**
   * Create character body (colored circle with class initial)
   */
  private createBody(): PIXI.Graphics {
    const graphic = new PIXI.Graphics();
    const color = this.getClassColor(this.classType);
    const radius = HEX_SIZE * 0.4;

    // Draw character circle
    graphic.beginFill(color, 1);
    graphic.lineStyle(3, 0xFFFFFF, 1);
    graphic.drawCircle(0, 0, radius);
    graphic.endFill();

    // Add class initial text
    const text = new PIXI.Text(this.classType.charAt(0), {
      fontFamily: 'Arial',
      fontSize: 24,
      fontWeight: 'bold',
      fill: 0xFFFFFF,
      align: 'center'
    });

    text.anchor.set(0.5);
    graphic.addChild(text);

    return graphic;
  }

  /**
   * Create health bar below character
   */
  private createHealthBar(): PIXI.Graphics {
    const graphic = new PIXI.Graphics();
    const barWidth = HEX_SIZE * 0.8;
    const barHeight = 6;
    const y = HEX_SIZE * 0.5;

    // Background (gray)
    graphic.beginFill(0x333333, 0.8);
    graphic.drawRect(-barWidth / 2, y, barWidth, barHeight);
    graphic.endFill();

    // Health (green to red gradient based on percentage)
    const healthPercent = this.data.health / this.data.maxHealth;
    const healthWidth = barWidth * healthPercent;
    const healthColor = this.getHealthColor(healthPercent);

    graphic.beginFill(healthColor, 1);
    graphic.drawRect(-barWidth / 2, y, healthWidth, barHeight);
    graphic.endFill();

    // Border
    graphic.lineStyle(1, 0xFFFFFF, 0.8);
    graphic.drawRect(-barWidth / 2, y, barWidth, barHeight);

    return graphic;
  }

  /**
   * Create selection ring (shown when character is selected)
   */
  private createSelectionRing(): PIXI.Graphics {
    const graphic = new PIXI.Graphics();
    const radius = HEX_SIZE * 0.5;

    graphic.lineStyle(4, 0xFFFF00, 1);
    graphic.drawCircle(0, 0, radius);

    return graphic;
  }

  /**
   * Create condition status icons above character
   */
  private createConditionIcons(): PIXI.Container {
    const container = new PIXI.Container();
    const iconSize = 16;
    const spacing = 4;
    const y = -(HEX_SIZE * 0.6);

    this.data.conditions.forEach((condition, index) => {
      const icon = this.createConditionIcon(condition, iconSize);
      icon.position.set((iconSize + spacing) * index - (this.data.conditions.length * (iconSize + spacing)) / 2, y);
      container.addChild(icon);
    });

    return container;
  }

  /**
   * Create a single condition icon
   */
  private createConditionIcon(condition: string, size: number): PIXI.Graphics {
    const graphic = new PIXI.Graphics();
    const color = this.getConditionColor(condition);

    graphic.beginFill(color, 0.9);
    graphic.lineStyle(1, 0x000000, 1);
    graphic.drawCircle(0, 0, size / 2);
    graphic.endFill();

    // Add condition letter
    const text = new PIXI.Text(condition.charAt(0).toUpperCase(), {
      fontFamily: 'Arial',
      fontSize: 10,
      fontWeight: 'bold',
      fill: 0xFFFFFF
    });

    text.anchor.set(0.5);
    graphic.addChild(text);

    return graphic;
  }

  /**
   * Setup interactive behaviors
   */
  private setupInteractivity(): void {
    this.eventMode = 'static';
    this.cursor = 'pointer';

    // Click/tap to select
    this.on('pointerdown', (event) => {
      event.stopPropagation();

      if (this.options.onSelect && !this.data.isExhausted) {
        this.options.onSelect(this.characterId);
      }
    });

    // Hover effects
    this.on('pointerover', () => {
      this._isHovered = true;
      this.updateVisuals();
    });

    this.on('pointerout', () => {
      this._isHovered = false;
      this.updateVisuals();
    });
  }

  /**
   * Set selected state
   */
  public setSelected(selected: boolean): void {
    this._isSelected = selected;
    this.updateVisuals();
  }

  /**
   * Update visual appearance based on state
   */
  private updateVisuals(): void {
    // Show selection ring if selected
    this.selectionRing.visible = this._isSelected;

    // Scale up slightly on hover
    const scale = this._isHovered && !this.data.isExhausted ? 1.1 : 1.0;
    this.body.scale.set(scale);
  }

  /**
   * Update character position
   */
  public updatePosition(hex: Axial): void {
    const pos = axialToScreen(hex);
    this.position.set(pos.x, pos.y);
  }

  /**
   * Animate movement along a path of hexes
   */
  public async animateMoveTo(path: Axial[], speed: number = 200): Promise<void> {
    for (const targetHex of path) {
      const startPos = this.position.clone();
      const endPos = axialToScreen(targetHex);
      const distance = Math.sqrt(Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.y - startPos.y, 2));
      const duration = (distance / speed) * 1000;
      const startTime = Date.now();

      await new Promise<void>((resolve) => {
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);

          const eased = 1 - Math.pow(1 - progress, 3); // Ease-out cubic

          this.position.x = startPos.x + (endPos.x - startPos.x) * eased;
          this.position.y = startPos.y + (endPos.y - startPos.y) * eased;

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            this.updatePosition(targetHex); // Snap to final position
            resolve();
          }
        };

        animate();
      });
    }
  }

  /**
   * Animate taking damage
   */
  public async animateDamage(amount: number): Promise<void> {
    // Flash red
    const originalTint = this.body.tint;
    this.body.tint = 0xFF0000;

    // Show damage number
    const damageText = new PIXI.Text(`-${amount}`, {
      fontFamily: 'Arial',
      fontSize: 20,
      fontWeight: 'bold',
      fill: 0xFF0000,
      stroke: { color: '#FFFFFF', width: 2 }
    });

    damageText.anchor.set(0.5);
    damageText.position.set(0, -HEX_SIZE * 0.3);
    this.addChild(damageText);

    // Animate damage text floating up
    return new Promise((resolve) => {
      let elapsed = 0;
      const duration = 1000;

      const animate = () => {
        elapsed += 16; // ~60fps
        const progress = elapsed / duration;

        damageText.position.y -= 2;
        damageText.alpha = 1 - progress;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.removeChild(damageText);
          this.body.tint = originalTint;
          resolve();
        }
      };

      animate();
    });
  }

  /**
   * Update character data
   */
  public updateData(data: Partial<CharacterData>): void {
    this.data = { ...this.data, ...data };

    // Update position if changed
    if (data.currentHex) {
      this.updatePosition(data.currentHex);
    }

    // Update health bar if health changed
    if (data.health !== undefined || data.maxHealth !== undefined) {
      this.removeChild(this.healthBar);
      this.healthBar.destroy();
      this.healthBar = this.createHealthBar();
      this.addChildAt(this.healthBar, 2);
    }

    // Update conditions if changed
    if (data.conditions) {
      this.removeChild(this.conditionIcons);
      this.conditionIcons.destroy();
      this.conditionIcons = this.createConditionIcons();
      this.addChild(this.conditionIcons);
    }

    // Update exhausted state
    if (data.isExhausted !== undefined) {
      this.setExhausted(data.isExhausted);
      if (data.isExhausted) {
        this.setSelected(false);
      }
    }
  }

  /**
   * Get color for character class
   */
  private getClassColor(classType: CharacterClass): number {
    switch (classType) {
      case 'Brute':
        return 0xCC3333;  // Red
      case 'Tinkerer':
        return 0x3399CC;  // Blue
      case 'Spellweaver':
        return 0x9933CC;  // Purple
      case 'Scoundrel':
        return 0x33CC33;  // Green
      case 'Cragheart':
        return 0xCC9933;  // Orange
      case 'Mindthief':
        return 0xCC33CC;  // Magenta
      default:
        return 0x999999;  // Gray
    }
  }

  /**
   * Get color for health bar based on percentage
   */
  private getHealthColor(percent: number): number {
    if (percent > 0.6) return 0x00FF00;  // Green
    if (percent > 0.3) return 0xFFFF00;  // Yellow
    return 0xFF0000;  // Red
  }

  /**
   * Get color for condition icon
   */
  private getConditionColor(condition: string): number {
    switch (condition.toLowerCase()) {
      case 'poison':
        return 0x9933CC;  // Purple
      case 'wound':
        return 0xCC3333;  // Red
      case 'stun':
        return 0xFFFF00;  // Yellow
      case 'immobilize':
        return 0x3399CC;  // Blue
      case 'disarm':
        return 0x999999;  // Gray
      case 'muddle':
        return 0x996633;  // Brown
      case 'strengthen':
        return 0xFF9900;  // Orange
      case 'invisible':
        return 0xCCCCCC;  // Light gray
      default:
        return 0x666666;  // Dark gray
    }
  }

  /**
   * Get current data
   */
  public getData(): CharacterData {
    return { ...this.data };
  }

  /**
   * Check if character is selected
   */
  public get isSelected(): boolean {
    return this._isSelected;
  }

  /**
   * Check if character is hovered
   */
  public get isHovered(): boolean {
    return this._isHovered;
  }
}
