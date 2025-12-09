/**
 * MatchCard Component (186 - Phase 9)
 * Displays a summary card for a completed game in match history
 */

import React from 'react';
import './MatchCard.css';
import type { GameHistoryItem } from '../services/game-history.service';

interface MatchCardProps {
  game: GameHistoryItem;
  onClick: () => void;
}

/**
 * Format date as relative time (e.g., "2 hours ago", "3 days ago")
 */
function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMonths > 0) {
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  }
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
  if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }
  if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  }
  return 'Just now';
}

export const MatchCard: React.FC<MatchCardProps> = ({ game, onClick }) => {
  return (
    <div
      className={`match-card ${game.victory ? 'victory' : 'defeat'}`}
      onClick={onClick}
    >
      {/* Header Badge */}
      <div className={`match-card-badge ${game.victory ? 'victory' : 'defeat'}`}>
        <span className="badge-icon">{game.victory ? '🏆' : '💀'}</span>
        <span className="badge-text">{game.victory ? 'VICTORY' : 'DEFEAT'}</span>
      </div>

      {/* Scenario Info */}
      <div className="match-card-header">
        <h3 className="scenario-name">
          {game.scenarioName || 'Custom Scenario'}
        </h3>
        <span className="match-time">{formatRelativeTime(game.completedAt)}</span>
      </div>

      {/* Stats Row */}
      <div className="match-card-stats">
        <div className="stat-item">
          <span className="stat-icon">🎭</span>
          <span className="stat-value">{game.playerResult.characterClass}</span>
        </div>
        <div className="stat-divider">|</div>
        <div className="stat-item">
          <span className="stat-icon">🔄</span>
          <span className="stat-value">{game.roundsCompleted} rounds</span>
        </div>
        <div className="stat-divider">|</div>
        <div className="stat-item">
          <span className="stat-icon">⭐</span>
          <span className="stat-value">{game.playerResult.experienceGained} XP</span>
        </div>
        <div className="stat-divider">|</div>
        <div className="stat-item">
          <span className="stat-icon">💰</span>
          <span className="stat-value">{game.playerResult.goldGained} gold</span>
        </div>
      </div>

      {/* Character Name */}
      <div className="match-card-character">
        Playing as: <strong>{game.playerResult.characterName}</strong>
      </div>

      {/* Other Players */}
      {game.otherPlayers.length > 0 && (
        <div className="match-card-players">
          <span className="players-label">With:</span>
          <span className="players-list">
            {game.otherPlayers.map((p, idx) => (
              <span key={idx} className="player-tag">
                {p.characterClass}
                {!p.survived && <span className="player-status-dead"> (💀)</span>}
              </span>
            ))}
          </span>
        </div>
      )}

      {/* Hover Indicator */}
      <div className="match-card-hover-hint">
        Click for details →
      </div>
    </div>
  );
};
