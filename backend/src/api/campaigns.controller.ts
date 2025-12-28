/**
 * Campaigns Controller (Issue #244 - Campaign Mode)
 * REST API endpoints for campaign management
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  ForbiddenException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { CampaignService } from '../services/campaign.service';
import { CampaignInvitationService } from '../services/campaign-invitation.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Public } from '../decorators/public.decorator';
import { JwtPayload } from '../types/auth.types';
import {
  CreateCampaignDto,
  JoinCampaignDto,
  CreateCampaignCharacterDto,
  InviteUserDto,
  CreateInviteTokenDto,
  JoinViaInvitationDto,
  JoinViaTokenDto,
} from '../types/campaign.types';
import type {
  CampaignWithDetails,
  CampaignListItem,
  CampaignScenarioInfo,
  CampaignTemplate,
  CampaignCharacterSummary,
  CampaignInvitation,
  CampaignInviteToken,
  CampaignPublicInfo,
} from '../types/campaign.types';

// Define locally to avoid decorator metadata issues with imported types
interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

@Controller('api/campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(
    private readonly campaignService: CampaignService,
    private readonly invitationService: CampaignInvitationService,
  ) {}

  /**
   * Get all available campaign templates
   * GET /api/campaigns/templates
   */
  @Get('templates')
  async getTemplates(): Promise<CampaignTemplate[]> {
    return this.campaignService.getAvailableTemplates();
  }

  /**
   * Get a specific campaign template
   * GET /api/campaigns/templates/:templateId
   */
  @Get('templates/:templateId')
  async getTemplate(
    @Param('templateId') templateId: string,
  ): Promise<CampaignTemplate | null> {
    return this.campaignService.getTemplate(templateId);
  }

  /**
   * Get all campaigns for the current user
   * GET /api/campaigns
   */
  @Get()
  async getUserCampaigns(
    @Req() req: AuthenticatedRequest,
  ): Promise<CampaignListItem[]> {
    const userId = req.user.userId;
    return this.campaignService.getUserCampaigns(userId);
  }

  /**
   * Create a new campaign
   * POST /api/campaigns
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCampaign(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateCampaignDto,
  ): Promise<CampaignWithDetails> {
    const userId = req.user.userId;
    return this.campaignService.createCampaign(userId, dto);
  }

  // ========== STATIC INVITATION ROUTES (must come before :campaignId) ==========

  /**
   * Get invitations received by current user (all campaigns)
   * GET /api/campaigns/invitations/received
   */
  @Get('invitations/received')
  async getReceivedInvitations(
    @Req() req: AuthenticatedRequest,
  ): Promise<CampaignInvitation[]> {
    const userId = req.user.userId;
    return this.invitationService.getReceivedInvitations(userId);
  }

  /**
   * Decline a received invitation
   * POST /api/campaigns/invitations/:invitationId/decline
   */
  @Post('invitations/:invitationId/decline')
  @HttpCode(HttpStatus.OK)
  async declineInvitation(
    @Req() req: AuthenticatedRequest,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
  ): Promise<void> {
    const userId = req.user.userId;
    return this.invitationService.declineInvitation(invitationId, userId);
  }

  /**
   * Validate invite token without consuming it
   * GET /api/campaigns/validate-token/:token
   */
  @Get('validate-token/:token')
  async validateToken(
    @Req() req: AuthenticatedRequest,
    @Param('token') token: string,
  ): Promise<CampaignPublicInfo> {
    const userId = req.user.userId;

    // Validate token and get campaignId without consuming
    const campaignId = await this.invitationService.validateToken(
      token,
      userId,
    );

    // Return public campaign info
    return this.invitationService.getCampaignPublicInfo(campaignId);
  }

  /**
   * Join campaign via direct invitation
   * POST /api/campaigns/join/by-invite/:invitationId
   */
  @Post('join/by-invite/:invitationId')
  @HttpCode(HttpStatus.OK)
  async joinViaInvitation(
    @Req() req: AuthenticatedRequest,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @Body() dto: JoinViaInvitationDto,
  ): Promise<CampaignWithDetails> {
    const userId = req.user.userId;

    // Accept the invitation and get campaignId
    const campaignId = await this.invitationService.acceptInvitation(
      invitationId,
      userId,
    );

    // Join campaign with character if provided
    if (dto.characterId) {
      return this.campaignService.joinCampaign(userId, campaignId, {
        characterId: dto.characterId,
      });
    }

    // Return campaign details without joining yet
    return this.campaignService.getCampaignWithDetails(campaignId);
  }

  /**
   * Join campaign via token
   * POST /api/campaigns/join/by-token/:token
   */
  @Post('join/by-token/:token')
  @HttpCode(HttpStatus.OK)
  async joinViaToken(
    @Req() req: AuthenticatedRequest,
    @Param('token') token: string,
    @Body() dto: JoinViaTokenDto,
  ): Promise<CampaignWithDetails> {
    const userId = req.user.userId;

    // Validate and consume token
    const campaignId = await this.invitationService.validateAndConsumeToken(
      token,
      userId,
    );

    // Join campaign with character if provided
    if (dto.characterId) {
      return this.campaignService.joinCampaign(userId, campaignId, {
        characterId: dto.characterId,
      });
    }

    // Return campaign details without joining yet
    return this.campaignService.getCampaignWithDetails(campaignId);
  }

  // ========== PARAMETERIZED CAMPAIGN ROUTES ==========

  /**
   * Get campaign details by ID
   * Requires user to have a character in the campaign
   * GET /api/campaigns/:campaignId
   */
  @Get(':campaignId')
  async getCampaign(
    @Req() req: AuthenticatedRequest,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
  ): Promise<CampaignWithDetails> {
    const userId = req.user.userId;

    // Authorization: verify user has access to this campaign
    const hasAccess = await this.campaignService.userHasAccessToCampaign(
      userId,
      campaignId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this campaign');
    }

    return this.campaignService.getCampaignWithDetails(campaignId);
  }

  /**
   * Join a campaign with an existing character
   * POST /api/campaigns/:campaignId/join
   */
  @Post(':campaignId/join')
  @HttpCode(HttpStatus.OK)
  async joinCampaign(
    @Req() req: AuthenticatedRequest,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Body() dto: JoinCampaignDto,
  ): Promise<CampaignWithDetails> {
    const userId = req.user.userId;
    return this.campaignService.joinCampaign(userId, campaignId, dto);
  }

  /**
   * Create a new character directly in a campaign
   * POST /api/campaigns/:campaignId/characters
   */
  @Post(':campaignId/characters')
  @HttpCode(HttpStatus.CREATED)
  async createCharacterInCampaign(
    @Req() req: AuthenticatedRequest,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Body() dto: CreateCampaignCharacterDto,
  ): Promise<CampaignWithDetails> {
    const userId = req.user.userId;
    return this.campaignService.createCharacterInCampaign(
      userId,
      campaignId,
      dto,
    );
  }

  /**
   * Remove a character from a campaign
   * DELETE /api/campaigns/:campaignId/characters/:characterId
   */
  @Delete(':campaignId/characters/:characterId')
  @HttpCode(HttpStatus.OK)
  async leaveCharacter(
    @Req() req: AuthenticatedRequest,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Param('characterId', ParseUUIDPipe) characterId: string,
  ): Promise<CampaignWithDetails> {
    const userId = req.user.userId;
    return this.campaignService.leaveCharacterFromCampaign(
      userId,
      campaignId,
      characterId,
    );
  }

  /**
   * Get available scenarios for starting a new game in campaign
   * Requires user to have a character in the campaign
   * GET /api/campaigns/:campaignId/scenarios/available
   */
  @Get(':campaignId/scenarios/available')
  async getAvailableScenarios(
    @Req() req: AuthenticatedRequest,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
  ): Promise<CampaignScenarioInfo[]> {
    const userId = req.user.userId;

    // Authorization: verify user has access to this campaign
    const hasAccess = await this.campaignService.userHasAccessToCampaign(
      userId,
      campaignId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this campaign');
    }

    return this.campaignService.getAvailableScenarios(campaignId);
  }

  /**
   * Get active (non-retired) characters for the current user in a campaign
   * GET /api/campaigns/:campaignId/my-characters
   */
  @Get(':campaignId/my-characters')
  async getMyCharactersInCampaign(
    @Req() req: AuthenticatedRequest,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
  ): Promise<CampaignCharacterSummary[]> {
    const userId = req.user.userId;
    return this.campaignService.getActiveCharactersInCampaign(
      userId,
      campaignId,
    );
  }

  // ========== INVITATION ENDPOINTS ==========

  /**
   * Send direct invitation by username
   * POST /api/campaigns/:campaignId/invitations
   */
  @Post(':campaignId/invitations')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 invitations per minute
  @HttpCode(HttpStatus.CREATED)
  async inviteUser(
    @Req() req: AuthenticatedRequest,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Body() dto: InviteUserDto,
  ): Promise<CampaignInvitation> {
    const userId = req.user.userId;
    return this.invitationService.inviteByUsername(
      campaignId,
      dto.invitedUsername,
      userId,
    );
  }

  /**
   * Get pending invitations for a campaign (host/member view)
   * GET /api/campaigns/:campaignId/invitations
   */
  @Get(':campaignId/invitations')
  async getCampaignInvitations(
    @Req() req: AuthenticatedRequest,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
  ): Promise<CampaignInvitation[]> {
    const userId = req.user.userId;
    return this.invitationService.getPendingInvitations(campaignId, userId);
  }

  /**
   * Revoke a pending invitation
   * DELETE /api/campaigns/:campaignId/invitations/:invitationId
   */
  @Delete(':campaignId/invitations/:invitationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeInvitation(
    @Req() req: AuthenticatedRequest,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
  ): Promise<void> {
    const userId = req.user.userId;
    return this.invitationService.revokeInvitation(invitationId, userId);
  }

  /**
   * Create invite token (shareable link)
   * POST /api/campaigns/:campaignId/invite-tokens
   */
  @Post(':campaignId/invite-tokens')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 tokens per minute
  @HttpCode(HttpStatus.CREATED)
  async createInviteToken(
    @Req() req: AuthenticatedRequest,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Body() dto: CreateInviteTokenDto,
  ): Promise<CampaignInviteToken> {
    const userId = req.user.userId;
    return this.invitationService.createInviteToken(
      campaignId,
      userId,
      dto.maxUses || 1,
    );
  }

  /**
   * Get active invite tokens for a campaign
   * GET /api/campaigns/:campaignId/invite-tokens
   */
  @Get(':campaignId/invite-tokens')
  async getInviteTokens(
    @Req() req: AuthenticatedRequest,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
  ): Promise<CampaignInviteToken[]> {
    const userId = req.user.userId;
    return this.invitationService.getActiveTokens(campaignId, userId);
  }

  /**
   * Revoke an invite token
   * DELETE /api/campaigns/:campaignId/invite-tokens/:tokenId
   */
  @Delete(':campaignId/invite-tokens/:tokenId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeInviteToken(
    @Req() req: AuthenticatedRequest,
    @Param('tokenId', ParseUUIDPipe) tokenId: string,
  ): Promise<void> {
    const userId = req.user.userId;
    return this.invitationService.revokeToken(tokenId, userId);
  }

  /**
   * Get public campaign info (no auth required)
   * GET /api/campaigns/:campaignId/public-info
   */
  @Public()
  @Get(':campaignId/public-info')
  async getCampaignPublicInfo(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
  ): Promise<CampaignPublicInfo> {
    return this.invitationService.getCampaignPublicInfo(campaignId);
  }
}
