/**
 * Condition Service Tests
 * Tests for condition application, removal, and expiration
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConditionService, ConditionState } from '../src/services/condition.service';
import { Character } from '../src/models/character.model';
import { Condition } from '../../shared/types/entities';

describe('ConditionService', () => {
  let service: ConditionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConditionService],
    }).compile();

    service = module.get<ConditionService>(ConditionService);
  });

  describe('Apply Conditions', () => {
    it('should apply single condition to character', async () => {
      const character = new Character({ id: 'test', position: { q: 0, r: 0 } });

      await service.applyCondition(character, Condition.POISON);

      expect(service.hasCondition(character, Condition.POISON)).toBe(true);
    });

    it('should apply multiple conditions', async () => {
      const character = new Character({ id: 'test', position: { q: 0, r: 0 } });

      await service.applyCondition(character, Condition.POISON);
      await service.applyCondition(character, Condition.WOUND);
      await service.applyCondition(character, Condition.STUN);

      expect(service.getConditions(character)).toContain(Condition.POISON);
      expect(service.getConditions(character)).toContain(Condition.WOUND);
      expect(service.getConditions(character)).toContain(Condition.STUN);
    });

    it('should not add duplicate conditions', async () => {
      const character = new Character({ id: 'test', position: { q: 0, r: 0 } });

      await service.applyCondition(character, Condition.POISON);
      await service.applyCondition(character, Condition.POISON);

      expect(service.getConditions(character).filter((c) => c === Condition.POISON).length).toBe(1);
    });

    it('should track condition duration', async () => {
      const character = new Character({ id: 'test', position: { q: 0, r: 0 } });

      await service.applyCondition(character, Condition.POISON, 'round');

      const state = service.getConditionState(character, Condition.POISON);
      expect(state?.duration).toBe('round');
    });

    it('should store condition metadata', async () => {
      const character = new Character({ id: 'test', position: { q: 0, r: 0 } });
      const metadata = { intensity: 'high', source: 'trap' };

      await service.applyCondition(character, Condition.POISON, 'round', metadata);

      const state = service.getConditionState(character, Condition.POISON);
      expect(state?.metadata).toEqual(metadata);
    });
  });

  describe('Remove Conditions', () => {
    it('should remove condition from character', async () => {
      const character = new Character({ id: 'test', position: { q: 0, r: 0 } });

      await service.applyCondition(character, Condition.POISON);
      expect(service.hasCondition(character, Condition.POISON)).toBe(true);

      await service.removeCondition(character, Condition.POISON);
      expect(service.hasCondition(character, Condition.POISON)).toBe(false);
    });

    it('should not affect other conditions when removing one', async () => {
      const character = new Character({ id: 'test', position: { q: 0, r: 0 } });

      await service.applyCondition(character, Condition.POISON);
      await service.applyCondition(character, Condition.WOUND);

      await service.removeCondition(character, Condition.POISON);

      expect(service.hasCondition(character, Condition.POISON)).toBe(false);
      expect(service.hasCondition(character, Condition.WOUND)).toBe(true);
    });

    it('should safely handle removing non-existent condition', async () => {
      const character = new Character({ id: 'test', position: { q: 0, r: 0 } });

      // Should not throw
      await service.removeCondition(character, Condition.POISON);

      expect(service.hasCondition(character, Condition.POISON)).toBe(false);
    });
  });

  describe('Clear Conditions', () => {
    it('should remove all conditions', async () => {
      const character = new Character({ id: 'test', position: { q: 0, r: 0 } });

      await service.applyCondition(character, Condition.POISON);
      await service.applyCondition(character, Condition.WOUND);
      await service.applyCondition(character, Condition.STUN);

      await service.clearConditions(character);

      expect(service.getConditions(character).length).toBe(0);
    });
  });

  describe('Condition Expiration', () => {
    it('should expire round-based conditions after one round', async () => {
      const character = new Character({ id: 'test', position: { q: 0, r: 0 } });

      const roundApplied = 5;
      await service.applyCondition(character, Condition.STUN, 'round');

      // Manually set round number for testing
      const state = service.getConditionState(character, Condition.STUN);
      if (state) {
        state.roundNumber = roundApplied;
      }

      const expired = await service.expireRoundBasedConditions(character, roundApplied + 1);

      expect(expired).toContain(Condition.STUN);
      expect(service.hasCondition(character, Condition.STUN)).toBe(false);
    });

    it('should not expire persistent conditions', async () => {
      const character = new Character({ id: 'test', position: { q: 0, r: 0 } });

      const roundApplied = 5;
      await service.applyCondition(character, Condition.POISON, 'persistent');

      const state = service.getConditionState(character, Condition.POISON);
      if (state) {
        state.roundNumber = roundApplied;
      }

      const expired = await service.expireRoundBasedConditions(character, roundApplied + 1);

      expect(expired).not.toContain(Condition.POISON);
      expect(service.hasCondition(character, Condition.POISON)).toBe(true);
    });

    it('should not expire until-consumed conditions on round expiration', async () => {
      const character = new Character({ id: 'test', position: { q: 0, r: 0 } });

      await service.applyCondition(character, Condition.WOUND, 'until-consumed');

      const state = service.getConditionState(character, Condition.WOUND);
      if (state) {
        state.roundNumber = 5;
      }

      const expired = await service.expireRoundBasedConditions(character, 6);

      expect(expired).not.toContain(Condition.WOUND);
      expect(service.hasCondition(character, Condition.WOUND)).toBe(true);
    });
  });

  describe('Consume Conditions', () => {
    it('should consume until-consumed condition', async () => {
      const character = new Character({ id: 'test', position: { q: 0, r: 0 } });

      await service.applyCondition(character, Condition.POISON, 'until-consumed');
      const consumed = await service.consumeCondition(character, Condition.POISON);

      expect(consumed).toBe(true);
      expect(service.hasCondition(character, Condition.POISON)).toBe(false);
    });

    it('should not consume round-based conditions', async () => {
      const character = new Character({ id: 'test', position: { q: 0, r: 0 } });

      await service.applyCondition(character, Condition.POISON, 'round');
      const consumed = await service.consumeCondition(character, Condition.POISON);

      expect(consumed).toBe(false);
      expect(service.hasCondition(character, Condition.POISON)).toBe(true);
    });

    it('should not consume non-existent condition', async () => {
      const character = new Character({ id: 'test', position: { q: 0, r: 0 } });

      const consumed = await service.consumeCondition(character, Condition.POISON);

      expect(consumed).toBe(false);
    });
  });

  describe('Condition Categorization', () => {
    it('should identify negative conditions', async () => {
      const character = new Character({ id: 'test', position: { q: 0, r: 0 } });

      await service.applyCondition(character, Condition.POISON);
      await service.applyCondition(character, Condition.WOUND);
      await service.applyCondition(character, Condition.STRENGTHEN); // Positive

      const negative = service.getNegativeConditions(character);

      expect(negative).toContain(Condition.POISON);
      expect(negative).toContain(Condition.WOUND);
      expect(negative).not.toContain(Condition.STRENGTHEN);
    });

    it('should identify positive conditions', async () => {
      const character = new Character({ id: 'test', position: { q: 0, r: 0 } });

      await service.applyCondition(character, Condition.STRENGTHEN);
      await service.applyCondition(character, Condition.BLESS);
      await service.applyCondition(character, Condition.POISON); // Negative

      const positive = service.getPositiveConditions(character);

      expect(positive).toContain(Condition.STRENGTHEN);
      expect(positive).toContain(Condition.BLESS);
      expect(positive).not.toContain(Condition.POISON);
    });

    it('should categorize conditions by type', async () => {
      const character = new Character({ id: 'test', position: { q: 0, r: 0 } });

      await service.applyCondition(character, Condition.POISON);
      await service.applyCondition(character, Condition.STUN);
      await service.applyCondition(character, Condition.STRENGTHEN);

      const damageConditions = service.getConditionsByCategory(character, 'damage');
      const controlConditions = service.getConditionsByCategory(character, 'control');
      const buffConditions = service.getConditionsByCategory(character, 'buff');

      expect(damageConditions).toContain(Condition.POISON);
      expect(controlConditions).toContain(Condition.STUN);
      expect(buffConditions).toContain(Condition.STRENGTHEN);
    });
  });

  describe('Incapacitation Check', () => {
    it('should identify incapacitated characters', async () => {
      const character = new Character({ id: 'test', position: { q: 0, r: 0 } });

      expect(service.isIncapacitated(character)).toBe(false);

      await service.applyCondition(character, Condition.STUN);
      expect(service.isIncapacitated(character)).toBe(true);

      await service.removeCondition(character, Condition.STUN);
      await service.applyCondition(character, Condition.IMMOBILIZE);
      expect(service.isIncapacitated(character)).toBe(true);

      await service.removeCondition(character, Condition.IMMOBILIZE);
      await service.applyCondition(character, Condition.DISARM);
      expect(service.isIncapacitated(character)).toBe(true);

      await service.removeCondition(character, Condition.DISARM);
      expect(service.isIncapacitated(character)).toBe(false);
    });
  });

  describe('Condition Descriptions', () => {
    it('should provide description for each condition', () => {
      const conditions = [
        Condition.POISON,
        Condition.WOUND,
        Condition.STUN,
        Condition.STRENGTHEN,
        Condition.BLESS,
      ];

      for (const condition of conditions) {
        const description = service.getConditionDescription(condition);
        expect(description).toBeTruthy();
        expect(description.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Multiple Conditions Application', () => {
    it('should apply multiple conditions at once', async () => {
      const character = new Character({ id: 'test', position: { q: 0, r: 0 } });

      await service.applyConditions(character, [
        { condition: Condition.POISON },
        { condition: Condition.WOUND, duration: 'round' },
        { condition: Condition.STUN, duration: 'persistent' },
      ]);

      expect(service.hasCondition(character, Condition.POISON)).toBe(true);
      expect(service.hasCondition(character, Condition.WOUND)).toBe(true);
      expect(service.hasCondition(character, Condition.STUN)).toBe(true);
    });
  });
});
