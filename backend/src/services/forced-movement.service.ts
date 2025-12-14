/**
 * Forced Movement Service
 * Handles push, pull, and other forced movement mechanics
 * Validates movement paths and applies terrain effects
 */

import { Injectable } from '@nestjs/common';
import { AxialCoordinates, CubeCoordinates, TerrainType } from '../../../shared/types/entities';
import { Character } from '../models/character.model';
import { PathfindingService } from './pathfinding.service';
import { GameStateManager } from './game-state.service';

export interface MovementResult {
  success: boolean;
  finalPosition: AxialCoordinates;
  stoppedBy?: string; // Entity or obstacle that stopped movement
  damageApplied?: number;
  terrainEffects?: string[];
}

@Injectable()
export class ForcedMovementService {
  constructor(
    private pathfinding: PathfindingService,
    private gameState: GameStateManager,
  ) {}

  /**
   * Apply a push effect to a target
   * Moves target away from source in a straight line
   */
  async applyPush(
    source: Character,
    target: Character,
    distance: number,
    direction?: 'away' | 'direct',
  ): Promise<MovementResult> {
    direction = direction || 'away';

    // Calculate push direction
    const pushDirection = this.calculatePushDirection(source.position, target.position, direction);

    // Apply movement
    return this.applyForcedMovement(target, pushDirection, distance);
  }

  /**
   * Apply a pull effect to a target
   * Moves target toward source in a straight line
   */
  async applyPull(
    source: Character,
    target: Character,
    distance: number,
  ): Promise<MovementResult> {
    // Calculate pull direction (toward source)
    const pullDirection = this.calculatePullDirection(source.position, target.position);

    // Apply movement
    return this.applyForcedMovement(target, pullDirection, distance);
  }

  /**
   * Apply forced movement in a specific direction
   * Stops when hitting obstacles or other entities
   */
  private async applyForcedMovement(
    target: Character,
    direction: { q: number; r: number },
    distance: number,
  ): Promise<MovementResult> {
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

      // Check if hex is valid
      const isWalkable = await this.isWalkableHex(nextPos);
      if (!isWalkable) {
        result.stoppedBy = 'obstacle';
        break;
      }

      // Check if hex is occupied
      const occupiedBy = await this.getOccupyingEntity(nextPos);
      if (occupiedBy) {
        result.stoppedBy = occupiedBy;
        break;
      }

      // Move to this hex
      currentPos = nextPos;
      hexesMoved++;

      // Check for terrain effects (traps, hazardous terrain)
      const terrainDamage = await this.applyTerrainEffects(currentPos);
      if (terrainDamage > 0) {
        result.damageApplied = (result.damageApplied || 0) + terrainDamage;
        result.terrainEffects?.push(`trap-damage-${terrainDamage}`);
      }
    }

    result.finalPosition = currentPos;
    return result;
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

    // Calculate direction away from source
    const dq = targetPos.q - sourcePos.q;
    const dr = targetPos.r - sourcePos.r;

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
   * Calculate direction vector for pull (toward source)
   */
  private calculatePullDirection(
    sourcePos: AxialCoordinates,
    targetPos: AxialCoordinates,
  ): { q: number; r: number } {
    const dq = sourcePos.q - targetPos.q;
    const dr = sourcePos.r - targetPos.r;

    // Normalize to single hex direction
    const absQ = Math.abs(dq);
    const absR = Math.abs(dr);

    if (absQ > absR) {
      return { q: dq > 0 ? 1 : -1, r: 0 };
    } else if (absR > absQ) {
      return { q: 0, r: dr > 0 ? 1 : -1 };
    } else {
      // Diagonal direction
      return { q: dq > 0 ? 1 : -1, r: dr > 0 ? 1 : -1 };
    }
  }

  /**
   * Check if a hex is walkable (not an obstacle wall)
   */
  private async isWalkableHex(pos: AxialCoordinates): Promise<boolean> {
    try {
      const hex = await this.gameState.getHex(pos.q, pos.r);
      if (!hex) {
        return false; // Hex doesn't exist
      }

      // Obstacles and walls are not walkable
      if (hex.terrainType === TerrainType.OBSTACLE) {
        return false;
      }

      // Check for wall features
      if (hex.features && hex.features.some((f) => f.type === 'wall')) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a hex is occupied by another entity
   */
  private async getOccupyingEntity(pos: AxialCoordinates): Promise<string | undefined> {
    try {
      const entities = await this.gameState.getEntitiesAt(pos.q, pos.r);
      return entities.length > 0 ? entities[0].id : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Apply terrain effects (traps, hazardous terrain)
   * Returns damage dealt
   */
  private async applyTerrainEffects(pos: AxialCoordinates): Promise<number> {
    try {
      const hex = await this.gameState.getHex(pos.q, pos.r);
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
        const traps = hex.features.filter((f) => f.type === 'trap');
        damage += traps.length; // Each trap deals 1 damage
      }

      return damage;
    } catch {
      return 0;
    }
  }

  /**
   * Validate a forced movement path
   * Checks if target can be pushed distance hexes in direction
   */
  async validateForcedMovementPath(
    target: Character,
    direction: { q: number; r: number },
    distance: number,
  ): Promise<{ valid: boolean; validDistance: number }> {
    let currentPos = { ...target.position };
    let validDistance = 0;

    for (let i = 0; i < distance; i++) {
      const nextPos = {
        q: currentPos.q + direction.q,
        r: currentPos.r + direction.r,
      };

      const isWalkable = await this.isWalkableHex(nextPos);
      const isOccupied = (await this.getOccupyingEntity(nextPos)) !== undefined;

      if (!isWalkable || isOccupied) {
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
   * Get all valid hexes for forced movement
   * Used for visualization/validation
   */
  async getValidForcedMovementHexes(
    target: Character,
    direction: { q: number; r: number },
    distance: number,
  ): Promise<AxialCoordinates[]> {
    const hexes: AxialCoordinates[] = [];
    let currentPos = { ...target.position };

    for (let i = 0; i < distance; i++) {
      const nextPos = {
        q: currentPos.q + direction.q,
        r: currentPos.r + direction.r,
      };

      const isWalkable = await this.isWalkableHex(nextPos);
      const isOccupied = (await this.getOccupyingEntity(nextPos)) !== undefined;

      if (!isWalkable || isOccupied) {
        break;
      }

      hexes.push(nextPos);
      currentPos = nextPos;
    }

    return hexes;
  }
}
