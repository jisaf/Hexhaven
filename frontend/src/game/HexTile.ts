/**
 * HexTile Sprite Component
 *
 * Represents a single hex tile on the game board with terrain type visualization.
 * Supports:
 * - Different terrain types (normal, obstacle, difficult, hazardous)
 * - Interactive states (hover, selected)
 * - Visual feedback for click/tap events
 */

import * as PIXI from 'pixi.js';
import { Axial, axialToScreen, HEX_SIZE } from './hex-utils';

export type TerrainType = 'normal' | 'obstacle' | 'difficult' | 'hazardous';

export interface HexTileData {
  coordinates: Axial;
  terrain: TerrainType;
  occupiedBy?: string; // Entity ID
  hasLoot?: boolean;
  hasTreasure?: boolean;
}

export interface HexTileOptions {
  interactive?: boolean;
  onClick?: (hex: Axial) => void;
  onHover?: (hex: Axial) => void;
  onHoverEnd?: () => void;
}

export class HexTile extends PIXI.Container {
  public readonly coordinates: Axial;
  public readonly terrain: TerrainType;

  private background: PIXI.Graphics;
  private border: PIXI.Graphics;
  private icon?: PIXI.Graphics;
  private options: HexTileOptions;
  private _isHovered: boolean = false;
  private _isSelected: boolean = false;

  constructor(data: HexTileData, options: HexTileOptions = {}) {
    super();

    this.coordinates = data.coordinates;
    this.terrain = data.terrain;
    this.options = options;

    // Position the container
    const pos = axialToScreen(this.coordinates);
    this.position.set(pos.x, pos.y);

    // Create visual elements
    this.background = this.createBackground();
    this.border = this.createBorder();

    this.addChild(this.background);
    this.addChild(this.border);

    // Add icons for special tiles
    if (data.terrain === 'obstacle') {
      this.icon = this.createObstacleIcon();
      this.addChild(this.icon);
    }

    if (data.hasLoot) {
      const lootIcon = this.createLootIcon();
      this.addChild(lootIcon);
    }

    if (data.hasTreasure) {
      const treasureIcon = this.createTreasureIcon();
      this.addChild(treasureIcon);
    }

    // Setup interactivity
    if (options.interactive) {
      this.setupInteractivity();
    }
  }

  /**
   * Create the hex background based on terrain type
   */
  private createBackground(): PIXI.Graphics {
    const graphic = new PIXI.Graphics();
    const color = this.getTerrainColor(this.terrain);

    graphic.beginFill(color, 1);
    this.drawHexagon(graphic, 0, 0, HEX_SIZE - 2);
    graphic.endFill();

    return graphic;
  }

  /**
   * Create the hex border
   */
  private createBorder(): PIXI.Graphics {
    const graphic = new PIXI.Graphics();

    graphic.lineStyle(2, 0x444444, 1);
    this.drawHexagon(graphic, 0, 0, HEX_SIZE);

    return graphic;
  }

  /**
   * Create obstacle icon (X pattern)
   */
  private createObstacleIcon(): PIXI.Graphics {
    const graphic = new PIXI.Graphics();
    const size = HEX_SIZE * 0.5;

    graphic.lineStyle(4, 0x000000, 0.6);
    graphic.moveTo(-size, -size);
    graphic.lineTo(size, size);
    graphic.moveTo(size, -size);
    graphic.lineTo(-size, size);

    return graphic;
  }

  /**
   * Create loot icon (coin)
   */
  private createLootIcon(): PIXI.Graphics {
    const graphic = new PIXI.Graphics();

    graphic.beginFill(0xFFD700, 1);
    graphic.drawCircle(0, 0, 8);
    graphic.endFill();

    graphic.lineStyle(1, 0xDAA520, 1);
    graphic.drawCircle(0, 0, 8);

    return graphic;
  }

