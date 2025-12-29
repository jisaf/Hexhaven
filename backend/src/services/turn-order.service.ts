/**
 * Turn Order Service (US2 - T090)
 *
 * Manages initiative calculation and turn order determination for combat.
 * - Calculates initiative from selected ability cards
 * - Determines turn order (lowest initiative first)
 * - Handles character class tie-breaking
 * - Skips dead/exhausted entities
 */

import { Injectable } from '@nestjs/common';
import { CharacterClass } from '../../../shared/types/entities';

export interface TurnEntity {
  entityId: string;
  entityType: 'character' | 'monster' | 'summon';
  initiative: number;
  name: string;
  characterClass?: CharacterClass;
  isDead?: boolean;
  isExhausted?: boolean;
  ownerId?: string; // For summons: links to owner character for turn order
}

@Injectable()
export class TurnOrderService {
  /**
   * Calculate initiative from two selected ability cards
   * Returns the lower initiative value (lower goes first)
   *
   * Long Rest: Per Gloomhaven rules, long rest has initiative 99 (always goes last)
   */
  calculateInitiative(
    topCardInitiative: number | null,
    bottomCardInitiative: number | null,
    isLongRest: boolean = false,
  ): number {
    // Long rest always has initiative 99 (goes last in round)
    if (isLongRest) {
      return 99;
    }

    if (topCardInitiative === null && bottomCardInitiative === null) {
      throw new Error('Cannot calculate initiative without card selections');
    }

    if (bottomCardInitiative === null) {
      return topCardInitiative!;
    }

    if (topCardInitiative === null) {
      return bottomCardInitiative;
    }

    return Math.min(topCardInitiative, bottomCardInitiative);
  }

  /**
   * Determine turn order from entities with initiatives
   * Sorts by initiative (lowest first), breaks ties with character class order
   *
   * Special handling for summons:
   * - Summons use their own initiative value (typically copies owner's initiative)
   * - Summons act BEFORE their owner when at the same initiative
   */
  determineTurnOrder(entities: TurnEntity[]): TurnEntity[] {
    if (entities.length === 0) {
      return [];
    }

    // Build a map of character initiative for ordering summons with their owners
    const characterInitiatives = new Map<string, number>();
    const characterClasses = new Map<string, CharacterClass>();
    for (const entity of entities) {
      if (entity.entityType === 'character') {
        characterInitiatives.set(entity.entityId, entity.initiative);
        if (entity.characterClass) {
          characterClasses.set(entity.entityId, entity.characterClass);
        }
      }
    }

    return [...entities].sort((a, b) => {
      // Primary sort: initiative (lower goes first)
      if (a.initiative !== b.initiative) {
        return a.initiative - b.initiative;
      }

      // Same initiative - apply tie-breakers

      // Summon-before-owner tiebreaker: summon goes before its owner
      if (a.entityType === 'summon' && a.ownerId === b.entityId) {
        return -1; // Summon goes before its owner
      }
      if (b.entityType === 'summon' && b.ownerId === a.entityId) {
        return 1; // Owner goes after its summon
      }

      // For summons of different owners at same initiative, group by owner's class order
      if (
        a.entityType === 'summon' &&
        b.entityType === 'summon' &&
        a.ownerId &&
        b.ownerId
      ) {
        const aOwnerClass = characterClasses.get(a.ownerId);
        const bOwnerClass = characterClasses.get(b.ownerId);
        if (aOwnerClass && bOwnerClass) {
          return this.compareCharacterClasses(aOwnerClass, bOwnerClass);
        }
      }

      // Summon vs character (not owner): summon follows its owner's position
      if (
        a.entityType === 'summon' &&
        a.ownerId &&
        b.entityType === 'character'
      ) {
        const aOwnerClass = characterClasses.get(a.ownerId);
        if (aOwnerClass && b.characterClass) {
          const classComparison = this.compareCharacterClasses(
            aOwnerClass,
            b.characterClass,
          );
          if (classComparison !== 0) return classComparison;
        }
        // If owner's class equals b's class, summon goes before (it should be with its owner who follows)
        return -1;
      }
      if (
        b.entityType === 'summon' &&
        b.ownerId &&
        a.entityType === 'character'
      ) {
        const bOwnerClass = characterClasses.get(b.ownerId);
        if (bOwnerClass && a.characterClass) {
          const classComparison = this.compareCharacterClasses(
            a.characterClass,
            bOwnerClass,
          );
          if (classComparison !== 0) return classComparison;
        }
        // If a's class equals summon's owner class, owner goes after summon
        return 1;
      }

      // Tie-breaker: for characters, use character class order
      if (
        a.entityType === 'character' &&
        b.entityType === 'character' &&
        a.characterClass &&
        b.characterClass
      ) {
        return this.compareCharacterClasses(a.characterClass, b.characterClass);
      }

      // Monsters or mixed: maintain original order (stable sort)
      return 0;
    });
  }

