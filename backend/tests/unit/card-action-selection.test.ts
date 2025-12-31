/**
 * Unit Tests: Card Action Selection During Round (Issue #411)
 *
 * Tests for the new card selection and action execution model:
 * - Character stores selected card IDs (not top/bottom designations)
 * - Character stores initiative card ID (which card determines initiative)
 * - Character tracks executed actions during turn
 * - Validation of action execution constraints (opposite card/half rule)
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { Character, CharacterData } from '../../src/models/character.model';
import { CharacterClass } from '../../../shared/types/entities';

describe('Card Action Selection (Issue #411)', () => {
  let character: Character;
  const testCardId1 = 'card-001';
  const testCardId2 = 'card-002';

  beforeEach(() => {
    character = Character.create(
      'player-123',
      CharacterClass.BRUTE,
      { q: 0, r: 0 },
    );
  });

  describe('selectedCardIds', () => {
    it('should initialize with undefined selectedCardIds', () => {
      expect(character.selectedCardIds).toBeUndefined();
    });

    it('should set selectedCardIds with array of 2 card IDs', () => {
      character.selectedCardIds = [testCardId1, testCardId2];

      expect(character.selectedCardIds).toEqual([testCardId1, testCardId2]);
    });

    it('should return a copy of selectedCardIds (immutability)', () => {
      character.selectedCardIds = [testCardId1, testCardId2];
      const cardIds = character.selectedCardIds;

      // Modify the returned array
      if (cardIds) {
        cardIds.push('card-003');
      }

      // Original should be unchanged
      expect(character.selectedCardIds).toEqual([testCardId1, testCardId2]);
    });

    it('should allow clearing selectedCardIds by setting to undefined', () => {
      character.selectedCardIds = [testCardId1, testCardId2];
      character.selectedCardIds = undefined;

      expect(character.selectedCardIds).toBeUndefined();
    });
  });

  describe('selectedInitiativeCardId', () => {
    it('should initialize with undefined selectedInitiativeCardId', () => {
      expect(character.selectedInitiativeCardId).toBeUndefined();
    });

    it('should set selectedInitiativeCardId', () => {
      character.selectedInitiativeCardId = testCardId1;

      expect(character.selectedInitiativeCardId).toBe(testCardId1);
    });

    it('should allow clearing selectedInitiativeCardId', () => {
      character.selectedInitiativeCardId = testCardId1;
      character.selectedInitiativeCardId = undefined;

      expect(character.selectedInitiativeCardId).toBeUndefined();
    });
  });

  describe('executedActionsThisTurn', () => {
    it('should initialize with empty array', () => {
      expect(character.executedActionsThisTurn).toEqual([]);
    });

    it('should track executed action with cardId and position', () => {
      character.addExecutedAction(testCardId1, 'top');

      expect(character.executedActionsThisTurn).toEqual([
        { cardId: testCardId1, actionPosition: 'top' },
      ]);
    });

    it('should track multiple executed actions', () => {
      character.addExecutedAction(testCardId1, 'bottom');
      character.addExecutedAction(testCardId2, 'top');

      expect(character.executedActionsThisTurn).toEqual([
        { cardId: testCardId1, actionPosition: 'bottom' },
        { cardId: testCardId2, actionPosition: 'top' },
      ]);
    });

    it('should return a copy of executedActionsThisTurn (immutability)', () => {
      character.addExecutedAction(testCardId1, 'top');
      const actions = character.executedActionsThisTurn;

      // Modify the returned array
      actions.push({ cardId: 'card-hack', actionPosition: 'bottom' });

      // Original should be unchanged
      expect(character.executedActionsThisTurn).toEqual([
        { cardId: testCardId1, actionPosition: 'top' },
      ]);
    });

    it('should clear executed actions on resetActionFlags', () => {
      character.addExecutedAction(testCardId1, 'top');
      character.addExecutedAction(testCardId2, 'bottom');

      character.resetActionFlags();

      expect(character.executedActionsThisTurn).toEqual([]);
    });
  });

  describe('action execution validation', () => {
    beforeEach(() => {
      character.selectedCardIds = [testCardId1, testCardId2];
      character.selectedInitiativeCardId = testCardId1;
    });

    it('should return true for canExecuteAction when no actions taken', () => {
      // First action can be any of the 4 options
      expect(character.canExecuteAction(testCardId1, 'top')).toBe(true);
      expect(character.canExecuteAction(testCardId1, 'bottom')).toBe(true);
      expect(character.canExecuteAction(testCardId2, 'top')).toBe(true);
      expect(character.canExecuteAction(testCardId2, 'bottom')).toBe(true);
    });

    it('should return false for canExecuteAction with non-selected card', () => {
      expect(character.canExecuteAction('non-selected-card', 'top')).toBe(false);
    });

    it('should return false for canExecuteAction if action already executed', () => {
      character.addExecutedAction(testCardId1, 'top');

      // Same action cannot be executed again
      expect(character.canExecuteAction(testCardId1, 'top')).toBe(false);
    });

    it('should enforce opposite card/half rule for second action', () => {
      // First action: card1, bottom
      character.addExecutedAction(testCardId1, 'bottom');

      // Valid second action: card2, top (opposite card + opposite half)
      expect(character.canExecuteAction(testCardId2, 'top')).toBe(true);

      // Invalid: same card
      expect(character.canExecuteAction(testCardId1, 'top')).toBe(false);

      // Invalid: opposite card but same half (bottom)
      expect(character.canExecuteAction(testCardId2, 'bottom')).toBe(false);
    });

    it('should enforce opposite card/half rule - scenario 2', () => {
      // First action: card2, top
      character.addExecutedAction(testCardId2, 'top');

      // Valid second action: card1, bottom (opposite card + opposite half)
      expect(character.canExecuteAction(testCardId1, 'bottom')).toBe(true);

      // Invalid: same card
      expect(character.canExecuteAction(testCardId2, 'bottom')).toBe(false);

      // Invalid: opposite card but same half (top)
      expect(character.canExecuteAction(testCardId1, 'top')).toBe(false);
    });

    it('should not allow third action', () => {
      character.addExecutedAction(testCardId1, 'bottom');
      character.addExecutedAction(testCardId2, 'top');

      // Both actions used, no more allowed
      expect(character.canExecuteAction(testCardId1, 'top')).toBe(false);
      expect(character.canExecuteAction(testCardId1, 'bottom')).toBe(false);
      expect(character.canExecuteAction(testCardId2, 'top')).toBe(false);
      expect(character.canExecuteAction(testCardId2, 'bottom')).toBe(false);
    });

    it('should return false when no cards selected', () => {
      character.selectedCardIds = undefined;

      expect(character.canExecuteAction(testCardId1, 'top')).toBe(false);
    });
  });

  describe('hasActionsRemaining', () => {
    beforeEach(() => {
      character.selectedCardIds = [testCardId1, testCardId2];
    });

    it('should return true when no actions executed', () => {
      expect(character.hasActionsRemaining).toBe(true);
    });

    it('should return true after first action executed', () => {
      character.addExecutedAction(testCardId1, 'top');

      expect(character.hasActionsRemaining).toBe(true);
    });

    it('should return false after both actions executed', () => {
      character.addExecutedAction(testCardId1, 'bottom');
      character.addExecutedAction(testCardId2, 'top');

      expect(character.hasActionsRemaining).toBe(false);
    });

    it('should return false when no cards selected', () => {
      character.selectedCardIds = undefined;

      expect(character.hasActionsRemaining).toBe(false);
    });
  });

  describe('getAvailableActions', () => {
    beforeEach(() => {
      character.selectedCardIds = [testCardId1, testCardId2];
    });

    it('should return all 4 actions when none executed', () => {
      const actions = character.getAvailableActions();

      expect(actions).toHaveLength(4);
      expect(actions).toContainEqual({ cardId: testCardId1, actionPosition: 'top' });
      expect(actions).toContainEqual({ cardId: testCardId1, actionPosition: 'bottom' });
      expect(actions).toContainEqual({ cardId: testCardId2, actionPosition: 'top' });
      expect(actions).toContainEqual({ cardId: testCardId2, actionPosition: 'bottom' });
    });

    it('should return only valid second action after first executed', () => {
      character.addExecutedAction(testCardId1, 'bottom');

      const actions = character.getAvailableActions();

      // Only card2-top should be available (opposite card + opposite half)
      expect(actions).toHaveLength(1);
      expect(actions).toContainEqual({ cardId: testCardId2, actionPosition: 'top' });
    });

    it('should return empty array after both actions executed', () => {
      character.addExecutedAction(testCardId1, 'bottom');
      character.addExecutedAction(testCardId2, 'top');

      const actions = character.getAvailableActions();

      expect(actions).toHaveLength(0);
    });

    it('should return empty array when no cards selected', () => {
      character.selectedCardIds = undefined;

      const actions = character.getAvailableActions();

      expect(actions).toHaveLength(0);
    });
  });

  describe('clearCardSelection', () => {
    it('should clear all card selection state', () => {
      character.selectedCardIds = [testCardId1, testCardId2];
      character.selectedInitiativeCardId = testCardId1;
      character.addExecutedAction(testCardId1, 'top');

      character.clearCardSelection();

      expect(character.selectedCardIds).toBeUndefined();
      expect(character.selectedInitiativeCardId).toBeUndefined();
      expect(character.executedActionsThisTurn).toEqual([]);
    });
  });

  describe('toJSON', () => {
    it('should include new card selection fields in JSON output', () => {
      character.selectedCardIds = [testCardId1, testCardId2];
      character.selectedInitiativeCardId = testCardId1;
      character.addExecutedAction(testCardId1, 'top');

      const json = character.toJSON();

      expect(json).toHaveProperty('selectedCardIds', [testCardId1, testCardId2]);
      expect(json).toHaveProperty('selectedInitiativeCardId', testCardId1);
      expect(json).toHaveProperty('executedActionsThisTurn', [
        { cardId: testCardId1, actionPosition: 'top' },
      ]);
    });
  });

  describe('backward compatibility', () => {
    it('should still support legacy selectedCards getter for reading', () => {
      // The old selectedCards format should still work for reading
      // but may return undefined when using new format
      expect(character.selectedCards).toBeUndefined();
    });
  });
});
