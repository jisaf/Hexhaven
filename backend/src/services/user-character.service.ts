/**
 * User Character Service (002)
 * Handles persistent user-owned character CRUD operations, leveling, items, and enhancements
 * Distinct from the in-game CharacterService (001) which manages session state
 */

import { Injectable, Optional } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import type {
  CreateCharacterDto,
  UpdateCharacterDto,
  LevelUpDto,
  CreateEnhancementDto,
  CharacterResponse,
  CharacterDetailResponse,
} from '../types/user-character.types';
import { ValidationError, NotFoundError, ConflictError } from '../types/errors';
import { prisma as defaultPrisma } from '../db/client';
import { characterNameSchema } from '../validation/schemas';

@Injectable()
export class UserCharacterService {
  private prisma: PrismaClient;

  constructor(@Optional() prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
  }

  async createCharacter(
    userId: string,
    dto: CreateCharacterDto,
  ): Promise<CharacterResponse> {
    // Validate and sanitize character name using Zod schema
    const nameValidation = characterNameSchema.safeParse(dto.name);
    if (!nameValidation.success) {
      const firstError = nameValidation.error.issues[0];
      throw new ValidationError(
        firstError?.message || 'Invalid character name',
      );
    }
    const validatedName = nameValidation.data;

    const characterClass = await this.prisma.characterClass.findUnique({
      where: { id: dto.classId },
    });

    if (!characterClass) {
      throw new NotFoundError('Character class not found');
    }

    const character = await this.prisma.character.create({
      data: {
        name: validatedName,
        userId,
        classId: dto.classId,
        level: 1,
        experience: 0,
        gold: 0,
        health: characterClass.startingHealth,
        perks: [],
      },
      include: {
        class: true,
        ownedItems: true,
      },
    });

    return this.mapToCharacterResponse(character);
  }

  async listCharacters(userId: string): Promise<CharacterResponse[]> {
    const characters = await this.prisma.character.findMany({
      where: { userId },
      include: {
        class: true,
        ownedItems: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return characters.map((char: any) => this.mapToCharacterResponse(char));
  }

  async getCharacter(
    characterId: string,
    userId: string,
  ): Promise<CharacterDetailResponse> {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      include: {
        class: true,
        enhancements: {
          include: {
            card: true,
          },
        },
      },
    });

    if (!character) {
      throw new NotFoundError('Character not found');
    }

    if (character.userId !== userId) {
      throw new NotFoundError('Character not found');
    }

    const abilityCards = await this.prisma.abilityCard.findMany({
      where: {
        classId: character.classId,
        level: { lte: character.level },
      },
      orderBy: [{ level: 'asc' }, { initiative: 'asc' }],
    });

    return {
      ...this.mapToCharacterResponse(character),
      class: {
        id: character.class.id,
        name: character.class.name,
        startingHealth: character.class.startingHealth,
        maxHealthByLevel: character.class.maxHealthByLevel as number[],
        handSize: character.class.handSize,
        perks: character.class.perks as string[],
        description: character.class.description,
        imageUrl: character.class.imageUrl,
      },
      abilityCards: abilityCards.map((card: any) => ({
        id: card.id,
        name: card.name,
        level: card.level,
        initiative: card.initiative,
        topAction: card.topAction,
        bottomAction: card.bottomAction,
      })),
      enhancements: character.enhancements.map((enh: any) => ({
        id: enh.id,
        cardId: enh.cardId,
        slot: enh.slot,
        enhancementType: enh.enhancementType,
        appliedAt: enh.appliedAt,
      })),
    };
  }

  async updateCharacter(
    characterId: string,
    userId: string,
    dto: UpdateCharacterDto,
  ): Promise<CharacterResponse> {
    const existing = await this.prisma.character.findUnique({
      where: { id: characterId },
    });

    if (!existing) {
      throw new NotFoundError('Character not found');
    }

    if (existing.userId !== userId) {
      throw new NotFoundError('Character not found');
    }

    if (existing.currentGameId) {
      throw new ConflictError('Cannot modify character while in active game');
    }

    // Validate name if provided
    let validatedName: string | undefined;
    if (dto.name !== undefined) {
      const nameValidation = characterNameSchema.safeParse(dto.name);
      if (!nameValidation.success) {
        const firstError = nameValidation.error.issues[0];
        throw new ValidationError(
          firstError?.message || 'Invalid character name',
        );
      }
      validatedName = nameValidation.data;
    }

    const character = await this.prisma.character.update({
      where: { id: characterId },
      data: {
        ...(validatedName && { name: validatedName }),
        ...(dto.experience !== undefined && { experience: dto.experience }),
        ...(dto.gold !== undefined && { gold: dto.gold }),
        ...(dto.health !== undefined && { health: dto.health }),
        ...(dto.perks && { perks: dto.perks }),
      },
      include: {
        class: true,
        ownedItems: true,
      },
    });

    return this.mapToCharacterResponse(character);
  }

  async levelUpCharacter(
    characterId: string,
    userId: string,
    dto: LevelUpDto,
  ): Promise<CharacterResponse> {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      include: { class: true, ownedItems: true },
    });

    if (!character) {
      throw new NotFoundError('Character not found');
    }

    if (character.userId !== userId) {
      throw new NotFoundError('Character not found');
    }

    if (character.currentGameId) {
      throw new ConflictError('Cannot level up character while in active game');
    }

