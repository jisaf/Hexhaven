/**
 * Character Classes Controller
 * Public endpoint to list available character classes
 */

import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { prisma } from '../db/client';

@Controller('api/character-classes')
export class CharacterClassesController {
  /**
   * Get all character classes
   * GET /api/character-classes
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getCharacterClasses() {
    const classes = await prisma.characterClass.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    return classes.map((c) => ({
      id: c.id,
      name: c.name,
      startingHealth: c.startingHealth,
      maxHealthByLevel: c.maxHealthByLevel,
      handSize: c.handSize,
      perks: c.perks,
      description: c.description,
      imageUrl: c.imageUrl,
    }));
  }
}
