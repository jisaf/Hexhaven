/**
 * Unit Test: Turn Action Tracking (Issue #411)
 *
 * Tests for the turn action tracking methods added to Character model:
 * - recordFirstAction()
 * - recordSecondAction()
 * - resetTurnActions()
 * - getAvailableActions()
 * - isActionAvailable()
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { Character } from '../../src/models/character.model';

describe('Turn Action Tracking (Issue #411)', () => {
  let character: Character;

  beforeEach(() => {
    // Create a Brute character for testing
    character = Character.create('player-1', 'Brute', { q: 0, r: 0 });

    // Set up selected cards (required for action tracking)
    character.selectedCards = {
      topCardId: 'card-1',
      bottomCardId: 'card-2',
      initiative: 25,
    };
  });

  describe('getAvailableActions()', () => {
    it('should return empty array when no cards are selected', () => {
      character.selectedCards = undefined;
      const available = character.getAvailableActions();
      expect(available).toEqual([]);
    });

    it('should return all 4 options when no actions taken', () => {
      const available = character.getAvailableActions();
      expect(available).toHaveLength(4);
      expect(available).toContainEqual({ cardId: 'card-1', position: 'top' });
      expect(available).toContainEqual({ cardId: 'card-1', position: 'bottom' });
      expect(available).toContainEqual({ cardId: 'card-2', position: 'top' });
      expect(available).toContainEqual({ cardId: 'card-2', position: 'bottom' });
    });

    it('should return only opposite of other card after first action (top used)', () => {
      character.recordFirstAction('card-1', 'top');
      const available = character.getAvailableActions();

      // Used top of card-1, so only bottom of card-2 available
      expect(available).toHaveLength(1);
      expect(available[0]).toEqual({ cardId: 'card-2', position: 'bottom' });
    });

    it('should return only opposite of other card after first action (bottom used)', () => {
      character.recordFirstAction('card-2', 'bottom');
      const available = character.getAvailableActions();

      // Used bottom of card-2, so only top of card-1 available
      expect(available).toHaveLength(1);
      expect(available[0]).toEqual({ cardId: 'card-1', position: 'top' });
    });

    it('should return empty array after both actions taken', () => {
      character.recordFirstAction('card-1', 'top');
      character.recordSecondAction('card-2', 'bottom');
      const available = character.getAvailableActions();
      expect(available).toEqual([]);
    });
  });

  describe('isActionAvailable()', () => {
    it('should return true for any action before first action', () => {
      expect(character.isActionAvailable('card-1', 'top')).toBe(true);
      expect(character.isActionAvailable('card-1', 'bottom')).toBe(true);
      expect(character.isActionAvailable('card-2', 'top')).toBe(true);
      expect(character.isActionAvailable('card-2', 'bottom')).toBe(true);
    });

    it('should return false for invalid card', () => {
      expect(character.isActionAvailable('card-invalid', 'top')).toBe(false);
    });

    it('should return true only for correct second action', () => {
      character.recordFirstAction('card-1', 'top');

      // Only bottom of card-2 should be available
      expect(character.isActionAvailable('card-1', 'top')).toBe(false);
      expect(character.isActionAvailable('card-1', 'bottom')).toBe(false);
      expect(character.isActionAvailable('card-2', 'top')).toBe(false);
      expect(character.isActionAvailable('card-2', 'bottom')).toBe(true);
    });

    it('should return false for all actions after both taken', () => {
      character.recordFirstAction('card-1', 'top');
      character.recordSecondAction('card-2', 'bottom');

      expect(character.isActionAvailable('card-1', 'top')).toBe(false);
      expect(character.isActionAvailable('card-1', 'bottom')).toBe(false);
      expect(character.isActionAvailable('card-2', 'top')).toBe(false);
      expect(character.isActionAvailable('card-2', 'bottom')).toBe(false);
    });
  });

  describe('recordFirstAction()', () => {
    it('should record first action successfully', () => {
      character.recordFirstAction('card-1', 'top');
      expect(character.turnActions.firstAction).toEqual({
        cardId: 'card-1',
        position: 'top',
      });
    });

    it('should throw error if first action already recorded', () => {
      character.recordFirstAction('card-1', 'top');
      expect(() => {
        character.recordFirstAction('card-2', 'bottom');
      }).toThrow('First action already recorded this turn');
    });
  });

  describe('recordSecondAction()', () => {
    it('should record second action after first', () => {
      character.recordFirstAction('card-1', 'top');
      character.recordSecondAction('card-2', 'bottom');
      expect(character.turnActions.secondAction).toEqual({
        cardId: 'card-2',
        position: 'bottom',
      });
    });

    it('should throw error if first action not recorded', () => {
      expect(() => {
        character.recordSecondAction('card-2', 'bottom');
      }).toThrow('Cannot record second action before first action');
    });

    it('should throw error if second action already recorded', () => {
      character.recordFirstAction('card-1', 'top');
      character.recordSecondAction('card-2', 'bottom');
      expect(() => {
        character.recordSecondAction('card-1', 'bottom');
      }).toThrow('Second action already recorded this turn');
    });
  });

  describe('resetTurnActions()', () => {
    it('should clear all turn actions', () => {
      character.recordFirstAction('card-1', 'top');
      character.recordSecondAction('card-2', 'bottom');

      character.resetTurnActions();

      expect(character.turnActions.firstAction).toBeUndefined();
      expect(character.turnActions.secondAction).toBeUndefined();
      expect(character.getAvailableActions()).toHaveLength(4);
    });
  });

  describe('resetActionFlags() integration', () => {
    it('should also reset turn actions when resetActionFlags is called', () => {
      character.recordFirstAction('card-1', 'top');
      character.recordSecondAction('card-2', 'bottom');

      // This should clear turn actions as well
      character.resetActionFlags();

      expect(character.turnActions.firstAction).toBeUndefined();
      expect(character.turnActions.secondAction).toBeUndefined();
      expect(character.getAvailableActions()).toHaveLength(4);
    });
  });

  describe('turnActions getter', () => {
    it('should return a copy, not the original object', () => {
      character.recordFirstAction('card-1', 'top');
      const actions1 = character.turnActions;
      const actions2 = character.turnActions;

      // Should be equal but not the same reference
      expect(actions1).toEqual(actions2);
      expect(actions1).not.toBe(actions2);
      expect(actions1.firstAction).not.toBe(actions2.firstAction);
    });
  });
});
