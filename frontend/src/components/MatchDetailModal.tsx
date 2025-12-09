/**
 * MatchDetailModal Component (186 - Phase 9)
 * Shows comprehensive details for a completed game from match history
 */

import React from 'react';
import './MatchDetailModal.css';
import type { GameResultDetail } from '../services/game-history.service';

interface MatchDetailModalProps {
  game: GameResultDetail;
  onClose: () => void;
}

/**
 * Format completion time from milliseconds to readable format
 */
function formatCompletionTime(ms: number | null): string {
  if (!ms) return 'N/A';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Format date to readable string
 */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({ game, onClose }) => {
  return (
    <div className="match-detail-overlay" onClick={onClose}>
      <div className="match-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={`match-detail-header ${game.victory ? 'victory' : 'defeat'}`}>
          <div className="header-icon">{game.victory ? '🏆' : '💀'}</div>
          <h2 className="header-title">
            {game.victory ? 'Victory!' : 'Defeat...'}
          </h2>
          <p className="header-subtitle">
            {game.scenarioName || 'Custom Scenario'}
          </p>
          <p className="header-date">{formatDate(game.completedAt)}</p>
        </div>

        {/* Overview Summary */}
        <div className="match-detail-summary">
          <div className="summary-item">
            <span className="summary-label">Room Code</span>
            <span className="summary-value">{game.roomCode}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Rounds</span>
            <span className="summary-value">{game.roundsCompleted}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Duration</span>
            <span className="summary-value">{formatCompletionTime(game.completionTimeMs)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total XP</span>
            <span className="summary-value">{game.totalExperience}</span>
          </div>
        </div>

        {/* Objectives */}
        {game.objectivesCompletedList.length > 0 && (
          <div className="match-detail-section">
            <h3 className="section-title">Objectives Completed</h3>
            <div className="objectives-list">
              {game.objectivesCompletedList.map((objective, idx) => (
                <div key={idx} className="objective-item">
                  <span className="objective-check">✓</span>
                  <span className="objective-text">{objective}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Objective Progress */}
        {Object.keys(game.objectiveProgress).length > 0 && (
          <div className="match-detail-section">
            <h3 className="section-title">Objective Progress</h3>
            <div className="progress-list">
              {Object.entries(game.objectiveProgress).map(([key, progress]) => (
                <div key={key} className="progress-item">
                  <div className="progress-header">
                    <span className="progress-name">{key}</span>
                    <span className="progress-value">
                      {progress.current} / {progress.target}
                      {progress.completed && <span className="progress-completed"> ✓</span>}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className={`progress-fill ${progress.completed ? 'completed' : ''}`}
                      style={{ width: `${Math.min((progress.current / progress.target) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loot Summary */}
        <div className="match-detail-section">
          <h3 className="section-title">Loot & Rewards</h3>
          <div className="loot-summary">
            <div className="loot-item">
              <span className="loot-icon">📦</span>
              <span className="loot-label">Total Loot</span>
              <span className="loot-value">{game.totalLootCollected}</span>
            </div>
            <div className="loot-item">
              <span className="loot-icon">⭐</span>
              <span className="loot-label">Experience</span>
              <span className="loot-value">{game.totalExperience}</span>
            </div>
            <div className="loot-item">
              <span className="loot-icon">💰</span>
              <span className="loot-label">Gold</span>
              <span className="loot-value">{game.totalGold}</span>
            </div>
          </div>
        </div>

        {/* Player Statistics */}
        <div className="match-detail-section">
          <h3 className="section-title">Player Statistics</h3>
          <div className="players-stats">
            {game.playerResults.map((player, idx) => (
              <div key={idx} className="player-stats-card">
                <div className="player-stats-header">
                  <div>
                    <div className="player-stats-name">{player.characterName}</div>
                    <div className="player-stats-class">{player.characterClass}</div>
                  </div>
                  <div className="player-stats-status">
                    {player.survived ? (
                      <span className="status-survived">✓ Survived</span>
                    ) : (
                      <span className="status-died">💀 {player.wasExhausted ? 'Exhausted' : 'Died'}</span>
                    )}
                  </div>
                </div>

                <div className="player-stats-grid">
                  <div className="player-stat">
                    <span className="stat-icon">⚔️</span>
                    <div className="stat-content">
                      <span className="stat-label">Damage Dealt</span>
                      <span className="stat-value">{player.damageDealt}</span>
                    </div>
                  </div>
                  <div className="player-stat">
                    <span className="stat-icon">🛡️</span>
                    <div className="stat-content">
                      <span className="stat-label">Damage Taken</span>
                      <span className="stat-value">{player.damageTaken}</span>
                    </div>
                  </div>
                  <div className="player-stat">
                    <span className="stat-icon">💀</span>
                    <div className="stat-content">
                      <span className="stat-label">Monsters Killed</span>
                      <span className="stat-value">{player.monstersKilled}</span>
                    </div>
                  </div>
                  <div className="player-stat">
                    <span className="stat-icon">📦</span>
                    <div className="stat-content">
                      <span className="stat-label">Loot Collected</span>
                      <span className="stat-value">{player.lootCollected}</span>
                    </div>
                  </div>
                  <div className="player-stat">
                    <span className="stat-icon">🃏</span>
                    <div className="stat-content">
                      <span className="stat-label">Cards Lost</span>
                      <span className="stat-value">{player.cardsLost}</span>
                    </div>
                  </div>
                  <div className="player-stat">
                    <span className="stat-icon">⭐</span>
                    <div className="stat-content">
                      <span className="stat-label">XP Gained</span>
                      <span className="stat-value">{player.experienceGained}</span>
                    </div>
                  </div>
                  <div className="player-stat">
                    <span className="stat-icon">💰</span>
                    <div className="stat-content">
                      <span className="stat-label">Gold Gained</span>
                      <span className="stat-value">{player.goldGained}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Close Button */}
        <div className="match-detail-actions">
          <button className="btn-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
