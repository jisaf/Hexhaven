/**
 * Match History Page (186 - Phase 9)
 * Displays player's past games with filtering and detail viewing
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MatchCard } from '../components/MatchCard';
import { MatchDetailModal } from '../components/MatchDetailModal';
import { gameHistoryService } from '../services/game-history.service';
import type {
  GameHistoryItem,
  GameResultDetail,
  HistoryFilters,
} from '../services/game-history.service';
import { authService } from '../services/auth.service';
import './MatchHistory.css';

const ITEMS_PER_PAGE = 20;

export const MatchHistory: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [games, setGames] = useState<GameHistoryItem[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameResultDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalGames, setTotalGames] = useState(0);

  // Filters
  const [filters, setFilters] = useState<HistoryFilters>({
    limit: ITEMS_PER_PAGE,
    offset: 0,
  });
  const [victoryFilter, setVictoryFilter] = useState<'all' | 'victory' | 'defeat'>('all');
  const [characterClassFilter, setCharacterClassFilter] = useState<string>('');
  const [scenarioFilter, setScenarioFilter] = useState<string>('');

  // Get current user ID
  const currentUser = authService.getUser();
  const userId = currentUser?.id;

  // Load games
  const loadGames = async (append: boolean = false) => {
    if (!userId) {
      setError('You must be logged in to view match history');
      setIsLoading(false);
      return;
    }

    try {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      const response = await gameHistoryService.getHistory(userId, filters);

      if (append) {
        setGames((prev) => [...prev, ...response.games]);
      } else {
        setGames(response.games);
      }

      setTotalGames(response.total);
      setHasMore(
        (filters.offset || 0) + (filters.limit || ITEMS_PER_PAGE) < response.total
      );
      setError(null);
    } catch (err) {
      console.error('Failed to load match history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load match history');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Load game detail
  const loadGameDetail = async (gameResultId: string) => {
    try {
      const detail = await gameHistoryService.getGameResult(gameResultId);
      setSelectedGame(detail);
    } catch (err) {
      console.error('Failed to load game details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load game details');
    }
  };

  // Load more games
  const handleLoadMore = () => {
    setFilters((prev) => ({
      ...prev,
      offset: (prev.offset || 0) + ITEMS_PER_PAGE,
    }));
  };

  // Apply filters
  const applyFilters = () => {
    const newFilters: HistoryFilters = {
      limit: ITEMS_PER_PAGE,
      offset: 0,
    };

    if (victoryFilter !== 'all') {
      newFilters.victory = victoryFilter === 'victory';
    }

    if (characterClassFilter) {
      newFilters.characterClass = characterClassFilter;
    }

    if (scenarioFilter) {
      newFilters.scenarioId = scenarioFilter;
    }

    setFilters(newFilters);
  };

  // Reset filters
  const resetFilters = () => {
    setVictoryFilter('all');
    setCharacterClassFilter('');
    setScenarioFilter('');
    setFilters({
      limit: ITEMS_PER_PAGE,
      offset: 0,
    });
  };

  // Effects
  useEffect(() => {
    if (!userId) {
      navigate('/login');
      return;
    }
    loadGames(filters.offset !== 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, userId]);

  // Render
  if (!userId) {
    return null; // Will redirect
  }

  return (
    <div className="match-history-page">
      {/* Header */}
      <header className="match-history-header">
        <div className="header-content">
          <button className="btn-back" onClick={() => navigate('/')}>
            ← Back to Lobby
          </button>
          <h1 className="page-title">Match History</h1>
          <p className="page-subtitle">
            {totalGames} {totalGames === 1 ? 'game' : 'games'} played
          </p>
        </div>

        {/* Filter Bar */}
        <div className="filter-bar">
          <div className="filter-group">
            <label htmlFor="victory-filter">Result:</label>
            <select
              id="victory-filter"
              value={victoryFilter}
              onChange={(e) => setVictoryFilter(e.target.value as any)}
            >
              <option value="all">All</option>
              <option value="victory">Victory</option>
              <option value="defeat">Defeat</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="class-filter">Character:</label>
            <input
              id="class-filter"
              type="text"
              placeholder="Class name..."
              value={characterClassFilter}
              onChange={(e) => setCharacterClassFilter(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="scenario-filter">Scenario:</label>
            <input
              id="scenario-filter"
              type="text"
              placeholder="Scenario ID..."
              value={scenarioFilter}
              onChange={(e) => setScenarioFilter(e.target.value)}
            />
          </div>

          <button className="btn-apply-filters" onClick={applyFilters}>
            Apply Filters
          </button>
          <button className="btn-reset-filters" onClick={resetFilters}>
            Reset
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="match-history-content">
        {/* Loading State */}
        {isLoading && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading match history...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <p>{error}</p>
            <button className="btn-retry" onClick={() => loadGames()}>
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && games.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🎮</div>
            <h2>No Games Found</h2>
            <p>
              {totalGames === 0
                ? "You haven't played any games yet. Start a new game to build your match history!"
                : 'No games match your current filters. Try adjusting or resetting them.'}
            </p>
            {totalGames > 0 && (
              <button className="btn-reset-filters" onClick={resetFilters}>
                Reset Filters
              </button>
            )}
            <button className="btn-start-game" onClick={() => navigate('/')}>
              Start New Game
            </button>
          </div>
        )}

        {/* Games List */}
        {!isLoading && games.length > 0 && (
          <>
            <div className="games-list">
              {games.map((game) => (
                <MatchCard
                  key={game.id}
                  game={game}
                  onClick={() => loadGameDetail(game.id)}
                />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="load-more-container">
                <button
                  className="btn-load-more"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <>
                      <span className="loading-spinner small"></span>
                      Loading...
                    </>
                  ) : (
                    `Load More (${totalGames - games.length} remaining)`
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedGame && (
        <MatchDetailModal game={selectedGame} onClose={() => setSelectedGame(null)} />
      )}
    </div>
  );
};
