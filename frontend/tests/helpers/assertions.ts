/**
 * Custom Assertions - Domain-Specific Test Assertions
 *
 * Provides game-specific assertion functions:
 * - Game state assertions
 * - WebSocket connection checks
 * - Player state validations
 * - Element existence checks
 * - Custom matchers
 *
 * Part of Phase 3 - Test Helper Modules
 */

import { expect, Page } from '@playwright/test';

/**
 * Assert element exists and is visible
 * Includes helpful error message
 */
export async function assertElementExists(
  page: Page,
  selector: string,
  message?: string
): Promise<void> {
  const element = page.locator(selector);

  await expect(element).toBeVisible({
    timeout: 5000,
  });

  if (message) {
    console.log(`✓ ${message}`);
  } else {
    console.log(`✓ Element exists: ${selector}`);
  }
}

/**
 * Assert element does not exist
 */
export async function assertElementNotExists(
  page: Page,
  selector: string,
  message?: string
): Promise<void> {
  const count = await page.locator(selector).count();

  expect(count).toBe(0);

  if (message) {
    console.log(`✓ ${message}`);
  } else {
    console.log(`✓ Element does not exist: ${selector}`);
  }
}

/**
 * Assert game state matches condition
 * Uses custom predicate function
 */
export async function assertGameState(
  page: Page,
  predicate: (state: any) => boolean,
  message: string
): Promise<void> {
  const state = await page.evaluate(() => {
    return (window as any).gameStateManager?.getState();
  });

  expect(state).toBeDefined();
  expect(predicate(state)).toBe(true);

  console.log(`✓ ${message}`);
}

/**
 * Assert WebSocket is connected
 */
export async function assertWebSocketConnected(
  page: Page
): Promise<void> {
  const connected = await page.evaluate(() => {
    const ws = (window as any).socket;
    return ws && ws.connected === true;
  });

  expect(connected).toBe(true);
  console.log('✓ WebSocket connected');
}

/**
 * Assert WebSocket is disconnected
 */
export async function assertWebSocketDisconnected(
  page: Page
): Promise<void> {
  const disconnected = await page.evaluate(() => {
    const ws = (window as any).socket;
    return !ws || ws.connected === false;
  });

  expect(disconnected).toBe(true);
  console.log('✓ WebSocket disconnected');
}

/**
 * Assert player count matches expected
 */
export async function assertPlayerCount(
  page: Page,
  expectedCount: number
): Promise<void> {
  const count = await page.locator('[data-testid="player-item"]').count();

  expect(count).toBe(expectedCount);
  console.log(`✓ Player count: ${expectedCount}`);
}

/**
 * Assert specific player is in lobby
 */
export async function assertPlayerInLobby(
  page: Page,
  playerName: string
): Promise<void> {
  const playerList = page.locator('[data-testid="player-list"]');
  await expect(playerList).toContainText(playerName);

  console.log(`✓ Player in lobby: ${playerName}`);
}

/**
 * Assert room code format is valid
 * Should be 6 alphanumeric characters
 */
export async function assertValidRoomCode(
  roomCode: string | null
): Promise<void> {
  expect(roomCode).toBeTruthy();
  expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);

  console.log(`✓ Valid room code: ${roomCode}`);
}

/**
 * Assert character is selected
 */
export async function assertCharacterSelected(
  page: Page,
  characterClass: string
): Promise<void> {
  const selector = `[data-testid="character-card-${characterClass}"].selected`;
  await assertElementExists(page, selector, `Character selected: ${characterClass}`);
}

/**
 * Assert character is disabled
 */
export async function assertCharacterDisabled(
  page: Page,
  characterClass: string
): Promise<void> {
  const selector = `[data-testid="character-card-${characterClass}"].disabled`;
  await assertElementExists(page, selector, `Character disabled: ${characterClass}`);
}

/**
 * Assert cards are selected
 */
