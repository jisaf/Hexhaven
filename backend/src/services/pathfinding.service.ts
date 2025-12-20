/**
 * Pathfinding Service (US2 - T092)
 *
 * Implements A* pathfinding for hexagonal grids:
 * - Find shortest path between hexes
 * - Handle terrain costs (normal, difficult, obstacle, hazardous)
 * - Get reachable hexes within movement range
 * - Support flying units (ignore obstacles)
 */

import { Injectable } from '@nestjs/common';
import {
  AxialCoordinates,
  TerrainType,
  HexTile,
} from '../../../shared/types/entities';

interface PathNode {
  hex: AxialCoordinates;
  gCost: number; // Cost from start
  hCost: number; // Heuristic cost to goal
  fCost: number; // gCost + hCost
  parent: PathNode | null;
}

@Injectable()
export class PathfindingService {
  /**
   * Find shortest path between two hexes using A* algorithm
   * @param occupiedHexes - Set of hex keys that are occupied by entities that block movement (enemies)
   */
  findPath(
    start: AxialCoordinates,
    goal: AxialCoordinates,
    hexMap: Map<string, HexTile>,
    canFly = false,
    occupiedHexes?: Set<string>,
  ): AxialCoordinates[] | null {
    // Already at goal
    if (start.q === goal.q && start.r === goal.r) {
      return [start];
    }

    const openSet = new Map<string, PathNode>();
    const closedSet = new Set<string>();

    const startNode: PathNode = {
      hex: start,
      gCost: 0,
      hCost: this.heuristic(start, goal),
      fCost: 0,
      parent: null,
    };
    startNode.fCost = startNode.gCost + startNode.hCost;

    openSet.set(this.hexKey(start), startNode);

    while (openSet.size > 0) {
      // Get node with lowest fCost
      let current: PathNode | null = null;
      let lowestFCost = Infinity;

      for (const node of openSet.values()) {
        if (node.fCost < lowestFCost) {
          lowestFCost = node.fCost;
          current = node;
        }
      }

      if (!current) break;

      // Reached goal
      if (current.hex.q === goal.q && current.hex.r === goal.r) {
        return this.reconstructPath(current);
      }

      openSet.delete(this.hexKey(current.hex));
      closedSet.add(this.hexKey(current.hex));

      // Check neighbors
      const neighbors = this.getAdjacentHexes(current.hex);

      for (const neighborHex of neighbors) {
        const neighborKey = this.hexKey(neighborHex);

        if (closedSet.has(neighborKey)) {
          continue;
        }

        const tile = hexMap.get(neighborKey);

        // CRITICAL: Non-existent tiles are impassable (prevents off-map movement)
        if (!tile) {
          continue;
        }

        const movementCost = this.calculateMovementCost(tile.terrain, canFly);

        // Can't pass through obstacles
        if (movementCost === Infinity) {
          continue;
        }

        // Can't pass through occupied hexes (enemies block movement)
        // Exception: allow moving TO the goal hex even if occupied (for attack positioning checks)
        if (
          occupiedHexes?.has(neighborKey) &&
          !(neighborHex.q === goal.q && neighborHex.r === goal.r)
        ) {
          continue;
        }

        const tentativeGCost = current.gCost + movementCost;

        const existingNeighbor = openSet.get(neighborKey);

        if (!existingNeighbor || tentativeGCost < existingNeighbor.gCost) {
          const neighbor: PathNode = {
            hex: neighborHex,
            gCost: tentativeGCost,
            hCost: this.heuristic(neighborHex, goal),
            fCost: 0,
            parent: current,
          };
          neighbor.fCost = neighbor.gCost + neighbor.hCost;

          openSet.set(neighborKey, neighbor);
        }
      }
    }

    // No path found
    return null;
  }

