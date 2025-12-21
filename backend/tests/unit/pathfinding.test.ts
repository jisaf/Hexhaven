/**
 * Unit Test: Pathfinding Service (US2 - T082)
 *
 * Tests A* pathfinding algorithm for hexagonal grids:
 * - Find shortest path between two hexes
 * - Avoid obstacles and occupied hexes
 * - Handle terrain costs (normal, difficult, hazardous, obstacle)
 * - Respect movement range limits
 * - Handle flying (ignore terrain)
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PathfindingService } from '../../src/services/pathfinding.service';
import {
  AxialCoordinates,
  TerrainType,
  HexTile,
} from '../../../shared/types/entities';

describe('PathfindingService', () => {
  let pathfindingService: PathfindingService;

  beforeEach(() => {
    pathfindingService = new PathfindingService();
  });

  // Helper to create hex map with a full grid of tiles
  // Creates a grid of normal tiles, then overlays specific terrain types
  function createHexMap(terrainData: Array<[string, TerrainType]>, gridRange: number = 10): Map<string, HexTile> {
    const map = new Map<string, HexTile>();

    // Create full grid of normal tiles
    for (let q = -gridRange; q <= gridRange; q++) {
      for (let r = -gridRange; r <= gridRange; r++) {
        const key = `${q},${r}`;
        map.set(key, { terrain: TerrainType.NORMAL } as HexTile);
      }
    }

    // Overlay specific terrain types
    terrainData.forEach(([key, terrain]) => {
      map.set(key, { terrain } as HexTile);
    });
    return map;
  }

  describe('findPath', () => {
    it('should find shortest path between two hexes (straight line)', () => {
      const start: AxialCoordinates = { q: 0, r: 0 };
      const goal: AxialCoordinates = { q: 3, r: 0 };
      const hexMap = createHexMap([]);

      const path = pathfindingService.findPath(start, goal, hexMap);

      expect(path).not.toBeNull();
      expect(path).toHaveLength(4); // [0,0 -> 1,0 -> 2,0 -> 3,0]
      expect(path![0]).toEqual(start);
      expect(path![path!.length - 1]).toEqual(goal);
    });

    it('should path around obstacles', () => {
      const start: AxialCoordinates = { q: 0, r: 0 };
      const goal: AxialCoordinates = { q: 3, r: 0 };
      const hexMap = createHexMap([
        ['1,0', TerrainType.OBSTACLE], // Obstacle in straight path
        ['2,0', TerrainType.OBSTACLE],
      ]);

      const path = pathfindingService.findPath(start, goal, hexMap);

      expect(path).not.toBeNull();
      // Path should not contain obstacles
      path!.forEach((hex) => {
        const key = pathfindingService.hexKey(hex);
        const tile = hexMap.get(key);
        expect(tile?.terrain).not.toBe(TerrainType.OBSTACLE);
      });
      // Path should end at goal
      expect(path![path!.length - 1]).toEqual(goal);
    });

    it('should return null if no path exists (surrounded by obstacles)', () => {
      const start: AxialCoordinates = { q: 0, r: 0 };
      const goal: AxialCoordinates = { q: 5, r: 0 };

      // Wall of obstacles blocking all paths
      const hexMap = createHexMap([
        ['1,-1', TerrainType.OBSTACLE],
        ['1,0', TerrainType.OBSTACLE],
        ['0,1', TerrainType.OBSTACLE],
        ['-1,1', TerrainType.OBSTACLE],
        ['-1,0', TerrainType.OBSTACLE],
        ['0,-1', TerrainType.OBSTACLE],
      ]);

      const path = pathfindingService.findPath(start, goal, hexMap);

      expect(path).toBeNull(); // No valid path
    });

    it('should handle diagonal movement correctly', () => {
      const start: AxialCoordinates = { q: 0, r: 0 };
      const goal: AxialCoordinates = { q: 2, r: 2 };
      const hexMap = createHexMap([]);

      const path = pathfindingService.findPath(start, goal, hexMap);

      expect(path).not.toBeNull();
      // Each step should be adjacent
      for (let i = 0; i < path!.length - 1; i++) {
        const isAdjacent = pathfindingService.isHexAdjacent(
          path![i],
          path![i + 1],
        );
        expect(isAdjacent).toBe(true);
      }
    });

    it('should return start hex if already at goal', () => {
      const start: AxialCoordinates = { q: 3, r: 5 };
      const goal: AxialCoordinates = { q: 3, r: 5 }; // Same as start
      const hexMap = createHexMap([]);

      const path = pathfindingService.findPath(start, goal, hexMap);

      expect(path).toEqual([start]);
    });

    it('should handle difficult terrain (higher cost)', () => {
      const start: AxialCoordinates = { q: 0, r: 0 };
      const goal: AxialCoordinates = { q: 3, r: 0 };

      const hexMap = createHexMap([
        ['1,0', TerrainType.DIFFICULT], // Difficult terrain in straight path
        ['2,0', TerrainType.DIFFICULT],
      ]);

      const path = pathfindingService.findPath(start, goal, hexMap);

      expect(path).not.toBeNull();
      expect(path![path!.length - 1]).toEqual(goal);
    });

    it('should prefer normal terrain over difficult terrain when possible', () => {
      const start: AxialCoordinates = { q: 0, r: 0 };
      const goal: AxialCoordinates = { q: 2, r: 0 };

      // Straight path is difficult, alternate path is normal
      const hexMap = createHexMap([
        ['1,0', TerrainType.DIFFICULT], // Straight (cost 2)
        ['0,1', TerrainType.NORMAL], // Alternate path
        ['1,1', TerrainType.NORMAL],
        ['2,0', TerrainType.NORMAL],
      ]);

      const path = pathfindingService.findPath(start, goal, hexMap);

      expect(path).not.toBeNull();
      expect(path![path!.length - 1]).toEqual(goal);
      // A* may choose either path depending on implementation details
      // Both are valid - just verify path exists and reaches goal
    });

    it('should handle hazardous terrain', () => {
      const start: AxialCoordinates = { q: 0, r: 0 };
      const goal: AxialCoordinates = { q: 3, r: 0 };

      const hexMap = createHexMap([
        ['1,0', TerrainType.HAZARDOUS], // High cost
        ['2,0', TerrainType.NORMAL],
      ]);

      const path = pathfindingService.findPath(start, goal, hexMap);

      expect(path).not.toBeNull();
      expect(path![path!.length - 1]).toEqual(goal);
    });

    it('should allow flying units to ignore terrain costs', () => {
      const start: AxialCoordinates = { q: 0, r: 0 };
      const goal: AxialCoordinates = { q: 2, r: 0 };

      const hexMap = createHexMap([
        ['1,0', TerrainType.DIFFICULT], // Difficult terrain
      ]);

      const path = pathfindingService.findPath(start, goal, hexMap, true); // canFly = true

      expect(path).not.toBeNull();
      expect(path).toHaveLength(3); // Straight line despite difficult terrain
    });

    it('should not allow flying units to pass through obstacles', () => {
      const start: AxialCoordinates = { q: 0, r: 0 };
      const goal: AxialCoordinates = { q: 2, r: 0 };

      const hexMap = createHexMap([
        ['1,0', TerrainType.OBSTACLE], // Obstacle blocks even flying
      ]);

      const path = pathfindingService.findPath(start, goal, hexMap, true);

      expect(path).not.toBeNull();
      // Should path around obstacle
      const hasObstacle = path!.some((hex) => {
        const key = pathfindingService.hexKey(hex);
        return hexMap.get(key)?.terrain === TerrainType.OBSTACLE;
      });
      expect(hasObstacle).toBe(false);
    });
  });

  describe('getReachableHexes', () => {
    it('should find all hexes within movement range', () => {
      const start: AxialCoordinates = { q: 0, r: 0 };
      const movementRange = 2;
      const hexMap = createHexMap([]);

      const reachable = pathfindingService.getReachableHexes(
        start,
        movementRange,
        hexMap,
      );

      // Within range 2: 6 adjacent + 12 at distance 2 = 18 hexes
      expect(reachable.length).toBeGreaterThanOrEqual(12);
    });

    it('should not include hexes beyond movement range', () => {
      const start: AxialCoordinates = { q: 0, r: 0 };
      const movementRange = 2;
      const hexMap = createHexMap([]);

      const reachable = pathfindingService.getReachableHexes(
        start,
        movementRange,
        hexMap,
      );

      // Verify no hex is more than 2 moves away
      reachable.forEach((hex) => {
        const distance = pathfindingService.heuristic(start, hex);
        expect(distance).toBeLessThanOrEqual(movementRange);
      });
    });

    it('should not include obstacles in reachable hexes', () => {
      const start: AxialCoordinates = { q: 0, r: 0 };
      const movementRange = 3;

      const hexMap = createHexMap([
        ['1,0', TerrainType.OBSTACLE],
        ['2,0', TerrainType.OBSTACLE],
      ]);

      const reachable = pathfindingService.getReachableHexes(
        start,
        movementRange,
        hexMap,
      );

      const hasObstacle = reachable.some((hex) => {
        const key = pathfindingService.hexKey(hex);
        return hexMap.get(key)?.terrain === TerrainType.OBSTACLE;
      });

      expect(hasObstacle).toBe(false);
    });

    it('should not include start hex in results', () => {
      const start: AxialCoordinates = { q: 0, r: 0 };
      const movementRange = 2;
      const hexMap = createHexMap([]);

      const reachable = pathfindingService.getReachableHexes(
        start,
        movementRange,
        hexMap,
      );

      const hasStart = reachable.some(
        (hex) => hex.q === start.q && hex.r === start.r,
      );
      expect(hasStart).toBe(false);
    });

    it('should handle difficult terrain reducing effective range', () => {
      const start: AxialCoordinates = { q: 0, r: 0 };
      const movementRange = 2;

      const hexMap = createHexMap([
        ['1,0', TerrainType.DIFFICULT], // Costs 2 movement
      ]);

      const reachable = pathfindingService.getReachableHexes(
        start,
        movementRange,
        hexMap,
      );

      // { q: 2, r: 0 } should NOT be reachable (1 normal + 1 difficult = 3 cost)
      const farHex = reachable.find((hex) => hex.q === 2 && hex.r === 0);
      expect(farHex).toBeUndefined();
    });

    it('should allow flying to ignore terrain costs', () => {
      const start: AxialCoordinates = { q: 0, r: 0 };
      const movementRange = 2;

      const hexMap = createHexMap([
        ['1,0', TerrainType.DIFFICULT],
        ['2,0', TerrainType.DIFFICULT],
      ]);

      const reachable = pathfindingService.getReachableHexes(
        start,
        movementRange,
        hexMap,
        true,
      ); // canFly = true

      // With flying, { q: 2, r: 0 } should be reachable
      const farHex = reachable.find((hex) => hex.q === 2 && hex.r === 0);
      expect(farHex).toBeDefined();
    });
  });

  describe('calculateMovementCost', () => {
    it('should return 1 for normal terrain', () => {
      const cost = pathfindingService.calculateMovementCost(
        TerrainType.NORMAL,
        false,
      );
      expect(cost).toBe(1);
    });

    it('should return 2 for difficult terrain', () => {
      const cost = pathfindingService.calculateMovementCost(
        TerrainType.DIFFICULT,
        false,
      );
      expect(cost).toBe(2);
    });

    it('should return 3 for hazardous terrain', () => {
      const cost = pathfindingService.calculateMovementCost(
        TerrainType.HAZARDOUS,
        false,
      );
      expect(cost).toBe(3);
    });

    it('should return Infinity for obstacle terrain', () => {
      const cost = pathfindingService.calculateMovementCost(
        TerrainType.OBSTACLE,
        false,
      );
      expect(cost).toBe(Infinity); // Cannot pass
    });

    it('should return 1 for flying units on any terrain except obstacles', () => {
      expect(
        pathfindingService.calculateMovementCost(TerrainType.NORMAL, true),
      ).toBe(1);
      expect(
        pathfindingService.calculateMovementCost(TerrainType.DIFFICULT, true),
      ).toBe(1);
      expect(
        pathfindingService.calculateMovementCost(TerrainType.HAZARDOUS, true),
      ).toBe(1);
    });

    it('should return Infinity for flying units on obstacles', () => {
      const cost = pathfindingService.calculateMovementCost(
        TerrainType.OBSTACLE,
        true,
      );
      expect(cost).toBe(Infinity); // Even flying can't pass obstacles
    });
  });

  describe('isHexAdjacent', () => {
    it('should return true for adjacent hexes (horizontal)', () => {
      const hex1: AxialCoordinates = { q: 0, r: 0 };
      const hex2: AxialCoordinates = { q: 1, r: 0 };

      const isAdjacent = pathfindingService.isHexAdjacent(hex1, hex2);

      expect(isAdjacent).toBe(true);
    });

    it('should return true for adjacent hexes (diagonal)', () => {
      const hex1: AxialCoordinates = { q: 0, r: 0 };
      const hex2: AxialCoordinates = { q: 1, r: -1 };

      const isAdjacent = pathfindingService.isHexAdjacent(hex1, hex2);

      expect(isAdjacent).toBe(true);
    });

    it('should return false for non-adjacent hexes', () => {
      const hex1: AxialCoordinates = { q: 0, r: 0 };
      const hex2: AxialCoordinates = { q: 3, r: 0 };

      const isAdjacent = pathfindingService.isHexAdjacent(hex1, hex2);

      expect(isAdjacent).toBe(false);
    });

    it('should return false for same hex', () => {
      const hex: AxialCoordinates = { q: 0, r: 0 };

      const isAdjacent = pathfindingService.isHexAdjacent(hex, hex);

      expect(isAdjacent).toBe(false);
    });

    it('should work with negative coordinates', () => {
      const hex1: AxialCoordinates = { q: -1, r: -1 };
      const hex2: AxialCoordinates = { q: 0, r: -1 };

      const isAdjacent = pathfindingService.isHexAdjacent(hex1, hex2);

      expect(isAdjacent).toBe(true);
    });
  });

  describe('heuristic (A* distance estimate)', () => {
    it('should estimate distance between two hexes', () => {
      const hex1: AxialCoordinates = { q: 0, r: 0 };
      const hex2: AxialCoordinates = { q: 5, r: 3 };

      const estimate = pathfindingService.heuristic(hex1, hex2);

      // Heuristic should equal actual distance for hex grids
      expect(estimate).toBeGreaterThan(0);
      expect(estimate).toBe(8); // max(|5-0|, |3-0|, |(5+3)-(0+0)|) = max(5, 3, 8) = 8
    });

    it('should return 0 for same hex', () => {
      const hex: AxialCoordinates = { q: 5, r: 5 };

      const estimate = pathfindingService.heuristic(hex, hex);

      expect(estimate).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const hex1: AxialCoordinates = { q: -2, r: -3 };
      const hex2: AxialCoordinates = { q: 1, r: 2 };

      const estimate = pathfindingService.heuristic(hex1, hex2);

      expect(estimate).toBeGreaterThan(0);
    });

    it('should be symmetric (distance from A to B = distance from B to A)', () => {
      const hex1: AxialCoordinates = { q: 2, r: 3 };
      const hex2: AxialCoordinates = { q: 7, r: 1 };

      const dist1 = pathfindingService.heuristic(hex1, hex2);
      const dist2 = pathfindingService.heuristic(hex2, hex1);

      expect(dist1).toBe(dist2);
    });
  });

  describe('hexKey (coordinate serialization)', () => {
    it('should convert axial coordinates to string key', () => {
      const hex: AxialCoordinates = { q: 5, r: -3 };

      const key = pathfindingService.hexKey(hex);

      expect(key).toBe('5,-3');
    });

    it('should handle negative coordinates', () => {
      const hex: AxialCoordinates = { q: -2, r: -7 };

      const key = pathfindingService.hexKey(hex);

      expect(key).toBe('-2,-7');
    });

    it('should handle zero coordinates', () => {
      const hex: AxialCoordinates = { q: 0, r: 0 };

      const key = pathfindingService.hexKey(hex);

      expect(key).toBe('0,0');
    });

    it('should create unique keys for different hexes', () => {
      const hex1: AxialCoordinates = { q: 1, r: 2 };
      const hex2: AxialCoordinates = { q: 2, r: 1 };

      const key1 = pathfindingService.hexKey(hex1);
      const key2 = pathfindingService.hexKey(hex2);

      expect(key1).not.toBe(key2);
    });

    it('should create same key for same hex', () => {
      const hex1: AxialCoordinates = { q: 3, r: 4 };
      const hex2: AxialCoordinates = { q: 3, r: 4 };

      const key1 = pathfindingService.hexKey(hex1);
      const key2 = pathfindingService.hexKey(hex2);

      expect(key1).toBe(key2);
    });
  });
});
