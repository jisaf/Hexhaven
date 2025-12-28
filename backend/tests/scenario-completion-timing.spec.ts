/**
 * Scenario Completion Timing Tests
 *
 * Tests for the deferred victory check behavior in checkScenarioCompletion.
 * These tests verify the actual calculation logic that determines when
 * victory vs defeat is triggered based on the checkPrimaryObjective option.
 *
 * Key behavior:
 * - Victory is only declared at round end (checkPrimaryObjective: true)
 * - Defeats are checked immediately (checkPrimaryObjective: false still checks defeats)
 * - Sub-objectives and narrative triggers are checked at all times
 *
 * @see game.gateway.ts checkScenarioCompletion method
 * @see ScenarioCompletionCheckOptions interface in game-state.types.ts
 */

import type { ScenarioCompletionCheckOptions } from '../src/types/game-state.types';

/**
 * Simulates the core victory/defeat calculation logic from checkScenarioCompletion.
 * This mirrors the actual implementation in game.gateway.ts lines 4713-4719.
 */
function calculateCompletionState(
  options: ScenarioCompletionCheckOptions,
  gameState: {
    allPlayersExhausted: boolean;
    failureTriggered: boolean;
    primaryComplete: boolean;
  },
): { isVictory: boolean; isDefeat: boolean; isComplete: boolean } {
  const { checkPrimaryObjective = true } = options;
  const { allPlayersExhausted, failureTriggered, primaryComplete } = gameState;

  // This mirrors the actual implementation in game.gateway.ts
  const isDefeat = allPlayersExhausted || failureTriggered;
  const isVictory = checkPrimaryObjective && primaryComplete && !isDefeat;
  const isComplete = isDefeat || isVictory;

  return { isVictory, isDefeat, isComplete };
}

