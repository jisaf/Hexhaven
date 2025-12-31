/**
 * Unit Tests: Action Execution Service (Issue #411)
 *
 * Tests for the unified action execution system:
 * - Reads action definitions from ability cards
 * - Executes actions based on type (move, attack, heal, loot, summon, etc.)
 * - Returns comprehensive action results
 * - Handles modifiers and effects
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ActionExecutionService, ActionExecutionResult } from '../../src/services/action-execution.service';
import { AbilityCardService } from '../../src/services/ability-card.service';
import { ActionDispatcherService } from '../../src/services/action-dispatcher.service';
import { Character } from '../../src/models/character.model';
import { CharacterClass } from '../../../shared/types/entities';
import type { CardAction } from '../../../shared/types/modifiers';
import type { AbilityCardData } from '../../src/models/ability-card.model';

describe('ActionExecutionService (Issue #411)', () => {
  let actionExecutionService: ActionExecutionService;
  let mockAbilityCardService: jest.Mocked<AbilityCardService>;
  let mockActionDispatcher: jest.Mocked<ActionDispatcherService>;
  let character: Character;

  const testCardId = 'test-card-001';
  const testCardId2 = 'test-card-002';

  const mockMoveCard: Partial<AbilityCardData> = {
    id: testCardId,
    name: 'Test Move Card',
    initiative: 25,
    topAction: {
      type: 'attack',
      value: 3,
      modifiers: [],
    },
    bottomAction: {
      type: 'move',
      value: 4,
      modifiers: [],
    },
  };

  const mockHealCard: Partial<AbilityCardData> = {
    id: testCardId2,
    name: 'Test Heal Card',
    initiative: 50,
    topAction: {
      type: 'heal',
      value: 3,
      modifiers: [],
    },
    bottomAction: {
      type: 'loot',
      value: 1,
      modifiers: [],
    },
  };

  beforeEach(() => {
    // Create mock services
    mockAbilityCardService = {
      getCardById: jest.fn(),
      getCardsByClass: jest.fn(),
    } as unknown as jest.Mocked<AbilityCardService>;

    mockActionDispatcher = {
      applyAction: jest.fn().mockReturnValue({
        success: true,
        appliedModifiers: [],
        failedModifiers: [],
        affectedEntities: [],
      }),
      applyModifiers: jest.fn().mockReturnValue({
        success: true,
        appliedModifiers: [],
        failedModifiers: [],
        affectedEntities: [],
      }),
    } as unknown as jest.Mocked<ActionDispatcherService>;

    actionExecutionService = new ActionExecutionService(
      mockAbilityCardService,
      mockActionDispatcher,
    );

    // Create a test character
    character = Character.create(
      'player-123',
      CharacterClass.BRUTE,
      { q: 0, r: 0 },
    );

    // Set up selected cards
    character.selectedCardIds = [testCardId, testCardId2];
    character.selectedInitiativeCardId = testCardId;
  });

  describe('executeAction', () => {
    it('should retrieve the action from the correct card position', async () => {
      mockAbilityCardService.getCardById.mockResolvedValue(mockMoveCard as AbilityCardData);

      await actionExecutionService.executeAction(
        character,
        testCardId,
        'bottom', // Move action is on bottom
        { roomCode: 'TEST01' },
      );

      expect(mockAbilityCardService.getCardById).toHaveBeenCalledWith(testCardId);
    });

    it('should return error if card is not found', async () => {
      mockAbilityCardService.getCardById.mockResolvedValue(null);
      // Use a card ID that IS in the selected cards but returns null from service
      character.selectedCardIds = [testCardId, 'missing-card-id'];

      const result = await actionExecutionService.executeAction(
        character,
        'missing-card-id',
        'top',
        { roomCode: 'TEST01' },
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should return error if action cannot be executed (canExecuteAction fails)', async () => {
      mockAbilityCardService.getCardById.mockResolvedValue(mockMoveCard as AbilityCardData);

      // Execute first action to set up state
      character.addExecutedAction(testCardId, 'top');

      // Try to execute bottom of same card (not allowed by Gloomhaven rules)
      const result = await actionExecutionService.executeAction(
        character,
        testCardId,
        'bottom',
        { roomCode: 'TEST01' },
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot execute');
    });

    it('should call actionDispatcher.applyAction with correct parameters for attack', async () => {
      mockAbilityCardService.getCardById.mockResolvedValue(mockMoveCard as AbilityCardData);

      await actionExecutionService.executeAction(
        character,
        testCardId,
        'top', // Attack action is on top
        { roomCode: 'TEST01', targetId: 'monster-001' },
      );

      expect(mockActionDispatcher.applyAction).toHaveBeenCalledWith(
        mockMoveCard.topAction,
        character,
        'monster-001',
        expect.any(String),
      );
    });

    it('should call actionDispatcher.applyAction with correct parameters for move', async () => {
      mockAbilityCardService.getCardById.mockResolvedValue(mockMoveCard as AbilityCardData);

      await actionExecutionService.executeAction(
        character,
        testCardId,
        'bottom', // Move action is on bottom
        { roomCode: 'TEST01' },
      );

      expect(mockActionDispatcher.applyAction).toHaveBeenCalledWith(
        mockMoveCard.bottomAction,
        character,
        undefined,
        expect.any(String),
      );
    });

    it('should record executed action on character after successful execution', async () => {
      mockAbilityCardService.getCardById.mockResolvedValue(mockMoveCard as AbilityCardData);

      expect(character.executedActionsThisTurn).toHaveLength(0);

      await actionExecutionService.executeAction(
        character,
        testCardId,
        'bottom',
        { roomCode: 'TEST01' },
      );

      expect(character.executedActionsThisTurn).toHaveLength(1);
      expect(character.executedActionsThisTurn[0]).toEqual({
        cardId: testCardId,
        actionPosition: 'bottom',
      });
    });

    it('should not record executed action if execution fails', async () => {
      mockAbilityCardService.getCardById.mockResolvedValue(mockMoveCard as AbilityCardData);
      mockActionDispatcher.applyAction.mockReturnValue({
        success: false,
        appliedModifiers: [],
        failedModifiers: [],
        affectedEntities: [],
      });

      await actionExecutionService.executeAction(
        character,
        testCardId,
        'bottom',
        { roomCode: 'TEST01' },
      );

      expect(character.executedActionsThisTurn).toHaveLength(0);
    });

    it('should return action result with action type and value', async () => {
      mockAbilityCardService.getCardById.mockResolvedValue(mockMoveCard as AbilityCardData);

      const result = await actionExecutionService.executeAction(
        character,
        testCardId,
        'bottom',
        { roomCode: 'TEST01' },
      );

      expect(result.success).toBe(true);
      expect(result.actionType).toBe('move');
      expect(result.actionValue).toBe(4);
      expect(result.cardId).toBe(testCardId);
      expect(result.actionPosition).toBe('bottom');
    });

    it('should handle heal action type', async () => {
      mockAbilityCardService.getCardById.mockResolvedValue(mockHealCard as AbilityCardData);

      const result = await actionExecutionService.executeAction(
        character,
        testCardId2,
        'top',
        { roomCode: 'TEST01' },
      );

      expect(result.success).toBe(true);
      expect(result.actionType).toBe('heal');
      expect(result.actionValue).toBe(3);
    });

    it('should handle loot action type', async () => {
      mockAbilityCardService.getCardById.mockResolvedValue(mockHealCard as AbilityCardData);

      const result = await actionExecutionService.executeAction(
        character,
        testCardId2,
        'bottom',
        { roomCode: 'TEST01' },
      );

      expect(result.success).toBe(true);
      expect(result.actionType).toBe('loot');
      expect(result.actionValue).toBe(1);
    });
  });

  describe('getActionFromCard', () => {
    it('should return top action when position is top', async () => {
      mockAbilityCardService.getCardById.mockResolvedValue(mockMoveCard as AbilityCardData);

      const action = await actionExecutionService.getActionFromCard(testCardId, 'top');

      expect(action).toEqual(mockMoveCard.topAction);
    });

    it('should return bottom action when position is bottom', async () => {
      mockAbilityCardService.getCardById.mockResolvedValue(mockMoveCard as AbilityCardData);

      const action = await actionExecutionService.getActionFromCard(testCardId, 'bottom');

      expect(action).toEqual(mockMoveCard.bottomAction);
    });

    it('should return null if card not found', async () => {
      mockAbilityCardService.getCardById.mockResolvedValue(null);

      const action = await actionExecutionService.getActionFromCard('non-existent', 'top');

      expect(action).toBeNull();
    });
  });

  describe('validateActionExecution', () => {
    it('should return valid when character can execute the action', async () => {
      const validation = actionExecutionService.validateActionExecution(
        character,
        testCardId,
        'top',
      );

      expect(validation.valid).toBe(true);
      expect(validation.reason).toBeUndefined();
    });

    it('should return invalid when cards not selected', async () => {
      character.selectedCardIds = undefined;

      const validation = actionExecutionService.validateActionExecution(
        character,
        testCardId,
        'top',
      );

      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('No cards selected');
    });

    it('should return invalid when card not in selection', async () => {
      const validation = actionExecutionService.validateActionExecution(
        character,
        'wrong-card-id',
        'top',
      );

      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('not one of the selected cards');
    });

    it('should return invalid when action already executed', async () => {
      character.addExecutedAction(testCardId, 'top');

      const validation = actionExecutionService.validateActionExecution(
        character,
        testCardId,
        'top',
      );

      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('already been executed');
    });

    it('should return invalid when second action violates opposite card/half rule', async () => {
      // First action: card1, top
      character.addExecutedAction(testCardId, 'top');

      // Second action: same card, bottom (invalid - must be opposite card)
      const validation = actionExecutionService.validateActionExecution(
        character,
        testCardId,
        'bottom',
      );

      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('opposite card');
    });

    it('should return valid for correct second action', async () => {
      // First action: card1, bottom
      character.addExecutedAction(testCardId, 'bottom');

      // Second action: card2, top (valid - opposite card AND opposite position)
      const validation = actionExecutionService.validateActionExecution(
        character,
        testCardId2,
        'top',
      );

      expect(validation.valid).toBe(true);
    });

    it('should return invalid after both actions executed', async () => {
      character.addExecutedAction(testCardId, 'bottom');
      character.addExecutedAction(testCardId2, 'top');

      const validation = actionExecutionService.validateActionExecution(
        character,
        testCardId,
        'top',
      );

      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('Maximum actions');
    });
  });

  describe('action type handling', () => {
    const mockSummonCard: Partial<AbilityCardData> = {
      id: 'summon-card',
      name: 'Test Summon Card',
      initiative: 30,
      topAction: {
        type: 'summon',
        summon: {
          name: 'Test Spirit',
          health: 5,
          attack: 2,
          move: 3,
          range: 1,
        },
        modifiers: [{ type: 'lost' }],
      },
      bottomAction: {
        type: 'move',
        value: 2,
        modifiers: [],
      },
    };

    it('should handle summon action type', async () => {
      mockAbilityCardService.getCardById.mockResolvedValue(mockSummonCard as AbilityCardData);
      character.selectedCardIds = ['summon-card', testCardId2];

      const result = await actionExecutionService.executeAction(
        character,
        'summon-card',
        'top',
        { roomCode: 'TEST01' },
      );

      expect(result.success).toBe(true);
      expect(result.actionType).toBe('summon');
      expect(result.summonDefinition).toBeDefined();
      expect(result.summonDefinition?.name).toBe('Test Spirit');
    });

    const mockSpecialCard: Partial<AbilityCardData> = {
      id: 'special-card',
      name: 'Test Special Card',
      initiative: 40,
      topAction: {
        type: 'special',
        special: 'Grant self Shield 2',
        modifiers: [{ type: 'shield', value: 2, duration: 'round' }],
      },
      bottomAction: {
        type: 'move',
        value: 3,
        modifiers: [],
      },
    };

    it('should handle special action type', async () => {
      mockAbilityCardService.getCardById.mockResolvedValue(mockSpecialCard as AbilityCardData);
      character.selectedCardIds = ['special-card', testCardId2];

      const result = await actionExecutionService.executeAction(
        character,
        'special-card',
        'top',
        { roomCode: 'TEST01' },
      );

      expect(result.success).toBe(true);
      expect(result.actionType).toBe('special');
    });
  });
});
