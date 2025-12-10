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
import { type Axial, axialToScreen, HEX_SIZE } from './hex-utils';
import { TerrainType, type HexTile as HexTileData, HexFeatureType, type HexFeature } from '../../../shared/types/entities.ts';

export type { HexTileData };

export interface HexTileOptions {
  interactive?: boolean;
  onClick?: (event: PIXI.FederatedPointerEvent, hex: Axial) => void;
  onHover?: (hex: Axial) => void;
  onHoverEnd?: () => void;
}

export class HexTile extends PIXI.Container {
  public readonly coordinates: Axial;
  public terrain: TerrainType;

  private background: PIXI.Graphics;
  private border: PIXI.Graphics;
  private options: HexTileOptions;
  private _isHovered: boolean = false;
  private _isSelected: boolean = false;
  private originalBackgroundColor: number;

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
    this.originalBackgroundColor = this.getTerrainColor(this.terrain);

    this.addChild(this.background);
    this.addChild(this.border);

    // Add icons for special tiles
    this.updateData(data);


    // Setup interactivity
    if (options.interactive) {
      this.setupInteractivity();
    }
  }

  // Hex tile transparency (0.2 = 80% transparent so background is visible)
  private static readonly TILE_ALPHA = 0.2;

  /**
   * Create the hex background based on terrain type
   */
  private createBackground(): PIXI.Graphics {
    const graphic = new PIXI.Graphics();
    const color = this.getTerrainColor(this.terrain);

    graphic.beginFill(color, HexTile.TILE_ALPHA);
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

  private createFeatureIcon(feature: HexFeature): PIXI.Graphics {
    const graphic = new PIXI.Graphics();
    switch (feature.type) {
      case HexFeatureType.TRAP:
        graphic.lineStyle(2, 0xff0000, 1);
        graphic.drawCircle(0, 0, 15);
        graphic.moveTo(-10, -10);
        graphic.lineTo(10, 10);
        graphic.moveTo(10, -10);
        graphic.lineTo(-10, 10);
        break;
      case HexFeatureType.DOOR:
        graphic.beginFill(feature.isOpen ? 0x00ff00 : 0x8B4513, 1);
        graphic.drawRect(-15, -5, 30, 10);
        graphic.endFill();
        break;
      case HexFeatureType.WALL:
        graphic.beginFill(0x808080, 1);
        graphic.drawRect(-20, -2, 40, 4);
        graphic.endFill();
        break;
      // Add cases for other feature types here
    }
    return graphic;
  }

  /**
   * Setup interactive behaviors
   */
  private setupInteractivity(): void {
    this.eventMode = 'static';
    this.cursor = 'pointer';

    // Click/tap handler
    this.on('pointerdown', (e) => {
      if (this.options.onClick && this.terrain !== 'obstacle') {
        this.options.onClick(e, this.coordinates);
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
      case TerrainType.NORMAL:
        return 0xE8DCC0;  // Tan/beige
      case TerrainType.OBSTACLE:
        return 0x8B7355;  // Dark brown
      case TerrainType.DIFFICULT:
        return 0xA0826D;  // Medium brown
      case TerrainType.HAZARDOUS:
        return 0xCD5C5C;  // Red-ish
      default:
        return 0xE8DCC0;
    }
  }

  /**
   * Draw a pointy-top hexagon at given position
   */
  private drawHexagon(graphic: PIXI.Graphics, x: number, y: number, size: number): void {
    const angles = [30, 90, 150, 210, 270, 330];
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
    // Update terrain
    if (data.terrain) {
      this.terrain = data.terrain;
      this.background.destroy();
      this.background = this.createBackground();
      this.addChildAt(this.background, 0);
    }

    // Clear existing feature icons
    this.children.filter(child => child.name === 'feature').forEach(child => {
        this.removeChild(child);
        child.destroy();
    });

    if (data.features) {
        data.features.forEach(feature => {
            const featureIcon = this.createFeatureIcon(feature);
            featureIcon.name = 'feature';
            this.addChild(featureIcon);
        });
    }


    // Update icons if loot/treasure status changed
    // Remove existing loot icons
    const existingLoot = this.children.find(child => child.name === 'loot');
    if (existingLoot) {
      this.removeChild(existingLoot);
      existingLoot.destroy();
    }
    // Add new loot icon if needed
    if (data.hasLoot) {
      const lootIcon = this.createLootIcon();
      lootIcon.name = 'loot';
      this.addChild(lootIcon);
    }

    // Remove existing treasure icons
    const existingTreasure = this.children.find(child => child.name === 'treasure');
    if (existingTreasure) {
      this.removeChild(existingTreasure);
      existingTreasure.destroy();
    }

    // Add new treasure icon if needed
    if (data.hasTreasure) {
      const treasureIcon = this.createTreasureIcon();
      treasureIcon.name = 'treasure';
      this.addChild(treasureIcon);
    }
  }

  public setExportMode(enabled: boolean): void {
    const color = enabled ? 0x00ff00 : this.getTerrainColor(this.terrain);
    // Export mode uses full opacity, normal mode uses transparent
    const alpha = enabled ? 1 : HexTile.TILE_ALPHA;
    this.background.destroy();
    this.background = new PIXI.Graphics();
    this.background.beginFill(color, alpha);
    this.drawHexagon(this.background, 0, 0, HEX_SIZE - 2);
    this.background.endFill();
    this.addChildAt(this.background, 0);

    // Toggle visibility of all children except the background itself.
    // This will hide the border and any feature/loot icons.
    this.children.forEach(child => {
      if (child !== this.background) {
        child.visible = !enabled;
      }
    });
  }

  /**
   * Set the highlight color of the tile.
   * Pass null to remove the highlight.
   */
  public setHighlight(color: number | null): void {
    const newColor = color === null ? this.originalBackgroundColor : color;

    // Redraw the background with the new color (keep transparency)
    this.background.clear();
    this.background.beginFill(newColor, HexTile.TILE_ALPHA);
    this.drawHexagon(this.background, 0, 0, HEX_SIZE - 2);
    this.background.endFill();
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
