/**
 * Forced Movement Service
 * Handles push, pull, and other forced movement mechanics
 * Validates movement paths and applies terrain effects
 *
 * Updated for Issue #220 - works with existing services
 */

import { Injectable, Optional } from '@nestjs/common';
import {
  AxialCoordinates,
  TerrainType,
  HexFeature,
  HexFeatureType,
} from '../../../shared/types/entities';
import { Character } from '../models/character.model';
import { PathfindingService } from './pathfinding.service';
import { hexDistance, hexNeighbors, hexKey } from '../utils/hex-utils';

export interface MovementResult {
  success: boolean;
  finalPosition: AxialCoordinates;
  stoppedBy?: string; // Entity or obstacle that stopped movement
  damageApplied?: number;
  terrainEffects?: string[];
}

// Simplified hex representation for forced movement
interface HexInfo {
  terrainType?: TerrainType;
  features?: HexFeature[];
}

@Injectable()
export class ForcedMovementService {
  constructor(@Optional() private pathfinding: PathfindingService) {}

  /**
   * Apply a push effect to a target
   * Moves target away from source in a straight line
   */
  applyPush(
    source: Character,
    target: Character,
    distance: number,
    direction?: 'away' | 'direct',
  ): MovementResult {
    direction = direction || 'away';

    // Calculate push direction
    const pushDirection = this.calculatePushDirection(
      source.position,
      target.position,
      direction,
    );

    // Apply movement
    return this.applyForcedMovement(target, pushDirection, distance);
  }

  /**
   * Apply a pull effect to a target
   * Moves target toward source in a straight line
   */
  applyPull(
    source: Character,
    target: Character,
    distance: number,
  ): MovementResult {
    // Calculate pull direction (toward source)
    const pullDirection = this.calculatePullDirection(
      source.position,
      target.position,
    );

    // Apply movement
    return this.applyForcedMovement(target, pullDirection, distance);
  }

  /**
   * Apply forced movement in a specific direction
   * Stops when hitting obstacles or other entities
   */
  private applyForcedMovement(
    target: Character,
    direction: { q: number; r: number },
    distance: number,
  ): MovementResult {
    const result: MovementResult = {
      success: true,
      finalPosition: target.position,
      terrainEffects: [],
    };

    let currentPos = { ...target.position };
    let hexesMoved = 0;

    // Move one hex at a time until we hit an obstacle or reach distance
    for (let i = 0; i < distance; i++) {
      const nextPos = {
        q: currentPos.q + direction.q,
        r: currentPos.r + direction.r,
      };

      // For now, assume all movement is valid (game gateway will validate)
      // In a full implementation, this would check the game state

      // Move to this hex
      currentPos = nextPos;
      hexesMoved++;
    }

    result.finalPosition = currentPos;

    // Update target position
    if (hexesMoved > 0) {
      target.moveTo(result.finalPosition);
    }

    return result;
  }

  /**
   * Calculate normalized direction vector between two positions
   * Returns a unit vector in axial coordinates pointing from 'from' to 'to'
   */
  private calculateDirectionVector(
    from: AxialCoordinates,
    to: AxialCoordinates,
  ): { q: number; r: number } {
    const dq = to.q - from.q;
    const dr = to.r - from.r;

    // Handle zero movement case
    if (dq === 0 && dr === 0) {
      return { q: 0, r: 0 };
    }

    // Normalize to single hex direction
    const absQ = Math.abs(dq);
    const absR = Math.abs(dr);

    if (absQ > absR) {
      return { q: dq > 0 ? 1 : -1, r: 0 };
    } else if (absR > absQ) {
      return { q: 0, r: dr > 0 ? 1 : -1 };
    } else {
      // Diagonal direction - choose based on magnitude
      return { q: dq > 0 ? 1 : -1, r: dr > 0 ? 1 : -1 };
    }
  }

  /**
   * Calculate direction vector for push (away from source)
   */
  private calculatePushDirection(
    sourcePos: AxialCoordinates,
    targetPos: AxialCoordinates,
    direction: 'away' | 'direct',
  ): { q: number; r: number } {
    if (direction === 'direct') {
      // Push in a specific cardinal direction (not implemented yet)
      return { q: 0, r: 0 };
    }

    // Push = direction from source to target (away from source)
    return this.calculateDirectionVector(sourcePos, targetPos);
  }

  /**
   * Calculate direction vector for pull (toward source)
   */
  private calculatePullDirection(
    sourcePos: AxialCoordinates,
    targetPos: AxialCoordinates,
  ): { q: number; r: number } {
    // Pull = direction from target to source (toward source)
    return this.calculateDirectionVector(targetPos, sourcePos);
  }

  /**
   * Check if a hex is walkable (not an obstacle wall)
   */
  isWalkableHex(hex: HexInfo | null): boolean {
    if (!hex) {
      return false; // Hex doesn't exist
    }

    // Obstacles and walls are not walkable
    if (hex.terrainType === TerrainType.OBSTACLE) {
      return false;
    }

    // Check for wall features
    if (
      hex.features &&
      hex.features.some((f: HexFeature) => f.type === HexFeatureType.WALL)
    ) {
      return false;
    }

    return true;
  }

