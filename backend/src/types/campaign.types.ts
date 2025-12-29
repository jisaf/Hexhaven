/**
 * Campaign Types (Issue #244 - Campaign Mode)
 * Types for campaign creation, management, and progression
 *
 * Shared types are imported from shared/types/campaign.ts
 * This file contains backend-specific DTOs with validation decorators
 */

import {
  IsString,
  IsUUID,
  IsOptional,
  IsIn,
  IsInt,
  IsPositive,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';

// Campaign invitation token constraints
export const MIN_TOKEN_USES = 1;
export const MAX_TOKEN_USES = 100;

// Invite token length constraints
export const TOKEN_MIN_LENGTH = 20;
export const TOKEN_MAX_LENGTH = 50;
export const TOKEN_GENERATED_LENGTH = 32;

// Import and re-export shared types and constants for convenience
import type { DeathMode } from '../../../shared/types/campaign';
import { USERNAME_MAX_LENGTH } from '../../../shared/types/campaign';

export type {
  DeathMode,
  CampaignScenarioTemplate,
  CampaignTemplate,
  CampaignWithDetails,
  CampaignCharacterSummary,
  CampaignScenarioInfo,
  CampaignScenarioCompletionResult,
  CampaignListItem,
  CampaignInvitation,
  CampaignInviteToken,
  CampaignPublicInfo,
  InvitationStatus,
} from '../../../shared/types/campaign';

export { USERNAME_MAX_LENGTH };

// DTO for creating a campaign (with validation decorators)
export class CreateCampaignDto {
  @IsUUID()
  templateId!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string; // Optional custom name (defaults to template name)

  @IsOptional()
  @IsIn(['healing', 'permadeath'])
  deathMode?: DeathMode; // Optional - defaults to template's deathMode
}

// DTO for joining a campaign with a character (with validation decorators)
export class JoinCampaignDto {
  @IsUUID()
  characterId!: string;
}

// DTO for creating a new character within a campaign (with validation decorators)
export class CreateCampaignCharacterDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;

  @IsUUID()
  classId!: string;
}

// ========== INVITATION DTOs ==========

// DTO for inviting a user by username
export class InviteUserDto {
  @IsString()
  @MinLength(1)
  @MaxLength(USERNAME_MAX_LENGTH)
  invitedUsername!: string;
}

// DTO for creating invite token
export class CreateInviteTokenDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Min(MIN_TOKEN_USES)
  @Max(MAX_TOKEN_USES)
  maxUses?: number; // Default 1
}

// DTO for joining via invitation
export class JoinViaInvitationDto {
  @IsOptional()
  @IsUUID()
  characterId?: string;
}

// DTO for joining via token
export class JoinViaTokenDto {
  @IsOptional()
  @IsUUID()
  characterId?: string;
}

// Campaign event types for event sourcing (backend-specific)
export enum CampaignEventType {
  CAMPAIGN_CREATED = 'CAMPAIGN_CREATED',
  CAMPAIGN_CHARACTER_JOINED = 'CAMPAIGN_CHARACTER_JOINED',
  CAMPAIGN_CHARACTER_LEFT = 'CAMPAIGN_CHARACTER_LEFT',
  CAMPAIGN_SCENARIO_STARTED = 'CAMPAIGN_SCENARIO_STARTED',
  CAMPAIGN_SCENARIO_COMPLETED = 'CAMPAIGN_SCENARIO_COMPLETED',
  CAMPAIGN_CHARACTERS_HEALED = 'CAMPAIGN_CHARACTERS_HEALED',
  CAMPAIGN_CHARACTER_RETIRED = 'CAMPAIGN_CHARACTER_RETIRED',
  CAMPAIGN_COMPLETED = 'CAMPAIGN_COMPLETED',
  CAMPAIGN_SCENARIOS_UNLOCKED = 'CAMPAIGN_SCENARIOS_UNLOCKED',
  // Invitation events
  CAMPAIGN_INVITATION_SENT = 'CAMPAIGN_INVITATION_SENT',
  CAMPAIGN_INVITATION_ACCEPTED = 'CAMPAIGN_INVITATION_ACCEPTED',
  CAMPAIGN_INVITE_TOKEN_CREATED = 'CAMPAIGN_INVITE_TOKEN_CREATED',
  CAMPAIGN_JOINED_VIA_INVITE = 'CAMPAIGN_JOINED_VIA_INVITE',
}
