/**
 * LobbyPage - Page Object Model
 *
 * Represents the game lobby where players:
 * - Enter nickname
 * - See room code
 * - View player list
 * - Select characters
 * - Start game (host only)
 *
 * Part of Phase 2 - Page Object Model Implementation
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LobbyPage extends BasePage {
  // Locators
  private readonly lobbyContainer = '[data-testid="lobby-page"]';
  private readonly roomCodeDisplay = '[data-testid="room-code"]';
  private readonly nicknameInput = '[data-testid="nickname-input"]';
  private readonly nicknameSubmit = '[data-testid="nickname-submit"]';
  private readonly roomCodeInput = '[data-testid="room-code-input"]';
  private readonly joinButton = 'button:has-text("Join")'; // Join button in form
  private readonly playerList = '[data-testid="player-list"]';
  private readonly playerItem = '[data-testid="player-item"]';
  private readonly startGameButton = '[data-testid="start-game-button"]';
  private readonly hostIndicator = '[data-testid="host-indicator"]';
  private readonly copyRoomCodeButton = '[data-testid="copy-room-code"]';

  constructor(page: Page) {
    super(page);
  }

  /**
   * Enter nickname and submit
   * Used when creating a game or joining
   */
  async enterNickname(nickname: string): Promise<void> {
    await this.fillInput(this.nicknameInput, nickname);
    await this.clickWithRetry(this.nicknameSubmit);
    await this.waitForNetworkIdle();
  }

  /**
   * Enter room code and join room
   * Complete flow for joining an existing game
   */
  async joinRoom(roomCode: string, nickname: string): Promise<void> {
    // Fill room code
    await this.fillInput(this.roomCodeInput, roomCode);

    // Fill nickname
    await this.fillInput(this.nicknameInput, nickname);

    // Click join button
    await this.clickWithRetry(this.joinButton);
    await this.waitForNetworkIdle();

    // Wait for lobby to load
    await this.verifyLobbyLoaded();
  }

  /**
   * Get room code from display
   */
  async getRoomCode(): Promise<string> {
    await this.waitForElement(this.roomCodeDisplay);
    const roomCode = await this.getTextContent(this.roomCodeDisplay);

    // Verify format (6 alphanumeric characters)
    expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);

    return roomCode;
  }

  /**
   * Copy room code to clipboard
   */
  async copyRoomCode(): Promise<void> {
    await this.clickWithRetry(this.copyRoomCodeButton);

    // Wait for copy feedback
    await this.waitForElement('text=Copied!', { timeout: 3000 });
  }

  /**
   * Wait for specific player count
   * Useful for multiplayer tests
   */
  async waitForPlayerCount(count: number, timeout: number = 10000): Promise<void> {
    await this.waitForElementCount(this.playerItem, count, timeout);
  }

  /**
   * Get current player count
   */
  async getPlayerCount(): Promise<number> {
    await this.waitForElement(this.playerList);
    return await this.getElementCount(this.playerItem);
  }

  /**
   * Get all player names in the lobby
   */
  async getPlayerNames(): Promise<string[]> {
    await this.waitForElement(this.playerList);
    return await this.getAllTextContent(this.playerItem);
  }

  /**
   * Start game (host only)
   * Waits for navigation to game board
   */
  async startGame(): Promise<void> {
    // Click start game button
    await this.clickWithRetry(this.startGameButton);

    // Wait for navigation to game page
    await this.waitForNavigation({ url: /\/game/ });
  }

  /**
   * Verify user is host
   * Checks for host indicator badge
   */
  async verifyIsHost(): Promise<void> {
    const indicator = await this.waitForElement(this.hostIndicator);
    await expect(indicator).toBeVisible();
  }

  /**
   * Verify lobby page loaded
   * Checks for key lobby elements
   */
  async verifyLobbyLoaded(): Promise<void> {
    await this.waitForElement(this.lobbyContainer);
    await this.waitForElement(this.playerList);
  }

  /**
   * Verify start game button is enabled
   * Used to check if game can be started
   */
  async isStartGameEnabled(): Promise<boolean> {
    const button = await this.waitForElement(this.startGameButton);
    const isDisabled = await button.isDisabled();
    return !isDisabled;
  }

  /**
   * Wait for start game button to be enabled
   * Waits for all players to be ready
   */
  async waitForStartGameEnabled(timeout: number = 30000): Promise<void> {
    await this.waitForCondition(
      async () => await this.isStartGameEnabled(),
      { timeout, message: 'Start game button did not become enabled within timeout' }
    );
  }

  /**
   * Verify player is in lobby with specific room code
   */
  async verifyInRoom(expectedRoomCode: string): Promise<void> {
    const actualRoomCode = await this.getRoomCode();
    expect(actualRoomCode).toBe(expectedRoomCode);
  }

  /**
   * Verify specific player is in the lobby
   */
  async verifyPlayerInLobby(playerName: string): Promise<void> {
    const players = await this.getPlayerNames();
    expect(players).toContain(playerName);
  }

  /**
   * Get start button text (for debugging)
   * Can show "Start Game" or status messages
   */
  async getStartButtonText(): Promise<string> {
    return await this.getTextContent(this.startGameButton);
  }
}
