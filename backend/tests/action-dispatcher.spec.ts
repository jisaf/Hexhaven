/**
 * Action Dispatcher Service Tests
 * Comprehensive test coverage for card action handling
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ActionDispatcherService } from '../src/services/action-dispatcher.service';
import { ConditionService } from '../src/services/condition.service';
import { ForcedMovementService } from '../src/services/forced-movement.service';
import { GameStateManager } from '../src/services/game-state.service';
import { DamageCalculationService } from '../src/services/damage-calculation.service';
import { ValidationService } from '../src/services/validation.service';
import { Character } from '../src/models/character.model';
import { Condition } from '../../shared/types/entities';
import { AttackAction, MoveAction, HealAction } from '../src/types/modifiers';

describe('ActionDispatcherService', () => {
  let service: ActionDispatcherService;
  let gameState: GameStateManager;
  let conditionService: ConditionService;
  let mockGameState: any;
  let mockConditionService: any;

  beforeEach(async () => {
    // Mock dependencies
    mockGameState = {
      getEntity: jest.fn(),
      getHex: jest.fn(),
      getEntitiesAt: jest.fn(),
      updateEntity: jest.fn(),
    };

    mockConditionService = {
      applyCondition: jest.fn(),
      removeCondition: jest.fn(),
      hasCondition: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActionDispatcherService,
        {
          provide: GameStateManager,
          useValue: mockGameState,
        },
        {
          provide: ConditionService,
          useValue: mockConditionService,
        },
        {
          provide: ForcedMovementService,
          useValue: {
            applyPush: jest.fn().mockResolvedValue({ success: true }),
            applyPull: jest.fn().mockResolvedValue({ success: true }),
          },
        },
        {
          provide: DamageCalculationService,
          useValue: {
            calculateDamage: jest.fn().mockReturnValue(5),
          },
        },
        {
          provide: ValidationService,
          useValue: {
            validateMovement: jest.fn().mockReturnValue({ valid: true }),
            validateAttack: jest.fn().mockReturnValue({ valid: true }),
          },
        },
      ],
    }).compile();

    service = module.get<ActionDispatcherService>(ActionDispatcherService);
    gameState = module.get<GameStateManager>(GameStateManager);
    conditionService = module.get<ConditionService>(ConditionService);
  });

  describe('Attack Actions', () => {
    it('should apply attack damage to target', async () => {
      const source = new Character({ id: 'attacker', position: { q: 0, r: 0 } });
      const target = new Character({ id: 'defender', position: { q: 1, r: 0 } });

      mockGameState.getEntity.mockResolvedValue(target);

      const action: AttackAction = {
        type: 'attack',
        value: 3,
      };

      const result = await service.applyAction(action, source, target.id);

      expect(result.success).toBe(true);
      expect(result.affectedEntities).toContain(target.id);
    });

    it('should prevent disarmed characters from attacking', async () => {
      const source = new Character({ id: 'attacker', position: { q: 0, r: 0 } });
      source.conditions.add(Condition.DISARM);
      const target = new Character({ id: 'defender', position: { q: 1, r: 0 } });

      const action: AttackAction = {
        type: 'attack',
        value: 3,
      };

      const result = await service.applyAction(action, source, target.id);

      expect(result.success).toBe(false);
    });

    it('should prevent stunned characters from attacking', async () => {
      const source = new Character({ id: 'attacker', position: { q: 0, r: 0 } });
      source.conditions.add(Condition.STUN);
      const target = new Character({ id: 'defender', position: { q: 1, r: 0 } });

      const action: AttackAction = {
        type: 'attack',
        value: 3,
      };

      const result = await service.applyAction(action, source, target.id);

      expect(result.success).toBe(false);
    });

    it('should apply conditions from attack modifiers', async () => {
      const source = new Character({ id: 'attacker', position: { q: 0, r: 0 } });
      const target = new Character({ id: 'defender', position: { q: 1, r: 0 } });

      mockGameState.getEntity.mockResolvedValue(target);

      const action: AttackAction = {
        type: 'attack',
        value: 2,
        modifiers: [
          { type: 'push', distance: 1 },
          { type: 'condition', condition: Condition.STUN, duration: 'round' },
        ],
      };

      const result = await service.applyAction(action, source, target.id);

      expect(result.success).toBe(true);
      expect(mockConditionService.applyCondition).toHaveBeenCalled();
    });
  });

  describe('Move Actions', () => {
    it('should apply move action without modifiers', async () => {
      const source = new Character({ id: 'character', position: { q: 0, r: 0 } });

      const action: MoveAction = {
        type: 'move',
        value: 3,
      };

      const result = await service.applyAction(action, source);

      expect(result.success).toBe(true);
      expect(result.appliedModifiers.length).toBe(0);
    });

    it('should prevent immobilized characters from moving', async () => {
      const source = new Character({ id: 'character', position: { q: 0, r: 0 } });
      source.conditions.add(Condition.IMMOBILIZE);

      const action: MoveAction = {
        type: 'move',
        value: 3,
      };

      const result = await service.applyAction(action, source);

      expect(result.success).toBe(false);
    });

    it('should prevent stunned characters from moving', async () => {
      const source = new Character({ id: 'character', position: { q: 0, r: 0 } });
      source.conditions.add(Condition.STUN);

      const action: MoveAction = {
        type: 'move',
        value: 3,
      };

      const result = await service.applyAction(action, source);

      expect(result.success).toBe(false);
    });

    it('should support jump modifier', async () => {
      const source = new Character({ id: 'character', position: { q: 0, r: 0 } });

      const action: MoveAction = {
        type: 'move',
        value: 3,
        modifiers: [{ type: 'jump' }],
      };

      const result = await service.applyAction(action, source);

      expect(result.success).toBe(true);
      expect(result.appliedModifiers).toContainEqual({ type: 'jump' });
    });
  });

  describe('Heal Actions', () => {
    it('should heal target character', async () => {
      const source = new Character({ id: 'healer', position: { q: 0, r: 0 } });
      const target = new Character({ id: 'ally', position: { q: 1, r: 0 }, health: 5, maxHealth: 10 });

      mockGameState.getEntity.mockResolvedValue(target);

      const action: HealAction = {
        type: 'heal',
        value: 3,
      };

      const result = await service.applyAction(action, source, target.id);

      expect(result.success).toBe(true);
      expect(result.affectedEntities).toContain(target.id);
    });

    it('should heal self if no target specified', async () => {
      const source = new Character({ id: 'healer', position: { q: 0, r: 0 }, health: 5, maxHealth: 10 });

      const action: HealAction = {
        type: 'heal',
        value: 3,
      };

      const result = await service.applyAction(action, source);

      expect(result.success).toBe(true);
      expect(result.affectedEntities).toContain(source.id);
    });

    it('should support heal with range modifier', async () => {
      const source = new Character({ id: 'healer', position: { q: 0, r: 0 } });
      const target = new Character({ id: 'ally', position: { q: 2, r: 0 }, health: 5, maxHealth: 10 });

      mockGameState.getEntity.mockResolvedValue(target);

      const action: HealAction = {
        type: 'heal',
        value: 3,
        modifiers: [{ type: 'range', distance: 2 }],
      };

      const result = await service.applyAction(action, source, target.id);

      expect(result.success).toBe(true);
    });
  });

  describe('Condition Modifiers', () => {
    it('should apply condition modifier', async () => {
      const target = new Character({ id: 'target', position: { q: 1, r: 0 } });

      await service.applyModifiers(
        [{ type: 'condition', condition: Condition.POISON, duration: 'round' }],
        new Character({ id: 'source', position: { q: 0, r: 0 } }),
        target,
      );

      expect(mockConditionService.applyCondition).toHaveBeenCalledWith(
        target,
        Condition.POISON,
        'round',
      );
    });

    it('should apply multiple conditions', async () => {
      const target = new Character({ id: 'target', position: { q: 1, r: 0 } });

      await service.applyModifiers(
        [
          { type: 'condition', condition: Condition.STUN, duration: 'round' },
          { type: 'condition', condition: Condition.WOUND, duration: 'until-consumed' },
        ],
        new Character({ id: 'source', position: { q: 0, r: 0 } }),
        target,
      );

      expect(mockConditionService.applyCondition).toHaveBeenCalledTimes(2);
    });
  });

  describe('Forced Movement Modifiers', () => {
    it('should apply push modifier', async () => {
      const source = new Character({ id: 'attacker', position: { q: 0, r: 0 } });
      const target = new Character({ id: 'defender', position: { q: 1, r: 0 } });

      const service = new ActionDispatcherService(
        mockGameState,
        mockConditionService,
        {
          applyPush: jest.fn().mockResolvedValue({ success: true }),
        } as any,
        {} as any,
        {} as any,
      );

      const result = await service.applyModifiers(
        [{ type: 'push', distance: 1 }],
        source,
        target,
      );

      expect(result.appliedModifiers).toContainEqual({ type: 'push', distance: 1 });
    });
  });

  describe('Shield & Retaliate Modifiers', () => {
    it('should apply shield modifier', async () => {
      const target = new Character({ id: 'character', position: { q: 0, r: 0 } });

      await service.applyModifiers(
        [{ type: 'shield', value: 2, duration: 'round' }],
        new Character({ id: 'source', position: { q: 0, r: 0 } }),
        target,
      );

      expect(target.metadata?.shield).toBeDefined();
      expect(target.metadata?.shield.value).toBe(2);
    });

    it('should apply retaliate modifier', async () => {
      const target = new Character({ id: 'character', position: { q: 0, r: 0 } });

      await service.applyModifiers(
        [{ type: 'retaliate', value: 2, duration: 'persistent' }],
        new Character({ id: 'source', position: { q: 0, r: 0 } }),
        target,
      );

      expect(target.metadata?.retaliate).toBeDefined();
      expect(target.metadata?.retaliate.value).toBe(2);
    });
  });

  describe('Special Actions', () => {
    it('should apply special action with modifiers', async () => {
      const source = new Character({ id: 'character', position: { q: 0, r: 0 } });

      const action = {
        type: 'special',
        modifiers: [
          { type: 'shield', value: 1, duration: 'persistent' },
          { type: 'retaliate', value: 1, duration: 'persistent' },
        ],
      };

      const result = await service.applyAction(action, source);

      expect(result.success).toBe(true);
      expect(result.appliedModifiers.length).toBe(2);
    });
  });
});
