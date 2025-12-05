/**
 * Card Layout Templates Controller
 * REST API endpoints for managing card layout templates
 *
 * GET endpoints are public (card rendering)
 * CUD endpoints require authentication (admin configuration)
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
  BadRequestException,
} from '@nestjs/common';
import { CardLayoutTemplate } from '@prisma/client';
import { CardLayoutTemplateService } from '../services/card-layout-template.service';
import type {
  CreateCardLayoutTemplateDto,
  UpdateCardLayoutTemplateDto,
} from '../services/card-layout-template.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('api/card-layout-templates')
export class CardLayoutTemplatesController {
  constructor(
    private readonly cardLayoutTemplateService: CardLayoutTemplateService,
  ) {}

  /**
   * Get all card layout templates
   * GET /api/card-layout-templates
   * Public endpoint - used for card rendering
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllTemplates(): Promise<CardLayoutTemplate[]> {
    return await this.cardLayoutTemplateService.findAll();
  }

  /**
   * Get a template by ID
   * GET /api/card-layout-templates/:id
   * Public endpoint - used for card rendering
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getTemplateById(@Param('id') id: string): Promise<CardLayoutTemplate> {
    return await this.cardLayoutTemplateService.findById(id);
  }

  /**
   * Get a template by name
   * GET /api/card-layout-templates/by-name/:name
   * Public endpoint - used for card rendering
   */
  @Get('by-name/:name')
  @HttpCode(HttpStatus.OK)
  async getTemplateByName(
    @Param('name') name: string,
  ): Promise<CardLayoutTemplate> {
    return await this.cardLayoutTemplateService.findByName(name);
  }

  /**
   * Get templates currently in use (have associated cards)
   * GET /api/card-layout-templates/in-use
   * Public endpoint
   */
  @Get('meta/in-use')
  @HttpCode(HttpStatus.OK)
  async getTemplatesInUse(): Promise<CardLayoutTemplate[]> {
    return await this.cardLayoutTemplateService.findTemplatesInUse();
  }

  /**
   * Create a new card layout template
   * POST /api/card-layout-templates
   * Requires authentication
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createTemplate(
    @Body() createDto: CreateCardLayoutTemplateDto,
  ): Promise<CardLayoutTemplate> {
    // Validate template structure
    const validation =
      this.cardLayoutTemplateService.validateTemplate(createDto.modules);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Invalid template structure',
        errors: validation.errors,
      });
    }

    return await this.cardLayoutTemplateService.create(createDto);
  }

  /**
   * Update an existing template
   * PATCH /api/card-layout-templates/:id
   * Requires authentication
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateTemplate(
    @Param('id') id: string,
    @Body() updateDto: UpdateCardLayoutTemplateDto,
  ): Promise<CardLayoutTemplate> {
    // Validate template structure if modules are being updated
    if (updateDto.modules) {
      const validation =
        this.cardLayoutTemplateService.validateTemplate(updateDto.modules);
      if (!validation.valid) {
        throw new BadRequestException({
          message: 'Invalid template structure',
          errors: validation.errors,
        });
      }
    }

    return await this.cardLayoutTemplateService.update(id, updateDto);
  }

  /**
   * Delete a template
   * DELETE /api/card-layout-templates/:id
   * Requires authentication
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTemplate(@Param('id') id: string): Promise<void> {
    await this.cardLayoutTemplateService.delete(id);
  }
}
