/**
 * Frontend Campaign Service (Issue #244)
 * Handles campaign CRUD operations and character management
 */

import { authService } from './auth.service';
import { getApiUrl } from '../config/api';

// Re-export shared types for components that import from this service
export type {
  DeathMode,
  CampaignTemplate,
  CampaignScenarioTemplate,
  CampaignWithDetails,
  CampaignCharacterSummary,
  CampaignScenarioInfo,
  CampaignListItem,
  CreateCampaignRequest,
  JoinCampaignRequest,
  CreateCampaignCharacterRequest,
  CampaignInvitation,
  CampaignInviteToken,
  CampaignPublicInfo,
  InvitationStatus,
} from '../../../shared/types/campaign';

import type {
  CampaignTemplate,
  CampaignWithDetails,
  CampaignScenarioInfo,
  CampaignListItem,
  DeathMode,
  CampaignCharacterSummary,
  CampaignInvitation,
  CampaignInviteToken,
  CampaignPublicInfo,
} from '../../../shared/types/campaign';

// Alias for backwards compatibility
export type CampaignCharacter = CampaignCharacterSummary;
export type CampaignScenario = CampaignScenarioInfo;

export interface CreateCampaignDto {
  templateId: string;
  name?: string;
  deathMode?: DeathMode;
}

// ========== Service ==========

class CampaignService {
  /**
   * Get available campaign templates
   */
  async getTemplates(): Promise<CampaignTemplate[]> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/campaigns/templates`,
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch campaign templates');
    }

    return response.json();
  }

  /**
   * Get user's campaigns (list view)
   */
  async getMyCampaigns(): Promise<CampaignListItem[]> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/campaigns`,
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch campaigns');
    }

    return response.json();
  }

  /**
   * Create a new campaign
   */
  async createCampaign(dto: CreateCampaignDto): Promise<CampaignWithDetails> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/campaigns`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dto),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create campaign');
    }

    return response.json();
  }

  /**
   * Get campaign details with characters
   */
  async getCampaignDetails(campaignId: string): Promise<CampaignWithDetails> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/campaigns/${campaignId}`,
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch campaign details');
    }

    return response.json();
  }

  /**
   * Join campaign with a character
   */
  async joinCampaign(campaignId: string, characterId: string): Promise<CampaignWithDetails> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/campaigns/${campaignId}/join`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ characterId }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to join campaign');
    }

    return response.json();
  }

  /**
   * Create a new character in campaign
   */
  async createCharacterInCampaign(
    campaignId: string,
    classId: string,
    name: string,
  ): Promise<CampaignCharacter> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/campaigns/${campaignId}/characters`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ classId, name }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create character');
    }

    return response.json();
  }

  /**
   * Remove character from campaign
   */
  async leaveCharacter(campaignId: string, characterId: string): Promise<void> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/campaigns/${campaignId}/characters/${characterId}`,
      {
        method: 'DELETE',
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to remove character from campaign');
    }
  }

  /**
   * Get available scenarios in campaign
   */
  async getAvailableScenarios(campaignId: string): Promise<CampaignScenario[]> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/campaigns/${campaignId}/scenarios/available`,
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch available scenarios');
    }

    return response.json();
  }

  // ========== INVITATION METHODS ==========

  /**
   * Invite user to campaign by username
   */
  async inviteUser(campaignId: string, invitedUsername: string): Promise<CampaignInvitation> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/campaigns/${campaignId}/invitations`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invitedUsername }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to send invitation');
    }

    return response.json();
  }

  /**
   * Get pending invitations for a campaign (host/member view)
   */
  async getCampaignInvitations(campaignId: string): Promise<CampaignInvitation[]> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/campaigns/${campaignId}/invitations`,
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch campaign invitations');
    }

    return response.json();
  }

  /**
   * Get invitations received by current user (all campaigns)
   */
  async getReceivedInvitations(): Promise<CampaignInvitation[]> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/campaigns/invitations/received`,
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch received invitations');
    }

    return response.json();
  }

  /**
   * Revoke a pending invitation
   */
  async revokeInvitation(invitationId: string): Promise<void> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/campaigns/invitations/${invitationId}`,
      {
        method: 'DELETE',
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to revoke invitation');
    }
  }

  /**
   * Decline a received invitation
   */
  async declineInvitation(invitationId: string): Promise<void> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/campaigns/invitations/${invitationId}/decline`,
      {
        method: 'POST',
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to decline invitation');
    }
  }

  /**
   * Create invite token (shareable link)
   */
  async createInviteToken(campaignId: string, maxUses?: number): Promise<CampaignInviteToken> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/campaigns/${campaignId}/invite-tokens`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ maxUses }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create invite token');
    }

    return response.json();
  }

  /**
   * Get active invite tokens for a campaign
   */
  async getInviteTokens(campaignId: string): Promise<CampaignInviteToken[]> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/campaigns/${campaignId}/invite-tokens`,
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch invite tokens');
    }

    return response.json();
  }

  /**
   * Revoke an invite token
   */
  async revokeInviteToken(tokenId: string): Promise<void> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/campaigns/invite-tokens/${tokenId}`,
      {
        method: 'DELETE',
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to revoke invite token');
    }
  }

  /**
   * Get public campaign info (no auth required)
   */
  async getCampaignPublicInfo(campaignId: string): Promise<CampaignPublicInfo> {
    const response = await fetch(
      `${getApiUrl()}/campaigns/${campaignId}/public-info`,
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch campaign info');
    }

    return response.json();
  }

  /**
   * Join campaign via direct invitation
   */
  async joinViaInvitation(
    invitationId: string,
    characterId?: string,
  ): Promise<CampaignWithDetails> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/campaigns/join/by-invite/${invitationId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ characterId }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to join campaign');
    }

    return response.json();
  }

  /**
   * Join campaign via token
   */
  async joinViaToken(
    token: string,
    characterId?: string,
  ): Promise<CampaignWithDetails> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/campaigns/join/by-token/${token}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ characterId }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to join campaign');
    }

    return response.json();
  }
}

// Export singleton instance
export const campaignService = new CampaignService();
