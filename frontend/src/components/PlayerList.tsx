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

import { useTranslation } from "react-i18next";
import styles from "./PlayerList.module.css";

export interface Player {
  id: string;
  nickname: string;
  isHost: boolean;
  connectionStatus: "connected" | "disconnected" | "reconnecting";
  characterClass?: string;
  isReady: boolean;
}

export interface PlayerListProps {
  players: Player[];
  currentPlayerId?: string;
}

export function PlayerList({ players, currentPlayerId }: PlayerListProps) {
  const { t } = useTranslation();

  const getConnectionIcon = (status: Player["connectionStatus"]) => {
    switch (status) {
      case "connected":
        return "●";
      case "disconnected":
        return "○";
      case "reconnecting":
        return "◐";
    }
  };

  const getConnectionColor = (status: Player["connectionStatus"]) => {
    switch (status) {
      case "connected":
        return "#4ade80";
      case "disconnected":
        return "#ef4444";
      case "reconnecting":
        return "#fbbf24";
    }
  };

  return (
    <div className={styles.playerListContainer} data-testid="player-list-container">
      <h4 className={styles.playerListTitle}>
        {t("lobby:players", "Players")} ({players.length}/4)
      </h4>
      <div className={styles.playerGrid}>
        {players.map(player => (
          <div key={player.id} className={`${styles.playerCard} ${player.id === currentPlayerId ? styles.currentPlayer : ""}`}>
            <div className={styles.playerInfo}>
              <span
                className={styles.connectionStatus}
                style={{ color: getConnectionColor(player.connectionStatus) }}
                title={t(`lobby:connectionStatus.${player.connectionStatus}`, player.connectionStatus)}
              >
                {getConnectionIcon(player.connectionStatus)}
              </span>
              <span className={styles.playerNickname}>
                {player.nickname}
                {player.id === currentPlayerId && <span className={styles.youBadge}>{t("lobby:you", "(You)")}</span>}
              </span>
              {player.isHost && <span className={styles.hostBadge} title={t("lobby:host", "Host")}>👑</span>}
            </div>
            <div className={styles.characterInfo}>
              {player.characterClass ? (
                <>
                  <span className={styles.characterClass}>{player.characterClass}</span>
                  {player.isReady && <span className={styles.readyBadge}>✓</span>}
                </>
              ) : (
                <span className={styles.noCharacter}>{t("lobby:noCharacter", "No character")}</span>
              )}
            </div>
          </div>
        ))}
        {Array.from({ length: 4 - players.length }).map((_, i) => (
          <div key={`empty-${i}`} className={`${styles.playerCard} ${styles.empty}`}>
            {t("lobby:waitingForPlayer", "Waiting for player...")}
          </div>
        ))}
      </div>
    </div>
  );
}
