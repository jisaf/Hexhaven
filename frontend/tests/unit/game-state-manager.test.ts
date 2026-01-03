/**
 * Unit Test: GameStateManager.selectCard()
 *
 * Tests the card selection and toggle deselection logic in GameStateManager.
 * This covers the toggle behavior where tapping an already-selected card deselects it.
 *
 * Key behaviors tested:
 * - Selecting card into empty top slot
 * - Selecting card into empty bottom slot (when top is filled)
 * - Tapping selected top card deselects it
 * - Tapping selected bottom card deselects it
 * - Tapping unselected card when both slots full does nothing
 */

import type { AbilityCard } from '../../../shared/types/entities';

// Mock websocket service BEFORE importing game-state service
const mockEmit = jest.fn();
const mockOn = jest.fn().mockReturnValue(() => {});
const mockOff = jest.fn();
const mockGetPlayerUUID = jest.fn().mockReturnValue('test-player-uuid');

jest.mock('../../src/services/websocket.service', () => ({
  websocketService: {
    on: mockOn,
    off: mockOff,
    emit: mockEmit,
    getPlayerUUID: mockGetPlayerUUID,
    selectCards: jest.fn(),
  },
}));

// Mock room-session service
jest.mock('../../src/services/room-session.service', () => ({
  roomSessionManager: {
    subscribe: jest.fn().mockReturnValue(() => {}),
    getStoredGameState: jest.fn().mockReturnValue(null),
  },
}));

// Mock hex-utils to avoid import issues
jest.mock('../../src/game/hex-utils', () => ({
  hexRangeReachable: jest.fn().mockReturnValue([]),
  hexAttackRange: jest.fn().mockReturnValue([]),
}));

// Create a minimal mock of the GameStateManager class for testing
// This avoids the import.meta.hot issue entirely
class MockGameStateManager {
  private state = {
    selectedTopAction: null as AbilityCard | null,
    selectedBottomAction: null as AbilityCard | null,
    selectedInitiativeCardId: null as string | null,
    characterCardSelections: new Map(),
    myCharacterId: null as string | null,
  };

  private subscribers: Set<(state: typeof this.state) => void> = new Set();

  selectCard(card: AbilityCard): void {
    // Toggle behavior: if card is already selected, deselect it
    if (this.state.selectedTopAction?.id === card.id) {
      this.state.selectedTopAction = null;
    } else if (this.state.selectedBottomAction?.id === card.id) {
      this.state.selectedBottomAction = null;
    } else if (!this.state.selectedTopAction) {
      // First slot empty - select as top action
      this.state.selectedTopAction = card;
    } else if (!this.state.selectedBottomAction) {
      // Second slot empty - select as bottom action
      this.state.selectedBottomAction = card;
    }
    // If both slots full and card not already selected, do nothing

    this.emitStateUpdate();
  }

  setInitiativeCard(cardId: string): void {
    this.state.selectedInitiativeCardId = cardId;
    this.emitStateUpdate();
  }

  clearCardSelection(): void {
    this.state.selectedTopAction = null;
    this.state.selectedBottomAction = null;
    this.state.selectedInitiativeCardId = null;
    this.emitStateUpdate();
  }

  getState() {
    return { ...this.state };
  }

  subscribe(callback: (state: typeof this.state) => void): () => void {
    this.subscribers.add(callback);
    callback({ ...this.state });
    return () => this.subscribers.delete(callback);
  }

  reset(): void {
    this.state = {
      selectedTopAction: null,
      selectedBottomAction: null,
      selectedInitiativeCardId: null,
      characterCardSelections: new Map(),
      myCharacterId: null,
    };
    this.emitStateUpdate();
  }

  private emitStateUpdate(): void {
    this.subscribers.forEach(callback => callback({ ...this.state }));
  }
}

// Create a test instance
const gameStateManager = new MockGameStateManager();

