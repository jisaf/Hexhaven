/**
 * Highlight Manager
 *
 * Handles visual highlighting of hexes on the game board by tinting them.
 * Manages different types of highlights:
 * - Movement range (green)
 * - Attack range (red)
 * - Summon placement (purple)
 * - Selected destination (blue)
 */

import { type Axial, axialKey } from './hex-utils';
import type { HexTile } from './HexTile';

/**
 * Standard highlight colors used throughout the game.
 */
export const HIGHLIGHT_COLORS = {
  MOVEMENT: 0x00ff00,  // Green
  ATTACK: 0xff0000,    // Red
  SELECTED: 0x0099ff,  // Blue
  SUMMON: 0x9900ff,    // Purple
  HEAL: 0x00ffcc,      // Cyan/Teal - distinguishable from green movement
  FORCED_MOVEMENT: 0xffff00,  // Yellow - for push/pull destination selection
} as const;

export class HighlightManager {
  private tiles: Map<string, HexTile>;
  private highlightedMovementHexes: Set<string>;
  private highlightedAttackHexes: Set<string>;
  private highlightedSummonHexes: Set<string>;
  private highlightedHealHexes: Set<string>;
  private highlightedForcedMovementHexes: Set<string>;
  private selectedHexKey: string | null = null;

  constructor(tiles: Map<string, HexTile>) {
    this.tiles = tiles;
    this.highlightedMovementHexes = new Set();
    this.highlightedAttackHexes = new Set();
    this.highlightedSummonHexes = new Set();
    this.highlightedHealHexes = new Set();
    this.highlightedForcedMovementHexes = new Set();
  }

  /**
   * Generic method to highlight a range of hexes with a specified color.
   * Clears any existing highlights in the tracking set before applying new ones.
   */
  private showHighlightedRange(hexes: Axial[], color: number, trackingSet: Set<string>): void {
    this.clearHighlightedRange(trackingSet);
    for (const hex of hexes) {
      const key = axialKey(hex);
      const tile = this.tiles.get(key);
      if (tile) {
        tile.setHighlight(color);
        trackingSet.add(key);
      }
    }
  }

  /**
   * Generic method to clear highlights tracked by a specific set.
   */
  private clearHighlightedRange(trackingSet: Set<string>): void {
    for (const key of trackingSet) {
      const tile = this.tiles.get(key);
      if (tile) {
        tile.setHighlight(null);
      }
    }
    trackingSet.clear();
  }

  /**
   * Highlight valid movement hexes by tinting them green.
   */
  public showMovementRange(hexes: Axial[]): void {
    this.showHighlightedRange(hexes, HIGHLIGHT_COLORS.MOVEMENT, this.highlightedMovementHexes);
  }

  /**
   * Clear all movement range highlights.
   */
  public clearMovementRange(): void {
    this.clearHighlightedRange(this.highlightedMovementHexes);
  }

  /**
   * Highlight valid attack hexes by tinting them red.
   */
  public showAttackRange(hexes: Axial[]): void {
    this.showHighlightedRange(hexes, HIGHLIGHT_COLORS.ATTACK, this.highlightedAttackHexes);
  }

  /**
   * Clear all attack range highlights.
   */
  public clearAttackRange(): void {
    this.clearHighlightedRange(this.highlightedAttackHexes);
  }

  /**
   * Highlight valid summon placement hexes by tinting them purple.
   */
  public showSummonPlacementRange(hexes: Axial[]): void {
    this.showHighlightedRange(hexes, HIGHLIGHT_COLORS.SUMMON, this.highlightedSummonHexes);
  }

  /**
   * Clear all summon placement highlights.
   */
  public clearSummonPlacementRange(): void {
    this.clearHighlightedRange(this.highlightedSummonHexes);
  }

  /**
   * Highlight valid heal target hexes by tinting them cyan/teal.
   */
  public showHealRange(hexes: Axial[]): void {
    this.showHighlightedRange(hexes, HIGHLIGHT_COLORS.HEAL, this.highlightedHealHexes);
  }

  /**
   * Clear all heal range highlights.
   */
  public clearHealRange(): void {
    this.clearHighlightedRange(this.highlightedHealHexes);
  }

  /**
   * Highlight valid forced movement (push/pull) hexes by tinting them yellow.
   */
  public showForcedMovementRange(hexes: Axial[]): void {
    this.showHighlightedRange(hexes, HIGHLIGHT_COLORS.FORCED_MOVEMENT, this.highlightedForcedMovementHexes);
  }

  /**
   * Clear all forced movement range highlights.
   */
  public clearForcedMovementRange(): void {
    this.clearHighlightedRange(this.highlightedForcedMovementHexes);
  }

  public setSelectedHex(hex: Axial | null): void {
    // Clear previous selection
    if (this.selectedHexKey) {
        const oldTile = this.tiles.get(this.selectedHexKey);
        // Only reset tint if it's not part of the movement range
        if (oldTile && !this.highlightedMovementHexes.has(this.selectedHexKey)) {
            oldTile.setHighlight(null);
        } else if (oldTile) {
            oldTile.setHighlight(HIGHLIGHT_COLORS.MOVEMENT);
        }
    }

    this.selectedHexKey = hex ? axialKey(hex) : null;

    if (this.selectedHexKey) {
        const newTile = this.tiles.get(this.selectedHexKey);
        if (newTile) {
            newTile.setHighlight(HIGHLIGHT_COLORS.SELECTED);
        }
    }
  }

  /**
   * Clear all types of highlights.
   */
  public clearAll(): void {
    this.clearMovementRange();
    this.clearAttackRange();
    this.clearSummonPlacementRange();
    this.clearHealRange();
    this.clearForcedMovementRange();
    this.setSelectedHex(null);
  }

  /**
   * Destroy and cleanup.
   */
  public destroy(): void {
    this.clearAll();
  }
}
