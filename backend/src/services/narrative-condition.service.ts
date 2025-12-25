/**
 * Narrative Condition Evaluator Service
 *
 * Evaluates complex AND/OR condition trees for narrative triggers.
 * Supports multiple condition types: character positions, monster kills,
 * round progression, treasure collection, etc.
 */

import { Injectable, Logger } from '@nestjs/common';
import type {
  NarrativeCondition,
  NarrativeConditionLeaf,
  CompoundCondition,
  NarrativeGameContext,
  CharacterOnHexCondition,
  CharactersOnHexesCondition,
  MonstersKilledCondition,
  RoundReachedCondition,
  AllEnemiesDeadCondition,
  TreasureCollectedCondition,
  DoorOpenedCondition,
  LootCollectedCondition,
} from '../../../shared/types/narrative';
import type { AxialCoordinates } from '../../../shared/types/entities';
import {
  isCompoundCondition,
  isLeafCondition,
} from '../../../shared/types/narrative';

@Injectable()
export class NarrativeConditionService {
  private readonly logger = new Logger(NarrativeConditionService.name);

  /**
   * Evaluate a condition tree against the current game context
   * @param condition - The condition to evaluate (leaf or compound)
   * @param context - Current game state context
   * @returns true if condition is satisfied
   */
  evaluate(
    condition: NarrativeCondition,
    context: NarrativeGameContext,
  ): boolean {
    try {
      if (isCompoundCondition(condition)) {
        return this.evaluateCompound(condition, context);
      } else if (isLeafCondition(condition)) {
        return this.evaluateLeaf(condition, context);
      }
      this.logger.warn('Unknown condition type encountered');
      return false;
    } catch (error) {
      this.logger.error(`Error evaluating condition: ${error}`);
      return false;
    }
  }

  /**
   * Evaluate a compound condition (AND/OR)
   */
  private evaluateCompound(
    condition: CompoundCondition,
    context: NarrativeGameContext,
  ): boolean {
    const { operator, conditions } = condition;

    if (conditions.length === 0) {
      this.logger.warn('Empty compound condition, returning false');
      return false;
    }

    if (operator === 'AND') {
      // All conditions must be true (early exit on first false)
      for (const subCondition of conditions) {
        if (!this.evaluate(subCondition, context)) {
          return false;
        }
      }
      return true;
    } else if (operator === 'OR') {
      // At least one condition must be true (early exit on first true)
      for (const subCondition of conditions) {
        if (this.evaluate(subCondition, context)) {
          return true;
        }
      }
      return false;
    }

    this.logger.warn(`Unknown operator: ${operator}`);
    return false;
  }

  /**
   * Evaluate a leaf condition based on its type
   */
  private evaluateLeaf(
    condition: NarrativeConditionLeaf,
    context: NarrativeGameContext,
  ): boolean {
    let result: boolean;

    switch (condition.type) {
      case 'character_on_hex':
        result = this.evaluateCharacterOnHex(condition, context);
        break;
      case 'characters_on_hexes':
        result = this.evaluateCharactersOnHexes(condition, context);
        break;
      case 'monsters_killed':
        result = this.evaluateMonstersKilled(condition, context);
        break;
      case 'round_reached':
        result = this.evaluateRoundReached(condition, context);
        break;
      case 'all_enemies_dead':
        result = this.evaluateAllEnemiesDead(condition, context);
        break;
      case 'treasure_collected':
        result = this.evaluateTreasureCollected(condition, context);
        break;
      case 'door_opened':
        result = this.evaluateDoorOpened(condition, context);
        break;
      case 'loot_collected':
        result = this.evaluateLootCollected(condition, context);
        break;
      default:
        this.logger.warn(`Unknown condition type: ${(condition as any).type}`);
        result = false;
    }

    // Apply negation if specified
    return condition.negate ? !result : result;
  }

