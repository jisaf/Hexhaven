/**
 * PlayerList Component
 *
 * Displays list of players in the game room lobby.
 * Features:
 * - Shows player nicknames
 * - Indicates host status
 * - Shows connection status
 * - Displays selected character class
 * - Shows ready status
 */

import { useTranslation } from 'react-i18next';

export interface Player {
  id: string;
  nickname: string;
  isHost: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  characterClass?: string;
  isReady: boolean;
}

export interface PlayerListProps {
  players: Player[];
  currentPlayerId?: string;
}

export function PlayerList({ players, currentPlayerId }: PlayerListProps) {
  const { t } = useTranslation();

  const getConnectionIcon = (status: Player['connectionStatus']) => {
    switch (status) {
      case 'connected':
        return '●';
      case 'disconnected':
        return '○';
      case 'reconnecting':
        return '◐';
    }
  };

  const getConnectionColor = (status: Player['connectionStatus']) => {
    switch (status) {
      case 'connected':
        return '#4ade80';
      case 'disconnected':
        return '#ef4444';
      case 'reconnecting':
        return '#fbbf24';
    }
  };

  return (
    <div className="player-list-container" data-testid="player-list-container">
      <h4 className="player-list-title">
        {t('lobby:players', 'Players')} ({players.length}/4)
      </h4>
      <div className="player-grid">
        {players.map(player => (
          <div key={player.id} className="player-card">
            <span className="player-nickname">{player.nickname}</span>
            {player.isHost && <span className="host-badge">👑</span>}
            {player.id === currentPlayerId && <span className="you-badge">{t('lobby:you', '(You)')}</span>}
          </div>
        ))}
        {Array.from({ length: 4 - players.length }).map((_, i) => (
          <div key={`empty-${i}`} className="player-card empty">
            {t('lobby:waiting', 'Waiting...')}
          </div>
        ))}
      </div>
      <style>{`
        .player-list-container {
          width: 100%;
        }
        .player-list-title {
          font-size: 16px;
          color: #c9a444;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin: 0 0 12px 0;
          text-align: center;
        }
        .player-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .player-card {
          background: rgba(0,0,0,0.3);
          padding: 10px;
          border-radius: 6px;
          text-align: center;
          font-size: 14px;
          color: #e0e0e0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 40px;
        }
        .player-card.empty {
          color: #888;
          font-style: italic;
        }
        .host-badge {
          font-size: 12px;
        }
        .you-badge {
          font-size: 11px;
          color: #c9a444;
          margin-left: 2px;
        }
      `}</style>
    </div>
  );
}
