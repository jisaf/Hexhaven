/**
 * Summon Model Tests (Issue #228)
 * TDD tests for the Summon entity model
 */

import { Summon, SummonData } from '../src/models/summon.model';
import { Condition } from '../../shared/types/entities';
import { SummonDefinition } from '../../shared/types/modifiers';

describe('Summon Model', () => {
  const baseSummonData: SummonData = {
    id: 'summon-1',
    roomId: 'room-1',
    ownerId: 'character-1',
    name: 'Mystic Ally',
    position: { q: 0, r: 0 },
    health: 4,
    maxHealth: 4,
    attack: 2,
    move: 3,
    range: 2,
    conditions: [],
    isDead: false,
    playerControlled: false,
    initiative: 15,
    typeIcon: 'ra-wolf-howl',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('Creation', () => {
    it('should create summon with valid SummonData', () => {
      const summon = new Summon(baseSummonData);

      expect(summon.id).toBe('summon-1');
      expect(summon.roomId).toBe('room-1');
      expect(summon.ownerId).toBe('character-1');
      expect(summon.name).toBe('Mystic Ally');
      expect(summon.position).toEqual({ q: 0, r: 0 });
    });

    it('should initialize health to provided value', () => {
      const summon = new Summon(baseSummonData);

      expect(summon.currentHealth).toBe(4);
      expect(summon.maxHealth).toBe(4);
    });

    it('should start with no conditions', () => {
      const summon = new Summon(baseSummonData);

      expect(summon.conditions).toEqual([]);
    });

    it('should allow undefined ownerId for scenario allies', () => {
      const scenarioAllyData = { ...baseSummonData, ownerId: undefined };
      const summon = new Summon(scenarioAllyData);

      expect(summon.ownerId).toBeUndefined();
      expect(summon.isScenarioAlly).toBe(true);
    });

    it('should correctly set playerControlled flag', () => {
      const playerControlledData = { ...baseSummonData, playerControlled: true };
      const summon = new Summon(playerControlledData);

      expect(summon.playerControlled).toBe(true);
    });

    it('should store initiative value', () => {
      const summon = new Summon(baseSummonData);

      expect(summon.initiative).toBe(15);
    });
  });

  describe('Static create method', () => {
    it('should create summon from SummonDefinition', () => {
      const definition: SummonDefinition = {
        name: 'Shadow Spirit',
        health: 6,
        attack: 3,
        move: 2,
        range: 0,
        typeIcon: 'ra-ghost',
      };

      const summon = Summon.create(
        'room-1',
        definition,
        { q: 1, r: 1 },
        'character-1',
        20,
      );

      expect(summon.name).toBe('Shadow Spirit');
      expect(summon.maxHealth).toBe(6);
      expect(summon.attack).toBe(3);
      expect(summon.move).toBe(2);
      expect(summon.range).toBe(0);
      expect(summon.ownerId).toBe('character-1');
      expect(summon.initiative).toBe(20);
      expect(summon.typeIcon).toBe('ra-ghost');
    });

    it('should create scenario ally without ownerId', () => {
      const definition: SummonDefinition = {
        name: 'Escort NPC',
        health: 8,
        attack: 1,
        move: 2,
        range: 0,
        initiative: 50, // Scenario allies have their own initiative
      };

      const summon = Summon.create(
        'room-1',
        definition,
        { q: 2, r: 2 },
        undefined,
        definition.initiative!,
      );

      expect(summon.ownerId).toBeUndefined();
      expect(summon.initiative).toBe(50);
      expect(summon.isScenarioAlly).toBe(true);
    });

    it('should respect playerControlled from definition', () => {
      const definition: SummonDefinition = {
        name: 'Controllable Companion',
        health: 5,
        attack: 2,
        move: 3,
        range: 1,
        playerControlled: true,
      };

      const summon = Summon.create('room-1', definition, { q: 0, r: 0 }, 'char-1', 10);

      expect(summon.playerControlled).toBe(true);
    });
  });

  describe('Movement', () => {
    it('should move to new position', () => {
      const summon = new Summon(baseSummonData);

      summon.moveTo({ q: 1, r: 1 });

      expect(summon.position).toEqual({ q: 1, r: 1 });
    });

    it('should throw error if immobilized', () => {
      const summon = new Summon(baseSummonData);
      summon.addCondition(Condition.IMMOBILIZE);

      expect(() => summon.moveTo({ q: 1, r: 1 })).toThrow('immobilized');
    });

    it('should throw error if stunned', () => {
      const summon = new Summon(baseSummonData);
      summon.addCondition(Condition.STUN);

      expect(() => summon.moveTo({ q: 1, r: 1 })).toThrow('stunned');
    });

    it('should throw error if dead', () => {
      const summon = new Summon({ ...baseSummonData, isDead: true });

      expect(() => summon.moveTo({ q: 1, r: 1 })).toThrow('dead');
    });
  });

  describe('Damage', () => {
    it('should take damage and track health', () => {
      const summon = new Summon(baseSummonData);

      const actualDamage = summon.takeDamage(2);

      expect(actualDamage).toBe(2);
      expect(summon.currentHealth).toBe(2);
    });

    it('should die when health reaches 0', () => {
      const summon = new Summon(baseSummonData);

      summon.takeDamage(4);

      expect(summon.currentHealth).toBe(0);
      expect(summon.isDead).toBe(true);
    });

    it('should not take more damage than remaining health', () => {
      const summon = new Summon(baseSummonData);

      const actualDamage = summon.takeDamage(10);

      expect(actualDamage).toBe(4);
      expect(summon.currentHealth).toBe(0);
    });

    it('should return 0 if already dead', () => {
      const summon = new Summon({ ...baseSummonData, isDead: true, health: 0 });

      const actualDamage = summon.takeDamage(5);

      expect(actualDamage).toBe(0);
    });
  });

  describe('Conditions', () => {
    it('should apply conditions', () => {
      const summon = new Summon(baseSummonData);

      summon.addCondition(Condition.POISON);

      expect(summon.conditions).toContain(Condition.POISON);
    });

    it('should remove conditions', () => {
      const summon = new Summon({ ...baseSummonData, conditions: [Condition.WOUND] });

      summon.removeCondition(Condition.WOUND);

      expect(summon.conditions).not.toContain(Condition.WOUND);
    });

    it('should check isStunned', () => {
      const summon = new Summon(baseSummonData);
      summon.addCondition(Condition.STUN);

      expect(summon.isStunned).toBe(true);
    });

    it('should check isImmobilized', () => {
      const summon = new Summon(baseSummonData);
      summon.addCondition(Condition.IMMOBILIZE);

      expect(summon.isImmobilized).toBe(true);
    });

    it('should check isDisarmed', () => {
      const summon = new Summon(baseSummonData);
      summon.addCondition(Condition.DISARM);

      expect(summon.isDisarmed).toBe(true);
    });
  });

  describe('Kill method', () => {
    it('should kill the summon with a reason', () => {
      const summon = new Summon(baseSummonData);

      summon.kill('owner_exhausted');

      expect(summon.isDead).toBe(true);
      expect(summon.currentHealth).toBe(0);
      expect(summon.deathReason).toBe('owner_exhausted');
    });

    it('should default to damage reason', () => {
      const summon = new Summon(baseSummonData);

      summon.kill();

      expect(summon.deathReason).toBe('damage');
    });
  });

  describe('Serialization', () => {
    it('should serialize to JSON correctly', () => {
      const summon = new Summon(baseSummonData);

      const json = summon.toJSON();

      expect(json.id).toBe('summon-1');
      expect(json.name).toBe('Mystic Ally');
      expect(json.ownerId).toBe('character-1');
      expect(json.position).toEqual({ q: 0, r: 0 });
    });

    it('should deserialize from JSON correctly', () => {
      const original = new Summon(baseSummonData);
      const json = original.toJSON();

      const restored = Summon.fromJSON(json);

      expect(restored.id).toBe(original.id);
      expect(restored.name).toBe(original.name);
      expect(restored.currentHealth).toBe(original.currentHealth);
    });
  });

  describe('Helper properties', () => {
    it('should identify scenario ally correctly', () => {
      const playerSummon = new Summon(baseSummonData);
      const scenarioAlly = new Summon({ ...baseSummonData, ownerId: undefined });

      expect(playerSummon.isScenarioAlly).toBe(false);
      expect(scenarioAlly.isScenarioAlly).toBe(true);
    });

    it('should provide canAct status', () => {
      const summon = new Summon(baseSummonData);
      expect(summon.canAct).toBe(true);

      summon.addCondition(Condition.STUN);
      expect(summon.canAct).toBe(false);
    });

    it('should provide canMove status', () => {
      const summon = new Summon(baseSummonData);
      expect(summon.canMove).toBe(true);

      summon.addCondition(Condition.IMMOBILIZE);
      expect(summon.canMove).toBe(false);
    });

    it('should provide canAttack status', () => {
      const summon = new Summon(baseSummonData);
      expect(summon.canAttack).toBe(true);

      summon.addCondition(Condition.DISARM);
      expect(summon.canAttack).toBe(false);
    });
  });
});
