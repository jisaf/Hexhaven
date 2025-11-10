/**
 * ScenarioCompleteModal Component (US2 - T110)
 *
 * Victory/defeat modal displayed when scenario is completed.
 * Shows results, loot collected, and experience gained.
 */

import React from 'react';
import './ScenarioCompleteModal.css';

export interface ScenarioResult {
  victory: boolean;
  scenarioName: string;
  roundsCompleted: number;
  lootCollected: number;
  experienceGained: number;
  goldEarned: number;
  objectivesCompleted: string[];
  playerStats: PlayerScenarioStats[];
}

export interface PlayerScenarioStats {
  playerName: string;
  characterClass: string;
  damageDealt: number;
  damageTaken: number;
  monstersKilled: number;
  cardsLost: number;
}

interface ScenarioCompleteModalProps {
  result: ScenarioResult;
  onClose: () => void;
  onPlayAgain?: () => void;
  onReturnToLobby?: () => void;
}

export const ScenarioCompleteModal: React.FC<ScenarioCompleteModalProps> = ({
  result,
  onClose,
  onPlayAgain,
  onReturnToLobby,
}) => {
  return (
    <div className="scenario-complete-modal-overlay" onClick={onClose}>
      <div
        className="scenario-complete-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`modal-header ${result.victory ? 'victory' : 'defeat'}`}>
          <div className="header-icon">
            {result.victory ? '🏆' : '💀'}
          </div>
          <h2 className="header-title">
            {result.victory ? 'Victory!' : 'Defeat...'}
          </h2>
          <p className="header-subtitle">
            {result.scenarioName}
          </p>
        </div>

        {/* Results Summary */}
        <div className="results-summary">
          <div className="summary-item">
            <span className="summary-label">Rounds</span>
            <span className="summary-value">{result.roundsCompleted}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Loot</span>
            <span className="summary-value">{result.lootCollected}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Experience</span>
            <span className="summary-value">+{result.experienceGained}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Gold</span>
            <span className="summary-value">💰 {result.goldEarned}</span>
          </div>
        </div>

        {/* Objectives */}
        {result.objectivesCompleted.length > 0 && (
          <div className="objectives-section">
            <h3 className="section-title">Objectives Completed</h3>
            <div className="objectives-list">
              {result.objectivesCompleted.map((objective, idx) => (
                <div key={idx} className="objective-item">
                  <span className="objective-check">✓</span>
                  <span className="objective-text">{objective}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Player Stats */}
        <div className="player-stats-section">
          <h3 className="section-title">Player Statistics</h3>
          <div className="stats-table">
            {result.playerStats.map((player, idx) => (
              <div key={idx} className="player-stat-row">
                <div className="player-info">
                  <div className="player-name">{player.playerName}</div>
                  <div className="player-class">{player.characterClass}</div>
                </div>
                <div className="player-metrics">
                  <div className="metric">
                    <span className="metric-icon">⚔️</span>
                    <span className="metric-value">{player.damageDealt}</span>
                    <span className="metric-label">Damage</span>
                  </div>
                  <div className="metric">
                    <span className="metric-icon">🛡️</span>
                    <span className="metric-value">{player.damageTaken}</span>
                    <span className="metric-label">Taken</span>
                  </div>
                  <div className="metric">
                    <span className="metric-icon">💀</span>
                    <span className="metric-value">{player.monstersKilled}</span>
                    <span className="metric-label">Kills</span>
                  </div>
                  <div className="metric">
                    <span className="metric-icon">🃏</span>
                    <span className="metric-value">{player.cardsLost}</span>
                    <span className="metric-label">Cards Lost</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="modal-actions">
          {onPlayAgain && (
            <button className="btn-action btn-play-again" onClick={onPlayAgain}>
              Play Again
            </button>
          )}
          {onReturnToLobby && (
            <button className="btn-action btn-lobby" onClick={onReturnToLobby}>
              Return to Lobby
            </button>
          )}
          <button className="btn-action btn-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
