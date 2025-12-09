/**
 * Browser Storage Utilities (US4 - T158)
 *
 * Handles localStorage operations for session restoration,
 * including player UUID persistence for reconnection.
 */

import { v4 as uuidv4 } from 'uuid';

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
      console.log('Created new player UUID:', uuid);
    }

    return uuid;
  } catch (error) {
    // Fallback if localStorage is unavailable (private browsing, etc.)
    console.error('localStorage unavailable, using session UUID:', error);
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
    console.error('Failed to get player UUID:', error);
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
    console.error('Failed to save nickname:', error);
  }
}

/**
 * Get stored player nickname
 */
export function getPlayerNickname(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.PLAYER_NICKNAME);
  } catch (error) {
    console.error('Failed to get nickname:', error);
    return null;
  }
}

/**
 * Get display name for the current user
 * - For authenticated users: returns username
 * - For anonymous users: returns stored nickname
 * - Returns null if neither is available
 */
export function getDisplayName(): string | null {
  try {
    // Check if user is authenticated
    const userJson = localStorage.getItem('hexhaven_user');
    if (userJson) {
      const user = JSON.parse(userJson);
      if (user && user.username) {
        return user.username;
      }
    }

    // Fall back to nickname for anonymous users
    return getPlayerNickname();
  } catch (error) {
    console.error('Failed to get display name:', error);
    return getPlayerNickname();
  }
}

/**
 * Check if user is authenticated
 * Helper function to avoid importing authService in storage utils
 */
export function isUserAuthenticated(): boolean {
  try {
    const accessToken = localStorage.getItem('hexhaven_access_token');
    const userJson = localStorage.getItem('hexhaven_user');
    return !!(accessToken && userJson);
  } catch (error) {
    console.error('Failed to check authentication:', error);
    return false;
  }
}

/**
 * Store last room code for quick rejoin
 */
export function saveLastRoomCode(roomCode: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_ROOM_CODE, roomCode);
  } catch (error) {
    console.error('Failed to save room code:', error);
  }
}

/**
 * Get last room code
 */
export function getLastRoomCode(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.LAST_ROOM_CODE);
  } catch (error) {
    console.error('Failed to get room code:', error);
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
    console.error('Failed to clear room code:', error);
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
    console.error('Failed to save preferences:', error);
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
    console.error('Failed to get preferences:', error);
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
    console.log('All storage cleared');
  } catch (error) {
    console.error('Failed to clear storage:', error);
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
