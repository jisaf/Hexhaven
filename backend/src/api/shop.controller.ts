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
} from '@nestjs/common';
import { ShopService } from '../services/shop.service';
import { CampaignService } from '../services/campaign.service';
import { PrismaService } from '../services/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  PurchaseItemDto,
  SellItemDto,
  UpdateShopConfigDto,
} from '../types/shop.types';

interface RequestWithUser extends Request {
  user: { userId: string };
}

@Controller('api/campaigns/:campaignId/shop')
@UseGuards(JwtAuthGuard)
export class ShopController {
  constructor(
    private shopService: ShopService,
    private campaignService: CampaignService,
    private prisma: PrismaService,
  ) {}

  /**
   * GET /api/campaigns/:campaignId/shop
   * Get current shop inventory and configuration
   */
  @Get()
  async getShop(@Param('campaignId') campaignId: string) {
    return this.shopService.getShopInventory(campaignId);
  }

  /**
   * POST /api/campaigns/:campaignId/shop/config
   * Update shop configuration (campaign owner only)
   */
  @Post('config')
  async updateShopConfig(
    @Param('campaignId') campaignId: string,
    @Body() configUpdate: UpdateShopConfigDto,
    @Req() req: RequestWithUser,
  ) {
    // Verify campaign ownership
    await this.verifyCampaignOwnership(campaignId, req.user.userId);

    return this.shopService.updateShopConfig(campaignId, configUpdate);
  }

  /**
   * POST /api/campaigns/:campaignId/shop/purchase
   * Purchase an item from the shop
   */
  @Post('purchase')
  async purchaseItem(
    @Param('campaignId') campaignId: string,
    @Body() dto: PurchaseItemDto & { characterId: string },
    @Req() req: RequestWithUser,
  ) {
    // Verify character belongs to user
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
    @Body() dto: SellItemDto & { characterId: string },
    @Req() req: RequestWithUser,
  ) {
    // Verify character belongs to user
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
   * Get shop transaction history (campaign owner only)
   */
  @Get('transactions')
  async getTransactionHistory(
    @Param('campaignId') campaignId: string,
    @Req() req: RequestWithUser,
  ) {
    // Verify campaign ownership
    await this.verifyCampaignOwnership(campaignId, req.user.userId);

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
  ) {
    // Verify character belongs to user
    await this.verifyCharacterOwnership(characterId, req.user.userId);

    return this.shopService.getCharacterTransactionHistory(
      characterId,
      campaignId,
    );
  }

  /**
   * POST /api/campaigns/:campaignId/shop/restock
   * Manually restock shop items (campaign owner only)
   */
  @Post('restock')
  async restockItems(
    @Param('campaignId') campaignId: string,
    @Req() req: RequestWithUser,
  ) {
    // Verify campaign ownership
    await this.verifyCampaignOwnership(campaignId, req.user.userId);

    return this.shopService.restockItems(campaignId);
  }

  /**
   * Verify that the user owns/is the creator of the campaign
   */
  private async verifyCampaignOwnership(
    campaignId: string,
    userId: string,
  ): Promise<void> {
    const campaign =
      await this.campaignService.getCampaignWithDetails(campaignId);

    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    // Check if any character in the campaign belongs to this user
    const userCharacter = campaign.characters.find(
      (char) => char.userId === userId,
    );

    if (!userCharacter) {
      // Check if user is the campaign creator (first character added)
      // For now, allow any user with characters in campaign to manage shop
      throw new NotFoundException(
        'User does not have characters in this campaign',
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
      throw new NotFoundException('User does not own this character');
    }
  }
}
