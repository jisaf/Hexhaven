/**
 * CharacterSelectionPage - Page Object Model
 *
 * Represents character selection in the lobby where players:
 * - View available character classes
 * - Select a character to play
 * - See disabled characters (already selected by others)
 * - Confirm selection
 *
 * Part of Phase 2 - Page Object Model Implementation
 */

import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Available character classes in Gloomhaven
 */
export type CharacterClass =
  | 'Brute'
  | 'Tinkerer'
  | 'Spellweaver'
  | 'Scoundrel'
  | 'Cragheart'
  | 'Mindthief';

export class CharacterSelectionPage extends BasePage {
  // Locators
  private readonly characterPanel = '[data-testid="character-select"]';
  private readonly characterCard = '[data-testid^="character-card-"]'; // Matches any character
  private readonly selectedClass = '.selected';
  private readonly disabledClass = '.disabled';

  // Character class names
  public readonly CHARACTERS: Record<string, CharacterClass> = {
    BRUTE: 'Brute',
    TINKERER: 'Tinkerer',
    SPELLWEAVER: 'Spellweaver',
    SCOUNDREL: 'Scoundrel',
    CRAGHEART: 'Cragheart',
    MINDTHIEF: 'Mindthief',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Wait for character selection panel to appear
   */
  async waitForCharacterSelection(timeout: number = 10000): Promise<void> {
    await this.waitForElement(this.characterPanel, { timeout });
    console.log('[CharacterSelectionPage] Character selection panel loaded');
  }

  /**
   * Select character by class name
   */
  async selectCharacter(characterClass: CharacterClass): Promise<void> {
    const cardSelector = `[data-testid="character-card-${characterClass}"]`;

    // Wait for character card
    await this.waitForElement(cardSelector);

    // Click to select
    await this.clickWithRetry(cardSelector);

    // Wait for selection state to update
    await this.waitFor(300);

    console.log(`[CharacterSelectionPage] Selected ${characterClass}`);
  }

  /**
   * Select character by index (0-based)
   * Useful when you don't care about specific class
   */
  async selectCharacterByIndex(index: number): Promise<void> {
    const cards = await this.page.locator(this.characterCard).all();

    if (index >= cards.length) {
      throw new Error(`Character index ${index} out of range. Available: ${cards.length}`);
    }

    await cards[index].click();
    await this.waitFor(300);
  }

  /**
   * Get selected character class
   * Returns the currently selected character name
   */
  async getSelectedCharacter(): Promise<CharacterClass | null> {
    const selectedCard = this.page.locator(`${this.characterCard}${this.selectedClass}`);

    const count = await selectedCard.count();
    if (count === 0) {
      return null;
    }

    // Get testid to extract character name
    const testId = await selectedCard.getAttribute('data-testid');
    if (!testId) return null;

    // Extract character name from testid
    const match = testId.match(/character-card-(\w+)/);
    return match ? (match[1] as CharacterClass) : null;
  }

  /**
   * Get list of available characters
   * Returns character names that can be selected
   */
  async getAvailableCharacters(): Promise<CharacterClass[]> {
    await this.waitForElement(this.characterPanel);

    const cards = await this.page.locator(this.characterCard).all();
    const characters: CharacterClass[] = [];

    for (const card of cards) {
      const testId = await card.getAttribute('data-testid');
      if (testId) {
        const match = testId.match(/character-card-(\w+)/);
        if (match) {
          characters.push(match[1] as CharacterClass);
        }
      }
    }

    return characters;
  }

  /**
   * Get list of disabled characters
   * Returns characters already selected by other players
   */
  async getDisabledCharacters(): Promise<CharacterClass[]> {
    await this.waitForElement(this.characterPanel);

    const disabledCards = await this.page
      .locator(`${this.characterCard}${this.disabledClass}`)
      .all();

    const characters: CharacterClass[] = [];

    for (const card of disabledCards) {
      const testId = await card.getAttribute('data-testid');
      if (testId) {
        const match = testId.match(/character-card-(\w+)/);
        if (match) {
          characters.push(match[1] as CharacterClass);
        }
      }
    }

    return characters;
  }

  /**
   * Verify specific character is available (not disabled)
   */
  async verifyCharacterAvailable(characterClass: CharacterClass): Promise<void> {
    const cardSelector = `[data-testid="character-card-${characterClass}"]`;
    const card = await this.waitForElement(cardSelector);

    const isDisabled = await card.evaluate((el) => el.classList.contains('disabled'));
    expect(isDisabled).toBe(false);
  }

  /**
   * Verify specific character is disabled
   */
  async verifyCharacterDisabled(characterClass: CharacterClass): Promise<void> {
    const cardSelector = `[data-testid="character-card-${characterClass}"]`;
    const card = await this.waitForElement(cardSelector);

    const isDisabled = await card.evaluate((el) => el.classList.contains('disabled'));
    expect(isDisabled).toBe(true);
  }

  /**
   * Get total character count
   * Should typically be 6 for base Gloomhaven
   */
  async getCharacterCount(): Promise<number> {
    await this.waitForElement(this.characterPanel);
    return await this.getElementCount(this.characterCard);
  }

  /**
   * Verify expected number of characters
   */
  async verifyCharacterCount(expectedCount: number): Promise<void> {
    const actualCount = await this.getCharacterCount();
    expect(actualCount).toBe(expectedCount);
  }

  /**
   * Select first available character
   * Useful for quick test setup
   */
  async selectFirstAvailable(): Promise<CharacterClass> {
    const available = await this.getAvailableCharacters();

    if (available.length === 0) {
      throw new Error('No available characters to select');
    }

    await this.selectCharacter(available[0]);
    return available[0];
  }

  /**
   * Select random available character
   * Adds variety to test runs
   */
  async selectRandomAvailable(): Promise<CharacterClass> {
    const available = await this.getAvailableCharacters();

    if (available.length === 0) {
      throw new Error('No available characters to select');
    }

    const randomIndex = Math.floor(Math.random() * available.length);
    const selectedChar = available[randomIndex];

    await this.selectCharacter(selectedChar);
    return selectedChar;
  }

  /**
   * Verify character selection panel is visible
   */
  async verifyPanelVisible(): Promise<void> {
    const panel = await this.waitForElement(this.characterPanel);
    await expect(panel).toBeVisible();
  }

  /**
   * Get character description text
   * Returns description shown on character card
   */
  async getCharacterDescription(characterClass: CharacterClass): Promise<string> {
    const cardSelector = `[data-testid="character-card-${characterClass}"]`;
    const descSelector = `${cardSelector} .character-description, ${cardSelector} p`;

    return await this.getTextContent(descSelector);
  }

  /**
   * Get character stats (health, hand size)
   * Returns stats displayed on card
   */
  async getCharacterStats(characterClass: CharacterClass): Promise<{
    health?: number;
    handSize?: number;
  }> {
    const cardSelector = `[data-testid="character-card-${characterClass}"]`;

    return await this.evaluate(() => {
      const card = document.querySelector(cardSelector);
      if (!card) return {};

      // Try to extract stats from card content
      const healthElement = card.querySelector('.health, .character-health');
      const handSizeElement = card.querySelector('.hand-size, .character-hand-size');

      return {
        health: healthElement ? parseInt(healthElement.textContent || '0') : undefined,
        handSize: handSizeElement ? parseInt(handSizeElement.textContent || '0') : undefined,
      };
    });
  }

  /**
   * Verify all 6 base characters are present
   */
  async verifyAllBaseCharactersPresent(): Promise<void> {
    const characters = await this.getAvailableCharacters();

    const expectedCharacters: CharacterClass[] = [
      'Brute',
      'Tinkerer',
      'Spellweaver',
      'Scoundrel',
      'Cragheart',
      'Mindthief',
    ];

    // Sort both arrays for comparison
    const sortedExpected = [...expectedCharacters].sort();
    const sortedActual = [...characters].sort();

    expect(sortedActual).toEqual(sortedExpected);
  }
}
