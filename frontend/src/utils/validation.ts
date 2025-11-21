/**
 * Validation Utilities
 *
 * Common validation functions for user input, room codes, nicknames, etc.
 */

/**
 * Validate room code format
 * Room codes should be 4-6 alphanumeric characters
 */
export function isValidRoomCode(roomCode: string): boolean {
  if (!roomCode) return false;
  return /^[A-Z0-9]{4,6}$/i.test(roomCode);
}

/**
 * Validate nickname
 * Nicknames should be 2-20 characters, alphanumeric with spaces and basic punctuation
 */
export function isValidNickname(nickname: string): boolean {
  if (!nickname) return false;
  const trimmed = nickname.trim();
  if (trimmed.length < 2 || trimmed.length > 20) return false;
  return /^[a-zA-Z0-9\s\-_]+$/.test(trimmed);
}

/**
 * Sanitize nickname by trimming whitespace
 */
export function sanitizeNickname(nickname: string): string {
  return nickname.trim();
}

/**
 * Sanitize room code by converting to uppercase and removing spaces
 */
export function sanitizeRoomCode(roomCode: string): string {
  return roomCode.toUpperCase().replace(/\s/g, '');
}

/**
 * Get validation error message for nickname
 */
export function getNicknameError(nickname: string): string | null {
  if (!nickname || nickname.trim().length === 0) {
    return 'Nickname is required';
  }
  const trimmed = nickname.trim();
  if (trimmed.length < 2) {
    return 'Nickname must be at least 2 characters';
  }
  if (trimmed.length > 20) {
    return 'Nickname must be 20 characters or less';
  }
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmed)) {
    return 'Nickname can only contain letters, numbers, spaces, hyphens, and underscores';
  }
  return null;
}

/**
 * Get validation error message for room code
 */
export function getRoomCodeError(roomCode: string): string | null {
  if (!roomCode || roomCode.trim().length === 0) {
    return 'Room code is required';
  }
  const sanitized = sanitizeRoomCode(roomCode);
  if (sanitized.length < 4) {
    return 'Room code must be at least 4 characters';
  }
  if (sanitized.length > 6) {
    return 'Room code must be 6 characters or less';
  }
  if (!/^[A-Z0-9]+$/.test(sanitized)) {
    return 'Room code can only contain letters and numbers';
  }
  return null;
}
