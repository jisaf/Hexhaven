/**
 * Hex Coordinate Utilities
 *
 * Provides conversion between screen coordinates and axial hex coordinates,
 * plus utilities for distance calculation and range finding.
 *
 * Coordinate Systems:
 * - Axial: (q, r) - 2D representation for storage
 * - Cube: (q, r, s) where q + r + s = 0 - 3D representation for algorithms
 * - Screen: (x, y) - Pixel coordinates
 */

import * as PIXI from 'pixi.js';

export interface Axial {
  q: number;
  r: number;
}

export interface Cube {
  q: number;
  r: number;
  s: number;
}

export interface Point {
  x: number;
  y: number;
}

// Hex layout constants
export const HEX_SIZE = 48; // pixels (radius from center to vertex)
export const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
export const HEX_HEIGHT = 2 * HEX_SIZE;

/**
 * Convert axial coordinates to cube coordinates
 */
export function axialToCube(hex: Axial): Cube {
  return {
    q: hex.q,
    r: hex.r,
    s: -hex.q - hex.r
  };
}

/**
 * Convert cube coordinates to axial coordinates
 */
export function cubeToAxial(cube: Cube): Axial {
  return {
    q: cube.q,
    r: cube.r
  };
}

/**
 * Calculate distance between two hexes (in hex steps)
 */
export function hexDistance(a: Axial, b: Axial): number {
  const ac = axialToCube(a);
  const bc = axialToCube(b);
  return (Math.abs(ac.q - bc.q) + Math.abs(ac.r - bc.r) + Math.abs(ac.s - bc.s)) / 2;
}

/**
 * Convert axial hex coordinates to screen pixel coordinates
 * Uses pointy-top hex orientation
 */
export function axialToScreen(hex: Axial): Point {
  const x = HEX_SIZE * (Math.sqrt(3) * hex.q + Math.sqrt(3) / 2 * hex.r);
  const y = HEX_SIZE * (3 / 2 * hex.r);
  return { x, y };
}

/**
 * Convert screen pixel coordinates to axial hex coordinates
 * Uses pointy-top hex orientation
 * Returns the nearest hex (rounded)
 */
export function screenToAxial(point: Point): Axial {
  // Convert to fractional cube coordinates
  const q = (Math.sqrt(3) / 3 * point.x - 1 / 3 * point.y) / HEX_SIZE;
  const r = (2 / 3 * point.y) / HEX_SIZE;
  const s = -q - r;

  // Round to nearest hex
  return cubeRound({ q, r, s });
}

/**
 * Round fractional cube coordinates to nearest integer cube coordinates
 */
function cubeRound(cube: Cube): Axial {
  let q = Math.round(cube.q);
  let r = Math.round(cube.r);
  let s = Math.round(cube.s);

  const qDiff = Math.abs(q - cube.q);
  const rDiff = Math.abs(r - cube.r);
  const sDiff = Math.abs(s - cube.s);

  // Reset the component with the largest rounding error
  // to maintain q + r + s = 0
  if (qDiff > rDiff && qDiff > sDiff) {
    q = -r - s;
  } else if (rDiff > sDiff) {
    r = -q - s;
  } else {
    s = -q - r;
  }

  return { q, r };
}

/**
 * Get all hexes within a given range of a center hex
 * @param center - Center hex
 * @param range - Maximum distance from center (inclusive)
 * @returns Array of hexes within range (including center)
 */
export function hexRange(center: Axial, range: number): Axial[] {
  const results: Axial[] = [];

  for (let q = -range; q <= range; q++) {
    const r1 = Math.max(-range, -q - range);
    const r2 = Math.min(range, -q + range);

    for (let r = r1; r <= r2; r++) {
      results.push({
        q: center.q + q,
        r: center.r + r
      });
    }
  }

  return results;
}

/**
 * Get all hexes within a given range, excluding obstacles
 * Uses breadth-first search to respect obstacle blocking
 */