  /**
   * Get all hexes reachable within movement range
   * @param occupiedHexes - Set of hex keys that are occupied by entities that block movement (enemies)
   */
  getReachableHexes(
    start: AxialCoordinates,
    movementRange: number,
    hexMap: Map<string, HexTile>,
    canFly = false,
    occupiedHexes?: Set<string>,
  ): AxialCoordinates[] {
    const reachable: AxialCoordinates[] = [];
    const visited = new Set<string>();
    const queue: Array<{ hex: AxialCoordinates; costSoFar: number }> = [
      { hex: start, costSoFar: 0 },
    ];

    visited.add(this.hexKey(start));

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.costSoFar > 0) {
        // Don't include start hex
        reachable.push(current.hex);
      }

      const neighbors = this.getAdjacentHexes(current.hex);

      for (const neighborHex of neighbors) {
        const neighborKey = this.hexKey(neighborHex);

        if (visited.has(neighborKey)) {
          continue;
        }

        const tile = hexMap.get(neighborKey);

        // CRITICAL: Non-existent tiles are impassable (prevents off-map movement)
        if (!tile) {
          continue;
        }

        const movementCost = this.calculateMovementCost(tile.terrain, canFly);

        if (movementCost === Infinity) {
          continue;
        }

        // Can't pass through occupied hexes (enemies block movement)
        if (occupiedHexes?.has(neighborKey)) {
          continue;
        }

        const newCost = current.costSoFar + movementCost;

        if (newCost <= movementRange) {
          visited.add(neighborKey);
          queue.push({ hex: neighborHex, costSoFar: newCost });
        }
      }
    }

    return reachable;
  }

  /**
   * Calculate movement cost based on terrain type
   */
  calculateMovementCost(terrain: TerrainType, canFly: boolean): number {
    if (canFly && terrain !== TerrainType.OBSTACLE) {
      return 1; // Flying ignores terrain except obstacles
    }

    switch (terrain) {
      case TerrainType.NORMAL:
        return 1;
      case TerrainType.DIFFICULT:
        return 2;
      case TerrainType.HAZARDOUS:
        return 3; // High cost but passable
      case TerrainType.OBSTACLE:
        return Infinity; // Impassable
      default:
        return 1;
    }
  }

  /**
   * Check if two hexes are adjacent
   */
  isHexAdjacent(hex1: AxialCoordinates, hex2: AxialCoordinates): boolean {
    const dq = Math.abs(hex1.q - hex2.q);
    const dr = Math.abs(hex1.r - hex2.r);
    const ds = Math.abs(hex1.q + hex1.r - (hex2.q + hex2.r));

    // Adjacent hexes have distance exactly 1
    return Math.max(dq, dr, ds) === 1;
  }

  /**
   * Heuristic function for A* (Manhattan distance for hex grids)
   */
  heuristic(hex1: AxialCoordinates, hex2: AxialCoordinates): number {
    const dq = Math.abs(hex1.q - hex2.q);
    const dr = Math.abs(hex1.r - hex2.r);
    const ds = Math.abs(hex1.q + hex1.r - (hex2.q + hex2.r));
    return Math.max(dq, dr, ds);
  }

  /**
   * Reconstruct path from A* parent chain
   */
  reconstructPath(node: PathNode): AxialCoordinates[] {
    const path: AxialCoordinates[] = [];
    let current: PathNode | null = node;

    while (current !== null) {
      path.unshift(current.hex);
      current = current.parent;
    }

    return path;
  }

  /**
   * Convert hex coordinates to string key for map lookups
   */
  hexKey(hex: AxialCoordinates): string {
    return `${hex.q},${hex.r}`;
  }

  /**
   * Get all adjacent hexes (6 neighbors)
   */
  private getAdjacentHexes(hex: AxialCoordinates): AxialCoordinates[] {
    return [
      { q: hex.q + 1, r: hex.r },
      { q: hex.q - 1, r: hex.r },
      { q: hex.q, r: hex.r + 1 },
      { q: hex.q, r: hex.r - 1 },
      { q: hex.q + 1, r: hex.r - 1 },
      { q: hex.q - 1, r: hex.r + 1 },
    ];
  }
}
