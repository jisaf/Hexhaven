/**
 * Hex Coordinate Utilities
 *
 * Implements axial and cube coordinate systems for hexagonal grid operations.
 * Based on Red Blob Games hex grid guide: https://www.redblobgames.com/grids/hexagons/
 */

/**
 * Axial coordinates (q, r) - used for storage
 * q: column coordinate
 * r: row coordinate
 */
export interface AxialCoord {
  q: number;
  r: number;
}

/**
 * Cube coordinates (q, r, s) - used for algorithms
 * Constraint: q + r + s = 0
 */
export interface CubeCoord {
  q: number;
  r: number;
  s: number;
}

/**
 * Convert axial coordinates to cube coordinates
 */
export function axialToCube(axial: AxialCoord): CubeCoord {
  return {
    q: axial.q,
    r: axial.r,
    s: -axial.q - axial.r,
  };
}

/**
 * Convert cube coordinates to axial coordinates
 */
export function cubeToAxial(cube: CubeCoord): AxialCoord {
  return {
    q: cube.q,
    r: cube.r,
  };
}

/**
 * Calculate distance between two hexes using cube coordinates
 */
export function cubeDistance(a: CubeCoord, b: CubeCoord): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.s - b.s)) / 2;
}

/**
 * Calculate distance between two hexes using axial coordinates
 */
export function hexDistance(a: AxialCoord, b: AxialCoord): number {
  const cubeA = axialToCube(a);
  const cubeB = axialToCube(b);
  return cubeDistance(cubeA, cubeB);
}

/**
 * Directions for hex neighbors (flat-top orientation)
 */
const HEX_DIRECTIONS: AxialCoord[] = [
  { q: 1, r: 0 },   // East
  { q: 1, r: -1 },  // Northeast
  { q: 0, r: -1 },  // Northwest
  { q: -1, r: 0 },  // West
  { q: -1, r: 1 },  // Southwest
  { q: 0, r: 1 },   // Southeast
];

/**
 * Add two axial coordinates
 */
function hexAdd(a: AxialCoord, b: AxialCoord): AxialCoord {
  return { q: a.q + b.q, r: a.r + b.r };
}

/**
 * Get all six neighbors of a hex
 */
export function hexNeighbors(hex: AxialCoord): AxialCoord[] {
  return HEX_DIRECTIONS.map(dir => hexAdd(hex, dir));
}

/**
 * Get a specific neighbor by direction index (0-5)
 */
export function hexNeighbor(hex: AxialCoord, direction: number): AxialCoord {
  const normalizedDir = ((direction % 6) + 6) % 6; // Handle negative indices
  return hexAdd(hex, HEX_DIRECTIONS[normalizedDir]);
}

/**
 * Get all hexes within a given range (inclusive)
 */
export function hexRange(center: AxialCoord, range: number): AxialCoord[] {
  const results: AxialCoord[] = [];

  for (let q = -range; q <= range; q++) {
    const r1 = Math.max(-range, -q - range);
    const r2 = Math.min(range, -q + range);

    for (let r = r1; r <= r2; r++) {
      results.push({
        q: center.q + q,
        r: center.r + r,
      });
    }
  }

  return results;
}

/**
 * Check if two hexes are equal
 */
export function hexEqual(a: AxialCoord, b: AxialCoord): boolean {
  return a.q === b.q && a.r === b.r;
}

/**
 * Generate a unique string key for a hex coordinate (for use in Maps/Sets)
 */
export function hexKey(hex: AxialCoord): string {
  return `${hex.q},${hex.r}`;
}

/**
 * Parse a hex key back to axial coordinates
 */
export function parseHexKey(key: string): AxialCoord | null {
  const parts = key.split(',');
  if (parts.length !== 2) return null;

  const q = parseInt(parts[0], 10);
  const r = parseInt(parts[1], 10);

  if (isNaN(q) || isNaN(r)) return null;

  return { q, r };
}

/**
 * Round fractional cube coordinates to nearest hex
 */
function cubeRound(cube: { q: number; r: number; s: number }): CubeCoord {
  let q = Math.round(cube.q);
  let r = Math.round(cube.r);
  let s = Math.round(cube.s);

  const qDiff = Math.abs(q - cube.q);
  const rDiff = Math.abs(r - cube.r);
  const sDiff = Math.abs(s - cube.s);

  if (qDiff > rDiff && qDiff > sDiff) {
    q = -r - s;
  } else if (rDiff > sDiff) {
    r = -q - s;
  } else {
    s = -q - r;
  }

  return { q, r, s };
}

/**
 * Round fractional axial coordinates to nearest hex
 */
export function hexRound(hex: { q: number; r: number }): AxialCoord {
  const cube = axialToCube(hex);
  const rounded = cubeRound(cube);
  return cubeToAxial(rounded);
}

/**
 * Linear interpolation between two hexes
 */
export function hexLerp(a: AxialCoord, b: AxialCoord, t: number): { q: number; r: number } {
  return {
    q: a.q * (1 - t) + b.q * t,
    r: a.r * (1 - t) + b.r * t,
  };
}

/**
 * Get line of hexes from a to b (includes both endpoints)
 */
export function hexLine(a: AxialCoord, b: AxialCoord): AxialCoord[] {
  const distance = hexDistance(a, b);
  const results: AxialCoord[] = [];

  for (let i = 0; i <= distance; i++) {
    const t = distance === 0 ? 0 : i / distance;
    results.push(hexRound(hexLerp(a, b, t)));
  }

  return results;
}

/**
 * Check if a hex is within a given range of a center hex
 */
export function hexInRange(hex: AxialCoord, center: AxialCoord, range: number): boolean {
  return hexDistance(hex, center) <= range;
}

/**
 * Get ring of hexes at exact distance from center
 */
export function hexRing(center: AxialCoord, radius: number): AxialCoord[] {
  if (radius === 0) return [center];

  const results: AxialCoord[] = [];

  // Start at the "west" hex at the given radius
  let hex = hexAdd(center, { q: -radius, r: 0 });

  // Walk around the ring in 6 directions
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < radius; j++) {
      results.push({ ...hex });
      hex = hexNeighbor(hex, i);
    }
  }

  return results;
}
