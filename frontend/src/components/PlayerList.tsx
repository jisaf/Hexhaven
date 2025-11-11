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
    <div className="player-list" data-testid="player-list">
      <h3 className="player-list-title">
        {t('lobby.players', 'Players')} ({players.length}/4)
      </h3>

      <ul className="players" role="list">
        {players.map((player) => (
          <li
            key={player.id}
            className={`player-item ${player.id === currentPlayerId ? 'current-player' : ''}`}
            data-testid="player-item"
          >
            <div className="player-info">
              <span
                className="connection-status"
                style={{ color: getConnectionColor(player.connectionStatus) }}
                aria-label={t(`lobby.connectionStatus.${player.connectionStatus}`, player.connectionStatus)}
              >
                {getConnectionIcon(player.connectionStatus)}
              </span>

              <span className="player-nickname">
                {player.nickname}
                {player.id === currentPlayerId && (
                  <span className="you-badge">{t('lobby.you', '(You)')}</span>
                )}
              </span>

              {player.isHost && (
                <span className="host-badge" title={t('lobby.host', 'Host')}>
                  👑
                </span>
              )}
            </div>

            <div className="player-status">
              {player.characterClass && (
                <span className="character-class">{player.characterClass}</span>
              )}

              {player.characterClass && player.isReady && (
                <span className="ready-badge">{t('lobby.ready', 'Ready')}</span>
              )}
            </div>
          </li>
        ))}

        {/* Empty slots */}
        {players.length < 4 &&
          Array.from({ length: 4 - players.length }).map((_, index) => (
            <li key={`empty-${index}`} className="player-item empty-slot">
              <span className="empty-slot-text">
                {t('lobby.waitingForPlayer', 'Waiting for player...')}
              </span>
            </li>
          ))}
      </ul>

      <style>{`
        .player-list {
          width: 100%;
          max-width: 500px;
          margin: 0 auto;
        }

        .player-list-title {
          margin: 0 0 16px 0;
          font-size: 20px;
          font-weight: 600;
          color: #ffffff;
        }

        .players {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .player-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #2c2c2c;
          border: 2px solid #444;
          border-radius: 8px;
          min-height: 60px;
          transition: all 0.2s;
        }

        .player-item.current-player {
          border-color: #5a9fd4;
          background: rgba(90, 159, 212, 0.1);
        }

        .player-item.empty-slot {
          border-style: dashed;
          opacity: 0.5;
        }

        .player-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .connection-status {
          font-size: 18px;
          line-height: 1;
        }

        .player-nickname {
          font-size: 16px;
          font-weight: 500;
          color: #ffffff;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .you-badge {
          font-size: 12px;
          font-weight: 400;
          color: #5a9fd4;
        }

        .host-badge {
          font-size: 20px;
          line-height: 1;
        }

        .player-status {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .character-class {
          padding: 4px 12px;
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
          background: #5a9fd4;
          border-radius: 12px;
        }

        .ready-badge {
          padding: 4px 12px;
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
          background: #4ade80;
          border-radius: 12px;
        }

        .empty-slot-text {
          font-size: 14px;
          font-style: italic;
          color: #888;
        }

        @media (max-width: 480px) {
          .player-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .player-status {
            align-self: flex-end;
          }
        }
      `}</style>
    </div>
  );
}
