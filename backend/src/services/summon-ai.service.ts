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
import { MonsterAIService } from './monster-ai.service';
import { Summon } from '../models/summon.model';
import { Monster } from '../models/monster.model';
import {
  AxialCoordinates,
  Condition,
  Monster as MonsterInterface,
  Character as CharacterInterface,
} from '../../../shared/types/entities';

/**
 * Interface representing a Monster-like object for delegation to MonsterAIService.
 * This allows us to adapt Summon properties to what MonsterAIService expects.
 */
interface MonsterLike {
  currentHex: AxialCoordinates;
  conditions: Condition[];
  attack: number;
  movement: number;
  range: number;
  specialAbilities: string[];
}

/**
 * Interface representing a Character-like object for delegation to MonsterAIService.
 * This allows us to adapt Monster properties to what MonsterAIService expects
 * when finding targets (summons target monsters, which we treat like "characters").
 */
interface CharacterLike {
  id: string;
  currentHex: AxialCoordinates | null;
  isExhausted: boolean;
  conditions: Condition[];
}

@Injectable()
export class SummonAIService {
  constructor(private monsterAIService: MonsterAIService) {}

  /**
   * Convert a Summon to a Monster-like interface for delegation to MonsterAIService.
   *
   * Property mappings:
   * - summon.position -> currentHex
   * - summon.conditions (already array) -> conditions
   * - summon.move -> movement
   * - [] -> specialAbilities (summons don't have special abilities)
   */
  private toMonsterLike(summon: Summon): MonsterLike {
    return {
      currentHex: summon.position,
      conditions: summon.conditions,
      attack: summon.attack,
      movement: summon.move,
      range: summon.range,
      specialAbilities: [], // Summons don't have special abilities
    };
  }

  /**
   * Convert a Monster to a Character-like interface for target selection.
   * Summons target monsters, so we adapt monsters to look like characters
   * for the existing MonsterAIService.selectFocusTarget algorithm.
   */
  private toCharacterLike(monster: Monster): CharacterLike {
    return {
      id: monster.id,
      currentHex: monster.position,
      isExhausted: monster.isDead, // Dead monsters are like exhausted characters
      conditions: monster.conditions,
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
   * @param monsters Array of potential target monsters
   * @returns Monster ID of the selected target, or null if no valid targets
   */
  selectFocusTarget(summon: Summon, monsters: Monster[]): string | null {
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
    let closestTargets: Monster[] = [];

    for (const monster of validTargets) {
      const distance = this.monsterAIService.calculateHexDistance(
        summon.position,
        monster.position,
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
   * @param target The target monster to move toward
   * @param obstacles Coordinates of obstacle hexes
   * @param occupied Coordinates of occupied hexes
   * @param hexMap Map of valid hexes on the board
   * @returns New position to move to, or null if no movement needed/possible
   */
  determineMovement(
    summon: Summon,
    target: Monster,
    obstacles: AxialCoordinates[],
    occupied: AxialCoordinates[],
    hexMap: Map<string, unknown>,
  ): AxialCoordinates | null {
    // Adapt summon to monster-like interface
    const summonAsMonster = this.toMonsterLike(summon) as MonsterInterface;
    // Adapt target to character-like interface
    const targetAsCharacter = this.toCharacterLike(
      target,
    ) as CharacterInterface;

    return this.monsterAIService.determineMovement(
      summonAsMonster,
      targetAsCharacter,
      obstacles,
      occupied,
      hexMap,
    );
  }

  /**
   * Check if summon should attack the target.
   *
   * @param summon The summon entity considering attack
   * @param target The target monster
   * @returns true if attack should proceed, false otherwise
   */
  shouldAttack(summon: Summon, target: Monster): boolean {
    // Check conditions that prevent attacking
    if (summon.isDisarmed || summon.isStunned) {
      return false;
    }

    // Check if in range
    return this.isInRange(summon, target.position);
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
