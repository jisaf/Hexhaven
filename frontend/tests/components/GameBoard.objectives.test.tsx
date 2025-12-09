/**
 * Frontend Unit Test: GameBoard Objectives Extraction
 *
 * Verifies that the GameBoard component correctly extracts objectives
 * from gameState.gameData.objectives instead of relying on a separate
 * objectives_loaded event.
 *
 * Based on verified behavior from manual testing.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { GameBoard } from '../../src/pages/GameBoard';
import { gameStateManager } from '../../src/services/game-state.service';
import type { ObjectivesLoadedPayload } from '../../../shared/types/events';

// Mock dependencies
jest.mock('../../src/services/game-state.service');
jest.mock('../../src/services/websocket.service');
jest.mock('../../src/hooks/useHexGrid');
jest.mock('../../src/hooks/useFullscreen');

describe('GameBoard - Objectives Extraction', () => {
  const mockObjectives: ObjectivesLoadedPayload = {
    primary: {
      id: 'primary-obj-1',
      description: 'Defeat all enemies',
      trackProgress: true,
    },
    secondary: [
      {
        id: 'secondary-obj-1',
        description: 'Loot the treasure chest',
        trackProgress: true,
        optional: true,
      },
    ],
    failureConditions: [],
  };

  const mockGameState = {
    gameData: {
      scenarioId: 'scenario-1',
      scenarioName: 'Black Barrow',
      mapLayout: [],
      monsters: [],
      characters: [],
      objectives: mockObjectives, // <-- Objectives included in game state
    },
    currentRound: 1,
    turnOrder: [],
    currentTurnEntityId: null,
    isMyTurn: false,
    myCharacterId: null,
    playerHand: [],
    selectedTopAction: null,
    selectedBottomAction: null,
    selectedCharacterId: null,
    selectedHex: null,
    currentMovementPoints: 0,
    validMovementHexes: [],
    attackMode: false,
    attackableTargets: [],
    validAttackHexes: [],
    selectedAttackTarget: null,
    logs: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock gameStateManager to return our mock state
    (gameStateManager.getState as jest.Mock).mockReturnValue(mockGameState);
    (gameStateManager.subscribe as jest.Mock).mockImplementation((callback: any) => {
      callback(mockGameState);
      return jest.fn(); // Return unsubscribe function
    });
  });

  it('should extract objectives from gameState.gameData.objectives', async () => {
    // Arrange & Act
    const { container } = render(
      <BrowserRouter>
        <GameBoard />
      </BrowserRouter>
    );

    // Assert: Wait for objectives to be extracted
    await waitFor(() => {
      // Verify objectives are displayed in the DOM
      const objectiveText = container.textContent;
      expect(objectiveText).toContain('Defeat all enemies');
      expect(objectiveText).toContain('Loot the treasure chest');
    });
  });

  it('should display primary objective', async () => {
    // Arrange & Act
    const { getByText } = render(
      <BrowserRouter>
        <GameBoard />
      </BrowserRouter>
    );

    // Assert
    await waitFor(() => {
      expect(getByText('Defeat all enemies')).toBeInTheDocument();
    });
  });

  it('should display secondary objectives', async () => {
    // Arrange & Act
    const { getByText } = render(
      <BrowserRouter>
        <GameBoard />
      </BrowserRouter>
    );

    // Assert
    await waitFor(() => {
      expect(getByText('Loot the treasure chest')).toBeInTheDocument();
    });
  });

  it('should handle game state without objectives gracefully', async () => {
    // Arrange: Game state without objectives
    const stateWithoutObjectives = {
      ...mockGameState,
      gameData: {
        ...mockGameState.gameData,
        objectives: undefined,
      },
    };

    (gameStateManager.getState as jest.Mock).mockReturnValue(stateWithoutObjectives);
    (gameStateManager.subscribe as jest.Mock).mockImplementation((callback: any) => {
      callback(stateWithoutObjectives);
      return jest.fn();
    });

    // Act
    const { container } = render(
      <BrowserRouter>
        <GameBoard />
      </BrowserRouter>
    );

    // Assert: Should not crash, objectives section should be empty or show placeholder
    expect(container).toBeInTheDocument();
  });

  it('should update objectives when game state changes', async () => {
    // Arrange: Initial state with one set of objectives
    let currentState = mockGameState;
    const subscribers: any[] = [];

    (gameStateManager.getState as jest.Mock).mockImplementation(() => currentState);
    (gameStateManager.subscribe as jest.Mock).mockImplementation((callback: any) => {
      subscribers.push(callback);
      callback(currentState);
      return jest.fn();
    });

    // Act: Render component
    const { getByText, rerender } = render(
      <BrowserRouter>
        <GameBoard />
      </BrowserRouter>
    );

    // Verify initial objectives
    await waitFor(() => {
      expect(getByText('Defeat all enemies')).toBeInTheDocument();
    });

    // Update state with new objectives
    const newObjectives: ObjectivesLoadedPayload = {
      primary: {
        id: 'primary-obj-2',
        description: 'Reach the exit',
        trackProgress: true,
      },
      secondary: [],
      failureConditions: [],
    };

    currentState = {
      ...mockGameState,
      gameData: {
        ...mockGameState.gameData!,
        objectives: newObjectives,
      },
    };

    // Trigger state update
    subscribers.forEach((sub) => sub(currentState));
    rerender(
      <BrowserRouter>
        <GameBoard />
      </BrowserRouter>
    );

    // Assert: New objectives should be displayed
    await waitFor(() => {
      expect(getByText('Reach the exit')).toBeInTheDocument();
    });
  });

  describe('Console Logging (Verified Behavior)', () => {
    it('should log objectives extraction from game state', async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      render(
        <BrowserRouter>
          <GameBoard />
        </BrowserRouter>
      );

      // Assert: Verify the expected log message
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('[GameBoard] Objectives loaded from game state:'),
          expect.objectContaining({
            primary: expect.any(Object),
            secondary: expect.any(Array),
          })
        );
      });

      consoleSpy.mockRestore();
    });
  });
});

/**
 * Verified Behavior from Manual Testing:
 *
 * 1. Console Log:
 *    "[GameBoard] Objectives loaded from game state: {primary: Object, secondary: Array(1), failureConditions: Array(0)}"
 *
 * 2. UI Display:
 *    - "Objective: Defeat all enemies"
 *    - "Optional: Loot the treasure chest"
 *
 * 3. Timing:
 *    - Objectives extracted immediately when gameState.gameData updates
 *    - No dependency on separate WebSocket event
 *    - No race condition possible
 *
 * 4. Implementation:
 *    ```typescript
 *    useEffect(() => {
 *      if (gameState.gameData?.objectives) {
 *        console.log('[GameBoard] Objectives loaded from game state:', gameState.gameData.objectives);
 *        setObjectives(gameState.gameData.objectives);
 *      }
 *    }, [gameState.gameData]);
 *    ```
 */
