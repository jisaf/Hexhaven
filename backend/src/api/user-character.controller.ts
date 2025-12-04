/**
 * User Character Controller
 * REST API endpoints for persistent user-owned character management (002)
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import type {
  CreateCharacterDto,
  UpdateCharacterDto,
  LevelUpDto,
  CreateEnhancementDto,
  CharacterResponse,
  CharacterDetailResponse,
} from '../types/user-character.types';
import { UserCharacterService } from '../services/user-character.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { prisma } from '../db/client';

@Controller('api/user-characters')
@UseGuards(JwtAuthGuard)
export class UserCharacterController {
  private userCharacterService: UserCharacterService;

  constructor() {
    this.userCharacterService = new UserCharacterService(prisma);
  }

  /**
   * Create a new character
   * POST /api/characters
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCharacter(
    @Request() req: any,
    @Body() createDto: CreateCharacterDto,
  ): Promise<CharacterResponse> {
    const userId = req.user.userId;
    return await this.userCharacterService.createCharacter(userId, createDto);
  }

  /**
   * List all characters for authenticated user
   * GET /api/user-characters
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async listCharacters(@Request() req: any): Promise<CharacterResponse[]> {
    const userId = req.user.userId;
    return await this.userCharacterService.listCharacters(userId);
  }

  /**
   * Get character details with full relations
   * GET /api/user-characters/:id
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getCharacter(
    @Request() req: any,
    @Param('id') characterId: string,
  ): Promise<CharacterDetailResponse> {
    const userId = req.user.userId;
    return await this.userCharacterService.getCharacter(characterId, userId);
  }

  /**
   * Update character stats
   * PATCH /api/user-characters/:id
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateCharacter(
    @Request() req: any,
    @Param('id') characterId: string,
    @Body() updateDto: UpdateCharacterDto,
  ): Promise<CharacterResponse> {
    const userId = req.user.userId;
    return await this.userCharacterService.updateCharacter(
      characterId,
      userId,
      updateDto,
    );
  }

  /**
   * Level up a character
   * POST /api/user-characters/:id/level-up
   */
  @Post(':id/level-up')
  @HttpCode(HttpStatus.OK)
  async levelUpCharacter(
    @Request() req: any,
    @Param('id') characterId: string,
    @Body() levelUpDto: LevelUpDto,
  ): Promise<CharacterResponse> {
    const userId = req.user.userId;
    return await this.userCharacterService.levelUpCharacter(
      characterId,
      userId,
      levelUpDto,
    );
  }

  /**
   * Delete/retire a character
   * DELETE /api/user-characters/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCharacter(
    @Request() req: any,
    @Param('id') characterId: string,
  ): Promise<void> {
    const userId = req.user.userId;
    await this.userCharacterService.deleteCharacter(characterId, userId);
  }

  /**
   * Equip an item to character
   * POST /api/user-characters/:id/items/:itemId
   */
  @Post(':id/items/:itemId')
  @HttpCode(HttpStatus.OK)
  async equipItem(
    @Request() req: any,
    @Param('id') characterId: string,
    @Param('itemId') itemId: string,
  ): Promise<CharacterResponse> {
    const userId = req.user.userId;
    return await this.userCharacterService.equipItem(
      characterId,
      userId,
      itemId,
    );
  }

  /**
   * Unequip an item from character
   * DELETE /api/user-characters/:id/items/:itemId
   */
  @Delete(':id/items/:itemId')
  @HttpCode(HttpStatus.OK)
  async unequipItem(
    @Request() req: any,
    @Param('id') characterId: string,
    @Param('itemId') itemId: string,
  ): Promise<CharacterResponse> {
    const userId = req.user.userId;
    return await this.userCharacterService.unequipItem(
      characterId,
      userId,
      itemId,
    );
  }

  /**
   * Add card enhancement
   * POST /api/user-characters/:id/enhancements
   */
  @Post(':id/enhancements')
  @HttpCode(HttpStatus.CREATED)
  async addEnhancement(
    @Request() req: any,
    @Param('id') characterId: string,
    @Body() enhancementDto: CreateEnhancementDto,
  ): Promise<CharacterDetailResponse> {
    const userId = req.user.userId;
    return await this.userCharacterService.addEnhancement(
      characterId,
      userId,
      enhancementDto,
    );
  }

  /**
   * Remove card enhancement
   * DELETE /api/user-characters/:id/enhancements/:enhancementId
   */
  @Delete(':id/enhancements/:enhancementId')
  @HttpCode(HttpStatus.OK)
  async removeEnhancement(
    @Request() req: any,
    @Param('id') characterId: string,
    @Param('enhancementId') enhancementId: string,
  ): Promise<CharacterDetailResponse> {
    const userId = req.user.userId;
    return await this.userCharacterService.removeEnhancement(
      characterId,
      userId,
      enhancementId,
    );
  }
}
