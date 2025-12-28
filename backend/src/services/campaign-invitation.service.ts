/**
 * Campaign Invitation Service
 * Business logic for campaign invitation management (direct invites and shareable tokens)
 */

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { randomBytes } from 'crypto';
import { config } from '../config/env.config';
import type {
  CampaignInvitation,
  CampaignInviteToken,
  CampaignPublicInfo,
  InvitationStatus,
} from '../../../shared/types/campaign';

// Invitation status constants for type-safe comparisons
const INVITATION_STATUS = {
  PENDING: 'PENDING' as const,
  ACCEPTED: 'ACCEPTED' as const,
  DECLINED: 'DECLINED' as const,
  EXPIRED: 'EXPIRED' as const,
};

@Injectable()
export class CampaignInvitationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Send direct invitation by username
   * Validates: campaign exists, user is campaign owner, username exists, user not already invited/in campaign
   */
  async inviteByUsername(
    campaignId: string,
    invitedUsername: string,
    invitingUserId: string,
  ): Promise<CampaignInvitation> {
    // Validate campaign exists and user is owner
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        characters: {
          include: {
            user: {
              select: { id: true, username: true },
            },
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Check if inviting user is a member of the campaign
    const isMember = campaign.characters.some(
      (char) => char.userId === invitingUserId,
    );

    if (!isMember) {
      throw new ForbiddenException(
        'You must be a member of the campaign to send invitations',
      );
    }

    // Validate invited username exists
    const invitedUser = await this.prisma.user.findUnique({
      where: { username: invitedUsername },
    });

    if (!invitedUser) {
      throw new NotFoundException(`User '${invitedUsername}' not found`);
    }

    // Check if user is already in campaign
    const alreadyInCampaign = campaign.characters.some(
      (char) => char.userId === invitedUser.id,
    );

    if (alreadyInCampaign) {
      throw new BadRequestException(
        `User '${invitedUsername}' is already in this campaign`,
      );
    }

    // Check if user already has a pending invitation
    const existingInvitation = await this.prisma.campaignInvitation.findUnique({
      where: {
        campaignId_invitedUserId: {
          campaignId,
          invitedUserId: invitedUser.id,
        },
      },
    });

    if (existingInvitation && existingInvitation.status === INVITATION_STATUS.PENDING) {
      throw new BadRequestException(
        `User '${invitedUsername}' already has a pending invitation to this campaign`,
      );
    }

    // Create invitation
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.campaign.directInvitationTtlDays);

    const invitation = await this.prisma.campaignInvitation.create({
      data: {
        campaignId,
        invitedUserId: invitedUser.id,
        invitedUsername: invitedUser.username,
        invitedByUserId: invitingUserId,
        status: INVITATION_STATUS.PENDING,
        expiresAt,
      },
      include: {
        campaign: {
          select: { name: true },
        },
        invitedBy: {
          select: { username: true },
        },
      },
    });

    return this.mapToInvitationResponse(invitation);
  }

  /**
   * Get pending invitations for a campaign (host view)
   */
  async getPendingInvitations(
    campaignId: string,
    userId: string,
  ): Promise<CampaignInvitation[]> {
    // Validate user is member of campaign
    await this.validateCampaignMembership(campaignId, userId);

    const invitations = await this.prisma.campaignInvitation.findMany({
      where: {
        campaignId,
        status: INVITATION_STATUS.PENDING,
        expiresAt: { gt: new Date() },
      },
      include: {
        campaign: {
          select: { name: true },
        },
        invitedBy: {
          select: { username: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invitations.map((inv) => this.mapToInvitationResponse(inv));
  }

  /**
   * Get invitations received by a user (all campaigns)
   */
  async getReceivedInvitations(userId: string): Promise<CampaignInvitation[]> {
    const invitations = await this.prisma.campaignInvitation.findMany({
      where: {
        invitedUserId: userId,
        status: INVITATION_STATUS.PENDING,
        expiresAt: { gt: new Date() },
      },
      include: {
        campaign: {
          select: { name: true },
        },
        invitedBy: {
          select: { username: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invitations.map((inv) => this.mapToInvitationResponse(inv));
  }

  /**
   * Revoke a pending invitation
   */
  async revokeInvitation(invitationId: string, userId: string): Promise<void> {
    const invitation = await this.prisma.campaignInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // Validate user is member of campaign
    await this.validateCampaignMembership(invitation.campaignId, userId);

    if (invitation.status !== INVITATION_STATUS.PENDING) {
      throw new BadRequestException('Can only revoke pending invitations');
    }

    await this.prisma.campaignInvitation.delete({
      where: { id: invitationId },
    });
  }

  /**
   * Accept invitation (called when user adds character to campaign)
   * Returns the campaignId for the accepted invitation
   */
  async acceptInvitation(
    invitationId: string,
    userId: string,
  ): Promise<string> {
    const invitation = await this.prisma.campaignInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.invitedUserId !== userId) {
      throw new ForbiddenException('This invitation was not sent to you');
    }

    if (invitation.status !== INVITATION_STATUS.PENDING) {
      throw new BadRequestException('Invitation has already been processed');
    }

    if (invitation.expiresAt < new Date()) {
      await this.prisma.campaignInvitation.update({
        where: { id: invitationId },
        data: { status: INVITATION_STATUS.EXPIRED },
      });
      throw new BadRequestException('Invitation has expired');
    }

    await this.prisma.campaignInvitation.update({
      where: { id: invitationId },
      data: { status: INVITATION_STATUS.ACCEPTED },
    });

    return invitation.campaignId;
  }

  /**
   * Decline invitation
   */
  async declineInvitation(invitationId: string, userId: string): Promise<void> {
    const invitation = await this.prisma.campaignInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.invitedUserId !== userId) {
      throw new ForbiddenException('This invitation was not sent to you');
    }

    if (invitation.status !== INVITATION_STATUS.PENDING) {
      throw new BadRequestException('Invitation has already been processed');
    }

    await this.prisma.campaignInvitation.update({
      where: { id: invitationId },
      data: { status: INVITATION_STATUS.DECLINED },
    });
  }

  /**
   * Create single or multi-use invite token
   */
  async createInviteToken(
    campaignId: string,
    userId: string,
    maxUses: number = 1,
  ): Promise<CampaignInviteToken> {
    // Validate user is member of campaign
    await this.validateCampaignMembership(campaignId, userId);

    if (maxUses < 1 || maxUses > 100) {
      throw new BadRequestException('maxUses must be between 1 and 100');
    }

    // Generate unique token
    const token = this.generateToken();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.campaign.inviteTokenTtlDays);

    const inviteToken = await this.prisma.campaignInviteToken.create({
      data: {
        campaignId,
        token,
        createdByUserId: userId,
        maxUses,
        usedCount: 0,
        expiresAt,
        isRevoked: false,
      },
    });

    return this.mapToTokenResponse(inviteToken);
  }

  /**
   * Get active tokens for a campaign
   */
  async getActiveTokens(
    campaignId: string,
    userId: string,
  ): Promise<CampaignInviteToken[]> {
    // Validate user is member of campaign
    await this.validateCampaignMembership(campaignId, userId);

    const tokens = await this.prisma.campaignInviteToken.findMany({
      where: {
        campaignId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tokens.map((token) => this.mapToTokenResponse(token));
  }

  /**
   * Revoke token before all uses consumed
   */
  async revokeToken(tokenId: string, userId: string): Promise<void> {
    const token = await this.prisma.campaignInviteToken.findUnique({
      where: { id: tokenId },
    });

    if (!token) {
      throw new NotFoundException('Token not found');
    }

    // Validate user is member of campaign
    await this.validateCampaignMembership(token.campaignId, userId);

    if (token.isRevoked) {
      throw new BadRequestException('Token is already revoked');
    }

    await this.prisma.campaignInviteToken.update({
      where: { id: tokenId },
      data: { isRevoked: true },
    });
  }

  /**
   * Validate invite token without consuming it
   * Returns campaignId if valid, throws otherwise
   */
  async validateToken(token: string, userId: string): Promise<string> {
    const { inviteToken } = await this.getAndValidateToken(token, userId);

    if (inviteToken.usedCount >= inviteToken.maxUses) {
      throw new BadRequestException(
        'This invite link has reached its maximum uses',
      );
    }

    return inviteToken.campaignId;
  }

  /**
   * Validate and consume invite token
   * Returns campaignId if valid, throws otherwise
   */
  async validateAndConsumeToken(
    token: string,
    userId: string,
  ): Promise<string> {
    const { inviteToken } = await this.getAndValidateToken(token, userId);

    // Atomically increment used count only if under max uses
    // This prevents race conditions when multiple users use the token simultaneously
    const updateResult = await this.prisma.campaignInviteToken.updateMany({
      where: {
        id: inviteToken.id,
        usedCount: { lt: inviteToken.maxUses },
      },
      data: {
        usedCount: { increment: 1 },
      },
    });

    // If no rows were updated, the token has reached max uses
    if (updateResult.count === 0) {
      throw new BadRequestException(
        'This invite link has reached its maximum uses',
      );
    }

    // Auto-revoke if this was the last use
    if (inviteToken.usedCount + 1 >= inviteToken.maxUses) {
      await this.prisma.campaignInviteToken.update({
        where: { id: inviteToken.id },
        data: { isRevoked: true },
      });
    }

    return inviteToken.campaignId;
  }

  /**
   * Helper: Validate token and check user eligibility
   * Returns validated token with campaign relations
   */
  private async getAndValidateToken(
    token: string,
    userId: string,
  ): Promise<{
    inviteToken: {
      id: string;
      campaignId: string;
      maxUses: number;
      usedCount: number;
      expiresAt: Date;
      isRevoked: boolean;
      campaign: {
        characters: { userId: string }[];
      };
    };
  }> {
    const inviteToken = await this.prisma.campaignInviteToken.findUnique({
      where: { token },
      include: {
        campaign: {
          include: {
            characters: true,
          },
        },
      },
    });

    if (!inviteToken) {
      throw new NotFoundException('Invalid invite token');
    }

    if (inviteToken.isRevoked) {
      throw new BadRequestException('This invite link has been revoked');
    }

    if (inviteToken.expiresAt < new Date()) {
      throw new BadRequestException('This invite link has expired');
    }

    // Check if user is already in campaign
    const alreadyInCampaign = inviteToken.campaign.characters.some(
      (char) => char.userId === userId,
    );

    if (alreadyInCampaign) {
      throw new BadRequestException(
        'You are already a member of this campaign',
      );
    }

    return { inviteToken };
  }

  /**
   * Get public campaign information (no auth required)
   */
  async getCampaignPublicInfo(campaignId: string): Promise<CampaignPublicInfo> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        characters: {
          where: { retired: false },
        },
        template: {
          include: {
            scenarios: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const completedScenarios = campaign.completedScenarios as string[];
    const totalScenarios = campaign.template?.scenarios.length || 0;

    return {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      deathMode: campaign.deathMode as 'healing' | 'permadeath',
      requireUniqueClasses: campaign.requireUniqueClasses,
      prosperityLevel: campaign.prosperityLevel,
      playerCount: campaign.characters.length,
      completedScenariosCount: completedScenarios.length,
      totalScenariosCount: totalScenarios,
      isCompleted: campaign.isCompleted,
    };
  }

  /**
   * Helper: Generate cryptographically secure random token
   */
  private generateToken(): string {
    return randomBytes(24).toString('base64url').slice(0, 32);
  }

  /**
   * Helper: Map Prisma invitation to response type
   */
  private mapToInvitationResponse(invitation: {
    id: string;
    campaignId: string;
    invitedUserId: string;
    invitedUsername: string;
    invitedByUserId: string;
    status: InvitationStatus;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
    campaign: { name: string };
    invitedBy: { username: string };
  }): CampaignInvitation {
    return {
      id: invitation.id,
      campaignId: invitation.campaignId,
      campaignName: invitation.campaign.name,
      invitedUserId: invitation.invitedUserId,
      invitedUsername: invitation.invitedUsername,
      invitedByUserId: invitation.invitedByUserId,
      invitedByUsername: invitation.invitedBy.username,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
    };
  }

  /**
   * Helper: Map Prisma invite token to response type
   */
  private mapToTokenResponse(token: {
    id: string;
    campaignId: string;
    token: string;
    createdByUserId: string;
    maxUses: number;
    usedCount: number;
    expiresAt: Date;
    isRevoked: boolean;
    createdAt: Date;
  }): CampaignInviteToken {
    return {
      id: token.id,
      campaignId: token.campaignId,
      token: token.token,
      createdByUserId: token.createdByUserId,
      maxUses: token.maxUses,
      usedCount: token.usedCount,
      expiresAt: token.expiresAt,
      isRevoked: token.isRevoked,
      createdAt: token.createdAt,
    };
  }

  /**
   * Helper: Validate user is member of campaign
   */
  private async validateCampaignMembership(
    campaignId: string,
    userId: string,
  ): Promise<void> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        characters: {
          where: { userId },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Allow campaign creator OR members with characters (Issue #388)
    const isCreator = campaign.createdByUserId === userId;
    const isMember = campaign.characters.length > 0;

    if (!isCreator && !isMember) {
      throw new ForbiddenException('You are not a member of this campaign');
    }
  }
}
