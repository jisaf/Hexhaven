/**
 * Condition Management Service
 * Handles application, removal, and expiration of status conditions
 * Manages condition duration and effects
 *
 * Updated for Issue #220 - works with existing Character model
 */

import { Injectable } from '@nestjs/common';
import { Condition } from '../../../shared/types/entities';
import { Character } from '../models/character.model';

export interface ConditionState {
  condition: Condition;
  appliedAt: Date;
  duration: 'round' | 'persistent' | 'until-consumed';
  roundNumber?: number; // Round when condition was applied (for round-based duration)
  expiresAt?: Date; // When persistent condition expires
  metadata?: Record<string, unknown>; // Condition-specific data
}

@Injectable()
export class ConditionService {
  // Store condition states per character ID (since Character model doesn't have this)
  private conditionStates: Map<string, ConditionState[]> = new Map();

  /**
   * Apply a condition to a target character
   */
  async applyCondition(
    target: Character,
    condition: Condition,
    duration: 'round' | 'persistent' | 'until-consumed' = 'until-consumed',
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    // Use Character's built-in method to add condition
    target.addCondition(condition);

    // Store condition state for duration tracking
    if (!this.conditionStates.has(target.id)) {
      this.conditionStates.set(target.id, []);
    }

    const states = this.conditionStates.get(target.id)!;

    // Don't add duplicate state for same condition
    const existingIndex = states.findIndex((s) => s.condition === condition);
    if (existingIndex >= 0) {
      // Update existing state
      states[existingIndex] = {
        condition,
        appliedAt: new Date(),
        duration,
        metadata,
      };
    } else {
      // Add new state
      states.push({
        condition,
        appliedAt: new Date(),
        duration,
        metadata,
      });
    }
  }

  /**
   * Remove a condition from a target
   */
  async removeCondition(target: Character, condition: Condition): Promise<void> {
    // Use Character's built-in method
    target.removeCondition(condition);

    // Remove from condition states
    const states = this.conditionStates.get(target.id);
    if (states) {
      const index = states.findIndex((s) => s.condition === condition);
      if (index >= 0) {
        states.splice(index, 1);
      }
    }
  }

  /**
   * Clear all conditions from a target
   */
  async clearConditions(target: Character): Promise<void> {
    // Use Character's built-in method
    target.clearConditions();

    // Clear condition states
    this.conditionStates.set(target.id, []);
  }

  /**
   * Check if condition is active on target
   */
  hasCondition(target: Character, condition: Condition): boolean {
    // Character.conditions returns an array
    return target.conditions.includes(condition);
  }

  /**
   * Get all active conditions on target
   */
  getConditions(target: Character): Condition[] {
    return target.conditions;
  }

  /**
   * Get condition state details
   */
  getConditionState(target: Character, condition: Condition): ConditionState | undefined {
    const states = this.conditionStates.get(target.id);
    return states?.find((c) => c.condition === condition);
  }

  /**
   * Process round-based condition expiration
   * Called at end of each round to expire conditions that lasted 'round'
   */
  async expireRoundBasedConditions(target: Character, currentRound: number): Promise<Condition[]> {
    const expiredConditions: Condition[] = [];
    const states = this.conditionStates.get(target.id);

    if (!states) {
      return expiredConditions;
    }

    const statesToKeep: ConditionState[] = [];

    for (const state of states) {
      // Round-based conditions expire after 1 round (next turn)
      if (state.duration === 'round' && state.roundNumber !== undefined) {
        if (currentRound > state.roundNumber) {
          // Expire this condition
          expiredConditions.push(state.condition);
          target.removeCondition(state.condition);
          continue;
        }
      }

      statesToKeep.push(state);
    }

    this.conditionStates.set(target.id, statesToKeep);
    return expiredConditions;
  }

