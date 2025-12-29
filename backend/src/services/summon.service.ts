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
   * @throws Error if definition is missing required properties
   * @throws Error if position is invalid
   * @throws Error if roomId is empty
   */
  createSummon(
    definition: SummonDefinition,
    position: AxialCoordinates,
    roomId: string,
    ownerId?: string,
    initiative?: number,
  ): Summon {
    // Validate definition
    if (!definition) {
      throw new Error('Summon definition is required');
    }
    if (!definition.name || definition.name.trim() === '') {
      throw new Error('Summon definition must have a name');
    }
    if (typeof definition.health !== 'number' || definition.health <= 0) {
      throw new Error('Summon definition must have positive health');
    }
    if (typeof definition.attack !== 'number' || definition.attack < 0) {
      throw new Error('Summon definition must have non-negative attack');
    }
    if (typeof definition.move !== 'number' || definition.move < 0) {
      throw new Error('Summon definition must have non-negative move');
    }
    if (typeof definition.range !== 'number' || definition.range < 0) {
      throw new Error('Summon definition must have non-negative range');
    }

    // Validate position
    if (!position) {
      throw new Error('Summon position is required');
    }
    if (typeof position.q !== 'number' || typeof position.r !== 'number') {
      throw new Error('Summon position must have valid q and r coordinates');
    }

    // Validate roomId
    if (!roomId || roomId.trim() === '') {
      throw new Error('Room ID is required for summon creation');
    }

    // Validate initiative if provided
    if (initiative !== undefined && typeof initiative !== 'number') {
      throw new Error('Initiative must be a number if provided');
    }

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
   * @throws Error if required parameters are missing or invalid
   */
  validatePlacement(
    hex: AxialCoordinates,
    ownerHex: AxialCoordinates,
    hexMap: Map<string, { terrain?: string }>,
    occupiedHexes: AxialCoordinates[],
    maxRange: number,
  ): boolean {
    // Input validation
    if (!hex || typeof hex.q !== 'number' || typeof hex.r !== 'number') {
      throw new Error('Target hex must have valid q and r coordinates');
    }
    if (
      !ownerHex ||
      typeof ownerHex.q !== 'number' ||
      typeof ownerHex.r !== 'number'
    ) {
      throw new Error('Owner hex must have valid q and r coordinates');
    }
    if (!hexMap) {
      throw new Error('Hex map is required for placement validation');
    }
    if (!Array.isArray(occupiedHexes)) {
      throw new Error('Occupied hexes must be an array');
    }
    if (typeof maxRange !== 'number' || maxRange < 0) {
      throw new Error('Max range must be a non-negative number');
    }

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
   * @throws Error if ownerId is empty
   * @throws Error if reason is invalid
   * @throws Error if summons is not an array
   */
  killSummonsByOwner(
    ownerId: string,
    reason: 'owner_exhausted' | 'owner_died' | 'scenario_end',
    summons: Summon[],
  ): Summon[] {
    // Input validation
    if (!ownerId || ownerId.trim() === '') {
      throw new Error('Owner ID is required to kill summons');
    }

    const validReasons = ['owner_exhausted', 'owner_died', 'scenario_end'];
    if (!validReasons.includes(reason)) {
      throw new Error(
        `Invalid death reason: ${reason}. Must be one of: ${validReasons.join(', ')}`,
      );
    }

    if (!Array.isArray(summons)) {
      throw new Error('Summons must be an array');
    }

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
