/**
 * NarrativeStateService Tests
 *
 * Tests for the narrative state service, specifically focusing on:
 * - Race condition between module load and initialization
 * - Event subscription timing
 * - Eager initialization pattern
 */

import type { NarrativeDisplayPayload } from '../../../shared/types/events';

// Store handlers registered via mock
const registeredHandlers: Map<string, ((...args: unknown[]) => void)[]> = new Map();

// Mock the websocket service BEFORE importing the module under test
const mockOn = jest.fn().mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
  if (!registeredHandlers.has(event)) {
    registeredHandlers.set(event, []);
  }
  registeredHandlers.get(event)!.push(handler);
  // Return unsubscribe function
  return () => {
    const handlers = registeredHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) handlers.splice(index, 1);
    }
  };
});
const mockEmit = jest.fn();
const mockOff = jest.fn();

jest.mock('../../src/services/websocket.service', () => ({
  websocketService: {
    on: mockOn,
    emit: mockEmit,
    off: mockOff,
  },
}));

// Helper to get a handler for an event
function getHandler(event: string): ((...args: unknown[]) => void) | undefined {
  const handlers = registeredHandlers.get(event);
  return handlers?.[handlers.length - 1]; // Return the most recent handler
}

// Helper to call handler with payload
function simulateEvent(event: string, payload?: unknown): void {
  const handler = getHandler(event);
  if (handler) {
    handler(payload);
  }
}

// Import after setting up mocks - this triggers the constructor
import { narrativeStateService } from '../../src/services/narrative-state.service';

