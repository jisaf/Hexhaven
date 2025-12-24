/**
 * Unit Test: MatchDetailModal Component
 *
 * Tests the MatchDetailModal component rendering and behavior,
 * including the Back to Lobby button functionality (Issue #293).
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MatchDetailModal } from '../../src/components/MatchDetailModal';
import type { GameResultDetail } from '../../src/services/game-history.service';

describe('MatchDetailModal', () => {
  const mockVictoryGame: GameResultDetail = {
    id: 'game-result-1',
    gameId: 'game-1',
    roomCode: 'ABC123',
    scenarioId: 'scenario-1',
    scenarioName: 'Black Barrow',
    victory: true,
    roundsCompleted: 8,
    completionTimeMs: 3600000, // 1 hour
    completedAt: '2024-01-15T14:30:00Z',
    primaryObjectiveCompleted: true,
    secondaryObjectiveCompleted: false,
    objectivesCompletedList: ['Defeat all enemies', 'Loot the treasure chest'],
    objectiveProgress: {
      'Kill Enemies': { current: 10, target: 10, completed: true },
      'Collect Coins': { current: 5, target: 8, completed: false },
    },
    totalLootCollected: 15,
    totalExperience: 20,
    totalGold: 25,
    playerResults: [
      {
        userId: 'user-1',
        characterId: 'char-1',
        characterClass: 'Brute',
        characterName: 'Grok',
        survived: true,
        wasExhausted: false,
        damageDealt: 50,
        damageTaken: 15,
        monstersKilled: 3,
        lootCollected: 8,
        cardsLost: 1,
        experienceGained: 12,
        goldGained: 15,
      },
      {
        userId: 'user-2',
        characterId: 'char-2',
        characterClass: 'Tinkerer',
        characterName: 'Fizz',
        survived: true,
        wasExhausted: false,
        damageDealt: 30,
        damageTaken: 8,
        monstersKilled: 2,
        lootCollected: 7,
        cardsLost: 0,
        experienceGained: 8,
        goldGained: 10,
      },
    ],
  };

  const mockDefeatGame: GameResultDetail = {
    ...mockVictoryGame,
    id: 'game-result-2',
    victory: false,
    scenarioName: 'Crypt of the Damned',
    roundsCompleted: 5,
    objectivesCompletedList: [],
    playerResults: [
      {
        ...mockVictoryGame.playerResults[0],
        survived: false,
        wasExhausted: true,
      },
    ],
  };

  const mockOnClose = jest.fn();
  const mockOnReturnToLobby = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Victory Modal', () => {
    it('should render victory header with correct icon and text', () => {
      render(<MatchDetailModal game={mockVictoryGame} onClose={mockOnClose} />);

      expect(screen.getByText('Victory!')).toBeInTheDocument();
      expect(screen.getByText('Black Barrow')).toBeInTheDocument();
    });

    it('should have correct victory CSS class on header', () => {
      const { container } = render(
        <MatchDetailModal game={mockVictoryGame} onClose={mockOnClose} />
      );

      const header = container.querySelector('.match-detail-header');
      expect(header).toHaveClass('victory');
      expect(header).not.toHaveClass('defeat');
    });
  });

  describe('Defeat Modal', () => {
    it('should render defeat header with correct text', () => {
      render(<MatchDetailModal game={mockDefeatGame} onClose={mockOnClose} />);

      expect(screen.getByText('Defeat...')).toBeInTheDocument();
      expect(screen.getByText('Crypt of the Damned')).toBeInTheDocument();
    });

    it('should have correct defeat CSS class on header', () => {
      const { container } = render(
        <MatchDetailModal game={mockDefeatGame} onClose={mockOnClose} />
      );

      const header = container.querySelector('.match-detail-header');
      expect(header).toHaveClass('defeat');
      expect(header).not.toHaveClass('victory');
    });
  });

  describe('Button Interactions', () => {
    it('should call onClose when Close button is clicked', () => {
      render(<MatchDetailModal game={mockVictoryGame} onClose={mockOnClose} />);

      const closeButton = screen.getByRole('button', { name: 'Close' });
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when clicking overlay', () => {
      const { container } = render(
        <MatchDetailModal game={mockVictoryGame} onClose={mockOnClose} />
      );

      const overlay = container.querySelector('.match-detail-overlay');
      fireEvent.click(overlay!);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when clicking modal content', () => {
      const { container } = render(
        <MatchDetailModal game={mockVictoryGame} onClose={mockOnClose} />
      );

      const modalContent = container.querySelector('.match-detail-modal');
      fireEvent.click(modalContent!);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    /**
     * Issue #293: Back to Lobby button must be clickable
     * The button should be rendered inside the modal and be fully interactive
     */
    it('should render Back to Lobby button when onReturnToLobby is provided', () => {
      render(
        <MatchDetailModal
          game={mockVictoryGame}
          onClose={mockOnClose}
          onReturnToLobby={mockOnReturnToLobby}
        />
      );

      const lobbyButton = screen.getByRole('button', { name: /back to lobby/i });
      expect(lobbyButton).toBeInTheDocument();
    });

    it('should call onReturnToLobby when Back to Lobby button is clicked', () => {
      render(
        <MatchDetailModal
          game={mockVictoryGame}
          onClose={mockOnClose}
          onReturnToLobby={mockOnReturnToLobby}
        />
      );

      const lobbyButton = screen.getByRole('button', { name: /back to lobby/i });
      fireEvent.click(lobbyButton);

      expect(mockOnReturnToLobby).toHaveBeenCalledTimes(1);
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should not render Back to Lobby button when onReturnToLobby is not provided', () => {
      render(<MatchDetailModal game={mockVictoryGame} onClose={mockOnClose} />);

      expect(screen.queryByRole('button', { name: /back to lobby/i })).not.toBeInTheDocument();
    });

    it('should have Back to Lobby button be clickable (not blocked by overlay)', () => {
      render(
        <MatchDetailModal
          game={mockVictoryGame}
          onClose={mockOnClose}
          onReturnToLobby={mockOnReturnToLobby}
        />
      );

      const lobbyButton = screen.getByRole('button', { name: /back to lobby/i });

      // Verify button is visible and not disabled
      expect(lobbyButton).toBeVisible();
      expect(lobbyButton).not.toBeDisabled();

      // Verify button has proper z-index or pointer-events to be clickable
      const buttonStyles = window.getComputedStyle(lobbyButton);
      expect(buttonStyles.pointerEvents).not.toBe('none');

      // Verify click works
      fireEvent.click(lobbyButton);
      expect(mockOnReturnToLobby).toHaveBeenCalledTimes(1);
    });
  });

  describe('Content Display', () => {
    it('should display room code', () => {
      render(<MatchDetailModal game={mockVictoryGame} onClose={mockOnClose} />);

      expect(screen.getByText('ABC123')).toBeInTheDocument();
    });

    it('should display rounds completed', () => {
      render(<MatchDetailModal game={mockVictoryGame} onClose={mockOnClose} />);

      expect(screen.getByText('Rounds')).toBeInTheDocument();
      // Rounds value appears alongside other stats, so use getAllByText
      expect(screen.getAllByText('8').length).toBeGreaterThan(0);
    });

    it('should display objectives when completed', () => {
      render(<MatchDetailModal game={mockVictoryGame} onClose={mockOnClose} />);

      expect(screen.getByText('Defeat all enemies')).toBeInTheDocument();
      expect(screen.getByText('Loot the treasure chest')).toBeInTheDocument();
    });

    it('should display player statistics', () => {
      render(<MatchDetailModal game={mockVictoryGame} onClose={mockOnClose} />);

      expect(screen.getByText('Grok')).toBeInTheDocument();
      expect(screen.getByText('Brute')).toBeInTheDocument();
      expect(screen.getByText('Fizz')).toBeInTheDocument();
      expect(screen.getByText('Tinkerer')).toBeInTheDocument();
    });

    it('should show survived status for living players', () => {
      render(<MatchDetailModal game={mockVictoryGame} onClose={mockOnClose} />);

      const survivedElements = screen.getAllByText(/Survived/i);
      expect(survivedElements.length).toBeGreaterThan(0);
    });

    it('should show exhausted status for exhausted players', () => {
      render(<MatchDetailModal game={mockDefeatGame} onClose={mockOnClose} />);

      expect(screen.getByText(/Exhausted/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have clickable buttons with proper roles', () => {
      render(
        <MatchDetailModal
          game={mockVictoryGame}
          onClose={mockOnClose}
          onReturnToLobby={mockOnReturnToLobby}
        />
      );

      const closeButton = screen.getByRole('button', { name: 'Close' });
      const lobbyButton = screen.getByRole('button', { name: /back to lobby/i });

      expect(closeButton).toBeInTheDocument();
      expect(lobbyButton).toBeInTheDocument();
    });

    it('should render with proper heading hierarchy', () => {
      render(<MatchDetailModal game={mockVictoryGame} onClose={mockOnClose} />);

      const h2 = screen.getByRole('heading', { level: 2, name: 'Victory!' });
      expect(h2).toBeInTheDocument();
    });
  });
});

/**
 * Test Coverage Summary:
 *
 * - Victory modal rendering
 * - Defeat modal rendering
 * - Close button functionality
 * - Overlay click handling
 * - Modal content click (should not close)
 * - Back to Lobby button rendering (Issue #293)
 * - Back to Lobby button click handler (Issue #293)
 * - Back to Lobby button clickability (not blocked by overlay) (Issue #293)
 * - Content display (room code, rounds, objectives, player stats)
 * - Accessibility (button roles, heading hierarchy)
 */
