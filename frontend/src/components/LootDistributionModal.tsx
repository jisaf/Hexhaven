/**
 * LootDistributionModal Component (US2 - T124)
 *
 * End-of-scenario modal showing loot distribution among players.
 * Displays gold collected by each player and total rewards.
 */

import React from 'react';
import './LootDistributionModal.css';

export interface PlayerLoot {
  playerId: string;
  playerName: string;
  characterClass: string;
  goldCollected: number;
  lootTokensCollected: number;
}

interface LootDistributionModalProps {
  loot: PlayerLoot[];
  totalGold: number;
  onClose: () => void;
  onContinue?: () => void;
}

export const LootDistributionModal: React.FC<LootDistributionModalProps> = ({
  loot,
  totalGold,
  onClose,
  onContinue,
}) => {
  return (
    <div className="loot-distribution-modal-overlay" onClick={onClose}>
      <div
        className="loot-distribution-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="header-icon">💰</div>
          <h2 className="header-title">Loot Distribution</h2>
          <p className="header-subtitle">
            Total Gold Collected: {totalGold}
          </p>
        </div>

        {/* Loot Table */}
        <div className="loot-table">
          <div className="table-header">
            <div className="column-player">Player</div>
            <div className="column-tokens">Tokens</div>
            <div className="column-gold">Gold</div>
          </div>

          {loot.map((playerLoot, idx) => (
            <div key={playerLoot.playerId} className="loot-row">
              <div className="column-player">
                <div className="player-info">
                  <div className="player-name">{playerLoot.playerName}</div>
                  <div className="player-class">{playerLoot.characterClass}</div>
                </div>
              </div>
              <div className="column-tokens">
                <span className="token-count">
                  {playerLoot.lootTokensCollected}
                </span>
                <span className="token-icon">🪙</span>
              </div>
              <div className="column-gold">
                <span className="gold-amount">
                  {playerLoot.goldCollected}
                </span>
                <span className="gold-icon">💰</span>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="loot-summary">
          <div className="summary-stat">
            <span className="stat-label">Total Tokens:</span>
            <span className="stat-value">
              {loot.reduce((sum, p) => sum + p.lootTokensCollected, 0)}
            </span>
          </div>
          <div className="summary-stat highlight">
            <span className="stat-label">Total Gold:</span>
            <span className="stat-value">{totalGold}</span>
          </div>
          <div className="summary-stat">
            <span className="stat-label">Average per Player:</span>
            <span className="stat-value">
              {loot.length > 0 ? Math.floor(totalGold / loot.length) : 0}
            </span>
          </div>
        </div>

        {/* Top Collector */}
        {loot.length > 0 && (
          <div className="top-collector">
            <span className="collector-label">🏆 Top Collector:</span>
            <span className="collector-name">
              {[...loot].sort((a, b) => b.goldCollected - a.goldCollected)[0].playerName}
            </span>
            <span className="collector-amount">
              ({[...loot].sort((a, b) => b.goldCollected - a.goldCollected)[0].goldCollected} gold)
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="modal-actions">
          {onContinue && (
            <button className="btn-action btn-continue" onClick={onContinue}>
              Continue to Results
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