    if (character.level >= 9) {
      throw new ValidationError('Character is already at max level');
    }

    const newLevel = character.level + 1;
    const maxHealthByLevel = character.class.maxHealthByLevel as number[];
    const newMaxHealth = maxHealthByLevel[newLevel - 1] || character.health;

    const currentPerks = character.perks as string[];
    const newPerks = dto.selectedPerk
      ? [...currentPerks, dto.selectedPerk]
      : currentPerks;

    const updated = await this.prisma.character.update({
      where: { id: characterId },
      data: {
        level: newLevel,
        health: newMaxHealth + dto.healthIncrease,
        perks: newPerks,
      },
      include: {
        class: true,
        ownedItems: true,
      },
    });

    return this.mapToCharacterResponse(updated);
  }

  async deleteCharacter(characterId: string, userId: string): Promise<void> {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      throw new NotFoundError('Character not found');
    }

    if (character.userId !== userId) {
      throw new NotFoundError('Character not found');
    }

    if (character.currentGameId) {
      throw new ConflictError('Cannot delete character while in active game');
    }

    await this.prisma.character.delete({
      where: { id: characterId },
    });
  }

  /**
   * Add item to character's inventory (legacy method - use InventoryService for new code)
   */
  async equipItem(
    characterId: string,
    userId: string,
    itemId: string,
  ): Promise<CharacterResponse> {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      include: { class: true, ownedItems: true },
    });

    if (!character) {
      throw new NotFoundError('Character not found');
    }

    if (character.userId !== userId) {
      throw new NotFoundError('Character not found');
    }

    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundError('Item not found');
    }

    // Check if already owned
    if (character.ownedItems.some((inv) => inv.itemId === itemId)) {
      throw new ConflictError('Item already in inventory');
    }

    await this.prisma.characterInventory.create({
      data: { characterId, itemId },
    });

    const updated = await this.prisma.character.findUnique({
      where: { id: characterId },
      include: { class: true, ownedItems: true },
    });

    return this.mapToCharacterResponse(updated!);
  }

  /**
   * Remove item from character's inventory (legacy method - use InventoryService for new code)
   */
  async unequipItem(
    characterId: string,
    userId: string,
    itemId: string,
  ): Promise<CharacterResponse> {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      include: { class: true, ownedItems: true },
    });

    if (!character) {
      throw new NotFoundError('Character not found');
    }

    if (character.userId !== userId) {
      throw new NotFoundError('Character not found');
    }

    const inventoryItem = character.ownedItems.find(
      (inv) => inv.itemId === itemId,
    );
    if (!inventoryItem) {
      throw new NotFoundError('Item not in inventory');
    }

    await this.prisma.characterInventory.delete({
      where: { id: inventoryItem.id },
    });

    const updated = await this.prisma.character.findUnique({
      where: { id: characterId },
      include: { class: true, ownedItems: true },
    });

    return this.mapToCharacterResponse(updated!);
  }

  async addEnhancement(
    characterId: string,
    userId: string,
    dto: CreateEnhancementDto,
  ): Promise<CharacterDetailResponse> {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      throw new NotFoundError('Character not found');
    }

    if (character.userId !== userId) {
      throw new NotFoundError('Character not found');
    }

    const card = await this.prisma.abilityCard.findUnique({
      where: { id: dto.cardId },
    });

    if (!card || card.classId !== character.classId) {
      throw new NotFoundError(
        'Ability card not found for this character class',
      );
    }

    const existingEnhancement = await this.prisma.cardEnhancement.findFirst({
      where: {
        characterId,
        cardId: dto.cardId,
        slot: dto.slot,
      },
    });

    if (existingEnhancement) {
      throw new ConflictError(
        'Enhancement already exists for this card and slot',
      );
    }

    await this.prisma.cardEnhancement.create({
      data: {
        characterId,
        cardId: dto.cardId,
        slot: dto.slot,
        enhancementType: dto.enhancementType,
      },
    });

    return this.getCharacter(characterId, userId);
  }

  async removeEnhancement(
    characterId: string,
    userId: string,
    enhancementId: string,
  ): Promise<CharacterDetailResponse> {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      throw new NotFoundError('Character not found');
    }

    if (character.userId !== userId) {
      throw new NotFoundError('Character not found');
    }

    const enhancement = await this.prisma.cardEnhancement.findUnique({
      where: { id: enhancementId },
    });

    if (!enhancement || enhancement.characterId !== characterId) {
      throw new NotFoundError('Enhancement not found');
    }

    await this.prisma.cardEnhancement.delete({
      where: { id: enhancementId },
    });

    return this.getCharacter(characterId, userId);
  }

  private mapToCharacterResponse(character: any): CharacterResponse {
    // Extract item IDs from ownedItems relation (if included)
    const inventory: string[] = character.ownedItems
      ? (character.ownedItems as Array<{ itemId: string }>).map(
          (inv) => inv.itemId,
        )
      : [];

    return {
      id: character.id,
      name: character.name,
      userId: character.userId,
      classId: character.classId,
      className: character.class?.name || 'Unknown',
      level: character.level,
      experience: character.experience,
      gold: character.gold,
      health: character.health,
      perks: character.perks as string[],
      inventory,
      currentGameId: character.currentGameId,
      campaignId: character.campaignId,
      createdAt: character.createdAt,
      updatedAt: character.updatedAt,
    };
  }
}
