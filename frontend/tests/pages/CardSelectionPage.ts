/**
 * CardSelectionPage - Page Object Model
 *
 * Represents the ability card selection phase where players:
 * - View available ability cards
 * - Select 2 cards (top and bottom actions)
 * - Confirm selection
 * - Wait for other players
 *
 * Part of Phase 2 - Page Object Model Implementation
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class CardSelectionPage extends BasePage {
  // Locators
  private readonly cardPanel = '[data-testid="card-selection-panel"]';
  private readonly abilityCard = '[data-testid^="ability-card-"]'; // Matches any card
  private readonly confirmButton = '[data-testid="confirm-cards-button"]';
  private readonly clearButton = 'button:has-text("Clear")';
  private readonly selectedCardClass = 'selected';
  private readonly waitingMessage = 'text=Waiting for other players';

  constructor(page: Page) {
    super(page);
  }

  /**
   * Wait for card selection panel to appear
   */
  async waitForCardSelection(timeout: number = 10000): Promise<void> {
    await this.waitForElement(this.cardPanel, { timeout });
    console.log('[CardSelectionPage] Card selection panel loaded');
  }

  /**
   * Select card by index (0-based)
   * Index corresponds to position in hand
   */
  async selectCard(index: number): Promise<void> {
    // Get all cards
    const cards = await this.page.locator(this.abilityCard).all();

    if (index >= cards.length) {
      throw new Error(`Card index ${index} out of range. Available cards: ${cards.length}`);
    }

    // Click the card at specified index
    await cards[index].click();

    // Wait for selection state to update
    await this.waitFor(300);
  }

  /**
   * Select card by ID
   * Uses exact data-testid match
   */
  async selectCardById(cardId: string): Promise<void> {
    const selector = `[data-testid="ability-card-${cardId}"]`;
    await this.clickWithRetry(selector);
    await this.waitFor(300);
  }

  /**
   * Select multiple cards by indices
   */
  async selectCards(indices: number[]): Promise<void> {
    for (const index of indices) {
      await this.selectCard(index);
    }
  }

  /**
   * Get number of selected cards
   * Counts cards with 'selected' class
   */
  async getSelectedCardCount(): Promise<number> {
    const selectedCards = this.page.locator(`${this.abilityCard}.${this.selectedCardClass}`);
    return await selectedCards.count();
  }

  /**
   * Confirm card selection
   * Clicks confirm button and waits for network activity
   */
  async confirmSelection(): Promise<void> {
    await this.clickWithRetry(this.confirmButton);
    await this.waitForNetworkIdle();
  }

  /**
   * Clear card selection
   * Removes all selected cards
   */
  async clearSelection(): Promise<void> {
    await this.clickWithRetry(this.clearButton);
    await this.waitFor(300);
  }

  /**
   * Select two cards and confirm (standard flow)
   * Most common card selection pattern
   */
  async selectTwoCardsAndConfirm(
    topCardIndex: number,
    bottomCardIndex: number
  ): Promise<void> {
    // Wait for panel
    await this.waitForCardSelection();

    // Select first card
    await this.selectCard(topCardIndex);
    console.log(`[CardSelectionPage] Selected card ${topCardIndex}`);

    // Select second card
    await this.selectCard(bottomCardIndex);
    console.log(`[CardSelectionPage] Selected card ${bottomCardIndex}`);

    // Verify exactly 2 cards selected
    const count = await this.getSelectedCardCount();
    expect(count).toBe(2);

    // Confirm selection
    await this.confirmSelection();
    console.log('[CardSelectionPage] Cards confirmed');
  }

  /**
   * Get total number of available cards
   */
  async getAvailableCardCount(): Promise<number> {
    await this.waitForElement(this.cardPanel);
    return await this.getElementCount(this.abilityCard);
  }

  /**
   * Verify confirm button is enabled
   * Button should only be enabled when 2 cards selected
   */
  async isConfirmButtonEnabled(): Promise<boolean> {
    const button = await this.waitForElement(this.confirmButton);
    const isDisabled = await button.isDisabled();
    return !isDisabled;
  }

  /**
   * Wait for confirm button to be enabled
   * Waits until 2 cards are selected
   */
  async waitForConfirmEnabled(timeout: number = 5000): Promise<void> {
    await this.waitForCondition(
      async () => await this.isConfirmButtonEnabled(),
      { timeout, message: 'Confirm button did not become enabled' }
    );
  }

  /**
   * Verify we're waiting for other players
   * Checks for waiting message
   */
  async isWaitingForOthers(): Promise<boolean> {
    return await this.elementExists(this.waitingMessage);
  }

  /**
   * Wait for card selection phase to complete
   * Waits until panel disappears or game board appears
   */
  async waitForSelectionComplete(timeout: number = 30000): Promise<void> {
    await this.waitForElementToDisappear(this.cardPanel, timeout);
    console.log('[CardSelectionPage] Card selection complete');
  }

  /**
   * Get card names (for debugging)
   * Returns array of card names visible in panel
   */
  async getCardNames(): Promise<string[]> {
    await this.waitForElement(this.cardPanel);

    // Get all card name elements (adjust selector as needed)
    const cardNameSelector = `${this.abilityCard} .card-name, ${this.abilityCard} h3, ${this.abilityCard} .ability-name`;

    return await this.getAllTextContent(cardNameSelector);
  }

  /**
   * Verify specific number of cards available
   */
  async verifyCardCount(expectedCount: number): Promise<void> {
    const actualCount = await this.getAvailableCardCount();
    expect(actualCount).toBe(expectedCount);
  }

  /**
   * Select first N available cards
   * Useful for testing with variable hand sizes
   */
  async selectFirstNCards(n: number): Promise<void> {
    const availableCount = await this.getAvailableCardCount();

    if (n > availableCount) {
      throw new Error(`Cannot select ${n} cards. Only ${availableCount} available.`);
    }

    for (let i = 0; i < n; i++) {
      await this.selectCard(i);
    }
  }

  /**
   * Complete card selection quickly (first 2 cards)
   * Fast path for tests that don't care about specific cards
   */
  async quickSelectCards(): Promise<void> {
    await this.selectTwoCardsAndConfirm(0, 1);
  }
}