describe('NarrativeStateService', () => {
  beforeEach(() => {
    // Clear mock call counts but preserve the registered handlers
    mockOn.mockClear();
    mockEmit.mockClear();
    mockOff.mockClear();
    // Reset the service state between tests
    narrativeStateService.reset();
  });

  describe('Eager Initialization (Race Condition Fix)', () => {
    it('should subscribe to WebSocket events immediately on module load', () => {
      // The singleton should have already subscribed to events when imported
      // This is the key test for the race condition fix

      // Check that handlers were registered for narrative events
      expect(registeredHandlers.has('narrative_display')).toBe(true);
      expect(registeredHandlers.has('narrative_acknowledged')).toBe(true);
      expect(registeredHandlers.has('narrative_dismissed')).toBe(true);
    });

    it('should NOT require explicit initialize() call to receive events', () => {
      // Create a test payload
      const testPayload: NarrativeDisplayPayload = {
        narrativeId: 'test-narrative-1',
        type: 'intro',
        content: {
          title: 'Test Narrative',
          text: 'This is a test narrative',
        },
        acknowledgments: [
          { playerId: 'player-1', playerName: 'Player One', acknowledged: false },
        ],
      };

      // Simulate receiving the event WITHOUT calling initialize()
      simulateEvent('narrative_display', testPayload);

      // The state should be updated
      const state = narrativeStateService.getState();
      expect(state.activeNarrative).not.toBeNull();
      expect(state.activeNarrative?.narrativeId).toBe('test-narrative-1');
    });

    it('should handle events before any subscriber is registered', () => {
      // Simulate event arriving
      simulateEvent('narrative_display', {
        narrativeId: 'early-event',
        type: 'trigger',
        content: { text: 'Early event' },
        acknowledgments: [],
      });

      // Now subscribe
      const subscriber = jest.fn();
      narrativeStateService.subscribe(subscriber);

      // Subscriber should receive the current state with the early event
      expect(subscriber).toHaveBeenCalledWith(
        expect.objectContaining({
          activeNarrative: expect.objectContaining({
            narrativeId: 'early-event',
          }),
        })
      );
    });
  });

  describe('initialize() method (backward compatibility)', () => {
    it('should be safe to call initialize() multiple times', () => {
      // Get count of handlers before calling initialize
      const handlerCountBefore = registeredHandlers.get('narrative_display')?.length ?? 0;

      // Call initialize multiple times (should be no-op since eager init)
      narrativeStateService.initialize();
      narrativeStateService.initialize();
      narrativeStateService.initialize();

      // Should not register additional handlers
      // (The singleton already registered on module load via constructor)
      const handlerCountAfter = registeredHandlers.get('narrative_display')?.length ?? 0;
      expect(handlerCountAfter).toBe(handlerCountBefore);
    });

    it('should be a no-op if already initialized', () => {
      // Initialize shouldn't throw and should be idempotent
      expect(() => {
        narrativeStateService.initialize();
      }).not.toThrow();
    });
  });

  describe('State Management', () => {
    it('should return initial empty state via getState()', () => {
      narrativeStateService.reset(); // Ensure clean state
      const state = narrativeStateService.getState();
      expect(state.activeNarrative).toBeNull();
      expect(state.acknowledgments).toEqual([]);
    });

    it('should notify subscribers immediately with current state on subscribe', () => {
      const subscriber = jest.fn();
      narrativeStateService.subscribe(subscriber);

      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenCalledWith({
        activeNarrative: expect.any(Object) || null,
        acknowledgments: expect.any(Array),
      });
    });

    it('should return unsubscribe function from subscribe()', () => {
      const subscriber = jest.fn();
      const unsubscribe = narrativeStateService.subscribe(subscriber);

      expect(typeof unsubscribe).toBe('function');

      // Unsubscribe
      unsubscribe();

      // Trigger a state change via event
      simulateEvent('narrative_display', {
        narrativeId: 'after-unsubscribe',
        type: 'intro',
        content: { text: 'Should not notify' },
        acknowledgments: [],
      });

      // Subscriber should NOT have been called again after unsubscribe
      // (only the initial call when subscribing)
      expect(subscriber).toHaveBeenCalledTimes(1);
    });

    it('should reset state correctly', () => {
      // Set some state via event
      simulateEvent('narrative_display', {
        narrativeId: 'test',
        type: 'intro',
        content: { text: 'Test' },
        acknowledgments: [{ playerId: 'p1', playerName: 'P1', acknowledged: false }],
      });

      // Verify state is set
      expect(narrativeStateService.getState().activeNarrative).not.toBeNull();

      // Reset
      narrativeStateService.reset();

      // Verify state is cleared
      const state = narrativeStateService.getState();
      expect(state.activeNarrative).toBeNull();
      expect(state.acknowledgments).toEqual([]);
    });
  });

  describe('Event Handling', () => {
    it('should handle narrative_display event', () => {
      const payload: NarrativeDisplayPayload = {
        narrativeId: 'display-test',
        type: 'victory',
        content: { title: 'Victory!', text: 'You won!' },
        acknowledgments: [
          { playerId: 'p1', playerName: 'Player 1', acknowledged: false },
          { playerId: 'p2', playerName: 'Player 2', acknowledged: true },
        ],
      };

      simulateEvent('narrative_display', payload);

      const state = narrativeStateService.getState();
      expect(state.activeNarrative).toEqual(payload);
      expect(state.acknowledgments).toHaveLength(2);
      expect(state.acknowledgments[1].acknowledged).toBe(true);
    });

    it('should handle narrative_acknowledged event', () => {
      // First, display a narrative
      simulateEvent('narrative_display', {
        narrativeId: 'ack-test',
        type: 'intro',
        content: { text: 'Test' },
        acknowledgments: [
          { playerId: 'p1', playerName: 'Player 1', acknowledged: false },
        ],
      });

      // Then acknowledge
      simulateEvent('narrative_acknowledged', { playerId: 'p1' });

      const state = narrativeStateService.getState();
      expect(state.acknowledgments[0].acknowledged).toBe(true);
    });

    it('should handle narrative_dismissed event', () => {
      // First, display a narrative
      simulateEvent('narrative_display', {
        narrativeId: 'dismiss-test',
        type: 'intro',
        content: { text: 'Test' },
        acknowledgments: [],
      });

      // Verify it's set
      expect(narrativeStateService.getState().activeNarrative).not.toBeNull();

      // Then dismiss
      simulateEvent('narrative_dismissed');

      const state = narrativeStateService.getState();
      expect(state.activeNarrative).toBeNull();
      expect(state.acknowledgments).toEqual([]);
    });
  });

  describe('Acknowledge Method', () => {
    it('should emit acknowledge_narrative event', () => {
      // First, display a narrative
      simulateEvent('narrative_display', {
        narrativeId: 'emit-test',
        type: 'intro',
        content: { text: 'Test' },
        acknowledgments: [
          { playerId: 'current-player', playerName: 'Me', acknowledged: false },
        ],
      });

      // Acknowledge
      narrativeStateService.acknowledge('current-player');

      // Should emit to server
      expect(mockEmit).toHaveBeenCalledWith('acknowledge_narrative', {
        narrativeId: 'emit-test',
      });
    });

    it('should update local state optimistically', () => {
      simulateEvent('narrative_display', {
        narrativeId: 'local-update-test',
        type: 'intro',
        content: { text: 'Test' },
        acknowledgments: [
          { playerId: 'p1', playerName: 'Player 1', acknowledged: false },
        ],
      });

      narrativeStateService.acknowledge('p1');

      // Local state should be updated immediately
      const state = narrativeStateService.getState();
      expect(state.acknowledgments[0].acknowledged).toBe(true);
    });

    it('should not emit if no active narrative', () => {
      narrativeStateService.reset();
      narrativeStateService.acknowledge('p1');

      // Should not emit
      expect(mockEmit).not.toHaveBeenCalled();
    });
  });

  describe('Convenience Methods', () => {
    it('should return correct narrative type via getNarrativeType()', () => {
      simulateEvent('narrative_display', {
        narrativeId: 'type-test',
        type: 'defeat',
        content: { text: 'Test' },
        acknowledgments: [],
      });

      expect(narrativeStateService.getNarrativeType()).toBe('defeat');
    });

    it('should return null for getNarrativeType() when no active narrative', () => {
      narrativeStateService.reset();
      expect(narrativeStateService.getNarrativeType()).toBeNull();
    });

    it('should return correct value for isDisplaying()', () => {
      narrativeStateService.reset();
      expect(narrativeStateService.isDisplaying()).toBe(false);

      simulateEvent('narrative_display', {
        narrativeId: 'display-check',
        type: 'intro',
        content: { text: 'Test' },
        acknowledgments: [],
      });

      expect(narrativeStateService.isDisplaying()).toBe(true);
    });
  });
});
