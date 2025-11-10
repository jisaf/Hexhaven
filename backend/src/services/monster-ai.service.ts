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
} from '../../../shared/types/entities';

@Injectable()
export class MonsterAIService {
  /**
   * Select the focus target for a monster
   * Priority: closest character by hex distance, break ties with initiative
   */
  selectFocusTarget(monster: Monster, characters: Character[]): string | null {
    // Filter out invisible and exhausted characters
    const validTargets = characters.filter(
      (char) =>
        !char.isExhausted &&
        !char.conditions.includes(Condition.INVISIBLE) &&
        char.currentHex !== null,
    );

    if (validTargets.length === 0) {
      return null;
    }

    // Find closest character(s)
    let closestDistance = Infinity;
    let closestTargets: Character[] = [];

    for (const char of validTargets) {
      const distance = this.calculateHexDistance(
        monster.currentHex,
        char.currentHex!,
      );

      if (distance < closestDistance) {
        closestDistance = distance;
        closestTargets = [char];
      } else if (distance === closestDistance) {
        closestTargets.push(char);
      }
    }

    // If tie, use initiative (lower goes first, so target them first)
    if (closestTargets.length === 1) {
      return closestTargets[0].id;
    }

    // Break tie with initiative - target character with lower initiative
    const sorted = closestTargets.sort((a, b) => {
      const initA = this.getCharacterInitiative(a);
      const initB = this.getCharacterInitiative(b);
      return initA - initB;
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
   * Determine optimal movement for monster toward focus target
   */
  determineMovement(
    monster: Monster,
    focusTarget: Character,
    obstacles: AxialCoordinates[],
  ): AxialCoordinates | null {
    if (!focusTarget.currentHex) {
      return null;
    }

    const distance = this.calculateHexDistance(
      monster.currentHex,
      focusTarget.currentHex,
    );

    // If already in attack range, don't move
    if (this.isInRange(monster, focusTarget.currentHex)) {
      return null;
    }

    // Get adjacent hexes and filter by movement
    const adjacentHexes = this.getAdjacentHexes(monster.currentHex);

    // Filter out obstacles (unless monster has flying)
    const hasFlying = monster.specialAbilities.includes('Flying');
    const validHexes = adjacentHexes.filter((hex) => {
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
   * Check if monster should attack
   */
  shouldAttack(monster: Monster, focusTarget: Character): boolean {
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

    return this.isInRange(monster, focusTarget.currentHex);
  }

  /**
   * Check if target is in monster's attack range
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
