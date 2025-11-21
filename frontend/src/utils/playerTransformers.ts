/**
 * Player Transformation Utilities
 *
 * Utilities for transforming player data from API responses to UI-ready format.
 */

import type { Player } from '../components/PlayerList';
import type { CharacterClass } from '../components/CharacterSelect';

interface RawPlayerData {
  id: string;
  nickname: string;
  isHost: boolean;
  characterClass?: string;
}

/**
 * Transform a single player from API format to UI format
 */
export function transformPlayer(rawPlayer: RawPlayerData): Player {
  return {
    ...rawPlayer,
    connectionStatus: 'connected' as const,
    isReady: !!rawPlayer.characterClass,
  };
}

/**
 * Transform an array of players from API format to UI format
 */
export function transformPlayers(rawPlayers: RawPlayerData[]): Player[] {
  return rawPlayers.map(transformPlayer);
}

/**
 * Find a player by ID in a player list
 */
export function findPlayerById(players: Player[], playerId: string): Player | undefined {
  return players.find(p => p.id === playerId);
}

/**
 * Check if a player is the host
 */
export function isPlayerHost(player: Player | undefined): boolean {
  return player?.isHost ?? false;
}

/**
 * Get disabled character classes (classes already selected by other players)
 */
export function getDisabledCharacterClasses(
  players: Player[],
  currentPlayerId: string | null
): CharacterClass[] {
  return players
    .filter(p => p.id !== currentPlayerId && p.characterClass)
    .map(p => p.characterClass as CharacterClass);
}

/**
 * Check if all players have selected a character
 */
export function allPlayersReady(players: Player[]): boolean {
  return players.length > 0 && players.every(p => p.characterClass);
}
