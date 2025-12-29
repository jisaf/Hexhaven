/**
 * Summon Service (Issue #228 - Phase 2)
 *
 * Lifecycle management service for summons:
 * - Creating summons from definitions
 * - Validating placement hexes
 * - Getting valid placement options for UI
 * - Killing summons when their owner is exhausted/dies
 *
 * Design decisions:
 * - Delegates hex distance calculations to MonsterAIService (DRY)
 * - Uses BFS-like approach to find all hexes within range
 * - Validates terrain, occupancy, and range for placement
 */

import { Injectable } from '@nestjs/common';
import { Summon, SummonDeathReason } from '../models/summon.model';
import { SummonDefinition } from '../../../shared/types/modifiers';
import { AxialCoordinates } from '../../../shared/types/entities';
import { MonsterAIService } from './monster-ai.service';

@Injectable()
export class SummonService {
  constructor(private monsterAIService: MonsterAIService) {}

  /**
   * Create a summon from a definition at the specified position.
   *
   * @param definition - Summon stats and configuration
   * @param position - Initial position on hex grid
   * @param roomId - Game room ID
   * @param ownerId - Character ID of summoner (undefined for scenario allies)
   * @param initiative - Initiative value (copies owner's or uses definition's)
   * @returns Newly created Summon entity
   */
  createSummon(
    definition: SummonDefinition,
    position: AxialCoordinates,
    roomId: string,
    ownerId?: string,
    initiative?: number,
  ): Summon {
    return Summon.create(roomId, definition, position, ownerId, initiative);
  }

  /**
   * Validate whether a hex is a valid placement location for a summon.
   *
   * Returns false if:
   * 1. Distance from ownerHex to hex > maxRange
   * 2. Hex is not in hexMap (off-map)
   * 3. Hex terrain is 'obstacle'
   * 4. Hex is in occupiedHexes (another entity is there)
   *
   * @param hex - Target hex to validate
   * @param ownerHex - Position of the summoner
   * @param hexMap - Map of hexes on the board with terrain info
   * @param occupiedHexes - Hexes occupied by other entities
   * @param maxRange - Maximum placement range from owner
   * @returns true if placement is valid, false otherwise
   */
  validatePlacement(
    hex: AxialCoordinates,
    ownerHex: AxialCoordinates,
    hexMap: Map<string, { terrain?: string }>,
    occupiedHexes: AxialCoordinates[],
    maxRange: number,
  ): boolean {
    // Check 1: Distance from owner must be within range
    const distance = this.monsterAIService.calculateHexDistance(ownerHex, hex);
    if (distance > maxRange) {
      return false;
    }

    // Check 2: Hex must exist on the map
    const hexKey = `${hex.q},${hex.r}`;
    const hexData = hexMap.get(hexKey);
    if (!hexData) {
      return false;
    }

    // Check 3: Hex must not be an obstacle
    if (hexData.terrain === 'obstacle') {
      return false;
    }

    // Check 4: Hex must not be occupied
    const isOccupied = occupiedHexes.some(
      (occupied) => occupied.q === hex.q && occupied.r === hex.r,
    );
    if (isOccupied) {
      return false;
    }

    return true;
  }

  /**
   * Get all valid placement hexes within range of the owner.
   *
   * Uses a ring-based approach to find all hexes at each distance level
   * from 1 to maxRange, then filters to only valid placements.
   *
   * @param ownerHex - Position of the summoner
   * @param hexMap - Map of hexes on the board with terrain info
   * @param occupiedHexes - Hexes occupied by other entities
   * @param maxRange - Maximum placement range from owner
   * @returns Array of valid hex coordinates for summon placement
   */
  getValidPlacementHexes(
    ownerHex: AxialCoordinates,
    hexMap: Map<string, { terrain?: string }>,
    occupiedHexes: AxialCoordinates[],
    maxRange: number,
  ): AxialCoordinates[] {
    const validHexes: AxialCoordinates[] = [];
    const visited = new Set<string>();

    // Get all hexes within range using BFS-like expansion
    const hexesInRange = this.getHexesWithinRange(ownerHex, maxRange);

    for (const hex of hexesInRange) {
      const hexKey = `${hex.q},${hex.r}`;

      // Skip if already processed
      if (visited.has(hexKey)) {
        continue;
      }
      visited.add(hexKey);

      // Validate this hex
      if (
        this.validatePlacement(hex, ownerHex, hexMap, occupiedHexes, maxRange)
      ) {
        validHexes.push(hex);
      }
    }

    return validHexes;
  }

  /**
   * Kill all summons owned by a character.
   *
   * Used when:
   * - Owner becomes exhausted
   * - Owner dies
   * - Scenario ends
   *
   * @param ownerId - Character ID whose summons should be killed
   * @param reason - Why the summons are being killed
   * @param summons - Array of all summons to search through
   * @returns Array of summons that were killed
   */
  killSummonsByOwner(
    ownerId: string,
    reason: 'owner_exhausted' | 'owner_died' | 'scenario_end',
    summons: Summon[],
  ): Summon[] {
    const killedSummons: Summon[] = [];

    for (const summon of summons) {
      // Only kill summons belonging to this owner
      // Note: Scenario allies (undefined ownerId) are never killed by this method
      if (summon.ownerId === ownerId) {
        summon.kill(reason as SummonDeathReason);
        killedSummons.push(summon);
      }
    }

    return killedSummons;
  }

  /**
   * Get all hexes within a given range of a center hex.
   *
   * Uses the cube coordinate formula for hex distance to efficiently
   * enumerate all hexes at each distance level.
   *
   * @param center - Center hex position
   * @param range - Maximum distance from center (inclusive)
   * @returns Array of all hexes within range (excluding center)
   */
  private getHexesWithinRange(
    center: AxialCoordinates,
    range: number,
  ): AxialCoordinates[] {
    const hexes: AxialCoordinates[] = [];

    // Iterate through all hexes in a bounding box and filter by distance
    // For cube coordinates: q + r + s = 0, so s = -q - r
    // A hex is within range if max(|dq|, |dr|, |ds|) <= range
    for (let dq = -range; dq <= range; dq++) {
      for (
        let dr = Math.max(-range, -dq - range);
        dr <= Math.min(range, -dq + range);
        dr++
      ) {
        // Skip the center hex (summon can't be placed on owner's hex)
        if (dq === 0 && dr === 0) {
          continue;
        }

        const hex: AxialCoordinates = {
          q: center.q + dq,
          r: center.r + dr,
        };

        // Verify distance (should always be true given the loop bounds, but double-check)
        const distance = this.monsterAIService.calculateHexDistance(
          center,
          hex,
        );
        if (distance >= 1 && distance <= range) {
          hexes.push(hex);
        }
      }
    }

    return hexes;
  }
}
