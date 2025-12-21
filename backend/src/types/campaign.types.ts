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
  MinLength,
  MaxLength,
} from 'class-validator';

// Re-export shared types for convenience
export type {
  DeathMode,
  CampaignScenarioTemplate,
  CampaignTemplate,
  CampaignWithDetails,
  CampaignCharacterSummary,
  CampaignScenarioInfo,
  CampaignScenarioCompletionResult,
  CampaignListItem,
} from '../../../shared/types/campaign';

import type { DeathMode } from '../../../shared/types/campaign';

// DTO for creating a campaign (with validation decorators)
export class CreateCampaignDto {
  @IsUUID()
  templateId!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string; // Optional custom name (defaults to template name)

  @IsIn(['healing', 'permadeath'])
  deathMode!: DeathMode; // Required if template allows configuration
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
}