  /**
   * Check if a character (or any character) is on a specific hex
   */
  private evaluateCharacterOnHex(
    condition: CharacterOnHexCondition,
    context: NarrativeGameContext,
  ): boolean {
    const { hex, characterId, characterClass } = condition.params;

    for (const character of context.characters) {
      // Check if character is on the hex
      if (!this.hexEquals(character.hex, hex)) {
        continue;
      }

      // If specific character ID required, check it
      if (characterId && character.id !== characterId) {
        continue;
      }

      // If specific class required, check it
      if (characterClass && character.characterClass !== characterClass) {
        continue;
      }

      return true;
    }

    return false;
  }

  /**
   * Check if multiple characters are positioned on specific hexes
   */
  private evaluateCharactersOnHexes(
    condition: CharactersOnHexesCondition,
    context: NarrativeGameContext,
  ): boolean {
    const { hexes, requireAll, mustBeSimultaneous } = condition.params;

    if (mustBeSimultaneous) {
      // All specified hexes must be occupied right now
      const occupiedHexes = hexes.filter((targetHex) =>
        context.characters.some((char) => this.hexEquals(char.hex, targetHex)),
      );

      if (requireAll) {
        return occupiedHexes.length === hexes.length;
      } else {
        return occupiedHexes.length > 0;
      }
    } else {
      // Cumulative - at least some hexes must have been visited
      // Note: This requires tracking visited hexes in context (not currently implemented)
      // For now, treat same as simultaneous
      const occupiedHexes = hexes.filter((targetHex) =>
        context.characters.some((char) => this.hexEquals(char.hex, targetHex)),
      );

      if (requireAll) {
        return occupiedHexes.length === hexes.length;
      } else {
        return occupiedHexes.length > 0;
      }
    }
  }

  /**
   * Check if enough monsters have been killed
   */
  private evaluateMonstersKilled(
    condition: MonstersKilledCondition,
    context: NarrativeGameContext,
  ): boolean {
    const { count, monsterType } = condition.params;

    if (monsterType) {
      // Check kills of specific monster type
      const typeKills = context.monstersKilledByType[monsterType] || 0;
      return typeKills >= count;
    } else {
      // Check total kills
      return context.monstersKilled >= count;
    }
  }

  /**
   * Check if a specific round has been reached
   */
  private evaluateRoundReached(
    condition: RoundReachedCondition,
    context: NarrativeGameContext,
  ): boolean {
    return context.currentRound >= condition.params.round;
  }

  /**
   * Check if all enemies are dead
   */
  private evaluateAllEnemiesDead(
    _condition: AllEnemiesDeadCondition,
    context: NarrativeGameContext,
  ): boolean {
    return context.monsters.every((monster) => !monster.isAlive);
  }

  /**
   * Check if a specific treasure has been collected
   */
  private evaluateTreasureCollected(
    condition: TreasureCollectedCondition,
    context: NarrativeGameContext,
  ): boolean {
    return context.collectedTreasures.includes(condition.params.treasureId);
  }

  /**
   * Check if a door has been opened
   */
  private evaluateDoorOpened(
    condition: DoorOpenedCondition,
    context: NarrativeGameContext,
  ): boolean {
    const { doorId, doorHex } = condition.params;

    if (doorHex) {
      return context.openedDoors.some((hex) => this.hexEquals(hex, doorHex));
    }

    if (doorId) {
      // Door ID checking would require additional tracking
      // For now, log warning and return false
      this.logger.warn('Door ID checking not yet implemented');
      return false;
    }

    return false;
  }

  /**
   * Check if loot has been collected from a specific hex
   */
  private evaluateLootCollected(
    condition: LootCollectedCondition,
    context: NarrativeGameContext,
  ): boolean {
    return context.collectedLootHexes.some((hex) =>
      this.hexEquals(hex, condition.params.hex),
    );
  }

  /**
   * Helper: Compare two hex coordinates for equality
   */
  private hexEquals(a: AxialCoordinates, b: AxialCoordinates): boolean {
    return a.q === b.q && a.r === b.r;
  }
}
