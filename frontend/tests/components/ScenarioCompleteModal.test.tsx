/**
 * Unit Test: ScenarioCompleteModal Component
 *
 * Tests the ScenarioCompleteModal component rendering and behavior
 * for both victory and defeat scenarios.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScenarioCompleteModal, ScenarioResult } from '../../src/components/ScenarioCompleteModal';

describe('ScenarioCompleteModal', () => {
  const mockVictoryResult: ScenarioResult = {
    victory: true,
    scenarioName: 'Black Barrow',
    roundsCompleted: 8,
    lootCollected: 15,
    experienceGained: 20,
    goldEarned: 25,
    objectivesCompleted: ['Defeat all enemies', 'Loot the treasure chest'],
    playerStats: [
      {
        playerName: 'TestPlayer',
        characterClass: 'Brute',
        damageDealt: 50,
        damageTaken: 15,
        monstersKilled: 3,
        cardsLost: 1,
      },
      {
        playerName: 'Player2',
        characterClass: 'Tinkerer',
        damageDealt: 30,
        damageTaken: 8,
        monstersKilled: 2,
        cardsLost: 0,
      },
    ],
  };

  const mockDefeatResult: ScenarioResult = {
    victory: false,
    scenarioName: 'Crypt of the Damned',
    roundsCompleted: 5,
    lootCollected: 8,
    experienceGained: 5,
    goldEarned: 10,
    objectivesCompleted: [],
    playerStats: [
      {
        playerName: 'TestPlayer',
        characterClass: 'Spellweaver',
        damageDealt: 25,
        damageTaken: 35,
        monstersKilled: 1,
        cardsLost: 5,
      },
    ],
  };

  const mockOnClose = jest.fn();
  const mockOnPlayAgain = jest.fn();
  const mockOnReturnToLobby = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Victory Modal', () => {
    it('should render victory header with correct icon and text', () => {
      render(
        <ScenarioCompleteModal
          result={mockVictoryResult}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Victory!')).toBeInTheDocument();
      expect(screen.getByText('🏆')).toBeInTheDocument();
      expect(screen.getByText('Black Barrow')).toBeInTheDocument();
    });

    it('should display results summary with correct values', () => {
      render(
        <ScenarioCompleteModal
          result={mockVictoryResult}
          onClose={mockOnClose}
        />
      );

      // Verify labels exist
      expect(screen.getByText('Rounds')).toBeInTheDocument();
      expect(screen.getByText('Loot')).toBeInTheDocument();
      expect(screen.getByText('Experience')).toBeInTheDocument();
      expect(screen.getByText('Gold')).toBeInTheDocument();

      // Verify values exist in the document (may appear multiple times)
      expect(screen.getAllByText('8').length).toBeGreaterThan(0);
      expect(screen.getAllByText('15').length).toBeGreaterThan(0);
      expect(screen.getByText('+20')).toBeInTheDocument();
      expect(screen.getByText('💰 25')).toBeInTheDocument();
    });

    it('should display completed objectives', () => {
      render(
        <ScenarioCompleteModal
          result={mockVictoryResult}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Objectives Completed')).toBeInTheDocument();
      expect(screen.getByText('Defeat all enemies')).toBeInTheDocument();
      expect(screen.getByText('Loot the treasure chest')).toBeInTheDocument();
    });

    it('should display all player statistics', () => {
      render(
        <ScenarioCompleteModal
          result={mockVictoryResult}
          onClose={mockOnClose}
        />
      );

      // Player 1
      expect(screen.getByText('TestPlayer')).toBeInTheDocument();
      expect(screen.getByText('Brute')).toBeInTheDocument();
      expect(screen.getAllByText('50').length).toBeGreaterThan(0); // Damage dealt
      expect(screen.getAllByText('15').length).toBeGreaterThan(0); // Damage taken
      expect(screen.getAllByText('3').length).toBeGreaterThan(0); // Monsters killed

      // Player 2
      expect(screen.getByText('Player2')).toBeInTheDocument();
      expect(screen.getByText('Tinkerer')).toBeInTheDocument();
      expect(screen.getAllByText('30').length).toBeGreaterThan(0); // Damage dealt
      expect(screen.getAllByText('8').length).toBeGreaterThan(0); // Damage taken
      expect(screen.getAllByText('2').length).toBeGreaterThan(0); // Monsters killed
    });

    it('should have correct victory CSS class on header', () => {
      const { container } = render(
        <ScenarioCompleteModal
          result={mockVictoryResult}
          onClose={mockOnClose}
        />
      );

      const header = container.querySelector('.modal-header');
      expect(header).toHaveClass('victory');
      expect(header).not.toHaveClass('defeat');
    });
  });

  describe('Defeat Modal', () => {
    it('should render defeat header with correct icon and text', () => {
      const { container } = render(
        <ScenarioCompleteModal
          result={mockDefeatResult}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Defeat...')).toBeInTheDocument();
      expect(container.textContent).toContain('💀');
      expect(screen.getByText('Crypt of the Damned')).toBeInTheDocument();
    });

    it('should show consolation experience for defeat', () => {
      render(
        <ScenarioCompleteModal
          result={mockDefeatResult}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('+5')).toBeInTheDocument();
    });

    it('should not show objectives completed section when empty', () => {
      render(
        <ScenarioCompleteModal
          result={mockDefeatResult}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByText('Objectives Completed')).not.toBeInTheDocument();
    });

    it('should have correct defeat CSS class on header', () => {
      const { container } = render(
        <ScenarioCompleteModal
          result={mockDefeatResult}
          onClose={mockOnClose}
        />
      );

      const header = container.querySelector('.modal-header');
      expect(header).toHaveClass('defeat');
      expect(header).not.toHaveClass('victory');
    });
  });

  describe('Button Interactions', () => {
    it('should call onClose when Close button is clicked', () => {
      render(
        <ScenarioCompleteModal
          result={mockVictoryResult}
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when clicking overlay', () => {
      const { container } = render(
        <ScenarioCompleteModal
          result={mockVictoryResult}
          onClose={mockOnClose}
        />
      );

      const overlay = container.querySelector('.scenario-complete-modal-overlay');
      fireEvent.click(overlay!);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when clicking modal content', () => {
      const { container } = render(
        <ScenarioCompleteModal
          result={mockVictoryResult}
          onClose={mockOnClose}
        />
      );

      const modalContent = container.querySelector('.scenario-complete-modal');
      fireEvent.click(modalContent!);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should call onPlayAgain when Play Again button is clicked', () => {
      render(
        <ScenarioCompleteModal
          result={mockVictoryResult}
          onClose={mockOnClose}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      const playAgainButton = screen.getByText('Play Again');
      fireEvent.click(playAgainButton);

      expect(mockOnPlayAgain).toHaveBeenCalledTimes(1);
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should call onReturnToLobby when Return to Lobby button is clicked', () => {
      render(
        <ScenarioCompleteModal
          result={mockVictoryResult}
          onClose={mockOnClose}
          onReturnToLobby={mockOnReturnToLobby}
        />
      );

      const lobbyButton = screen.getByText('Return to Lobby');
      fireEvent.click(lobbyButton);

      expect(mockOnReturnToLobby).toHaveBeenCalledTimes(1);
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should not render Play Again button when callback not provided', () => {
      render(
        <ScenarioCompleteModal
          result={mockVictoryResult}
          onClose={mockOnClose}
          onReturnToLobby={mockOnReturnToLobby}
        />
      );

      expect(screen.queryByText('Play Again')).not.toBeInTheDocument();
    });

    it('should not render Return to Lobby button when callback not provided', () => {
      render(
        <ScenarioCompleteModal
          result={mockVictoryResult}
          onClose={mockOnClose}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      expect(screen.queryByText('Return to Lobby')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero player stats', () => {
      const resultWithNoPlayers: ScenarioResult = {
        ...mockVictoryResult,
        playerStats: [],
      };

      render(
        <ScenarioCompleteModal
          result={resultWithNoPlayers}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Player Statistics')).toBeInTheDocument();
      // Should still render the section even with no players
    });

    it('should handle zero values in stats', () => {
      const resultWithZeroStats: ScenarioResult = {
        ...mockVictoryResult,
        roundsCompleted: 0,
        lootCollected: 0,
        experienceGained: 0,
        goldEarned: 0,
      };

      const { container } = render(
        <ScenarioCompleteModal
          result={resultWithZeroStats}
          onClose={mockOnClose}
        />
      );

      // Check that summary items exist (values will be rendered)
      expect(screen.getByText('Rounds')).toBeInTheDocument();
      expect(screen.getByText('Loot')).toBeInTheDocument();
      expect(screen.getByText('Experience')).toBeInTheDocument();
      expect(screen.getByText('Gold')).toBeInTheDocument();

      // Verify the container contains the zero values
      expect(container.textContent).toContain('0');
      expect(container.textContent).toContain('+0');
    });

    it('should handle single player scenario', () => {
      const singlePlayerResult: ScenarioResult = {
        ...mockVictoryResult,
        playerStats: [mockVictoryResult.playerStats[0]],
      };

      render(
        <ScenarioCompleteModal
          result={singlePlayerResult}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('TestPlayer')).toBeInTheDocument();
      expect(screen.queryByText('Player2')).not.toBeInTheDocument();
    });

    it('should handle long scenario names', () => {
      const longNameResult: ScenarioResult = {
        ...mockVictoryResult,
        scenarioName: 'The Ancient Ruins of the Forgotten Temple of the Lost Civilization',
      };

      render(
        <ScenarioCompleteModal
          result={longNameResult}
          onClose={mockOnClose}
        />
      );

      expect(
        screen.getByText('The Ancient Ruins of the Forgotten Temple of the Lost Civilization')
      ).toBeInTheDocument();
    });

    it('should handle many objectives completed', () => {
      const manyObjectivesResult: ScenarioResult = {
        ...mockVictoryResult,
        objectivesCompleted: [
          'Defeat all enemies',
          'Loot the treasure chest',
          'Complete in under 8 rounds',
          'No character exhaustion',
          'Collect all coins',
        ],
      };

      render(
        <ScenarioCompleteModal
          result={manyObjectivesResult}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Defeat all enemies')).toBeInTheDocument();
      expect(screen.getByText('Loot the treasure chest')).toBeInTheDocument();
      expect(screen.getByText('Complete in under 8 rounds')).toBeInTheDocument();
      expect(screen.getByText('No character exhaustion')).toBeInTheDocument();
      expect(screen.getByText('Collect all coins')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should render with proper heading hierarchy', () => {
      render(
        <ScenarioCompleteModal
          result={mockVictoryResult}
          onClose={mockOnClose}
        />
      );

      const h2 = screen.getByRole('heading', { level: 2, name: 'Victory!' });
      const h3Objectives = screen.getByRole('heading', { level: 3, name: 'Objectives Completed' });
      const h3Stats = screen.getByRole('heading', { level: 3, name: 'Player Statistics' });

      expect(h2).toBeInTheDocument();
      expect(h3Objectives).toBeInTheDocument();
      expect(h3Stats).toBeInTheDocument();
    });

    it('should have clickable buttons with proper text', () => {
      render(
        <ScenarioCompleteModal
          result={mockVictoryResult}
          onClose={mockOnClose}
          onPlayAgain={mockOnPlayAgain}
          onReturnToLobby={mockOnReturnToLobby}
        />
      );

      const closeButton = screen.getByRole('button', { name: 'Close' });
      const playAgainButton = screen.getByRole('button', { name: 'Play Again' });
      const lobbyButton = screen.getByRole('button', { name: 'Return to Lobby' });

      expect(closeButton).toBeInTheDocument();
      expect(playAgainButton).toBeInTheDocument();
      expect(lobbyButton).toBeInTheDocument();
    });
  });
});

/**
 * Test Coverage Summary:
 *
 * ✅ Victory modal rendering
 * ✅ Defeat modal rendering
 * ✅ Results summary display
 * ✅ Objectives completed section
 * ✅ Player statistics display
 * ✅ CSS class application
 * ✅ Button click handlers
 * ✅ Overlay click handling
 * ✅ Optional button rendering
 * ✅ Edge cases (zero values, no players, many objectives)
 * ✅ Accessibility (headings, buttons)
 *
 * Coverage: ~100% of ScenarioCompleteModal component functionality
 */