export function hexRangeReachable(
  center: Axial,
  range: number,
  isBlocked: (hex: Axial) => boolean
): Axial[] {
  const visited = new Set<string>();
  const reachable: Axial[] = [center];
  const fringes: Axial[][] = [[center]];

  visited.add(axialKey(center));

  for (let k = 1; k <= range; k++) {
    fringes[k] = [];

    for (const hex of fringes[k - 1]) {
      const neighbors = hexNeighbors(hex);

      for (const neighbor of neighbors) {
        const key = axialKey(neighbor);

        if (!visited.has(key) && !isBlocked(neighbor)) {
          visited.add(key);
          reachable.push(neighbor);
          fringes[k].push(neighbor);
        }
      }
    }
  }

  return reachable;
}

/**
 * Get all hexes within attack range
 * Unlike hexRangeReachable, this ignores obstacles (attacks can go through walls)
 * but filters to only hexes that contain valid targets
 */
export function hexAttackRange(
  center: Axial,
  range: number,
  hasTarget: (hex: Axial) => boolean
): Axial[] {
  // Get all hexes in range using simple distance check (ignoring obstacles)
  const allInRange = hexRange(center, range);

  // Filter to only hexes with targets, excluding the center hex itself
  return allInRange.filter(hex =>
    !hexEqual(hex, center) && hasTarget(hex)
  );
}

/**
 * Get the 6 neighboring hexes
 * Order: east, northeast, northwest, west, southwest, southeast
 */
export function hexNeighbors(hex: Axial): Axial[] {
  const directions: Axial[] = [
    { q: 1, r: 0 },   // east
    { q: 1, r: -1 },  // northeast
    { q: 0, r: -1 },  // northwest
    { q: -1, r: 0 },  // west
    { q: -1, r: 1 },  // southwest
    { q: 0, r: 1 }    // southeast
  ];

  return directions.map(dir => ({
    q: hex.q + dir.q,
    r: hex.r + dir.r
  }));
}

/**
 * Get a specific neighbor in a direction (0-5)
 * 0 = east, 1 = northeast, 2 = northwest, 3 = west, 4 = southwest, 5 = southeast
 */
export function hexNeighbor(hex: Axial, direction: number): Axial {
  const directions: Axial[] = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 }
  ];

  const dir = directions[direction % 6];
  return {
    q: hex.q + dir.q,
    r: hex.r + dir.r
  };
}

/**
 * Create a unique string key for a hex coordinate (for use in Sets/Maps)
 */
export function axialKey(hex: Axial): string {
  return `${hex.q},${hex.r}`;
}

/**
 * Parse a hex key back to axial coordinates
 */
export function keyToAxial(key: string): Axial {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
}

/**
 * Check if two hexes are equal
 */
export function hexEqual(a: Axial, b: Axial): boolean {
  return a.q === b.q && a.r === b.r;
}

/**
 * Get a line of hexes from start to end (for line of sight checks)
 * Uses linear interpolation
 */
export function hexLine(start: Axial, end: Axial): Axial[] {
  const distance = hexDistance(start, end);
  const results: Axial[] = [];

  for (let i = 0; i <= distance; i++) {
    const t = distance === 0 ? 0 : i / distance;
    const cube = cubeLerp(
      axialToCube(start),
      axialToCube(end),
      t
    );
    results.push(cubeRound(cube));
  }

  return results;
}

/**
 * Linear interpolation between two cube coordinates
 */
function cubeLerp(a: Cube, b: Cube, t: number): Cube {
  return {
    q: a.q * (1 - t) + b.q * t,
    r: a.r * (1 - t) + b.r * t,
    s: a.s * (1 - t) + b.s * t
  };
}

/**
 * Update a PIXI sprite's position based on hex coordinates
 *
 * This utility function ensures PIXI.js properly recalculates the sprite's
 * interactive bounds for hit detection. When moving sprites programmatically,
 * simply calling position.set() may not update the hit area, causing clicks
 * to register at the old location.
 *
 * @param sprite - The PIXI.Container (sprite) to reposition
 * @param hex - The target hex coordinates in axial format
 *
 * @example
 * const monsterSprite = new MonsterSprite(monsterData);
 * updateSpritePosition(monsterSprite, { q: 3, r: 2 });
 */
export function updateSpritePosition(sprite: PIXI.Container, hex: Axial): void {
  const pos = axialToScreen(hex);
  sprite.position.set(pos.x, pos.y);
}
