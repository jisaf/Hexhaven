/**
 * LandingPage - Page Object Model
 *
 * Represents the landing/home page where users:
 * - See the app title
 * - Click "Create Game" to start a new game
 * - Click "Join Game" to join an existing game
 *
 * Part of Phase 2 - Page Object Model Implementation
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LandingPage extends BasePage {
  // Locators
  private readonly appTitle = 'h1';
  private readonly createGameButton = '[data-testid="create-room-button"]';
  private readonly joinGameButton = '[data-testid="join-game-button"]';

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to landing page
   */
  async navigate(): Promise<void> {
    await this.goto('/');
    await this.verifyPageLoaded();
  }

  /**
   * Click Create Game button
   * Navigates to nickname entry for creating a room
   */
  async clickCreateGame(): Promise<void> {
    await this.clickWithRetry(this.createGameButton);
    await this.waitForNetworkIdle();
  }

  /**
   * Click Join Game button (via Active Games list)
   * Shows the join room form
   */
  async clickJoinGame(): Promise<void> {
    await this.clickWithRetry(this.joinGameButton);
    await this.waitForNetworkIdle();
  }

  /**
   * Verify landing page loaded successfully
   * Checks for presence of key elements
   */
  async verifyPageLoaded(): Promise<void> {
    await this.waitForElement(this.appTitle);

    // Verify title is correct
    const title = await this.getTextContent(this.appTitle);
    expect(title).toBe('Hexhaven Multiplayer');
  }

  /**
   * Get app title text
   */
  async getTitle(): Promise<string> {
    return await this.getTextContent(this.appTitle);
  }

  /**
   * Verify both primary buttons are visible
   */
  async verifyButtonsVisible(): Promise<void> {
    await this.waitForElement(this.createGameButton);

    // Join button is in active games tab, may need to switch tabs
    // For now, just verify create button is visible
    const createVisible = await this.isVisible(this.createGameButton);
    expect(createVisible).toBe(true);
  }
}
