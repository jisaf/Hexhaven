/**
 * Monster AI Service (US2 - T091)
 *
 * Handles monster AI decision-making for combat:
 * - Select focus target (closest character)
 * - Determine optimal movement
 * - Decide when to attack
 * - Handle special abilities (flying, ranged)
 */

import { Injectable } from '@nestjs/common';
import {
  Monster,
  Character,
  AxialCoordinates,
  Condition,
  Summon,
} from '../../../shared/types/entities';

/**
 * Internal type for unified target representation during focus selection.
 * Combines characters and summons into a common format for processing.
 */
interface FocusTarget {
  id: string;
  hex: AxialCoordinates;
  type: 'character' | 'summon';
  ownerId?: string;
  initiative: number;
}

/**
 * Minimal interface for entities that can move (Monster or adapted Summon).
 * Used by determineMovement to avoid requiring full Monster interface.
 */
export interface MovableEntity {
  currentHex: AxialCoordinates;
  conditions: Condition[];
  range: number;
  specialAbilities: string[];
}

/**
 * Minimal interface for movement targets (Character or adapted Monster).
 * Used by determineMovement to avoid requiring full Character interface.
 */
export interface MovementTarget {
  currentHex: AxialCoordinates | null;
}

/**
 * Minimal interface for attack targets.
 * Used by shouldAttack to avoid requiring full Character interface.
 */
export interface AttackTarget {
  currentHex: AxialCoordinates | null;
}

@Injectable()
export class MonsterAIService {
  /**
   * Select the focus target for a monster
   *
   * Priority (per Gloomhaven rules):
   * 1. Find closest entities (characters + summons) by hex distance
   * 2. At same distance: prefer summons over their owner (summon.ownerId === character.id)
   * 3. At same distance: prefer any summon over any character
   * 4. Break remaining ties with initiative (lower goes first)
   *
   * @param monster - The monster selecting a target
   * @param characters - Array of characters to consider
   * @param summons - Optional array of summons to consider (backward compatible)
   * @returns ID of the focus target, or null if no valid targets
   */
  selectFocusTarget(
    monster: Monster,
    characters: Character[],
    summons?: Summon[],
  ): string | null {
    // Filter out invalid characters (invisible, exhausted, or no position)
    const validCharacters = characters.filter(
      (char) =>
        !char.isExhausted &&
        !char.conditions.includes(Condition.INVISIBLE) &&
        char.currentHex !== null,
    );

    // Filter out invalid summons (dead, invisible, or no position)
    const validSummons = (summons || []).filter(
      (summon) =>
        !summon.isDead &&
        !summon.conditions.includes(Condition.INVISIBLE) &&
        summon.currentHex !== null,
    );

    // Convert all valid targets to unified format
    const allTargets: FocusTarget[] = [
      ...validCharacters.map((char) => ({
        id: char.id,
        hex: char.currentHex!,
        type: 'character' as const,
        ownerId: undefined,
        initiative: this.getCharacterInitiative(char),
      })),
      ...validSummons.map((summon) => ({
        id: summon.id,
        hex: summon.currentHex,
        type: 'summon' as const,
        ownerId: summon.ownerId,
        initiative: summon.initiative,
      })),
    ];

    if (allTargets.length === 0) {
      return null;
    }

    // Find minimum distance to any target
    let closestDistance = Infinity;
    for (const target of allTargets) {
      const distance = this.calculateHexDistance(
        monster.currentHex,
        target.hex,
      );
      if (distance < closestDistance) {
        closestDistance = distance;
      }
    }

    // Get all targets at the closest distance
    const closestTargets = allTargets.filter((target) => {
      const distance = this.calculateHexDistance(
        monster.currentHex,
        target.hex,
      );
      return distance === closestDistance;
    });

    // If only one target at closest distance, return it
    if (closestTargets.length === 1) {
      return closestTargets[0].id;
    }

    // Apply tie-breakers for multiple targets at same distance:
    // 1. Summons preferred over characters
    // 2. Lower initiative wins
    const sorted = closestTargets.sort((a, b) => {
      // Summons preferred over characters
      if (a.type === 'summon' && b.type === 'character') {
        return -1;
      }
      if (a.type === 'character' && b.type === 'summon') {
        return 1;
      }

      // Both same type, use initiative (lower first)
      return a.initiative - b.initiative;
    });

    return sorted[0].id;
  }

  /**
   * Calculate hex distance between two hexes (using axial coordinates)
   */
  calculateHexDistance(hex1: AxialCoordinates, hex2: AxialCoordinates): number {
    const dq = Math.abs(hex1.q - hex2.q);
    const dr = Math.abs(hex1.r - hex2.r);
    const ds = Math.abs(hex1.q + hex1.r - (hex2.q + hex2.r));
    return Math.max(dq, dr, ds);
  }

