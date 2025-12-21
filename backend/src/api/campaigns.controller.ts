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
import { Request } from 'express';
import { CampaignService } from '../services/campaign.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { JwtPayload } from '../types/auth.types';
import {
  CreateCampaignDto,
  JoinCampaignDto,
  CreateCampaignCharacterDto,
} from '../types/campaign.types';
import type {
  CampaignWithDetails,
  CampaignListItem,
  CampaignScenarioInfo,
  CampaignTemplate,
  CampaignCharacterSummary,
} from '../types/campaign.types';

// Define locally to avoid decorator metadata issues with imported types
interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

@Controller('api/campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(private readonly campaignService: CampaignService) {}

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
}
