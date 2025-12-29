/**
 * Summon AI Service (Issue #228 - Phase 1)
 *
 * A thin wrapper that adapts Summon entities to work with MonsterAIService.
 * Summons target monsters (enemies), unlike monsters which target characters.
 * The AI logic is identical, just the target pool differs.
 *
 * Key insight: Both summons and monsters use the same pathfinding and
 * targeting algorithms - they just target different entity types.
 */

import { Injectable } from '@nestjs/common';
import {
  MonsterAIService,
  MovableEntity,
  MovementTarget,
} from './monster-ai.service';
import { Summon } from '../models/summon.model';
import {
  AxialCoordinates,
  Condition,
  Monster as MonsterInterface,
} from '../../../shared/types/entities';

/**
 * Type alias for monsters that can be targeted by summons.
 * Uses the shared Monster interface which is what game.gateway.ts provides.
 */
type TargetableMonster = MonsterInterface;

@Injectable()
export class SummonAIService {
  constructor(private monsterAIService: MonsterAIService) {}

  /**
   * Convert a Summon to a MovableEntity interface for delegation to MonsterAIService.
   *
   * Property mappings:
   * - summon.position -> currentHex
   * - summon.conditions (already array) -> conditions
   * - summon.move -> (not used by MovableEntity, but range is)
   * - [] -> specialAbilities (summons don't have special abilities)
   *
   * Note: Returns a type-safe MovableEntity object that MonsterAIService accepts.
   */
  private toMovableEntity(summon: Summon): MovableEntity {
    // Validate required properties at runtime
    if (!summon.position) {
      throw new Error(
        'Summon must have a position to convert to MovableEntity',
      );
    }

    return {
      currentHex: summon.position,
      conditions: summon.conditions,
      range: summon.range,
      specialAbilities: [], // Summons don't have special abilities
    };
  }

  /**
   * Convert a Monster (shared interface) to a MovementTarget interface for target selection.
   * Summons target monsters, so we adapt monsters to the MovementTarget interface
   * for the existing MonsterAIService.determineMovement algorithm.
   *
   * Note: Returns a type-safe MovementTarget object that MonsterAIService accepts.
   * Accepts the shared Monster interface which uses currentHex (not position).
   */
  private toMovementTarget(monster: TargetableMonster): MovementTarget {
    // Validate required properties at runtime
    if (!monster.currentHex) {
      throw new Error(
        'Monster must have a currentHex to convert to MovementTarget',
      );
    }

    return {
      currentHex: monster.currentHex,
    };
  }

  /**
   * Select the focus target for a summon.
   * Summons target monsters (enemies), using the same targeting logic
   * as monsters targeting characters:
   * - Priority: closest monster by hex distance
   * - Break ties deterministically by ID (monsters don't have initiative)
   *
   * @param summon The summon entity selecting a target
   * @param monsters Array of potential target monsters (shared Monster interface)
   * @returns Monster ID of the selected target, or null if no valid targets
   */
  selectFocusTarget(
    summon: Summon,
    monsters: TargetableMonster[],
  ): string | null {
    // Filter out invalid targets (dead or invisible)
    const validTargets = monsters.filter(
      (monster) =>
        !monster.isDead && !monster.conditions.includes(Condition.INVISIBLE),
    );

    if (validTargets.length === 0) {
      return null;
    }

    // Find closest monster(s)
    let closestDistance = Infinity;
    let closestTargets: TargetableMonster[] = [];

    for (const monster of validTargets) {
      const distance = this.monsterAIService.calculateHexDistance(
        summon.position,
        monster.currentHex, // Use currentHex from shared interface
      );

      if (distance < closestDistance) {
        closestDistance = distance;
        closestTargets = [monster];
      } else if (distance === closestDistance) {
        closestTargets.push(monster);
      }
    }

    // If single target, return it
    if (closestTargets.length === 1) {
      return closestTargets[0].id;
    }

    // Break ties deterministically by ID (since monsters don't have individual initiative)
    const sorted = closestTargets.sort((a, b) => a.id.localeCompare(b.id));
    return sorted[0].id;
  }

  /**
   * Determine optimal movement for summon toward focus target.
   * Delegates to MonsterAIService after adapting interfaces.
   *
   * @param summon The summon entity to move
   * @param target The target monster to move toward (shared Monster interface)
   * @param obstacles Coordinates of obstacle hexes
   * @param occupied Coordinates of occupied hexes
   * @param hexMap Map of valid hexes on the board
   * @returns New position to move to, or null if no movement needed/possible
   */
  determineMovement(
    summon: Summon,
    target: TargetableMonster,
    obstacles: AxialCoordinates[],
    occupied: AxialCoordinates[],
    hexMap: Map<string, unknown>,
  ): AxialCoordinates | null {
    // Adapt summon to MovableEntity interface (type-safe, no casting needed)
    const summonAsMovable = this.toMovableEntity(summon);
    // Adapt target to MovementTarget interface (type-safe, no casting needed)
    const targetAsMovementTarget = this.toMovementTarget(target);

    return this.monsterAIService.determineMovement(
      summonAsMovable,
      targetAsMovementTarget,
      obstacles,
      occupied,
      hexMap,
    );
  }

  /**
   * Check if summon should attack the target.
   *
   * @param summon The summon entity considering attack
   * @param target The target monster (shared Monster interface)
   * @returns true if attack should proceed, false otherwise
   */
  shouldAttack(summon: Summon, target: TargetableMonster): boolean {
    // Check conditions that prevent attacking
    if (summon.isDisarmed || summon.isStunned) {
      return false;
    }

    // Check if in range (use currentHex from shared interface)
    return this.isInRange(summon, target.currentHex);
  }

  /**
   * Check if target is in summon's attack range.
   */
  private isInRange(summon: Summon, targetHex: AxialCoordinates): boolean {
    const distance = this.monsterAIService.calculateHexDistance(
      summon.position,
      targetHex,
    );

    // Melee attack (range 0 or 1) requires adjacency (distance 1)
    if (summon.range <= 1) {
      return distance === 1;
    }

    // Ranged attack
    return distance <= summon.range;
  }
}
