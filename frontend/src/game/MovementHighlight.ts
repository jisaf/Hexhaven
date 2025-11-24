/**
 * Movement Range Highlighting
 *
 * Handles visual highlighting of valid movement hexes for a selected character.
 * Creates and manages overlay sprites to show:
 * - Valid movement targets (green)
 * - Attack range (red)
 * - Selected path (yellow)
 */

import * as PIXI from 'pixi.js';
import { type Axial, axialKey, axialToScreen, HEX_SIZE } from './hex-utils';

export interface HighlightOptions {
  color: number;
  alpha: number;
  lineWidth?: number;
  lineColor?: number;
}

export class MovementHighlight {
  private container: PIXI.Container;
  private highlights: Map<string, PIXI.Graphics>;

  constructor(container: PIXI.Container) {
    this.container = container;
    this.highlights = new Map();
  }

  /**
   * Highlight valid movement hexes
   */
  public showMovementRange(hexes: Axial[], color: number = 0x00ff00, alpha: number = 0.3): void {
    this.clear();

    for (const hex of hexes) {
      const key = axialKey(hex);
      const highlight = this.createHexHighlight(hex, {
        color,
        alpha,
        lineWidth: 2,
        lineColor: 0x00ff00
      });

      this.highlights.set(key, highlight);
      this.container.addChild(highlight);
    }
  }

  /**
   * Highlight attack range hexes
   */
  public showAttackRange(hexes: Axial[], color: number = 0xff0000, alpha: number = 0.3): void {
    for (const hex of hexes) {
      const key = axialKey(hex);

      // Don't overwrite movement highlights
      if (!this.highlights.has(key)) {
        const highlight = this.createHexHighlight(hex, {
          color,
          alpha,
          lineWidth: 2,
          lineColor: 0xff0000
        });

        this.highlights.set(key, highlight);
        this.container.addChild(highlight);
      }
    }
  }

  /**
   * Highlight a specific path (for showing movement animation)
   */
  public showPath(hexes: Axial[], color: number = 0xffff00, alpha: number = 0.5): void {
    // Remove existing path highlights
    for (const [key, highlight] of this.highlights.entries()) {
      if (highlight.name === 'path') {
        this.container.removeChild(highlight);
        this.highlights.delete(key);
      }
    }

    // Add new path highlights
    for (const hex of hexes) {
      const key = axialKey(hex);
      const highlight = this.createHexHighlight(hex, {
        color,
        alpha,
        lineWidth: 3,
        lineColor: 0xffaa00
      });

      highlight.name = 'path';
      this.highlights.set(key, highlight);
      this.container.addChild(highlight);
    }
  }

  /**
   * Highlight a single hex (for hover effects)
   */
  public showHover(hex: Axial, color: number = 0xffffff, alpha: number = 0.4): void {
    const key = 'hover';
    const existing = this.highlights.get(key);

    if (existing) {
      this.container.removeChild(existing);
    }

    const highlight = this.createHexHighlight(hex, {
      color,
      alpha,
      lineWidth: 3,
      lineColor: 0xffffff
    });

    highlight.name = 'hover';
    this.highlights.set(key, highlight);
    this.container.addChild(highlight);
  }

  /**
   * Remove hover highlight
   */
  public clearHover(): void {
    const existing = this.highlights.get('hover');

    if (existing) {
      this.container.removeChild(existing);
      this.highlights.delete('hover');
    }
  }

  /**
   * Highlight a single hex as the selected destination
   */
  public showSelected(hex: Axial, color: number = 0x0000ff, alpha: number = 0.5): void {
    this.clearSelected(); // Clear previous selection

    const key = 'selected';
    const highlight = this.createHexHighlight(hex, {
      color,
      alpha,
      lineWidth: 2,
      lineColor: 0x8888ff
    });

    highlight.name = 'selected';
    this.highlights.set(key, highlight);
    this.container.addChild(highlight);
  }

  /**
   * Remove selected highlight
   */
  public clearSelected(): void {
    const existing = this.highlights.get('selected');

    if (existing) {
      this.container.removeChild(existing);
      this.highlights.delete('selected');
    }
  }

  /**
   * Clear all highlights
   */
  public clear(): void {
    for (const highlight of this.highlights.values()) {
      this.container.removeChild(highlight);
    }

    this.highlights.clear();
  }

  /**
   * Clear specific type of highlights
   */
  public clearType(type: 'movement' | 'attack' | 'path'): void {
    const toRemove: string[] = [];

    for (const [key, highlight] of this.highlights.entries()) {
      if (highlight.name === type || (!highlight.name && type === 'movement')) {
        this.container.removeChild(highlight);
        toRemove.push(key);
      }
    }

    for (const key of toRemove) {
      this.highlights.delete(key);
    }
  }

  /**
   * Create a hexagonal highlight sprite
   */
  private createHexHighlight(hex: Axial, options: HighlightOptions): PIXI.Graphics {
    const graphic = new PIXI.Graphics();
    const pos = axialToScreen(hex);

    // Make the highlight non-interactive
    graphic.eventMode = 'none';
    graphic.name = 'highlight';

    // Draw filled hex
    graphic.beginFill(options.color, options.alpha);

    // Draw outline if specified
    if (options.lineWidth && options.lineColor !== undefined) {
      graphic.lineStyle(options.lineWidth, options.lineColor, 1);
    }

    // Draw flat-top hexagon
    this.drawHexagon(graphic, pos.x, pos.y, HEX_SIZE);

    graphic.endFill();

    return graphic;
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
   * Destroy and cleanup
   */
  public destroy(): void {
    this.clear();
    this.highlights.clear();
  }
}
