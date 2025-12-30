/**
 * Campaign Invitation Service
 * Business logic for campaign invitation management (direct invites and shareable tokens)
 */

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from './prisma.service';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { config } from '../config/env.config';
import {
  MIN_TOKEN_USES,
  MAX_TOKEN_USES,
  TOKEN_GENERATED_LENGTH,
} from '../types/campaign.types';
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

// Type for campaign with characters included
type CampaignWithCharacters = Prisma.CampaignGetPayload<{
  include: {
    characters: {
      include: {
        user: {
          select: { id: true; username: true };
        };
      };
    };
  };
}>;

@Injectable()
export class CampaignInvitationService {
  private readonly logger = new Logger(CampaignInvitationService.name);

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
    // Validate campaign membership and get campaign with characters
    const campaign = await this.validateCampaignMembership(
      campaignId,
      invitingUserId,
      true,
    );

    // Sanitize and validate invited username
    const sanitizedUsername = invitedUsername.trim();
    if (!sanitizedUsername) {
      throw new BadRequestException('Username cannot be empty');
    }

    const invitedUser = await this.prisma.user.findUnique({
      where: { username: sanitizedUsername },
    });

    if (!invitedUser) {
      throw new NotFoundException(`User '${sanitizedUsername}' not found`);
    }

    // Check if user is already in campaign
    if (this.isUserInCampaign(campaign.characters, invitedUser.id)) {
      throw new BadRequestException(
        `User '${sanitizedUsername}' is already in this campaign`,
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

    if (
      existingInvitation &&
      existingInvitation.status === INVITATION_STATUS.PENDING
    ) {
      throw new BadRequestException(
        `User '${sanitizedUsername}' already has a pending invitation to this campaign`,
      );
    }

    // Create invitation
    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() + config.campaign.directInvitationTtlDays,
    );

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
  async revokeInvitation(
    campaignId: string,
    invitationId: string,
    userId: string,
  ): Promise<void> {
    const invitation = await this.prisma.campaignInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // Validate invitation belongs to the specified campaign
    if (invitation.campaignId !== campaignId) {
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

    if (maxUses < MIN_TOKEN_USES || maxUses > MAX_TOKEN_USES) {
      throw new BadRequestException(
        `maxUses must be between ${MIN_TOKEN_USES} and ${MAX_TOKEN_USES}`,
      );
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
  async revokeToken(
    campaignId: string,
    tokenId: string,
    userId: string,
  ): Promise<void> {
    const token = await this.prisma.campaignInviteToken.findUnique({
      where: { id: tokenId },
    });

    if (!token) {
      throw new NotFoundException('Token not found');
    }

    // Validate token belongs to the specified campaign
    if (token.campaignId !== campaignId) {
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

    // Atomically increment used count and revoke if needed in a transaction
    // This prevents race conditions when multiple users use the token simultaneously
    const result = await this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.campaignInviteToken.updateMany({
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

      // Auto-revoke if this was the last use (check after increment)
      const newUsedCount = inviteToken.usedCount + 1;
      if (newUsedCount >= inviteToken.maxUses) {
        await tx.campaignInviteToken.update({
          where: { id: inviteToken.id },
          data: { isRevoked: true },
        });
      }

      return inviteToken.campaignId;
    });

    return result;
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
    if (this.isUserInCampaign(inviteToken.campaign.characters, userId)) {
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

    const completedScenarios = Array.isArray(campaign.completedScenarios)
      ? (campaign.completedScenarios as string[])
      : [];
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
   * Cleanup expired invitations and tokens
   * Scheduled to run daily at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredRecords(): Promise<void> {
    try {
      const now = new Date();

      // Delete expired invitations
      const deletedInvitations =
        await this.prisma.campaignInvitation.deleteMany({
          where: {
            expiresAt: { lt: now },
          },
        });

      // Delete expired tokens
      const deletedTokens = await this.prisma.campaignInviteToken.deleteMany({
        where: {
          expiresAt: { lt: now },
        },
      });

      this.logger.log(
        `Cleaned up ${deletedInvitations.count} expired invitations and ${deletedTokens.count} expired tokens`,
      );
    } catch (error) {
      this.logger.error('Failed to cleanup expired records', error);
    }
  }

  /**
   * Helper: Check if user is already a member of campaign
   */
  private isUserInCampaign(
    characters: { userId: string }[],
    userId: string,
  ): boolean {
    return characters.some((char) => char.userId === userId);
  }

  /**
   * Helper: Generate cryptographically secure random token
   */
  private generateToken(): string {
    const token = randomBytes(24)
      .toString('base64url')
      .slice(0, TOKEN_GENERATED_LENGTH);
    if (token.length !== TOKEN_GENERATED_LENGTH) {
      throw new Error('Token generation failed: unexpected length');
    }
    return token;
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
   * Returns campaign with characters if includeCharacters is true
   */
  private async validateCampaignMembership(
    campaignId: string,
    userId: string,
    includeCharacters?: false,
  ): Promise<void>;
  private async validateCampaignMembership(
    campaignId: string,
    userId: string,
    includeCharacters: true,
  ): Promise<CampaignWithCharacters>;
  private async validateCampaignMembership(
    campaignId: string,
    userId: string,
    includeCharacters = false,
  ): Promise<CampaignWithCharacters | void> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        characters: includeCharacters
          ? {
              include: {
                user: {
                  select: { id: true, username: true },
                },
              },
            }
          : { where: { userId } },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Allow campaign creator OR members with characters (Issue #388)
    const isCreator = campaign.createdByUserId === userId;
    const isMember = includeCharacters
      ? this.isUserInCampaign(campaign.characters, userId)
      : campaign.characters.length > 0;

    if (!isCreator && !isMember) {
      throw new ForbiddenException('You are not a member of this campaign');
    }

    if (includeCharacters) {
      return campaign as CampaignWithCharacters;
    }
  }
}