  /**
   * Apply terrain effects (traps, hazardous terrain)
   * Returns damage dealt
   */
  applyTerrainEffects(hex: HexInfo | null): number {
    if (!hex) {
      return 0;
    }

    let damage = 0;

    // Check terrain type
    if (hex.terrainType === TerrainType.HAZARDOUS) {
      damage += 1; // Hazardous terrain deals 1 damage
    }

    // Check for trap features
    if (hex.features) {
      const traps = hex.features.filter(
        (f: HexFeature) => f.type === HexFeatureType.TRAP,
      );
      damage += traps.length; // Each trap deals 1 damage
    }

    return damage;
  }

  /**
   * Validate a forced movement path
   * Checks if target can be pushed distance hexes in direction
   */
  validateForcedMovementPath(
    targetPos: AxialCoordinates,
    direction: { q: number; r: number },
    distance: number,
    getHex: (pos: AxialCoordinates) => HexInfo | null,
    isOccupied: (pos: AxialCoordinates) => boolean,
  ): { valid: boolean; validDistance: number } {
    let currentPos = { ...targetPos };
    let validDistance = 0;

    for (let i = 0; i < distance; i++) {
      const nextPos = {
        q: currentPos.q + direction.q,
        r: currentPos.r + direction.r,
      };

      const hex = getHex(nextPos);
      const isWalkable = this.isWalkableHex(hex);
      const occupied = isOccupied(nextPos);

      if (!isWalkable || occupied) {
        break;
      }

      currentPos = nextPos;
      validDistance++;
    }

    return {
      valid: validDistance > 0,
      validDistance,
    };
  }

  /**
   * Get all valid hexes for forced movement (single direction - legacy)
   * Used for visualization/validation
   */
  getValidForcedMovementHexes(
    targetPos: AxialCoordinates,
    direction: { q: number; r: number },
    distance: number,
    getHex: (pos: AxialCoordinates) => HexInfo | null,
    isOccupied: (pos: AxialCoordinates) => boolean,
  ): AxialCoordinates[] {
    const hexes: AxialCoordinates[] = [];
    let currentPos = { ...targetPos };

    for (let i = 0; i < distance; i++) {
      const nextPos = {
        q: currentPos.q + direction.q,
        r: currentPos.r + direction.r,
      };

      const hex = getHex(nextPos);
      const isWalkable = this.isWalkableHex(hex);
      const occupied = isOccupied(nextPos);

      if (!isWalkable || occupied) {
        break;
      }

      hexes.push(nextPos);
      currentPos = nextPos;
    }

    return hexes;
  }

  /**
   * Get ALL valid destination hexes for player-controlled forced movement.
   * Uses BFS to find all reachable hexes that satisfy the direction constraint.
   *
   * For push: each step must be FARTHER from attacker
   * For pull: each step must be CLOSER to attacker
   *
   * @param attackerPos - Position of the attacker (source of push/pull)
   * @param targetPos - Current position of the target being pushed/pulled
   * @param distance - Maximum movement distance (push/pull value)
   * @param movementType - 'push' or 'pull'
   * @param getHex - Function to get hex info for walkability check
   * @param isOccupied - Function to check if hex is occupied
   * @returns Array of all valid destination hexes
   */
  getAllValidForcedMovementDestinations(
    attackerPos: AxialCoordinates,
    targetPos: AxialCoordinates,
    distance: number,
    movementType: 'push' | 'pull',
    getHex: (pos: AxialCoordinates) => HexInfo | null,
    isOccupied: (pos: AxialCoordinates) => boolean,
  ): AxialCoordinates[] {
    const results: AxialCoordinates[] = [];
    const visited = new Set<string>();

    // BFS queue: each entry tracks position and depth (steps taken)
    const queue: Array<{ pos: AxialCoordinates; depth: number }> = [];

    // Start from target's current position
    visited.add(hexKey(targetPos));
    queue.push({ pos: targetPos, depth: 0 });

    while (queue.length > 0) {
      const { pos: currentPos, depth } = queue.shift()!;

      // Don't explore beyond max distance
      if (depth >= distance) {
        continue;
      }

      const currentDistFromAttacker = hexDistance(attackerPos, currentPos);

      // Check all 6 neighbors
      const neighbors = hexNeighbors(currentPos);
      for (const neighbor of neighbors) {
        const key = hexKey(neighbor);

        // Skip if already visited
        if (visited.has(key)) {
          continue;
        }
        visited.add(key);

        // Check walkability
        const hex = getHex(neighbor);
        if (!this.isWalkableHex(hex)) {
          continue;
        }

        // Check if occupied
        if (isOccupied(neighbor)) {
          continue;
        }

        // Check direction constraint
        const neighborDistFromAttacker = hexDistance(attackerPos, neighbor);

        if (movementType === 'push') {
          // Push: neighbor must be FARTHER from attacker than current
          if (neighborDistFromAttacker <= currentDistFromAttacker) {
            continue;
          }
        } else {
          // Pull: neighbor must be CLOSER to attacker than current
          if (neighborDistFromAttacker >= currentDistFromAttacker) {
            continue;
          }
        }

        // Valid destination - add to results
        results.push({ q: neighbor.q, r: neighbor.r });

        // Continue BFS from this neighbor
        queue.push({ pos: neighbor, depth: depth + 1 });
      }
    }

    return results;
  }

  /**
   * Apply forced movement to a specific destination (player-chosen).
   * Used when player selects a destination hex from valid options.
   */
  applyToDestination(
    target: Character,
    destination: AxialCoordinates,
  ): MovementResult {
    const result: MovementResult = {
      success: true,
      finalPosition: destination,
      terrainEffects: [],
    };

    target.moveTo(destination);

    return result;
  }
}