  /**
   * Create treasure icon (chest)
   */
  private createTreasureIcon(): PIXI.Graphics {
    const graphic = new PIXI.Graphics();

    graphic.beginFill(0x8B4513, 1);
    graphic.drawRect(-10, -8, 20, 16);
    graphic.endFill();

    graphic.beginFill(0xFFD700, 1);
    graphic.drawRect(-2, 0, 4, 4);
    graphic.endFill();

    return graphic;
  }

  /**
   * Setup interactive behaviors
   */
  private setupInteractivity(): void {
    this.eventMode = 'static';
    this.cursor = 'pointer';

    // Click/tap handler
    this.on('pointerdown', () => {
      if (this.options.onClick && this.terrain !== 'obstacle') {
        this.options.onClick(this.coordinates);
      }
    });

    // Hover handlers
    this.on('pointerover', () => {
      this._isHovered = true;
      this.updateVisuals();

      if (this.options.onHover) {
        this.options.onHover(this.coordinates);
      }
    });

    this.on('pointerout', () => {
      this._isHovered = false;
      this.updateVisuals();

      if (this.options.onHoverEnd) {
        this.options.onHoverEnd();
      }
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
    // Update border color based on state
    const borderColor = this._isSelected
      ? 0xFFFF00  // Yellow for selected
      : this._isHovered
      ? 0xFFFFFF  // White for hover
      : 0x444444; // Default gray

    const borderWidth = this._isSelected || this._isHovered ? 3 : 2;

    // Recreate border with new color
    this.removeChild(this.border);
    this.border.destroy();

    this.border = new PIXI.Graphics();
    this.border.lineStyle(borderWidth, borderColor, 1);
    this.drawHexagon(this.border, 0, 0, HEX_SIZE);

    this.addChildAt(this.border, 1); // Add above background
  }

  /**
   * Get color for terrain type
   */
  private getTerrainColor(terrain: TerrainType): number {
    switch (terrain) {
      case 'normal':
        return 0xE8DCC0;  // Tan/beige
      case 'obstacle':
        return 0x8B7355;  // Dark brown
      case 'difficult':
        return 0xA0826D;  // Medium brown
      case 'hazardous':
        return 0xCD5C5C;  // Red-ish
      default:
        return 0xE8DCC0;
    }
  }

  /**
   * Draw a flat-top hexagon at given position
   */
  private drawHexagon(graphic: PIXI.Graphics, x: number, y: number, size: number): void {
    const angles = [0, 60, 120, 180, 240, 300];
    const points: Array<{ x: number; y: number }> = [];

    for (const angle of angles) {
      const rad = (Math.PI / 180) * angle;
      points.push({
        x: x + size * Math.cos(rad),
        y: y + size * Math.sin(rad)
      });
    }

    graphic.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      graphic.lineTo(points[i].x, points[i].y);
    }

    graphic.closePath();
  }

  /**
   * Update tile data (for dynamic changes)
   */
  public updateData(data: Partial<HexTileData>): void {
    // Update icons if loot/treasure status changed
    if (data.hasLoot !== undefined) {
      // Remove existing loot icons
      const existingLoot = this.children.find(child => child.name === 'loot');
      if (existingLoot) {
        this.removeChild(existingLoot);
      }

      // Add new loot icon if needed
      if (data.hasLoot) {
        const lootIcon = this.createLootIcon();
        lootIcon.name = 'loot';
        this.addChild(lootIcon);
      }
    }

    if (data.hasTreasure !== undefined) {
      // Remove existing treasure icons
      const existingTreasure = this.children.find(child => child.name === 'treasure');
      if (existingTreasure) {
        this.removeChild(existingTreasure);
      }

      // Add new treasure icon if needed
      if (data.hasTreasure) {
        const treasureIcon = this.createTreasureIcon();
        treasureIcon.name = 'treasure';
        this.addChild(treasureIcon);
      }
    }
  }

  /**
   * Get current hover state
   */
  public get isHovered(): boolean {
    return this._isHovered;
  }

  /**
   * Get current selected state
   */
  public get isSelected(): boolean {
    return this._isSelected;
  }
}
