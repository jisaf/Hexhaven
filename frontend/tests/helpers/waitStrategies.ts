/**
 * Wait Strategies - Advanced Waiting Functions
 *
 * Provides specialized wait functions for complex conditions:
 * - WebSocket connection waiting
 * - Game state waiting
 * - Network idle waiting
 * - Element count waiting
 * - Canvas rendering waiting
 * - Custom condition waiting
 *
 * Part of Phase 3 - Test Helper Modules
 */

import { Page, Locator } from '@playwright/test';

/**
 * Wait for element to be visible with retry
 * More robust than standard waitFor
 */
export async function waitForVisible(
  page: Page,
  selector: string,
  options: { timeout?: number; retries?: number } = {}
): Promise<Locator> {
  const { timeout = 10000, retries = 3 } = options;

  for (let i = 0; i < retries; i++) {
    try {
      const element = page.locator(selector);
      await element.waitFor({ state: 'visible', timeout });
      return element;
    } catch (error) {
      if (i === retries - 1) throw error;
      await page.waitForTimeout(1000);
    }
  }

  throw new Error(`Element not found after ${retries} retries: ${selector}`);
}

/**
 * Wait for WebSocket connection
 * Checks window.socket object
 */
export async function waitForWebSocketConnection(
  page: Page,
  timeout: number = 10000
): Promise<void> {
  await page.waitForFunction(
    () => {
      const ws = (window as any).socket;
      return ws && ws.connected === true;
    },
    { timeout }
  );

  console.log('[waitStrategies] WebSocket connected');
}

/**
 * Wait for WebSocket to disconnect
 * Useful for testing reconnection
 */
export async function waitForWebSocketDisconnect(
  page: Page,
  timeout: number = 10000
): Promise<void> {
  await page.waitForFunction(
    () => {
      const ws = (window as any).socket;
      return !ws || ws.connected === false;
    },
    { timeout }
  );

  console.log('[waitStrategies] WebSocket disconnected');
}

/**
 * Wait for game state to update
 * Accepts predicate function to check state
 */
export async function waitForGameStateUpdate(
  page: Page,
  predicate: (state: any) => boolean,
  timeout: number = 10000
): Promise<void> {
  await page.waitForFunction(
    (predicateStr) => {
      const state = (window as any).gameStateManager?.getState();
      if (!state) return false;

      // Reconstruct predicate from string
      const predicateFn = new Function('state', `return (${predicateStr})(state)`);
      return predicateFn(state);
    },
    predicate.toString(),
    { timeout }
  );
}

/**
 * Wait for network to be quiet
 * More reliable than networkidle for SPAs
 */
export async function waitForNetworkQuiet(
  page: Page,
  options: { timeout?: number; idleTime?: number } = {}
): Promise<void> {
  const { timeout = 30000, idleTime = 500 } = options;

  await page.waitForLoadState('networkidle', { timeout });
  await page.waitForTimeout(idleTime); // Additional buffer
}

/**
 * Wait for element count to match
 * Useful for waiting for lists to populate
 */
export async function waitForElementCount(
  page: Page,
  selector: string,
  expectedCount: number,
  timeout: number = 10000
): Promise<void> {
  await page.waitForFunction(
    ({ sel, count }) => {
      const elements = document.querySelectorAll(sel);
      return elements.length === count;
    },
    { selector, expectedCount },
    { timeout }
  );

  console.log(`[waitStrategies] Found ${expectedCount} elements matching: ${selector}`);
}

/**
 * Wait for element count to be at least N
 * Useful when exact count is unknown
 */
export async function waitForMinimumElementCount(
  page: Page,
  selector: string,
  minimumCount: number,
  timeout: number = 10000
): Promise<void> {
  await page.waitForFunction(
    ({ sel, min }) => {
      const elements = document.querySelectorAll(sel);
      return elements.length >= min;
    },
    { selector, minimumCount },
    { timeout }
  );

  const actualCount = await page.locator(selector).count();
  console.log(`[waitStrategies] Found ${actualCount} elements (minimum ${minimumCount}): ${selector}`);
}

/**
 * Wait for canvas to render
 * Checks that canvas has non-zero dimensions and context
 */
export async function waitForCanvasReady(
  page: Page,
  canvasSelector: string,
  timeout: number = 10000
): Promise<void> {
  await page.waitForFunction(
    (sel) => {
      const canvas = document.querySelector(sel) as HTMLCanvasElement;
      if (!canvas) return false;

      // Check dimensions
      if (canvas.width === 0 || canvas.height === 0) return false;

      // Check if context exists
      const ctx = canvas.getContext('2d');
      return ctx !== null;
    },
    canvasSelector,
    { timeout }
  );

  console.log('[waitStrategies] Canvas ready:', canvasSelector);
}

