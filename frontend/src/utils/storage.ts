/**
 * Browser Storage Utilities (US4 - T158)
 *
 * Handles localStorage operations for session restoration,
 * including player UUID persistence for reconnection.
 */

import { v4 as uuidv4 } from 'uuid';
import { loggingService } from '../services/logging.service';

const STORAGE_KEYS = {
  PLAYER_UUID: 'hexhaven_player_uuid',
  PLAYER_NICKNAME: 'hexhaven_player_nickname',
  LAST_ROOM_CODE: 'hexhaven_last_room_code',
  GAME_PREFERENCES: 'hexhaven_preferences',
} as const;

/**
 * Get or create player UUID for session restoration
 * UUID is persistent across page refreshes for reconnection
 */
export function getOrCreatePlayerUUID(): string {
  try {
    let uuid = localStorage.getItem(STORAGE_KEYS.PLAYER_UUID);

    if (!uuid) {
      uuid = uuidv4();
      localStorage.setItem(STORAGE_KEYS.PLAYER_UUID, uuid);
      loggingService.log('State', 'Created new player UUID:', uuid);
    }

    return uuid;
  } catch (error) {
    // Fallback if localStorage is unavailable (private browsing, etc.)
    loggingService.error('Default', 'localStorage unavailable, using session UUID:', error);
    return uuidv4();
  }
}

/**
 * Get stored player UUID without creating a new one
 */
export function getPlayerUUID(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.PLAYER_UUID);
  } catch (error) {
    loggingService.error('Default', 'Failed to get player UUID:', error);
    return null;
  }
}

/**
 * Store player nickname for auto-fill on return
 */
export function savePlayerNickname(nickname: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PLAYER_NICKNAME, nickname);
  } catch (error) {
    loggingService.error('Default', 'Failed to save nickname:', error);
  }
}

/**
 * Get stored player nickname
 */
export function getPlayerNickname(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.PLAYER_NICKNAME);
  } catch (error) {
    loggingService.error('Default', 'Failed to get nickname:', error);
    return null;
  }
}

/**
 * Store last room code for quick rejoin
 */
export function saveLastRoomCode(roomCode: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_ROOM_CODE, roomCode);
  } catch (error) {
    loggingService.error('Default', 'Failed to save room code:', error);
  }
}

/**
 * Get last room code
 */
export function getLastRoomCode(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.LAST_ROOM_CODE);
  } catch (error) {
    loggingService.error('Default', 'Failed to get room code:', error);
    return null;
  }
}

/**
 * Clear last room code (on game completion or explicit leave)
 */
export function clearLastRoomCode(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.LAST_ROOM_CODE);
  } catch (error) {
    loggingService.error('Default', 'Failed to clear room code:', error);
  }
}

/**
 * Save game preferences (volume, language, etc.)
 */
export function savePreferences(preferences: Record<string, unknown>): void {
  try {
    localStorage.setItem(
      STORAGE_KEYS.GAME_PREFERENCES,
      JSON.stringify(preferences)
    );
  } catch (error) {
    loggingService.error('Default', 'Failed to save preferences:', error);
  }
}

/**
 * Get game preferences
 */
export function getPreferences(): Record<string, unknown> | null {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.GAME_PREFERENCES);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    loggingService.error('Default', 'Failed to get preferences:', error);
    return null;
  }
}

/**
 * Clear all stored data (for logout/reset)
 */
export function clearAllStorage(): void {
  try {
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
    loggingService.log('State', 'All storage cleared');
  } catch (error) {
    loggingService.error('Default', 'Failed to clear storage:', error);
  }
}

/**
 * Check if localStorage is available
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}