  /**
   * Determine optimal movement for monster toward focus target.
   * Accepts MovableEntity and MovementTarget interfaces to allow both
   * Monster/Character and Summon/Monster adapted pairs.
   */
  determineMovement(
    monster: MovableEntity,
    focusTarget: MovementTarget,
    obstacles: AxialCoordinates[],
    occupiedHexes: AxialCoordinates[],
    hexMap: Map<string, unknown>,
  ): AxialCoordinates | null {
    if (!focusTarget.currentHex) {
      return null;
    }

    const distance = this.calculateHexDistance(
      monster.currentHex,
      focusTarget.currentHex,
    );

    // If already in attack range, don't move
    if (this.isInRangeForMovable(monster, focusTarget.currentHex)) {
      return null;
    }

    // Get adjacent hexes and filter by movement
    const adjacentHexes = this.getAdjacentHexes(monster.currentHex);

    // Filter out non-existent hexes, obstacles (unless monster has flying), and occupied hexes
    const hasFlying = monster.specialAbilities.includes('Flying');
    const validHexes = adjacentHexes.filter((hex) => {
      // CRITICAL: Only allow movement to hexes that exist on the map
      const hexKey = `${hex.q},${hex.r}`;
      if (!hexMap.has(hexKey)) {
        return false;
      }

      // Check if hex is occupied by another entity (can't stop here)
      const isOccupied = occupiedHexes.some(
        (occupied) => occupied.q === hex.q && occupied.r === hex.r,
      );
      if (isOccupied) {
        return false;
      }

      // Check for terrain obstacles
      if (!hasFlying) {
        return !obstacles.some((obs) => obs.q === hex.q && obs.r === hex.r);
      }
      return true;
    });

    // Find hex that gets closest to target
    let bestHex: AxialCoordinates | null = null;
    let bestDistance = distance;

    for (const hex of validHexes) {
      const newDistance = this.calculateHexDistance(
        hex,
        focusTarget.currentHex,
      );
      if (newDistance < bestDistance) {
        bestDistance = newDistance;
        bestHex = hex;
      }
    }

    return bestHex;
  }

  /**
   * Check if monster should attack.
   * Accepts MovableEntity and AttackTarget interfaces to allow both
   * Monster/Character and Summon/Monster pairs.
   */
  shouldAttack(monster: MovableEntity, focusTarget: AttackTarget): boolean {
    // Can't attack if disarmed or stunned
    if (
      monster.conditions.includes(Condition.DISARM) ||
      monster.conditions.includes(Condition.STUN)
    ) {
      return false;
    }

    // Can't attack if target is null or out of range
    if (!focusTarget.currentHex) {
      return false;
    }

    return this.isInRangeForMovable(monster, focusTarget.currentHex);
  }

  /**
   * Check if target is in movable entity's attack range (works with MovableEntity interface)
   */
  private isInRangeForMovable(
    entity: MovableEntity,
    targetHex: AxialCoordinates,
  ): boolean {
    const distance = this.calculateHexDistance(entity.currentHex, targetHex);

    // Melee attack (range 0) requires adjacency
    if (entity.range === 0) {
      return distance === 1;
    }

    // Ranged attack
    return distance <= entity.range;
  }

  /**
   * Check if target is in monster's attack range
   * @deprecated Use isInRangeForMovable for generic interface support
   */
  private isInRange(monster: Monster, targetHex: AxialCoordinates): boolean {
    const distance = this.calculateHexDistance(monster.currentHex, targetHex);

    // Melee attack (range 0) requires adjacency
    if (monster.range === 0) {
      return distance === 1;
    }

    // Ranged attack
    return distance <= monster.range;
  }

  /**
   * Get all adjacent hexes (6 neighbors in hexagonal grid)
   */
  getAdjacentHexes(hex: AxialCoordinates): AxialCoordinates[] {
    return [
      { q: hex.q + 1, r: hex.r },
      { q: hex.q - 1, r: hex.r },
      { q: hex.q, r: hex.r + 1 },
      { q: hex.q, r: hex.r - 1 },
      { q: hex.q + 1, r: hex.r - 1 },
      { q: hex.q - 1, r: hex.r + 1 },
    ];
  }

  /**
   * Get character's initiative from active cards
   */
  private getCharacterInitiative(character: Character): number {
    // Default to high initiative if no cards selected
    if (!character.activeCards) {
      return 99;
    }

    // In real implementation, would look up card initiatives
    // For now, return a default value
    return 50;
  }
}
