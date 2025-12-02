/**
 * Game Management Controller (002 - Phase 6)
 * REST API endpoints for game state management with event sourcing
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import type {
  CreateGameDto,
  JoinGameDto,
  GameWithCharacters,
  GameCompletionResult,
  GameEventRecord,
  GameSnapshot,
} from '../types/game-state.types';
import { GameStateService } from '../services/game-state.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { prisma } from '../db/client';

@Controller('api/games')
@UseGuards(JwtAuthGuard)
export class GameManagementController {
  private gameStateService: GameStateService;

  constructor() {
    this.gameStateService = new GameStateService(prisma);
  }

  /**
   * Create a new game with character
   * POST /api/games
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createGame(
    @Request() req: any,
    @Body() createDto: CreateGameDto,
  ): Promise<GameWithCharacters> {
    const userId = req.user.userId;
    return await this.gameStateService.createGame(userId, createDto);
  }

  /**
   * Join game with character
   * POST /api/games/:id/join
   */
  @Post(':id/join')
  @HttpCode(HttpStatus.OK)
  async joinGame(
    @Request() req: any,
    @Param('id') gameId: string,
    @Body() joinDto: JoinGameDto,
  ): Promise<GameWithCharacters> {
    const userId = req.user.userId;
    return await this.gameStateService.joinGame(userId, gameId, joinDto);
  }

  /**
   * Start game
   * POST /api/games/:id/start
   */
  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  async startGame(@Param('id') gameId: string): Promise<GameWithCharacters> {
    return await this.gameStateService.startGame(gameId);
  }

  /**
   * Complete game with results
   * POST /api/games/:id/complete
   */
  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  async completeGame(
    @Param('id') gameId: string,
    @Body() body: { victory: boolean },
  ): Promise<GameCompletionResult> {
    return await this.gameStateService.completeGame(gameId, body.victory);
  }

  /**
   * Abandon game
   * POST /api/games/:id/abandon
   */
  @Post(':id/abandon')
  @HttpCode(HttpStatus.NO_CONTENT)
  async abandonGame(@Param('id') gameId: string): Promise<void> {
    await this.gameStateService.abandonGame(gameId);
  }

  /**
   * Get game with characters
   * GET /api/games/:id
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getGame(@Param('id') gameId: string): Promise<GameWithCharacters> {
    return await this.gameStateService.getGameWithCharacters(gameId);
  }

  /**
   * Get game events (event sourcing log)
   * GET /api/games/:id/events
   */
  @Get(':id/events')
  @HttpCode(HttpStatus.OK)
  async getGameEvents(@Param('id') gameId: string): Promise<GameEventRecord[]> {
    return await this.gameStateService.getGameEvents(gameId);
  }

  /**
   * Get game snapshots
   * GET /api/games/:id/snapshots
   */
  @Get(':id/snapshots')
  @HttpCode(HttpStatus.OK)
  async getGameSnapshots(@Param('id') gameId: string): Promise<GameSnapshot[]> {
    return await this.gameStateService.getGameSnapshots(gameId);
  }
}