  /**
   * Get next entity index in turn order (wraps to 0)
   */
  getNextEntityIndex(currentTurnIndex: number, turnOrder: unknown[]): number {
    return (currentTurnIndex + 1) % turnOrder.length;
  }

  /**
   * Get next living entity index (skips dead monsters and exhausted characters)
   */
  getNextLivingEntityIndex(
    currentTurnIndex: number,
    turnOrder: Array<{
      entityId: string;
      isDead?: boolean;
      isExhausted?: boolean;
    }>,
  ): number {
    const startIndex = currentTurnIndex;
    let nextIndex = (currentTurnIndex + 1) % turnOrder.length;

    // Loop until we find a living entity or complete a full circle
    while (nextIndex !== startIndex) {
      const entity = turnOrder[nextIndex];

      // Skip dead monsters and exhausted characters
      if (!entity.isDead && !entity.isExhausted) {
        return nextIndex;
      }

      nextIndex = (nextIndex + 1) % turnOrder.length;
    }

    // If all entities are dead/exhausted, return next index anyway
    return nextIndex;
  }

  /**
   * Get character class order for tie-breaking
   */
  getCharacterClassOrder(): CharacterClass[] {
    return [
      CharacterClass.BRUTE,
      CharacterClass.TINKERER,
      CharacterClass.SPELLWEAVER,
      CharacterClass.SCOUNDREL,
      CharacterClass.CRAGHEART,
      CharacterClass.MINDTHIEF,
    ];
  }

  /**
   * Compare two character classes for sorting
   * Returns negative if class1 comes before class2, positive if after, 0 if equal
   */
  compareCharacterClasses(
    class1: CharacterClass,
    class2: CharacterClass,
  ): number {
    const order = this.getCharacterClassOrder();
    const index1 = order.indexOf(class1);
    const index2 = order.indexOf(class2);
    return index1 - index2;
  }

  /**
   * Detect if we're starting a new round (turn wrapped to start)
   */
  isNewRound(currentTurnIndex: number, turnOrderLength: number): boolean {
    // New round when we reach the last index and are about to wrap
    return currentTurnIndex === turnOrderLength - 1;
  }

  /**
   * Update turn order after new card selections
   * Recalculates initiatives and re-sorts entities
   */
  updateTurnOrder(
    previousTurnOrder: TurnEntity[],
    newCardSelections: Array<{ playerId: string; initiative: number }>,
  ): TurnEntity[] {
    // Create a map of new initiatives by player ID
    const newInitiatives = new Map(
      newCardSelections.map((sel) => [sel.playerId, sel.initiative]),
    );

    // Update player initiatives, keep monster initiatives
    const updatedEntities = previousTurnOrder.map((entity) => {
      if (
        entity.entityType === 'character' &&
        newInitiatives.has(entity.entityId)
      ) {
        return {
          ...entity,
          initiative: newInitiatives.get(entity.entityId)!,
        };
      }
      return entity;
    });

    // Re-sort with new initiatives
    return this.determineTurnOrder(updatedEntities);
  }
}