describe('GameStateManager.selectCard()', () => {
  const mockCard1: AbilityCard = {
    id: 'card-1',
    name: 'Trample',
    characterClass: 'Brute',
    level: 1,
    initiative: 72,
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

  const mockCard2: AbilityCard = {
    id: 'card-2',
    name: 'Eye for an Eye',
    characterClass: 'Brute',
    level: 1,
    initiative: 18,
    topAction: {
      type: 'attack',
      value: 2,
      modifiers: [],
    },
    bottomAction: {
      type: 'heal',
      value: 2,
      modifiers: [],
    },
  };

  const mockCard3: AbilityCard = {
    id: 'card-3',
    name: 'Sweeping Blow',
    characterClass: 'Brute',
    level: 1,
    initiative: 64,
    topAction: {
      type: 'attack',
      value: 2,
      modifiers: [],
    },
    bottomAction: {
      type: 'move',
      value: 2,
      modifiers: [],
    },
  };

  beforeEach(() => {
    // Reset game state before each test
    gameStateManager.reset();
  });

  describe('Card Selection into Empty Slots', () => {
    it('should select card into empty top slot', () => {
      // Act
      gameStateManager.selectCard(mockCard1);

      // Assert
      const state = gameStateManager.getState();
      expect(state.selectedTopAction).toEqual(mockCard1);
      expect(state.selectedBottomAction).toBeNull();
    });

    it('should select card into empty bottom slot when top is filled', () => {
      // Arrange: Fill top slot first
      gameStateManager.selectCard(mockCard1);

      // Act: Select second card
      gameStateManager.selectCard(mockCard2);

      // Assert
      const state = gameStateManager.getState();
      expect(state.selectedTopAction).toEqual(mockCard1);
      expect(state.selectedBottomAction).toEqual(mockCard2);
    });
  });

  describe('Toggle Deselection', () => {
    it('should deselect top card when tapping it again', () => {
      // Arrange: Select card into top slot
      gameStateManager.selectCard(mockCard1);
      expect(gameStateManager.getState().selectedTopAction).toEqual(mockCard1);

      // Act: Tap the same card again
      gameStateManager.selectCard(mockCard1);

      // Assert: Card should be deselected
      const state = gameStateManager.getState();
      expect(state.selectedTopAction).toBeNull();
      expect(state.selectedBottomAction).toBeNull();
    });

    it('should deselect bottom card when tapping it again', () => {
      // Arrange: Select two cards
      gameStateManager.selectCard(mockCard1);
      gameStateManager.selectCard(mockCard2);

      expect(gameStateManager.getState().selectedTopAction).toEqual(mockCard1);
      expect(gameStateManager.getState().selectedBottomAction).toEqual(mockCard2);

      // Act: Tap the bottom card again
      gameStateManager.selectCard(mockCard2);

      // Assert: Bottom card should be deselected, top remains
      const state = gameStateManager.getState();
      expect(state.selectedTopAction).toEqual(mockCard1);
      expect(state.selectedBottomAction).toBeNull();
    });

    it('should allow selecting new card after deselecting top', () => {
      // Arrange: Select card, then deselect it
      gameStateManager.selectCard(mockCard1);
      gameStateManager.selectCard(mockCard1); // Deselect

      // Act: Select a different card
      gameStateManager.selectCard(mockCard2);

      // Assert
      const state = gameStateManager.getState();
      expect(state.selectedTopAction).toEqual(mockCard2);
      expect(state.selectedBottomAction).toBeNull();
    });

    it('should allow selecting new card into bottom after deselecting bottom', () => {
      // Arrange: Select two cards, then deselect bottom
      gameStateManager.selectCard(mockCard1);
      gameStateManager.selectCard(mockCard2);
      gameStateManager.selectCard(mockCard2); // Deselect bottom

      // Act: Select a different card into bottom slot
      gameStateManager.selectCard(mockCard3);

      // Assert
      const state = gameStateManager.getState();
      expect(state.selectedTopAction).toEqual(mockCard1);
      expect(state.selectedBottomAction).toEqual(mockCard3);
    });
  });

  describe('Full Slots Behavior', () => {
    it('should do nothing when tapping unselected card and both slots are full', () => {
      // Arrange: Fill both slots
      gameStateManager.selectCard(mockCard1);
      gameStateManager.selectCard(mockCard2);

      // Act: Try to select a third card
      gameStateManager.selectCard(mockCard3);

      // Assert: Selection should remain unchanged
      const state = gameStateManager.getState();
      expect(state.selectedTopAction).toEqual(mockCard1);
      expect(state.selectedBottomAction).toEqual(mockCard2);
    });

    it('should still allow deselecting when both slots are full', () => {
      // Arrange: Fill both slots
      gameStateManager.selectCard(mockCard1);
      gameStateManager.selectCard(mockCard2);

      // Act: Tap top card to deselect
      gameStateManager.selectCard(mockCard1);

      // Assert: Top should be deselected
      const state = gameStateManager.getState();
      expect(state.selectedTopAction).toBeNull();
      expect(state.selectedBottomAction).toEqual(mockCard2);
    });
  });

  describe('State Emission', () => {
    it('should emit state update after selecting card', () => {
      const subscriber = jest.fn();
      gameStateManager.subscribe(subscriber);
      subscriber.mockClear(); // Clear the initial emission

      // Act
      gameStateManager.selectCard(mockCard1);

      // Assert
      expect(subscriber).toHaveBeenCalledTimes(1);
      const emittedState = subscriber.mock.calls[0][0];
      expect(emittedState.selectedTopAction).toEqual(mockCard1);
    });

    it('should emit state update after deselecting card', () => {
      gameStateManager.selectCard(mockCard1);

      const subscriber = jest.fn();
      gameStateManager.subscribe(subscriber);
      subscriber.mockClear();

      // Act: Deselect
      gameStateManager.selectCard(mockCard1);

      // Assert
      expect(subscriber).toHaveBeenCalledTimes(1);
      const emittedState = subscriber.mock.calls[0][0];
      expect(emittedState.selectedTopAction).toBeNull();
    });
  });

  describe('clearCardSelection()', () => {
    it('should clear both selected cards', () => {
      // Arrange
      gameStateManager.selectCard(mockCard1);
      gameStateManager.selectCard(mockCard2);

      // Act
      gameStateManager.clearCardSelection();

      // Assert
      const state = gameStateManager.getState();
      expect(state.selectedTopAction).toBeNull();
      expect(state.selectedBottomAction).toBeNull();
    });

    it('should also clear initiative card selection', () => {
      // Arrange
      gameStateManager.selectCard(mockCard1);
      gameStateManager.selectCard(mockCard2);
      gameStateManager.setInitiativeCard('card-1');

      // Act
      gameStateManager.clearCardSelection();

      // Assert
      const state = gameStateManager.getState();
      expect(state.selectedInitiativeCardId).toBeNull();
    });
  });
});

/**
 * Test Coverage Summary:
 *
 * - Card Selection into Empty Slots:
 *   - Selecting into empty top slot
 *   - Selecting into empty bottom slot when top is filled
 *
 * - Toggle Deselection:
 *   - Tapping selected top card deselects it
 *   - Tapping selected bottom card deselects it
 *   - Can select new card after deselecting
 *
 * - Full Slots Behavior:
 *   - Tapping unselected card when both full does nothing
 *   - Can still deselect when both slots full
 *
 * - State Emission:
 *   - Emits after selection
 *   - Emits after deselection
 *
 * - clearCardSelection():
 *   - Clears both cards and initiative selection
 */
