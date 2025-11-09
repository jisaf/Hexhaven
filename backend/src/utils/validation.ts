/**
 * Validation Decorators and DTOs using class-validator
 *
 * Provides server-authoritative validation for all player actions.
 * Uses class-validator for declarative validation rules.
 */

import {
  IsString,
  IsUUID,
  IsInt,
  IsEnum,
  IsOptional,
  MinLength,
  MaxLength,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Axial coordinate DTO
 */
export class AxialCoordDto {
  @IsInt()
  q!: number;

  @IsInt()
  r!: number;
}

/**
 * Join room DTO
 */
export class JoinRoomDto {
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  @IsNotEmpty()
  roomCode!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @IsNotEmpty()
  nickname!: string;

  @IsUUID()
  @IsOptional()
  uuid?: string;
}

/**
 * Create room DTO
 */
export class CreateRoomDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @IsNotEmpty()
  hostNickname!: string;

  @IsUUID()
  @IsOptional()
  uuid?: string;
}

/**
 * Select character DTO
 */
export class SelectCharacterDto {
  @IsEnum([
    'Brute',
    'Tinkerer',
    'Spellweaver',
    'Scoundrel',
    'Cragheart',
    'Mindthief',
  ])
  @IsNotEmpty()
  characterClass!: string;
}

/**
 * Select scenario DTO
 */
export class SelectScenarioDto {
  @IsUUID()
  @IsNotEmpty()
  scenarioId!: string;
}

/**
 * Move character DTO
 */
export class MoveCharacterDto {
  @ValidateNested()
  @Type(() => AxialCoordDto)
  @IsNotEmpty()
  targetHex!: AxialCoordDto;
}

/**
 * Attack target DTO
 */
export class AttackTargetDto {
  @IsUUID()
  @IsNotEmpty()
  targetId!: string;
}

/**
 * Select cards DTO
 */
export class SelectCardsDto {
  @IsUUID()
  @IsNotEmpty()
  topCardId!: string;

  @IsUUID()
  @IsNotEmpty()
  bottomCardId!: string;
}

/**
 * End turn DTO
 */
export class EndTurnDto {
  // No fields required, just player authentication
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Movement validation
 */
export function validateMovement(
  currentHex: AxialCoordDto,
  targetHex: AxialCoordDto,
  movementRange: number,
  obstacles: Set<string>,
): ValidationResult {
  const errors: string[] = [];

  // Check if target is within movement range
  const distance = hexDistance(currentHex, targetHex);
  if (distance > movementRange) {
    errors.push(
      `Target hex is ${distance} steps away, but movement range is only ${movementRange}`,
    );
  }

  // Check if target is not an obstacle
  const targetKey = hexKey(targetHex);
  if (obstacles.has(targetKey)) {
    errors.push('Target hex is blocked by an obstacle');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Attack validation
 */
export function validateAttack(
  attackerHex: AxialCoordDto,
  targetHex: AxialCoordDto,
  attackRange: number,
  isDisarmed: boolean,
): ValidationResult {
  const errors: string[] = [];

  // Check if attacker is disarmed
  if (isDisarmed) {
    errors.push('Attacker is disarmed and cannot attack');
  }

  // Check if target is within attack range
  const distance = hexDistance(attackerHex, targetHex);
  if (distance > attackRange) {
    errors.push(
      `Target is ${distance} hexes away, but attack range is only ${attackRange}`,
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Card selection validation
 */
export function validateCardSelection(
  selectedCards: { topCardId: string; bottomCardId: string },
  hand: string[],
): ValidationResult {
  const errors: string[] = [];

  // Check if top card is in hand
  if (!hand.includes(selectedCards.topCardId)) {
    errors.push('Selected top card is not in hand');
  }

  // Check if bottom card is in hand
  if (!hand.includes(selectedCards.bottomCardId)) {
    errors.push('Selected bottom card is not in hand');
  }

  // Check if cards are different
  if (selectedCards.topCardId === selectedCards.bottomCardId) {
    errors.push('Must select two different cards');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Room join validation
 */
export function validateRoomJoin(
  roomStatus: string,
  playerCount: number,
  maxPlayers: number = 4,
): ValidationResult {
  const errors: string[] = [];

  // Check if room is in lobby state
  if (roomStatus !== 'lobby') {
    errors.push('Cannot join room - game has already started');
  }

  // Check if room has space
  if (playerCount >= maxPlayers) {
    errors.push('Cannot join room - room is full');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Game start validation
 */
export function validateGameStart(
  playerCount: number,
  allPlayersReady: boolean,
  scenarioSelected: boolean,
): ValidationResult {
  const errors: string[] = [];

  // Check minimum players
  if (playerCount < 2) {
    errors.push('Need at least 2 players to start game');
  }

  // Check maximum players
  if (playerCount > 4) {
    errors.push('Maximum 4 players allowed');
  }

  // Check if all players have selected characters
  if (!allPlayersReady) {
    errors.push('All players must select a character before starting');
  }

  // Check if scenario is selected
  if (!scenarioSelected) {
    errors.push('Host must select a scenario before starting');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Helper functions (imported from hex-utils in real implementation)
function hexDistance(a: AxialCoordDto, b: AxialCoordDto): number {
  const dq = Math.abs(a.q - b.q);
  const dr = Math.abs(a.r - b.r);
  const ds = Math.abs(-a.q - a.r - (-b.q - b.r));
  return Math.max(dq, dr, ds);
}

function hexKey(hex: AxialCoordDto): string {
  return `${hex.q},${hex.r}`;
}
