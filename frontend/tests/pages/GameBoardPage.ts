/**
 * GameBoardPage - Page Object Model
 *
 * Represents the game board with:
 * - Pixi.js hex grid canvas
 * - Turn indicator
 * - End turn button
 * - Game HUD
 * - Character and monster interactions
 *
 * Part of Phase 2 - Page Object Model Implementation
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class GameBoardPage extends BasePage {
  // Locators
  private readonly gameBoardContainer = '[data-testid="pixi-app-container"]';
  private readonly turnIndicator = '[data-testid="turn-indicator"]';
  private readonly endTurnButton = '[data-testid="end-turn-button"]';
  private readonly gameEndScreen = '[data-testid="game-end-screen"]';

  constructor(page: Page) {
    super(page);
  }

  /**
   * Wait for game board to load and render
   * Includes waiting for canvas to be ready
   */
  async waitForGameBoard(timeout: number = 15000): Promise<void> {
    // Wait for container to be visible
    await this.waitForElement(this.gameBoardContainer, { timeout });

    // Wait for canvas to have non-zero dimensions
    await this.page.waitForFunction(
      () => {
        const container = document.querySelector('[data-testid="pixi-app-container"]');
        if (!container) return false;

        const canvas = container.querySelector('canvas');
        if (!canvas) return false;

        return canvas.width > 0 && canvas.height > 0;
      },
      { timeout }
    );

    console.log('[GameBoardPage] Game board canvas ready');
  }

  /**
   * Verify game board is visible
   */
  async verifyBoardVisible(): Promise<void> {
    const container = await this.waitForElement(this.gameBoardContainer);
    await expect(container).toBeVisible();

    // Verify canvas exists
    const hasCanvas = await this.evaluate(() => {
      const container = document.querySelector('[data-testid="pixi-app-container"]');
      return container?.querySelector('canvas') !== null;
    });

    expect(hasCanvas).toBe(true);
  }

  /**
   * Click hex tile at coordinates (using canvas coordinates)
   * Note: Coordinates are relative to canvas, not page
   */
  async clickHexTile(x: number, y: number): Promise<void> {
    const canvas = this.page.locator(`${this.gameBoardContainer} canvas`);
    await canvas.click({ position: { x, y } });
    await this.waitForNetworkIdle();
  }

  /**
   * Get current turn player name
   */
  async getCurrentTurnPlayer(): Promise<string> {
    await this.waitForElement(this.turnIndicator);
    return await this.getTextContent(this.turnIndicator);
  }

  /**
   * Verify it's my turn
   * Checks if turn indicator shows "Your Turn"
   */
  async verifyIsMyTurn(): Promise<void> {
    const turnText = await this.getCurrentTurnPlayer();
    expect(turnText).toContain('Your Turn');
  }

  /**
   * Verify it's opponent's turn
   */
  async verifyIsOpponentTurn(): Promise<void> {
    const turnText = await this.getCurrentTurnPlayer();
    expect(turnText).toMatch(/Opponent'?s? Turn/i);
  }

  /**
   * End turn (clicks end turn button)
   */
  async endTurn(): Promise<void> {
    await this.clickWithRetry(this.endTurnButton);
    await this.waitForNetworkIdle();
  }

  /**
   * Verify end turn button is enabled
   */
  async isEndTurnEnabled(): Promise<boolean> {
    const button = await this.waitForElement(this.endTurnButton);
    const isDisabled = await button.isDisabled();
    return !isDisabled;
  }

  /**
   * Capture game board screenshot
   * Takes screenshot of entire page or just canvas
   */
  async captureBoard(filename: string, options?: { canvasOnly?: boolean }): Promise<void> {
    if (options?.canvasOnly) {
      const canvas = this.page.locator(`${this.gameBoardContainer} canvas`);
      await canvas.screenshot({
        path: `public/test-videos/${filename}.png`
      });
    } else {
      await this.screenshot(filename, { fullPage: true });
    }
  }

  /**
   * Get game state via window object (for testing)
   * Accesses exposed game state manager
   */
  async getGameState(): Promise<any> {
    return await this.evaluate(() => {
      return (window as any).gameStateManager?.getState();
    });
  }

  /**
   * Verify hex tiles exist in game state
   * Checks that game data was loaded correctly
   */
  async verifyHexTilesExist(): Promise<void> {
    const gameState = await this.getGameState();

    expect(gameState).toBeDefined();
    expect(gameState.gameData).toBeDefined();
    expect(gameState.gameData.mapLayout).toBeDefined();
    expect(gameState.gameData.mapLayout.length).toBeGreaterThan(0);
  }

  /**
   * Verify characters exist in game state
   */
  async verifyCharactersExist(): Promise<void> {
    const gameState = await this.getGameState();

    expect(gameState).toBeDefined();
    expect(gameState.gameData).toBeDefined();
    expect(gameState.gameData.characters).toBeDefined();
    expect(gameState.gameData.characters.length).toBeGreaterThan(0);
  }

  /**
   * Verify monsters exist in game state
   */
  async verifyMonstersExist(): Promise<void> {
    const gameState = await this.getGameState();

    expect(gameState).toBeDefined();
    expect(gameState.gameData).toBeDefined();
    expect(gameState.gameData.monsters).toBeDefined();
    expect(gameState.gameData.monsters.length).toBeGreaterThan(0);
  }

  /**
   * Wait for monster turn to complete
   * Waits for turn indicator to update
   */
  async waitForMonsterTurn(): Promise<void> {
    // Wait a moment for monster AI to process
    await this.waitFor(2000);

    // Wait for network activity to settle
    await this.waitForNetworkIdle();
  }

  /**
   * Verify game ended (scenario complete screen visible)
   */
  async verifyGameEnded(): Promise<void> {
    await this.waitForElement(this.gameEndScreen, { timeout: 15000 });
  }

  /**
   * Get scenario result (victory or defeat)
   */
  async getScenarioResult(): Promise<'victory' | 'defeat'> {
    await this.waitForElement(this.gameEndScreen);

    const victoryExists = await this.elementExists('text=Victory!');
    const defeatExists = await this.elementExists('text=Defeat');

    if (victoryExists) return 'victory';
    if (defeatExists) return 'defeat';

    throw new Error('Could not determine scenario result');
  }

  /**
   * Click "Play Again" on game end screen
   */
  async clickPlayAgain(): Promise<void> {
    await this.clickByText('Play Again', { exact: false });
    await this.waitForNetworkIdle();
  }

  /**
   * Click "Return to Lobby" on game end screen
   */
  async clickReturnToLobby(): Promise<void> {
    await this.clickByText('Return to Lobby', { exact: false });
    await this.waitForNavigation({ url: /\/$/ });
  }

  /**
   * Verify canvas has rendered content
   * Checks that canvas is not blank
   */
  async verifyCanvasRendered(): Promise<void> {
    const hasContent = await this.evaluate(() => {
      const container = document.querySelector('[data-testid="pixi-app-container"]');
      const canvas = container?.querySelector('canvas') as HTMLCanvasElement;

      if (!canvas) return false;

      const ctx = canvas.getContext('2d');
      if (!ctx) return false;

      // Check if canvas has any non-transparent pixels
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) {
          return true; // Found non-transparent pixel
        }
      }

      return false;
    });

    expect(hasContent).toBe(true);
  }

  /**
   * Wait for game to be fully loaded
   * Comprehensive check for all game elements
   */
  async waitForGameLoaded(timeout: number = 20000): Promise<void> {
    // Wait for board
    await this.waitForGameBoard(timeout);

    // Wait for turn indicator
    await this.waitForElement(this.turnIndicator, { timeout });

    // Wait for end turn button
    await this.waitForElement(this.endTurnButton, { timeout });

    // Verify game state loaded
    await this.verifyHexTilesExist();
    await this.verifyCharactersExist();

    console.log('[GameBoardPage] Game fully loaded');
  }
}