/**
 * Wait for canvas to have rendered content
 * Checks for non-transparent pixels
 */
export async function waitForCanvasContent(
  page: Page,
  canvasSelector: string,
  timeout: number = 10000
): Promise<void> {
  await page.waitForFunction(
    (sel) => {
      const canvas = document.querySelector(sel) as HTMLCanvasElement;
      if (!canvas) return false;

      const ctx = canvas.getContext('2d');
      if (!ctx) return false;

      // Sample center pixel
      const centerX = Math.floor(canvas.width / 2);
      const centerY = Math.floor(canvas.height / 2);

      const imageData = ctx.getImageData(centerX, centerY, 1, 1);
      const alpha = imageData.data[3];

      // Check if pixel has any opacity
      return alpha > 0;
    },
    canvasSelector,
    { timeout }
  );

  console.log('[waitStrategies] Canvas has content:', canvasSelector);
}

/**
 * Wait for text to appear
 * Case-insensitive substring match
 */
export async function waitForText(
  page: Page,
  text: string,
  options: { exact?: boolean; timeout?: number } = {}
): Promise<void> {
  const { exact = false, timeout = 10000 } = options;

  await page.waitForFunction(
    ({ searchText, exactMatch }) => {
      const bodyText = document.body.textContent || '';

      if (exactMatch) {
        return bodyText === searchText;
      }

      return bodyText.toLowerCase().includes(searchText.toLowerCase());
    },
    { searchText: text, exactMatch: exact },
    { timeout }
  );
}

/**
 * Wait for text to disappear
 * Useful for waiting for loading messages to hide
 */
export async function waitForTextToDisappear(
  page: Page,
  text: string,
  timeout: number = 10000
): Promise<void> {
  await page.waitForFunction(
    (searchText) => {
      const bodyText = document.body.textContent || '';
      return !bodyText.toLowerCase().includes(searchText.toLowerCase());
    },
    text,
    { timeout }
  );
}

/**
 * Wait for URL to match pattern
 * Supports string or regex
 */
export async function waitForUrlMatch(
  page: Page,
  pattern: string | RegExp,
  timeout: number = 10000
): Promise<void> {
  await page.waitForURL(pattern, { timeout });
}

/**
 * Wait for localStorage key to exist
 * Useful for session restoration tests
 */
export async function waitForLocalStorageKey(
  page: Page,
  key: string,
  timeout: number = 10000
): Promise<void> {
  await page.waitForFunction(
    (storageKey) => {
      return localStorage.getItem(storageKey) !== null;
    },
    key,
    { timeout }
  );
}

/**
 * Wait for localStorage key to have specific value
 */
export async function waitForLocalStorageValue(
  page: Page,
  key: string,
  expectedValue: string,
  timeout: number = 10000
): Promise<void> {
  await page.waitForFunction(
    ({ storageKey, value }) => {
      return localStorage.getItem(storageKey) === value;
    },
    { storageKey: key, value: expectedValue },
    { timeout }
  );
}

/**
 * Wait for condition with custom polling interval
 * More efficient than busy waiting
 */
export async function waitForCondition(
  page: Page,
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number; message?: string } = {}
): Promise<void> {
  const { timeout = 10000, interval = 100, message = 'Condition not met' } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await page.waitForTimeout(interval);
  }

  throw new Error(`${message} (timeout: ${timeout}ms)`);
}

/**
 * Wait for all promises to settle
 * Useful for parallel operations
 */
export async function waitForAll(
  promises: Promise<any>[],
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 30000 } = options;

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`waitForAll timeout after ${timeout}ms`)), timeout)
  );

  await Promise.race([Promise.all(promises), timeoutPromise]);
}

/**
 * Wait with exponential backoff
 * Useful for retrying with increasing delays
 */
export async function waitExponentialBackoff(
  page: Page,
  baseDelay: number,
  attempt: number,
  maxDelay: number = 10000
): Promise<void> {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  await page.waitForTimeout(delay);
}

/**
 * Smart wait - combination of strategies
 * Tries multiple wait strategies in sequence
 */
export async function smartWait(
  page: Page,
  selector: string,
  options: { timeout?: number } = {}
): Promise<Locator> {
  const { timeout = 10000 } = options;

  // Try visibility first
  try {
    const element = page.locator(selector);
    await element.waitFor({ state: 'visible', timeout: timeout / 2 });
    return element;
  } catch {
    // Fall back to networkidle
    await waitForNetworkQuiet(page, { timeout: timeout / 2 });

    // Retry visibility
    const element = page.locator(selector);
    await element.waitFor({ state: 'visible', timeout: timeout / 2 });
    return element;
  }
}
