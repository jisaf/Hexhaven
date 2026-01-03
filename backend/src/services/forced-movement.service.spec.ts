/**
 * Forced Movement Service Unit Tests
 *
 * Tests for push/pull forced movement mechanics:
 * - getAllValidForcedMovementDestinations (BFS algorithm)
 * - applyToDestination
 * - Direction constraint validation (push = farther, pull = closer)
 * - Obstacle and occupied hex handling
 */

import { ForcedMovementService } from './forced-movement.service';
import { AxialCoordinates } from '../../../shared/types/entities';
import { Character } from '../models/character.model';

// Create a mock Character with position setter
const createMockCharacter = (position: AxialCoordinates): Character => {
  const char = {
    position: { ...position },
    currentHex: { ...position },
    moveTo: jest.fn((newPos: AxialCoordinates) => {
      char.position = { ...newPos };
      char.currentHex = { ...newPos };
    }),
  } as unknown as Character;
  return char;
};

// Create mock hex info for passable terrain
const createWalkableHex = () => ({
  terrainType: 'normal' as const,
  features: [],
});

// Create mock hex info for obstacle terrain
const createObstacleHex = () => ({
  terrainType: 'obstacle' as const,
  features: [],
});

describe('ForcedMovementService', () => {
  let service: ForcedMovementService;

  beforeEach(() => {
    service = new ForcedMovementService();
  });

  describe('getAllValidForcedMovementDestinations', () => {
    describe('push (target must move farther from attacker)', () => {
      it('should return valid destinations for push 1 on open terrain', () => {
        const attackerPos: AxialCoordinates = { q: 0, r: 0 };
        const targetPos: AxialCoordinates = { q: 1, r: 0 };
        const distance = 1;

        // All hexes are walkable, none occupied
        const getHex = () => createWalkableHex();
        const isOccupied = () => false;

        const destinations = service.getAllValidForcedMovementDestinations(
          attackerPos,
          targetPos,
          distance,
          'push',
          getHex,
          isOccupied,
        );

        // Target is at (1,0). Push 1 means destinations must be distance 2 from attacker
        // Valid neighbors of (1,0) that are farther from (0,0): (2,0), (1,1), (2,-1)
        expect(destinations.length).toBeGreaterThan(0);

        // All destinations should be farther from attacker than target
        const targetDist = Math.abs(targetPos.q) + Math.abs(targetPos.r);
        destinations.forEach(dest => {
          const destDist = Math.abs(dest.q) + Math.abs(dest.r);
          expect(destDist).toBeGreaterThan(targetDist);
        });
      });

      it('should return valid destinations for push 2 on open terrain', () => {
        const attackerPos: AxialCoordinates = { q: 0, r: 0 };
        const targetPos: AxialCoordinates = { q: 1, r: 0 };
        const distance = 2;

        const getHex = () => createWalkableHex();
        const isOccupied = () => false;

        const destinations = service.getAllValidForcedMovementDestinations(
          attackerPos,
          targetPos,
          distance,
          'push',
          getHex,
          isOccupied,
        );

        // Push 2 should have destinations up to 2 hexes away from target
        expect(destinations.length).toBeGreaterThan(0);

        // Should include destinations at various distances
        const hasDistanceOne = destinations.some(d =>
          Math.abs(d.q - targetPos.q) + Math.abs(d.r - targetPos.r) === 1 ||
          Math.abs(d.q - targetPos.q) === 1 && Math.abs(d.r - targetPos.r) === 0
        );
        const hasDistanceTwo = destinations.some(d =>
          Math.abs(d.q - targetPos.q) + Math.abs(d.r - targetPos.r) >= 2
        );
        expect(hasDistanceOne || hasDistanceTwo).toBe(true);
      });

      it('should exclude blocked hexes from destinations', () => {
        const attackerPos: AxialCoordinates = { q: 0, r: 0 };
        const targetPos: AxialCoordinates = { q: 1, r: 0 };
        const distance = 1;

        // Make (2,0) an obstacle
        const getHex = (pos: AxialCoordinates) => {
          if (pos.q === 2 && pos.r === 0) return createObstacleHex();
          return createWalkableHex();
        };
        const isOccupied = () => false;

        const destinations = service.getAllValidForcedMovementDestinations(
          attackerPos,
          targetPos,
          distance,
          'push',
          getHex,
          isOccupied,
        );

        // (2,0) should NOT be in destinations
        const has_2_0 = destinations.some(d => d.q === 2 && d.r === 0);
        expect(has_2_0).toBe(false);
      });

      it('should exclude occupied hexes from destinations', () => {
        const attackerPos: AxialCoordinates = { q: 0, r: 0 };
        const targetPos: AxialCoordinates = { q: 1, r: 0 };
        const distance = 1;

        const getHex = () => createWalkableHex();
        // (2,0) is occupied
        const isOccupied = (pos: AxialCoordinates) => pos.q === 2 && pos.r === 0;

        const destinations = service.getAllValidForcedMovementDestinations(
          attackerPos,
          targetPos,
          distance,
          'push',
          getHex,
          isOccupied,
        );

        // (2,0) should NOT be in destinations
        const has_2_0 = destinations.some(d => d.q === 2 && d.r === 0);
        expect(has_2_0).toBe(false);
      });

      it('should return empty array when completely blocked', () => {
        const attackerPos: AxialCoordinates = { q: 0, r: 0 };
        const targetPos: AxialCoordinates = { q: 1, r: 0 };
        const distance = 1;

        // All adjacent hexes are obstacles
        const getHex = (pos: AxialCoordinates) => {
          if (pos.q === targetPos.q && pos.r === targetPos.r) return createWalkableHex();
          return createObstacleHex();
        };
        const isOccupied = () => false;

        const destinations = service.getAllValidForcedMovementDestinations(
          attackerPos,
          targetPos,
          distance,
          'push',
          getHex,
          isOccupied,
        );

        expect(destinations).toEqual([]);
      });
    });

    describe('pull (target must move closer to attacker)', () => {
      it('should return valid destinations for pull 1 on open terrain', () => {
        const attackerPos: AxialCoordinates = { q: 0, r: 0 };
        const targetPos: AxialCoordinates = { q: 2, r: 0 };
        const distance = 1;

        const getHex = () => createWalkableHex();
        const isOccupied = () => false;

        const destinations = service.getAllValidForcedMovementDestinations(
          attackerPos,
          targetPos,
          distance,
          'pull',
          getHex,
          isOccupied,
        );

        expect(destinations.length).toBeGreaterThan(0);

        // All destinations should be closer to attacker than target
        // Target is 2 away from attacker, destinations should be 1 away
        destinations.forEach(dest => {
          const destDist = Math.abs(dest.q - attackerPos.q) + Math.abs(dest.r - attackerPos.r);
          const targetDist = Math.abs(targetPos.q - attackerPos.q) + Math.abs(targetPos.r - attackerPos.r);
          expect(destDist).toBeLessThan(targetDist);
        });
      });

      it('should return valid destinations for pull 2 on open terrain', () => {
        const attackerPos: AxialCoordinates = { q: 0, r: 0 };
        const targetPos: AxialCoordinates = { q: 3, r: 0 };
        const distance = 2;

        const getHex = () => createWalkableHex();
        const isOccupied = () => false;

        const destinations = service.getAllValidForcedMovementDestinations(
          attackerPos,
          targetPos,
          distance,
          'pull',
          getHex,
          isOccupied,
        );

        expect(destinations.length).toBeGreaterThan(0);
      });

      it('should not allow pull into attackers position', () => {
        const attackerPos: AxialCoordinates = { q: 0, r: 0 };
        const targetPos: AxialCoordinates = { q: 1, r: 0 };
        const distance = 1;

        const getHex = () => createWalkableHex();
        // Attacker position is occupied (by attacker)
        const isOccupied = (pos: AxialCoordinates) => pos.q === 0 && pos.r === 0;

        const destinations = service.getAllValidForcedMovementDestinations(
          attackerPos,
          targetPos,
          distance,
          'pull',
          getHex,
          isOccupied,
        );

        // Should not include attacker's position
        const hasAttackerPos = destinations.some(d => d.q === 0 && d.r === 0);
        expect(hasAttackerPos).toBe(false);
      });
    });
  });

  describe('applyToDestination', () => {
    it('should move target to destination and return success', () => {
      const target = createMockCharacter({ q: 1, r: 0 });
      const destination: AxialCoordinates = { q: 2, r: 0 };

      const result = service.applyToDestination(target, destination);

      expect(result.success).toBe(true);
      expect(result.finalPosition).toEqual(destination);
      expect(target.moveTo).toHaveBeenCalledWith(destination);
    });

    it('should update target position correctly', () => {
      const target = createMockCharacter({ q: 1, r: 0 });
      const destination: AxialCoordinates = { q: 3, r: -1 };

      service.applyToDestination(target, destination);

      expect(target.position).toEqual(destination);
    });
  });
});