  /**
   * Consume a condition (for conditions that are consumed by healing, etc.)
   * Returns true if condition was consumed, false if it doesn't exist
   */
  async consumeCondition(target: Character, condition: Condition): Promise<boolean> {
    const state = this.getConditionState(target, condition);

    if (!state) {
      return false;
    }

    // Only consume if it's marked as 'until-consumed'
    if (state.duration === 'until-consumed') {
      await this.removeCondition(target, condition);
      return true;
    }

    return false;
  }

  /**
   * Get all negative conditions (debuffs)
   */
  getNegativeConditions(target: Character): Condition[] {
    const negative = [
      Condition.POISON,
      Condition.WOUND,
      Condition.MUDDLE,
      Condition.IMMOBILIZE,
      Condition.DISARM,
      Condition.STUN,
      Condition.CURSE,
      Condition.BRITTLE,
      Condition.BANE,
    ];

    return this.getConditions(target).filter((c) => negative.includes(c));
  }

  /**
   * Get all positive conditions (buffs)
   */
  getPositiveConditions(target: Character): Condition[] {
    const positive = [
      Condition.STRENGTHEN,
      Condition.BLESS,
      Condition.REGENERATE,
      Condition.WARD,
      Condition.INVISIBLE,
    ];

    return this.getConditions(target).filter((c) => positive.includes(c));
  }

  /**
   * Get condition by category
   */
  getConditionsByCategory(
    target: Character,
    category: 'damage' | 'control' | 'buff' | 'debuff',
  ): Condition[] {
    const conditions = this.getConditions(target);

    switch (category) {
      case 'damage':
        // Conditions that deal damage
        return conditions.filter((c) => [Condition.POISON, Condition.WOUND, Condition.BANE].includes(c));

      case 'control':
        // Conditions that restrict actions
        return conditions.filter((c) =>
          [Condition.STUN, Condition.IMMOBILIZE, Condition.DISARM, Condition.MUDDLE].includes(c),
        );

      case 'buff':
        return this.getPositiveConditions(target);

      case 'debuff':
        return this.getNegativeConditions(target);

      default:
        return [];
    }
  }

  /**
   * Apply conditions from condition modifiers (plural)
   * Useful for applying multiple conditions at once
   */
  async applyConditions(
    target: Character,
    conditions: Array<{ condition: Condition; duration?: 'round' | 'persistent' | 'until-consumed' }>,
  ): Promise<void> {
    for (const cond of conditions) {
      await this.applyCondition(target, cond.condition, cond.duration || 'until-consumed');
    }
  }

  /**
   * Check if character is incapacitated (cannot act)
   */
  isIncapacitated(target: Character): boolean {
    // Use Character's built-in boolean getters
    return target.isStunned || target.isImmobilized || target.isDisarmed;
  }

  /**
   * Get condition description for UI/logging
   */
  getConditionDescription(condition: Condition): string {
    const descriptions: Record<Condition, string> = {
      [Condition.POISON]: 'Adds +1 damage to all attacks suffered',
      [Condition.WOUND]: 'Suffers 1 damage at start of each turn',
      [Condition.MUDDLE]: 'Suffers Disadvantage on all attacks',
      [Condition.IMMOBILIZE]: 'Cannot perform any move abilities',
      [Condition.DISARM]: 'Cannot perform any attack abilities',
      [Condition.STUN]: 'Loses entire next turn',
      [Condition.CURSE]: 'Negative card shuffled into attack modifier deck',
      [Condition.BRITTLE]: 'Next attack suffered deals double damage',
      [Condition.BANE]: 'Suffers 10 damage at start of next turn, then heals 2',
      [Condition.STRENGTHEN]: 'Performs all attacks with Advantage',
      [Condition.BLESS]: 'Positive card shuffled into attack modifier deck',
      [Condition.REGENERATE]: 'Performs automatic Heal 1 at start of turn',
      [Condition.WARD]: 'Next damage suffered is halved',
      [Condition.INVISIBLE]: 'Enemies cannot target with attacks or conditions',
    };

    return descriptions[condition] || 'Unknown condition';
  }
}
