/**
 * Shared Campaign Types (Issue #244 - Campaign Mode)
 * Types shared between frontend and backend for campaign management
 */

// Death mode configuration
export type DeathMode = 'healing' | 'permadeath';

// Campaign template scenario definition
export interface CampaignScenarioTemplate {
  scenarioId: string;
  name: string;
  description: string | null;
  unlocksScenarios?: string[];
  isStarting?: boolean;
  finalScenario?: boolean;
  sequence: number;
}

// Campaign template (DB-driven)
export interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  deathMode: DeathMode | 'configurable';
  minPlayers: number;
  maxPlayers: number;
  requireUniqueClasses: boolean;
  scenarios: CampaignScenarioTemplate[];
}

// Campaign with full details
export interface CampaignWithDetails {
  id: string;
  templateId: string | null;
  name: string;
  description: string | null;
  prosperityLevel: number;
  reputation: number;
  completedScenarios: string[];
  deathMode: DeathMode;
  requireUniqueClasses: boolean;
  retiredCharacterIds: string[];
  unlockedScenarios: string[];
  isCompleted: boolean;
  completedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  characters: CampaignCharacterSummary[];
  availableScenarios: CampaignScenarioInfo[];
}

// Character summary for campaign view
export interface CampaignCharacterSummary {
  id: string;
  name: string;
  className: string;
  level: number;
  experience: number;
  gold: number;
  health: number;
  maxHealth: number;
  retired: boolean;
  userId: string;
  username: string;
}

// Scenario info for campaign view
export interface CampaignScenarioInfo {
  scenarioId: string;
  name: string;
  description: string | null;
  isCompleted: boolean;
  isUnlocked: boolean;
  isFinalScenario: boolean;
  unlocksScenarios?: string[];
}

// Result of completing a campaign scenario
export interface CampaignScenarioCompletionResult {
  campaignId: string;
  scenarioId: string;
  victory: boolean;
  newlyUnlockedScenarios: string[];
  healedCharacters: string[];
  retiredCharacters: string[];
  campaignCompleted: boolean;
  experienceGained: Record<string, number>;
  goldGained: Record<string, number>;
}

// Campaign list item for browsing campaigns
export interface CampaignListItem {
  id: string;
  name: string;
  description: string | null;
  deathMode: DeathMode;
  prosperityLevel: number;
  reputation: number;
  isCompleted: boolean;
  characterCount: number;
  completedScenariosCount: number;
  totalScenariosCount: number;
  createdAt: Date | string;
}

// DTO types for API requests
export interface CreateCampaignRequest {
  templateId: string;
  name?: string;
  deathMode: DeathMode;
}

export interface JoinCampaignRequest {
  characterId: string;
}

export interface CreateCampaignCharacterRequest {
  name: string;
  classId: string;
}
