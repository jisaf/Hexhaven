/**
 * Validation Service (US1 - T054)
 *
 * Server-authoritative validation for all player actions.
 * Ensures game rules are enforced on the server side.
 */

import { Character } from '../models/character.model';
import { GameRoom } from '../models/game-room.model';
import {
  RoomStatus,
  type AxialCoordinates,
} from '../../../shared/types/entities';
import { cubeDistance, axialToCube } from '../utils/hex-utils';

export class ValidationService {
  /**
   * Validate character movement
   */
  validateMovement(
    character: Character,
    targetHex: AxialCoordinates,
    occupiedHexes: Set<string>, // Set of "q,r" hex coordinates
    obstacles: Set<string>, // Set of "q,r" hex coordinates
  ): { valid: boolean; error?: string } {
    // Check if character is immobilized
    if (character.isImmobilized) {
      return {
        valid: false,
        error: 'Character is immobilized and cannot move',
      };
    }

    // Check if character is stunned
    if (character.isStunned) {
      return { valid: false, error: 'Character is stunned and cannot move' };
    }

    // Check if character is exhausted
    if (character.exhausted) {
      return { valid: false, error: 'Character is exhausted' };
    }

    // Calculate distance from current position to target
    const currentCube = axialToCube(character.position);
    const targetCube = axialToCube(targetHex);
    const distance = cubeDistance(currentCube, targetCube);

    // Check if target is within movement range
    if (distance > character.movement) {
      return {
        valid: false,
        error: `Target hex is ${distance} hexes away, but character can only move ${character.movement}`,
      };
    }

    // Check if target hex is occupied
    const targetKey = `${targetHex.q},${targetHex.r}`;
    if (occupiedHexes.has(targetKey)) {
      return { valid: false, error: 'Target hex is occupied' };
    }

    // Check if target hex is an obstacle
    if (obstacles.has(targetKey)) {
      // TODO: Check if character has flying ability
      return { valid: false, error: 'Target hex is an obstacle' };
    }

    return { valid: true };
  }

  /**
   * Validate attack action
   */
  validateAttack(
    attacker: Character,
    targetPosition: AxialCoordinates,
    targetAlive: boolean,
  ): { valid: boolean; error?: string } {
    // Check if attacker is disarmed
    if (attacker.isDisarmed) {
      return { valid: false, error: 'Character is disarmed and cannot attack' };
    }

    // Check if attacker is stunned
    if (attacker.isStunned) {
      return { valid: false, error: 'Character is stunned and cannot attack' };
    }

    // Check if attacker is exhausted
    if (attacker.exhausted) {
      return { valid: false, error: 'Character is exhausted' };
    }

    // Check if target is alive
    if (!targetAlive) {
      return { valid: false, error: 'Target is already defeated' };
    }

    // Calculate distance to target
    const attackerCube = axialToCube(attacker.position);
    const targetCube = axialToCube(targetPosition);
    const distance = cubeDistance(attackerCube, targetCube);

    // Check if target is within attack range
    if (distance > attacker.range) {
      return {
        valid: false,
        error: `Target is ${distance} hexes away, but character can only attack ${attacker.range} hex${attacker.range > 1 ? 'es' : ''} away`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate card selection
   */
  validateCardSelection(
    topCardId: string,
    bottomCardId: string,
    handCardIds: string[],
  ): { valid: boolean; error?: string } {
    // Check if cards are different
    if (topCardId === bottomCardId) {
      return { valid: false, error: 'Top and bottom cards must be different' };
    }

    // Check if both cards are in hand
    if (!handCardIds.includes(topCardId)) {
      return { valid: false, error: 'Top card is not in your hand' };
    }

    if (!handCardIds.includes(bottomCardId)) {
      return { valid: false, error: 'Bottom card is not in your hand' };
    }

    return { valid: true };
  }

  /**
   * Validate room join
   * Note: Players can now join multiple rooms simultaneously
   */
  validateRoomJoin(
    room: GameRoom,
    _playerAlreadyInRoom: boolean,
  ): { valid: boolean; error?: string } {
    // Check room status
    if (room.status !== RoomStatus.LOBBY) {
      return { valid: false, error: 'Game has already started' };
    }

    // Check if room is full
    if (room.isFull) {
      return { valid: false, error: 'Room is full (maximum 4 players)' };
    }

    return { valid: true };
  }

  /**
   * Validate game start
   */
  validateGameStart(
    room: GameRoom,
    requestingPlayerIsHost: boolean,
  ): { valid: boolean; error?: string } {
    // Check if requester is host
    if (!requestingPlayerIsHost) {
      return { valid: false, error: 'Only the host can start the game' };
    }

    // Check room status
    if (room.status !== RoomStatus.LOBBY) {
      return {
        valid: false,
        error: 'Game has already started or is completed',
      };
    }

    // Check if room has minimum players
    if (room.playerCount < 2) {
      return {
        valid: false,
        error: 'Need at least 2 players to start the game',
      };
    }

    // Check if all players have selected characters
    if (!room.isStartable) {
      return {
        valid: false,
        error: 'All players must select characters before starting',
      };
    }

    return { valid: true };
  }
}

// Singleton instance
export const validationService = new ValidationService();