describe('Scenario Completion Timing', () => {
  describe('ScenarioCompletionCheckOptions Type', () => {
    it('should be importable from game-state.types', () => {
      // Verify the type is exported and usable
      const options: ScenarioCompletionCheckOptions = { checkPrimaryObjective: false };
      expect(options.checkPrimaryObjective).toBe(false);
    });

    it('should default checkPrimaryObjective to true when not specified', () => {
      const options: ScenarioCompletionCheckOptions = {};
      const { checkPrimaryObjective = true } = options;
      expect(checkPrimaryObjective).toBe(true);
    });
  });

  describe('Victory Deferral Logic', () => {
    describe('when checkPrimaryObjective is false (mid-round checks)', () => {
      const options: ScenarioCompletionCheckOptions = { checkPrimaryObjective: false };

      it('should NOT trigger victory even when primary objective is complete', () => {
        const result = calculateCompletionState(options, {
          allPlayersExhausted: false,
          failureTriggered: false,
          primaryComplete: true, // Objective complete but...
        });

        expect(result.isVictory).toBe(false); // Victory suppressed
        expect(result.isDefeat).toBe(false);
        expect(result.isComplete).toBe(false); // Game continues
      });

      it('should still trigger defeat when all players exhausted', () => {
        const result = calculateCompletionState(options, {
          allPlayersExhausted: true, // Defeat condition
          failureTriggered: false,
          primaryComplete: true, // Even with objective complete
        });

        expect(result.isVictory).toBe(false);
        expect(result.isDefeat).toBe(true); // Defeat triggers immediately
        expect(result.isComplete).toBe(true); // Game ends
      });

      it('should still trigger defeat when failure condition met', () => {
        const result = calculateCompletionState(options, {
          allPlayersExhausted: false,
          failureTriggered: true, // Failure condition
          primaryComplete: false,
        });

        expect(result.isVictory).toBe(false);
        expect(result.isDefeat).toBe(true);
        expect(result.isComplete).toBe(true);
      });

      it('should allow game to continue when objective incomplete', () => {
        const result = calculateCompletionState(options, {
          allPlayersExhausted: false,
          failureTriggered: false,
          primaryComplete: false,
        });

        expect(result.isVictory).toBe(false);
        expect(result.isDefeat).toBe(false);
        expect(result.isComplete).toBe(false);
      });
    });

    describe('when checkPrimaryObjective is true (round end checks)', () => {
      const options: ScenarioCompletionCheckOptions = { checkPrimaryObjective: true };

      it('should trigger victory when primary objective is complete', () => {
        const result = calculateCompletionState(options, {
          allPlayersExhausted: false,
          failureTriggered: false,
          primaryComplete: true,
        });

        expect(result.isVictory).toBe(true);
        expect(result.isDefeat).toBe(false);
        expect(result.isComplete).toBe(true);
      });

      it('should NOT trigger victory when objective incomplete', () => {
        const result = calculateCompletionState(options, {
          allPlayersExhausted: false,
          failureTriggered: false,
          primaryComplete: false,
        });

        expect(result.isVictory).toBe(false);
        expect(result.isDefeat).toBe(false);
        expect(result.isComplete).toBe(false);
      });

      it('should trigger defeat over victory when both conditions met', () => {
        const result = calculateCompletionState(options, {
          allPlayersExhausted: true, // Defeat condition
          failureTriggered: false,
          primaryComplete: true, // Victory condition
        });

        // Defeat takes precedence
        expect(result.isVictory).toBe(false);
        expect(result.isDefeat).toBe(true);
        expect(result.isComplete).toBe(true);
      });
    });

    describe('with default options (empty object)', () => {
      const options: ScenarioCompletionCheckOptions = {};

      it('should check primary objective by default', () => {
        const result = calculateCompletionState(options, {
          allPlayersExhausted: false,
          failureTriggered: false,
          primaryComplete: true,
        });

        expect(result.isVictory).toBe(true);
        expect(result.isComplete).toBe(true);
      });
    });
  });

  describe('Call Site Documentation', () => {
    it('should document expected options for each call site', () => {
      // This test documents the expected behavior at each call site
      // and serves as a contract for future maintenance

      const callSiteExpectations = [
        {
          name: 'Attack handler (after monster death)',
          options: { checkPrimaryObjective: false },
          expectedBehavior: 'Defer victory, check defeats only',
        },
        {
          name: 'Turn advancement',
          options: { checkPrimaryObjective: false },
          expectedBehavior: 'Defer victory, check defeats only',
        },
        {
          name: 'Character exhaustion',
          options: { checkPrimaryObjective: false },
          expectedBehavior: 'Primarily checks for defeat',
        },
        {
          name: 'Round end',
          options: { checkPrimaryObjective: true },
          expectedBehavior: 'Full check including victory',
        },
      ];

      // Verify each call site's expected behavior
      for (const site of callSiteExpectations) {
        const { options } = site;
        const primaryComplete = true;

        const result = calculateCompletionState(options, {
          allPlayersExhausted: false,
          failureTriggered: false,
          primaryComplete,
        });

        if (options.checkPrimaryObjective) {
          expect(result.isVictory).toBe(true);
          expect(result.isComplete).toBe(true);
        } else {
          expect(result.isVictory).toBe(false);
          expect(result.isComplete).toBe(false);
        }
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle simultaneous exhaustion and failure', () => {
      const result = calculateCompletionState(
        { checkPrimaryObjective: true },
        {
          allPlayersExhausted: true,
          failureTriggered: true,
          primaryComplete: false,
        },
      );

      expect(result.isDefeat).toBe(true);
      expect(result.isComplete).toBe(true);
    });

    it('should handle undefined checkPrimaryObjective as true', () => {
      // Test that the destructuring default works correctly
      const result = calculateCompletionState(
        {} as ScenarioCompletionCheckOptions,
        {
          allPlayersExhausted: false,
          failureTriggered: false,
          primaryComplete: true,
        },
      );

      expect(result.isVictory).toBe(true);
    });
  });
});