export async function assertCardsSelected(
  page: Page,
  expectedCount: number
): Promise<void> {
  const selectedCards = page.locator('[data-testid^="ability-card-"].selected');
  const count = await selectedCards.count();

  expect(count).toBe(expectedCount);
  console.log(`✓ Cards selected: ${expectedCount}`);
}

/**
 * Assert it's player's turn
 */
export async function assertIsMyTurn(page: Page): Promise<void> {
  const turnIndicator = page.locator('[data-testid="turn-indicator"]');
  await expect(turnIndicator).toContainText('Your Turn');

  console.log('✓ It is my turn');
}

/**
 * Assert it's opponent's turn
 */
export async function assertIsOpponentTurn(page: Page): Promise<void> {
  const turnIndicator = page.locator('[data-testid="turn-indicator"]');
  await expect(turnIndicator).toContainText(/Opponent'?s? Turn/i);

  console.log('✓ It is opponent turn');
}

/**
 * Assert game board is loaded
 */
export async function assertGameBoardLoaded(page: Page): Promise<void> {
  // Check for canvas
  await assertElementExists(
    page,
    '[data-testid="pixi-app-container"]',
    'Game board container loaded'
  );

  // Verify canvas has content
  const hasCanvas = await page.evaluate(() => {
    const container = document.querySelector('[data-testid="pixi-app-container"]');
    const canvas = container?.querySelector('canvas');
    return canvas && canvas.width > 0 && canvas.height > 0;
  });

  expect(hasCanvas).toBe(true);
  console.log('✓ Game board loaded with canvas');
}

/**
 * Assert hex tiles exist in game state
 */
export async function assertHexTilesExist(page: Page): Promise<void> {
  await assertGameState(
    page,
    (state) => {
      return (
        state.gameData &&
        state.gameData.mapLayout &&
        state.gameData.mapLayout.length > 0
      );
    },
    'Hex tiles exist in game state'
  );
}

/**
 * Assert characters exist in game state
 */
export async function assertCharactersExist(page: Page): Promise<void> {
  await assertGameState(
    page,
    (state) => {
      return (
        state.gameData &&
        state.gameData.characters &&
        state.gameData.characters.length > 0
      );
    },
    'Characters exist in game state'
  );
}

/**
 * Assert monsters exist in game state
 */
export async function assertMonstersExist(page: Page): Promise<void> {
  await assertGameState(
    page,
    (state) => {
      return (
        state.gameData &&
        state.gameData.monsters &&
        state.gameData.monsters.length > 0
      );
    },
    'Monsters exist in game state'
  );
}

/**
 * Assert scenario is complete
 */
export async function assertScenarioComplete(page: Page): Promise<void> {
  await assertGameState(
    page,
    (state) => state.scenarioComplete === true,
    'Scenario is complete'
  );
}

/**
 * Assert scenario result (victory or defeat)
 */
export async function assertScenarioResult(
  page: Page,
  expectedResult: 'victory' | 'defeat'
): Promise<void> {
  const endScreen = page.locator('[data-testid="game-end-screen"]');

  if (expectedResult === 'victory') {
    await expect(endScreen).toContainText('Victory!');
    console.log('✓ Scenario result: Victory');
  } else {
    await expect(endScreen).toContainText('Defeat');
    console.log('✓ Scenario result: Defeat');
  }
}

/**
 * Assert localStorage key exists
 */
export async function assertLocalStorageKey(
  page: Page,
  key: string
): Promise<void> {
  const value = await page.evaluate((storageKey) => {
    return localStorage.getItem(storageKey);
  }, key);

  expect(value).toBeTruthy();
  console.log(`✓ localStorage key exists: ${key}`);
}

/**
 * Assert localStorage key has specific value
 */
export async function assertLocalStorageValue(
  page: Page,
  key: string,
  expectedValue: string
): Promise<void> {
  const value = await page.evaluate((storageKey) => {
    return localStorage.getItem(storageKey);
  }, key);

  expect(value).toBe(expectedValue);
  console.log(`✓ localStorage[${key}] = ${expectedValue}`);
}

/**
 * Assert URL matches pattern
 */
export async function assertUrlMatches(
  page: Page,
  pattern: string | RegExp
): Promise<void> {
  const currentUrl = page.url();

  if (typeof pattern === 'string') {
    expect(currentUrl).toContain(pattern);
  } else {
    expect(currentUrl).toMatch(pattern);
  }

  console.log(`✓ URL matches pattern: ${pattern}`);
}

/**
 * Assert text is visible on page
 */
export async function assertTextVisible(
  page: Page,
  text: string,
  options?: { exact?: boolean }
): Promise<void> {
  await expect(page.getByText(text, { exact: options?.exact || false })).toBeVisible();
  console.log(`✓ Text visible: "${text}"`);
}

/**
 * Assert text is not visible on page
 */
export async function assertTextNotVisible(
  page: Page,
  text: string
): Promise<void> {
  const count = await page.getByText(text).count();
  expect(count).toBe(0);
  console.log(`✓ Text not visible: "${text}"`);
}

/**
 * Assert element has class
 */
export async function assertHasClass(
  page: Page,
  selector: string,
  className: string
): Promise<void> {
  const element = page.locator(selector);
  const classAttr = await element.getAttribute('class');

  expect(classAttr).toContain(className);
  console.log(`✓ Element has class "${className}": ${selector}`);
}

/**
 * Assert element does not have class
 */
export async function assertNotHasClass(
  page: Page,
  selector: string,
  className: string
): Promise<void> {
  const element = page.locator(selector);
  const classAttr = await element.getAttribute('class');

  expect(classAttr).not.toContain(className);
  console.log(`✓ Element does not have class "${className}": ${selector}`);
}

/**
 * Assert button is enabled
 */
export async function assertButtonEnabled(
  page: Page,
  selector: string
): Promise<void> {
  const button = page.locator(selector);
  const isDisabled = await button.isDisabled();

  expect(isDisabled).toBe(false);
  console.log(`✓ Button enabled: ${selector}`);
}

/**
 * Assert button is disabled
 */
export async function assertButtonDisabled(
  page: Page,
  selector: string
): Promise<void> {
  const button = page.locator(selector);
  const isDisabled = await button.isDisabled();

  expect(isDisabled).toBe(true);
  console.log(`✓ Button disabled: ${selector}`);
}

/**
 * Assert element count
 */
export async function assertElementCount(
  page: Page,
  selector: string,
  expectedCount: number
): Promise<void> {
  const actualCount = await page.locator(selector).count();

  expect(actualCount).toBe(expectedCount);
  console.log(`✓ Element count: ${actualCount} (${selector})`);
}

/**
 * Assert element count is at least N
 */
export async function assertMinimumElementCount(
  page: Page,
  selector: string,
  minimumCount: number
): Promise<void> {
  const actualCount = await page.locator(selector).count();

  expect(actualCount).toBeGreaterThanOrEqual(minimumCount);
  console.log(`✓ Element count: ${actualCount} >= ${minimumCount} (${selector})`);
}

/**
 * Assert error message is displayed
 */
export async function assertErrorMessage(
  page: Page,
  expectedMessage?: string
): Promise<void> {
  const errorBanner = page.locator('.error-banner[role="alert"], [role="alert"]');
  await expect(errorBanner).toBeVisible();

  if (expectedMessage) {
    await expect(errorBanner).toContainText(expectedMessage);
    console.log(`✓ Error message: "${expectedMessage}"`);
  } else {
    console.log('✓ Error message displayed');
  }
}

/**
 * Assert no error message is displayed
 */
export async function assertNoError(page: Page): Promise<void> {
  const errorBanner = page.locator('.error-banner[role="alert"]');
  const count = await errorBanner.count();

  expect(count).toBe(0);
  console.log('✓ No error messages');
}
