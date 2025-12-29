/**
 * Frontend Campaign Service (Issue #244)
 * Handles campaign CRUD operations and character management
 */

import { authService } from './auth.service';
import { getApiUrl } from '../config/api';
import type {
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
};

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
   * Helper method to handle API responses consistently
   */
  private async handleResponse<T>(response: Response, fallbackError: string): Promise<T> {
    if (!response.ok) {
      let message = fallbackError;
      try {
        const errorData = await response.json();
        message = errorData.message || fallbackError;
      } catch {
        // Response was not JSON (e.g., proxy error, HTML error page)
      }
      throw new Error(message);
    }
    return response.json();
  }

  /**
   * Helper method to handle API responses with no content (void)
   */
  private async handleVoidResponse(response: Response, fallbackError: string): Promise<void> {
    if (!response.ok) {
      let message = fallbackError;
      try {
        const errorData = await response.json();
        message = errorData.message || fallbackError;
      } catch {
        // Response was not JSON (e.g., proxy error, HTML error page)
      }
      throw new Error(message);
    }
  }

  /**
   * Get available campaign templates
   */
  async getTemplates(): Promise<CampaignTemplate[]> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/campaigns/templates`,
    );
    return this.handleResponse<CampaignTemplate[]>(response, 'Failed to fetch campaign templates');
  }

  /**
   * Get user's campaigns (list view)
   */
  async getMyCampaigns(): Promise<CampaignListItem[]> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/campaigns`,
    );
    return this.handleResponse<CampaignListItem[]>(response, 'Failed to fetch campaigns');
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
    return this.handleResponse<CampaignWithDetails>(response, 'Failed to create campaign');
  }

  /**
   * Get campaign details with characters
   */
  async getCampaignDetails(campaignId: string): Promise<CampaignWithDetails> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/campaigns/${campaignId}`,
    );
    return this.handleResponse<CampaignWithDetails>(response, 'Failed to fetch campaign details');
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
    return this.handleResponse<CampaignWithDetails>(response, 'Failed to join campaign');
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
    return this.handleResponse<CampaignCharacter>(response, 'Failed to create character');
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
    return this.handleVoidResponse(response, 'Failed to remove character from campaign');
  }

  /**
   * Get available scenarios in campaign
   */
  async getAvailableScenarios(campaignId: string): Promise<CampaignScenario[]> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/campaigns/${campaignId}/scenarios/available`,
    );
    return this.handleResponse<CampaignScenario[]>(response, 'Failed to fetch available scenarios');
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
    return this.handleResponse<CampaignInvitation>(response, 'Failed to send invitation');
  }

  /**
   * Get pending invitations for a campaign (host/member view)
   */
  async getCampaignInvitations(campaignId: string): Promise<CampaignInvitation[]> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/campaigns/${campaignId}/invitations`,
    );
    return this.handleResponse<CampaignInvitation[]>(response, 'Failed to fetch campaign invitations');
  }

  /**
   * Get invitations received by current user (all campaigns)
   */
  async getReceivedInvitations(): Promise<CampaignInvitation[]> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/campaigns/invitations/received`,
    );
    return this.handleResponse<CampaignInvitation[]>(response, 'Failed to fetch received invitations');
  }

  /**
   * Revoke a pending invitation
   */
  async revokeInvitation(campaignId: string, invitationId: string): Promise<void> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/campaigns/${campaignId}/invitations/${invitationId}`,
      {
        method: 'DELETE',
      },
    );
    return this.handleVoidResponse(response, 'Failed to revoke invitation');
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
    return this.handleVoidResponse(response, 'Failed to decline invitation');
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
    return this.handleResponse<CampaignInviteToken>(response, 'Failed to create invite token');
  }

  /**
   * Get active invite tokens for a campaign
   */
  async getInviteTokens(campaignId: string): Promise<CampaignInviteToken[]> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/campaigns/${campaignId}/invite-tokens`,
    );
    return this.handleResponse<CampaignInviteToken[]>(response, 'Failed to fetch invite tokens');
  }

  /**
   * Revoke an invite token
   */
  async revokeInviteToken(campaignId: string, tokenId: string): Promise<void> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/campaigns/${campaignId}/invite-tokens/${tokenId}`,
      {
        method: 'DELETE',
      },
    );
    return this.handleVoidResponse(response, 'Failed to revoke invite token');
  }

  /**
   * Get public campaign info (no auth required)
   */
  async getCampaignPublicInfo(campaignId: string): Promise<CampaignPublicInfo> {
    const response = await fetch(
      `${getApiUrl()}/campaigns/${campaignId}/public-info`,
    );
    return this.handleResponse<CampaignPublicInfo>(response, 'Failed to fetch campaign info');
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
    return this.handleResponse<CampaignWithDetails>(response, 'Failed to join campaign');
  }

  /**
   * Validate invite token without consuming it
   */
  async validateInviteToken(token: string): Promise<CampaignPublicInfo> {
    const response = await authService.authenticatedFetch(
      `${getApiUrl()}/campaigns/validate-token/${token}`,
    );
    return this.handleResponse<CampaignPublicInfo>(response, 'Failed to validate token');
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
    return this.handleResponse<CampaignWithDetails>(response, 'Failed to join campaign');
  }
}

// Export singleton instance
export const campaignService = new CampaignService();
