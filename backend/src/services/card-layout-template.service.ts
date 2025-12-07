/**
 * Card Layout Template Service
 *
 * Manages card layout templates:
 * - Get all templates
 * - Get template by ID
 * - Get template by name
 * - Create new template
 * - Update existing template
 * - Delete template
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CardLayoutTemplate } from '@prisma/client';
import { CardModule } from '../../../shared/types/card-config';

export interface CreateCardLayoutTemplateDto {
  name: string;
  description?: string;
  modules: CardModule[];
}

export interface UpdateCardLayoutTemplateDto {
  name?: string;
  description?: string;
  modules?: CardModule[];
}

@Injectable()
export class CardLayoutTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all card layout templates
   */
  async findAll(): Promise<CardLayoutTemplate[]> {
    return this.prisma.cardLayoutTemplate.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get a template by ID
   * @throws NotFoundException if template doesn't exist
   */
  async findById(id: string): Promise<CardLayoutTemplate> {
    const template = await this.prisma.cardLayoutTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(
        `Card layout template with ID ${id} not found`,
      );
    }

    return template;
  }

  /**
   * Get a template by name
   * @throws NotFoundException if template doesn't exist
   */
  async findByName(name: string): Promise<CardLayoutTemplate> {
    const template = await this.prisma.cardLayoutTemplate.findUnique({
      where: { name },
    });

    if (!template) {
      throw new NotFoundException(`Card layout template '${name}' not found`);
    }

    return template;
  }

  /**
   * Create a new card layout template
   */
  async create(dto: CreateCardLayoutTemplateDto): Promise<CardLayoutTemplate> {
    return this.prisma.cardLayoutTemplate.create({
      data: {
        name: dto.name,
        description: dto.description,
        modules: dto.modules as any, // Prisma expects JsonValue
      },
    });
  }

  /**
   * Update an existing template
   * @throws NotFoundException if template doesn't exist
   */
  async update(
    id: string,
    dto: UpdateCardLayoutTemplateDto,
  ): Promise<CardLayoutTemplate> {
    // Check if template exists
    await this.findById(id);

    return this.prisma.cardLayoutTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        modules: dto.modules as any,
      },
    });
  }

  /**
   * Delete a template
   * @throws NotFoundException if template doesn't exist
   */
  async delete(id: string): Promise<void> {
    // Check if template exists
    await this.findById(id);

    await this.prisma.cardLayoutTemplate.delete({
      where: { id },
    });
  }

  /**
   * Get templates used by ability cards (templates with associated cards)
   */
  async findTemplatesInUse(): Promise<CardLayoutTemplate[]> {
    return this.prisma.cardLayoutTemplate.findMany({
      where: {
        abilityCards: {
          some: {}, // Has at least one associated card
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Validate template modules structure
   */
  validateTemplate(modules: CardModule[]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!Array.isArray(modules)) {
      errors.push('Modules must be an array');
      return { valid: false, errors };
    }

    if (modules.length === 0) {
      errors.push('Template must have at least one module');
    }

    // Check each module has required fields
    modules.forEach((module, index) => {
      if (!module.id) {
        errors.push(`Module ${index} missing required field: id`);
      }
      if (!module.type) {
        errors.push(`Module ${index} missing required field: type`);
      }
      if (typeof module.rows !== 'number' || module.rows < 1) {
        errors.push(`Module ${index} must have rows >= 1`);
      }
      if (typeof module.order !== 'number') {
        errors.push(`Module ${index} missing required field: order`);
      }
    });

    // Check for duplicate module IDs
    const moduleIds = modules.map((m) => m.id);
    const duplicateIds = moduleIds.filter(
      (id, index) => moduleIds.indexOf(id) !== index,
    );
    if (duplicateIds.length > 0) {
      errors.push(`Duplicate module IDs found: ${duplicateIds.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
