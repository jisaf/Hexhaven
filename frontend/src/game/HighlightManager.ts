/**
 * Highlight Manager
 *
 * Handles visual highlighting of hexes on the game board by tinting them.
 * Manages different types of highlights:
 * - Movement range (green)
 * - Attack range (red)
 * - Selected destination (blue)
 */

import { type Axial, axialKey } from './hex-utils';
import type { HexTile } from './HexTile';

export class HighlightManager {
  private tiles: Map<string, HexTile>;
  private highlightedMovementHexes: Set<string>;
  private highlightedAttackHexes: Set<string>;
  private selectedHexKey: string | null = null;

  constructor(tiles: Map<string, HexTile>) {
    this.tiles = tiles;
    this.highlightedMovementHexes = new Set();
    this.highlightedAttackHexes = new Set();
  }

  /**
   * Highlight valid movement hexes by tinting them.
   */
  public showMovementRange(hexes: Axial[]): void {
    this.clearMovementRange();

    const color = 0x00ff00; // Green

    for (const hex of hexes) {
      const key = axialKey(hex);
      const tile = this.tiles.get(key);
      if (tile) {
        tile.setHighlight(color);
        this.highlightedMovementHexes.add(key);
      }
    }
  }

  /**
   * Clear all movement range highlights.
   */
  public clearMovementRange(): void {
    for (const key of this.highlightedMovementHexes) {
      const tile = this.tiles.get(key);
      if (tile) {
        tile.setHighlight(null);
      }
    }
    this.highlightedMovementHexes.clear();
  }

  /**
   * Highlight valid attack hexes by tinting them red.
   */
  public showAttackRange(hexes: Axial[]): void {
    this.clearAttackRange();

    const color = 0xff0000; // Red

    for (const hex of hexes) {
      const key = axialKey(hex);
      const tile = this.tiles.get(key);
      if (tile) {
        tile.setHighlight(color);
        this.highlightedAttackHexes.add(key);
      }
    }
  }

  /**
   * Clear all attack range highlights.
   */
  public clearAttackRange(): void {
    for (const key of this.highlightedAttackHexes) {
      const tile = this.tiles.get(key);
      if (tile) {
        tile.setHighlight(null);
      }
    }
    this.highlightedAttackHexes.clear();
  }

  public setSelectedHex(hex: Axial | null): void {
    // Clear previous selection
    if (this.selectedHexKey) {
        const oldTile = this.tiles.get(this.selectedHexKey);
        // Only reset tint if it's not part of the movement range
        if (oldTile && !this.highlightedMovementHexes.has(this.selectedHexKey)) {
            oldTile.setHighlight(null);
        } else if (oldTile) {
            oldTile.setHighlight(0x00ff00); // Back to green
        }
    }

    this.selectedHexKey = hex ? axialKey(hex) : null;

    if (this.selectedHexKey) {
        const newTile = this.tiles.get(this.selectedHexKey);
        if (newTile) {
            newTile.setHighlight(0x0099ff); // Blue
        }
    }
  }

  /**
   * Clear all types of highlights.
   */
  public clearAll(): void {
    this.clearMovementRange();
    this.clearAttackRange();
    this.setSelectedHex(null);
  }

  /**
   * Destroy and cleanup.
   */
  public destroy(): void {
    this.clearAll();
  }
}
