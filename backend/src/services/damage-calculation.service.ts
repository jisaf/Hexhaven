/**
 * Damage Calculation Service (US2 - T093)
 *
 * Handles combat damage calculations:
 * - Apply attack modifier cards
 * - Handle advantage/disadvantage
 * - Apply shield, pierce, retaliate
 * - Calculate final damage
 */

import { Injectable } from '@nestjs/common';
import { AttackModifierCard } from '../../../shared/types/entities';

@Injectable()
export class DamageCalculationService {
  /**
   * Calculate final damage from base attack and modifier card
   */
  calculateDamage(baseAttack: number, modifier: AttackModifierCard): number {
    // Null modifier = miss (0 damage)
    if (modifier.modifier === 'null') {
      return 0;
    }

    // x2 modifier = double damage
    if (modifier.modifier === 'x2') {
      return baseAttack * 2;
    }

    // Numeric modifier
    const modifierValue =
      typeof modifier.modifier === 'number' ? modifier.modifier : 0;
    const damage = baseAttack + modifierValue;

    // Damage can't go below 0
    return Math.max(0, damage);
  }

  /**
   * Apply shield value to reduce damage
   */
  applyShield(damage: number, shieldValue: number, isNull: boolean): number {
    // Shield doesn't apply to null modifiers (misses)
    if (isNull) {
      return damage;
    }

    const reducedDamage = damage - shieldValue;
    return Math.max(0, reducedDamage);
  }

  /**
   * Extract effects from modifier card
   */
  extractEffects(modifier: AttackModifierCard): string[] {
    return modifier.effects || [];
  }

  /**
   * Apply advantage (draw 2, use better)
   */
  applyAdvantage(
    modifiers: [AttackModifierCard, AttackModifierCard],
  ): AttackModifierCard {
    const [mod1, mod2] = modifiers;
    return this.compareModifiers(mod1, mod2) >= 0 ? mod1 : mod2;
  }

  /**
   * Apply disadvantage (draw 2, use worse)
   */
  applyDisadvantage(
    modifiers: [AttackModifierCard, AttackModifierCard],
  ): AttackModifierCard {
    const [mod1, mod2] = modifiers;
    return this.compareModifiers(mod1, mod2) <= 0 ? mod1 : mod2;
  }

  /**
   * Compare two modifiers (positive = first is better)
   */
  compareModifiers(mod1: AttackModifierCard, mod2: AttackModifierCard): number {
    const value1 = this.getModifierValue(mod1);
    const value2 = this.getModifierValue(mod2);
    return value1 - value2;
  }

  /**
   * Apply retaliate damage to attacker
   */
  applyRetaliate(
    attackerHealth: number,
    retaliateValue: number,
    isRangedAttack: boolean,
  ): number {
    // Retaliate only applies to melee attacks
    if (isRangedAttack) {
      return attackerHealth;
    }

    const newHealth = attackerHealth - retaliateValue;
    return Math.max(0, newHealth);
  }

  /**
   * Apply pierce to ignore shield
   */
  applyPierce(
    damage: number,
    shieldValue: number,
    pierceValue: number,
  ): number {
    const effectiveShield = Math.max(0, shieldValue - pierceValue);
    const reducedDamage = damage - effectiveShield;
    return Math.max(0, reducedDamage);
  }

  /**
   * Check if modifier triggers reshuffle
   */
  isReshuffle(modifier: AttackModifierCard): boolean {
    return modifier.isReshuffle;
  }

  /**
   * Get numeric value of modifier for comparison
   */
  private getModifierValue(modifier: AttackModifierCard): number {
    if (modifier.modifier === 'x2') {
      return 100; // Highest value
    }
    if (modifier.modifier === 'null') {
      return -100; // Lowest value
    }
    return typeof modifier.modifier === 'number' ? modifier.modifier : 0;
  }
}
