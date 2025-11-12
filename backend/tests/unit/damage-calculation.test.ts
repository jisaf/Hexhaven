/**
 * Unit Test: Damage Calculation Service (US2 - T083)
 *
 * Tests attack damage calculation with modifiers:
 * - Base attack value from ability card
 * - Attack modifier deck draw (+2, +1, 0, -1, -2, null, x2)
 * - Advantage (draw 2, use better) and disadvantage (draw 2, use worse)
 * - Effects application (poison, wound, stun, etc.)
 * - Shield and armor reduction
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { DamageCalculationService } from '../../src/services/damage-calculation.service';
import { AttackModifierCard } from '../../../shared/types/entities';

describe('DamageCalculationService', () => {
  let damageService: DamageCalculationService;

  beforeEach(() => {
    damageService = new DamageCalculationService();
  });

  describe('calculateDamage', () => {
    it('should apply positive modifier to base damage', () => {
      const baseAttack = 5;
      const modifier: AttackModifierCard = { modifier: 2, isReshuffle: false };

      const damage = damageService.calculateDamage(baseAttack, modifier);

      expect(damage).toBe(7); // 5 + 2
    });

    it('should apply negative modifier to base damage', () => {
      const baseAttack = 5;
      const modifier: AttackModifierCard = { modifier: -1, isReshuffle: false };

      const damage = damageService.calculateDamage(baseAttack, modifier);

      expect(damage).toBe(4); // 5 - 1
    });

    it('should return 0 damage for null modifier (miss)', () => {
      const baseAttack = 5;
      const modifier: AttackModifierCard = {
        modifier: 'null',
        isReshuffle: true,
      };

      const damage = damageService.calculateDamage(baseAttack, modifier);

      expect(damage).toBe(0); // Miss
    });

    it('should double damage for x2 modifier (critical)', () => {
      const baseAttack = 5;
      const modifier: AttackModifierCard = { modifier: 'x2', isReshuffle: true };

      const damage = damageService.calculateDamage(baseAttack, modifier);

      expect(damage).toBe(10); // 5 * 2
    });

    it('should not reduce damage below 0', () => {
      const baseAttack = 2;
      const modifier: AttackModifierCard = { modifier: -2, isReshuffle: false };

      const damage = damageService.calculateDamage(baseAttack, modifier);

      expect(damage).toBe(0); // Cannot go negative
    });

    it('should handle zero base attack', () => {
      const baseAttack = 0;
      const modifier: AttackModifierCard = { modifier: 2, isReshuffle: false };

      const damage = damageService.calculateDamage(baseAttack, modifier);

      expect(damage).toBe(2); // 0 + 2
    });

    it('should apply zero modifier correctly', () => {
      const baseAttack = 5;
      const modifier: AttackModifierCard = { modifier: 0, isReshuffle: false };

      const damage = damageService.calculateDamage(baseAttack, modifier);

      expect(damage).toBe(5); // 5 + 0
    });

    it('should handle large positive modifiers', () => {
      const baseAttack = 3;
      const modifier: AttackModifierCard = { modifier: 5, isReshuffle: false };

      const damage = damageService.calculateDamage(baseAttack, modifier);

      expect(damage).toBe(8); // 3 + 5
    });

    it('should double zero base attack with x2', () => {
      const baseAttack = 0;
      const modifier: AttackModifierCard = { modifier: 'x2', isReshuffle: true };

      const damage = damageService.calculateDamage(baseAttack, modifier);

      expect(damage).toBe(0); // 0 * 2 = 0
    });
  });

  describe('applyShield', () => {
    it('should reduce damage by shield value', () => {
      const incomingDamage = 7;
      const shieldValue = 2;
      const isNull = false;

      const finalDamage = damageService.applyShield(
        incomingDamage,
        shieldValue,
        isNull,
      );

      expect(finalDamage).toBe(5); // 7 - 2
    });

    it('should not reduce damage below 0 with shield', () => {
      const incomingDamage = 3;
      const shieldValue = 5; // Shield higher than damage
      const isNull = false;

      const finalDamage = damageService.applyShield(
        incomingDamage,
        shieldValue,
        isNull,
      );

      expect(finalDamage).toBe(0); // Cannot go negative
    });

    it('should not apply shield to null modifier (miss)', () => {
      const incomingDamage = 0; // Already 0 from null modifier
      const shieldValue = 2;
      const isNull = true;

      const finalDamage = damageService.applyShield(
        incomingDamage,
        shieldValue,
        isNull,
      );

      expect(finalDamage).toBe(0);
    });

    it('should handle zero shield value', () => {
      const incomingDamage = 7;
      const shieldValue = 0;
      const isNull = false;

      const finalDamage = damageService.applyShield(
        incomingDamage,
        shieldValue,
        isNull,
      );

      expect(finalDamage).toBe(7); // No shield reduction
    });

    it('should completely block damage when shield equals damage', () => {
      const incomingDamage = 4;
      const shieldValue = 4;
      const isNull = false;

      const finalDamage = damageService.applyShield(
        incomingDamage,
        shieldValue,
        isNull,
      );

      expect(finalDamage).toBe(0);
    });
  });

  describe('extractEffects', () => {
    it('should extract effects from attack modifier card', () => {
      const modifier: AttackModifierCard = {
        modifier: 1,
        isReshuffle: false,
        effects: ['poison', 'push 2'],
      };

      const effects = damageService.extractEffects(modifier);

      expect(effects).toContain('poison');
      expect(effects).toContain('push 2');
      expect(effects).toHaveLength(2);
    });

    it('should return empty array if no effects', () => {
      const modifier: AttackModifierCard = {
        modifier: 0,
        isReshuffle: false,
      };

      const effects = damageService.extractEffects(modifier);

      expect(effects).toEqual([]);
    });

    it('should handle effects on null modifier', () => {
      // Some curse cards have effects even on miss
      const modifier: AttackModifierCard = {
        modifier: 'null',
        isReshuffle: true,
        effects: ['curse'],
      };

      const effects = damageService.extractEffects(modifier);

      expect(effects).toContain('curse');
    });

    it('should handle multiple effects', () => {
      const modifier: AttackModifierCard = {
        modifier: 2,
        isReshuffle: false,
        effects: ['poison', 'wound', 'stun'],
      };

      const effects = damageService.extractEffects(modifier);

      expect(effects).toHaveLength(3);
      expect(effects).toEqual(['poison', 'wound', 'stun']);
    });

    it('should handle effects on x2 modifier', () => {
      const modifier: AttackModifierCard = {
        modifier: 'x2',
        isReshuffle: true,
        effects: ['strengthen'],
      };

      const effects = damageService.extractEffects(modifier);

      expect(effects).toContain('strengthen');
    });
  });

  describe('applyAdvantage', () => {
    it('should draw 2 modifiers and use better one', () => {
      const modifier1: AttackModifierCard = {
        modifier: -1,
        isReshuffle: false,
      };
      const modifier2: AttackModifierCard = { modifier: 2, isReshuffle: false };

      const usedModifier = damageService.applyAdvantage([modifier1, modifier2]);

      expect(usedModifier).toBe(modifier2); // +2 is better than -1
    });

    it('should prefer x2 over numeric modifiers', () => {
      const modifier1: AttackModifierCard = { modifier: 2, isReshuffle: false };
      const modifier2: AttackModifierCard = {
        modifier: 'x2',
        isReshuffle: true,
      };

      const usedModifier = damageService.applyAdvantage([modifier1, modifier2]);

      expect(usedModifier).toBe(modifier2); // x2 is better
    });

    it('should prefer any damage over null modifier', () => {
      const modifier1: AttackModifierCard = {
        modifier: 'null',
        isReshuffle: true,
      };
      const modifier2: AttackModifierCard = {
        modifier: -2,
        isReshuffle: false,
      };

      const usedModifier = damageService.applyAdvantage([modifier1, modifier2]);

      expect(usedModifier).toBe(modifier2); // -2 is better than null (miss)
    });

    it('should choose higher positive modifier when both are positive', () => {
      const modifier1: AttackModifierCard = { modifier: 1, isReshuffle: false };
      const modifier2: AttackModifierCard = { modifier: 2, isReshuffle: false };

      const usedModifier = damageService.applyAdvantage([modifier1, modifier2]);

      expect(usedModifier).toBe(modifier2); // +2 > +1
    });

    it('should choose zero over negative modifier', () => {
      const modifier1: AttackModifierCard = {
        modifier: -1,
        isReshuffle: false,
      };
      const modifier2: AttackModifierCard = { modifier: 0, isReshuffle: false };

      const usedModifier = damageService.applyAdvantage([modifier1, modifier2]);

      expect(usedModifier).toBe(modifier2); // 0 > -1
    });
  });

  describe('applyDisadvantage', () => {
    it('should draw 2 modifiers and use worse one', () => {
      const modifier1: AttackModifierCard = {
        modifier: -1,
        isReshuffle: false,
      };
      const modifier2: AttackModifierCard = { modifier: 2, isReshuffle: false };

      const usedModifier = damageService.applyDisadvantage([
        modifier1,
        modifier2,
      ]);

      expect(usedModifier).toBe(modifier1); // -1 is worse than +2
    });

    it('should prefer null over any damage modifier', () => {
      const modifier1: AttackModifierCard = {
        modifier: 'null',
        isReshuffle: true,
      };
      const modifier2: AttackModifierCard = { modifier: 2, isReshuffle: false };

      const usedModifier = damageService.applyDisadvantage([
        modifier1,
        modifier2,
      ]);

      expect(usedModifier).toBe(modifier1); // null (miss) is worse
    });

    it('should prefer lower numeric modifier when both are numbers', () => {
      const modifier1: AttackModifierCard = {
        modifier: -2,
        isReshuffle: false,
      };
      const modifier2: AttackModifierCard = { modifier: 1, isReshuffle: false };

      const usedModifier = damageService.applyDisadvantage([
        modifier1,
        modifier2,
      ]);

      expect(usedModifier).toBe(modifier1); // -2 is worse
    });

    it('should choose negative over zero modifier', () => {
      const modifier1: AttackModifierCard = { modifier: 0, isReshuffle: false };
      const modifier2: AttackModifierCard = {
        modifier: -1,
        isReshuffle: false,
      };

      const usedModifier = damageService.applyDisadvantage([
        modifier1,
        modifier2,
      ]);

      expect(usedModifier).toBe(modifier2); // -1 < 0
    });

    it('should choose null over x2', () => {
      const modifier1: AttackModifierCard = {
        modifier: 'x2',
        isReshuffle: true,
      };
      const modifier2: AttackModifierCard = {
        modifier: 'null',
        isReshuffle: true,
      };

      const usedModifier = damageService.applyDisadvantage([
        modifier1,
        modifier2,
      ]);

      expect(usedModifier).toBe(modifier2); // null is worst
    });
  });

  describe('compareModifiers', () => {
    it('should rank x2 as best modifier', () => {
      const x2: AttackModifierCard = { modifier: 'x2', isReshuffle: true };
      const plus2: AttackModifierCard = { modifier: 2, isReshuffle: false };

      const comparison = damageService.compareModifiers(x2, plus2);

      expect(comparison).toBeGreaterThan(0); // x2 ranks higher
    });

    it('should rank null as worst modifier', () => {
      const nullMod: AttackModifierCard = {
        modifier: 'null',
        isReshuffle: true,
      };
      const minus2: AttackModifierCard = { modifier: -2, isReshuffle: false };

      const comparison = damageService.compareModifiers(nullMod, minus2);

      expect(comparison).toBeLessThan(0); // null ranks lower
    });

    it('should rank numeric modifiers by value', () => {
      const plus1: AttackModifierCard = { modifier: 1, isReshuffle: false };
      const minus1: AttackModifierCard = { modifier: -1, isReshuffle: false };

      const comparison = damageService.compareModifiers(plus1, minus1);

      expect(comparison).toBeGreaterThan(0); // +1 > -1
    });

    it('should return 0 for equal modifiers', () => {
      const mod1: AttackModifierCard = { modifier: 1, isReshuffle: false };
      const mod2: AttackModifierCard = { modifier: 1, isReshuffle: false };

      const comparison = damageService.compareModifiers(mod1, mod2);

      expect(comparison).toBe(0); // Equal
    });

    it('should correctly compare positive and zero', () => {
      const zero: AttackModifierCard = { modifier: 0, isReshuffle: false };
      const plus2: AttackModifierCard = { modifier: 2, isReshuffle: false };

      const comparison = damageService.compareModifiers(plus2, zero);

      expect(comparison).toBeGreaterThan(0); // +2 > 0
    });
  });

  describe('applyRetaliate', () => {
    it('should deal damage back to attacker', () => {
      const retaliateValue = 2;
      const attackerHealth = 10;
      const isRangedAttack = false;

      const newHealth = damageService.applyRetaliate(
        attackerHealth,
        retaliateValue,
        isRangedAttack,
      );

      expect(newHealth).toBe(8); // 10 - 2
    });

    it('should not trigger retaliate on ranged attacks', () => {
      const retaliateValue = 2;
      const attackerHealth = 10;
      const isRangedAttack = true;

      const newHealth = damageService.applyRetaliate(
        attackerHealth,
        retaliateValue,
        isRangedAttack,
      );

      expect(newHealth).toBe(10); // No damage (ranged immune to retaliate)
    });

    it('should not reduce attacker health below 0', () => {
      const retaliateValue = 5;
      const attackerHealth = 3;
      const isRangedAttack = false;

      const newHealth = damageService.applyRetaliate(
        attackerHealth,
        retaliateValue,
        isRangedAttack,
      );

      expect(newHealth).toBe(0); // Capped at 0
    });

    it('should handle zero retaliate value', () => {
      const retaliateValue = 0;
      const attackerHealth = 10;
      const isRangedAttack = false;

      const newHealth = damageService.applyRetaliate(
        attackerHealth,
        retaliateValue,
        isRangedAttack,
      );

      expect(newHealth).toBe(10); // No retaliate damage
    });

    it('should handle exact lethal retaliate', () => {
      const retaliateValue = 5;
      const attackerHealth = 5;
      const isRangedAttack = false;

      const newHealth = damageService.applyRetaliate(
        attackerHealth,
        retaliateValue,
        isRangedAttack,
      );

      expect(newHealth).toBe(0); // Exactly lethal
    });
  });

  describe('applyPierce', () => {
    it('should ignore shield up to pierce value', () => {
      const damage = 7;
      const shieldValue = 3;
      const pierceValue = 2;

      // Pierce 2 reduces shield from 3 to 1
      const finalDamage = damageService.applyPierce(
        damage,
        shieldValue,
        pierceValue,
      );

      expect(finalDamage).toBe(6); // 7 - (3 - 2) = 7 - 1 = 6
    });

    it('should completely ignore shield if pierce >= shield', () => {
      const damage = 7;
      const shieldValue = 2;
      const pierceValue = 3; // Pierce exceeds shield

      const finalDamage = damageService.applyPierce(
        damage,
        shieldValue,
        pierceValue,
      );

      expect(finalDamage).toBe(7); // Shield completely ignored
    });

    it('should not increase damage', () => {
      const damage = 7;
      const shieldValue = 0; // No shield
      const pierceValue = 3;

      const finalDamage = damageService.applyPierce(
        damage,
        shieldValue,
        pierceValue,
      );

      expect(finalDamage).toBe(7); // Pierce doesn't add damage
    });

    it('should handle pierce equal to shield', () => {
      const damage = 5;
      const shieldValue = 2;
      const pierceValue = 2;

      const finalDamage = damageService.applyPierce(
        damage,
        shieldValue,
        pierceValue,
      );

      expect(finalDamage).toBe(5); // Shield completely negated
    });

    it('should handle zero pierce value', () => {
      const damage = 10;
      const shieldValue = 3;
      const pierceValue = 0;

      const finalDamage = damageService.applyPierce(
        damage,
        shieldValue,
        pierceValue,
      );

      expect(finalDamage).toBe(7); // Normal shield application
    });

    it('should not allow negative final damage', () => {
      const damage = 2;
      const shieldValue = 5;
      const pierceValue = 1;

      const finalDamage = damageService.applyPierce(
        damage,
        shieldValue,
        pierceValue,
      );

      expect(finalDamage).toBe(0); // Cannot go negative
    });
  });

  describe('isReshuffle', () => {
    it('should identify reshuffle modifiers (null)', () => {
      const nullMod: AttackModifierCard = {
        modifier: 'null',
        isReshuffle: true,
      };

      expect(damageService.isReshuffle(nullMod)).toBe(true);
    });

    it('should identify reshuffle modifiers (x2)', () => {
      const x2Mod: AttackModifierCard = { modifier: 'x2', isReshuffle: true };

      expect(damageService.isReshuffle(x2Mod)).toBe(true);
    });

    it('should identify non-reshuffle modifiers', () => {
      const normalMod: AttackModifierCard = {
        modifier: 1,
        isReshuffle: false,
      };

      expect(damageService.isReshuffle(normalMod)).toBe(false);
    });

    it('should identify non-reshuffle zero modifier', () => {
      const zeroMod: AttackModifierCard = { modifier: 0, isReshuffle: false };

      expect(damageService.isReshuffle(zeroMod)).toBe(false);
    });

    it('should identify non-reshuffle negative modifier', () => {
      const negativeMod: AttackModifierCard = {
        modifier: -2,
        isReshuffle: false,
      };

      expect(damageService.isReshuffle(negativeMod)).toBe(false);
    });
  });
});
