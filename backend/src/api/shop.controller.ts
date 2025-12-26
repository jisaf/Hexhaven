/**
 * Shop Controller (Issue #328 - Campaign Shop API)
 * REST API endpoints for campaign shop operations
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ShopService } from '../services/shop.service';
import { PrismaService } from '../services/prisma.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import {
  PurchaseItemDto,
  SellItemDto,
  UpdateShopConfigDto,
  CampaignShopView,
  ShopTransactionHistory,
  PurchaseResult,
  SellResult,
} from '../types/shop.types';

interface RequestWithUser extends Request {
  user: { userId: string };
}

@Controller('api/campaigns/:campaignId/shop')
@UseGuards(JwtAuthGuard)
export class ShopController {
  constructor(
    private shopService: ShopService,
    private prisma: PrismaService,
  ) {}

  /**
   * GET /api/campaigns/:campaignId/shop
   * Get current shop inventory and configuration
   */
  @Get()
  async getShop(
    @Param('campaignId') campaignId: string,
    @Req() req: RequestWithUser,
  ): Promise<CampaignShopView> {
    await this.verifyCampaignAccess(campaignId, req.user.userId);

    return this.shopService.getShopInventory(campaignId);
  }

  /**
   * POST /api/campaigns/:campaignId/shop/config
   * Update shop configuration
   * Requires user to have a character in the campaign
   */
  @Post('config')
  async updateShopConfig(
    @Param('campaignId') campaignId: string,
    @Body() configUpdate: UpdateShopConfigDto,
    @Req() req: RequestWithUser,
  ): Promise<CampaignShopView> {
    await this.verifyCampaignAccess(campaignId, req.user.userId);

    return this.shopService.updateShopConfig(campaignId, configUpdate);
  }

  /**
   * POST /api/campaigns/:campaignId/shop/purchase
   * Purchase an item from the shop
   */
  @Post('purchase')
  async purchaseItem(
    @Param('campaignId') campaignId: string,
    @Body() dto: PurchaseItemDto,
    @Req() req: RequestWithUser,
  ): Promise<PurchaseResult> {
    await this.verifyCharacterOwnership(dto.characterId, req.user.userId);

    const quantity = dto.quantity || 1;

    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException('Quantity must be a positive integer');
    }

    return this.shopService.purchaseItem(
      campaignId,
      dto.characterId,
      dto.itemId,
      quantity,
    );
  }

  /**
   * POST /api/campaigns/:campaignId/shop/sell
   * Sell an item back to the shop
   */
  @Post('sell')
  async sellItem(
    @Param('campaignId') campaignId: string,
    @Body() dto: SellItemDto,
    @Req() req: RequestWithUser,
  ): Promise<SellResult> {
    await this.verifyCharacterOwnership(dto.characterId, req.user.userId);

    const quantity = dto.quantity || 1;

    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException('Quantity must be a positive integer');
    }

    return this.shopService.sellItem(
      campaignId,
      dto.characterId,
      dto.itemId,
      quantity,
    );
  }

  /**
   * GET /api/campaigns/:campaignId/shop/transactions
   * Get shop transaction history for the campaign
   * Requires user to have a character in the campaign
   */
  @Get('transactions')
  async getTransactionHistory(
    @Param('campaignId') campaignId: string,
    @Req() req: RequestWithUser,
  ): Promise<ShopTransactionHistory> {
    await this.verifyCampaignAccess(campaignId, req.user.userId);

    return this.shopService.getTransactionHistory(campaignId);
  }

  /**
   * GET /api/campaigns/:campaignId/shop/character/:characterId/transactions
   * Get character's transaction history in this campaign
   */
  @Get('character/:characterId/transactions')
  async getCharacterTransactions(
    @Param('campaignId') campaignId: string,
    @Param('characterId') characterId: string,
    @Req() req: RequestWithUser,
  ): Promise<ShopTransactionHistory> {
    await this.verifyCharacterOwnership(characterId, req.user.userId);

    return this.shopService.getCharacterTransactionHistory(
      characterId,
      campaignId,
    );
  }

  /**
   * POST /api/campaigns/:campaignId/shop/restock
   * Manually restock shop items
   * Requires user to have a character in the campaign
   */
  @Post('restock')
  async restockItems(
    @Param('campaignId') campaignId: string,
    @Req() req: RequestWithUser,
  ): Promise<CampaignShopView> {
    await this.verifyCampaignAccess(campaignId, req.user.userId);

    return this.shopService.restockItems(campaignId);
  }

  /**
   * Verify that the user has access to the campaign
   * (has at least one character in the campaign)
   */
  private async verifyCampaignAccess(
    campaignId: string,
    userId: string,
  ): Promise<void> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { characters: { select: { userId: true } } },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    const hasAccess = campaign.characters.some(
      (char) => char.userId === userId,
    );

    if (!hasAccess) {
      throw new ForbiddenException(
        'You do not have access to this campaign. Join with a character first.',
      );
    }
  }

  /**
   * Verify that the user owns the character
   */
  private async verifyCharacterOwnership(
    characterId: string,
    userId: string,
  ): Promise<void> {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      throw new NotFoundException(`Character ${characterId} not found`);
    }

    if (character.userId !== userId) {
      throw new ForbiddenException('You do not own this character');
    }
  }
}
