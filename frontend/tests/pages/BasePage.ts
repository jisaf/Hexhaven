/**
 * BasePage Class - Foundation for Page Object Model
 *
 * Provides shared methods for all page objects including:
 * - Smart wait strategies (no hard-coded timeouts)
 * - Retry logic for flaky elements
 * - Screenshot helpers
 * - Network idle waits
 * - Safe element interaction
 *
 * Part of Phase 1.3 - E2E Test Suite Refactoring
 */

import { Page, Locator, expect } from '@playwright/test';

export abstract class BasePage {
  constructor(protected page: Page) {}

  /**
   * Navigate to a URL
   */
  async goto(path: string): Promise<void> {
    await this.page.goto(path);
    await this.waitForNetworkIdle();
  }

  /**
   * Wait for element to be visible with smart timeout
   * Uses Playwright's built-in auto-wait, no arbitrary timeouts
   */
  async waitForElement(
    selector: string,
    options?: { timeout?: number; state?: 'attached' | 'detached' | 'visible' | 'hidden' }
  ): Promise<Locator> {
    const element = this.page.locator(selector);
    await element.waitFor({
      state: options?.state || 'visible',
      timeout: options?.timeout || 10000
    });
    return element;
  }

  /**
   * Click with retry logic for flaky elements
   * Automatically retries if element is not clickable
   */
  async clickWithRetry(
    selector: string,
    options?: { maxAttempts?: number; delay?: number }
  ): Promise<void> {
    const maxAttempts = options?.maxAttempts || 3;
    const delay = options?.delay || 1000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const element = this.page.locator(selector);

        // Wait for element to be visible and enabled
        await element.waitFor({ state: 'visible', timeout: 5000 });

        // Verify element is enabled (not disabled)
        const isDisabled = await element.isDisabled();
        if (isDisabled) {
          throw new Error(`Element is disabled: ${selector}`);
        }

        // Perform click
        await element.click({ timeout: 5000 });

        // Success!
        return;
      } catch (error) {
        if (attempt === maxAttempts) {
          throw new Error(
            `Failed to click element after ${maxAttempts} attempts: ${selector}. ` +
            `Error: ${error instanceof Error ? error.message : String(error)}`
          );
        }

        // Log retry attempt
        console.log(`[BasePage] Click failed (attempt ${attempt}/${maxAttempts}), retrying...`);

        // Wait before retry
        await this.page.waitForTimeout(delay);
      }
    }
  }

  /**
   * Fill input with validation
   * Verifies value was actually set (catches async update issues)
   */
  async fillInput(
    selector: string,
    value: string,
    options?: { clearFirst?: boolean }
  ): Promise<void> {
    const input = await this.waitForElement(selector);

    // Clear existing value if requested
    if (options?.clearFirst) {
      await input.clear();
    }

    // Fill the input
    await input.fill(value);

    // Verify value was set correctly
    const filledValue = await input.inputValue();
    if (filledValue !== value) {
      throw new Error(
        `Failed to fill input. Expected: "${value}", Got: "${filledValue}". Selector: ${selector}`
      );
    }
  }

  /**
   * Take screenshot with automatic naming
   */
  async screenshot(name: string, options?: { fullPage?: boolean }): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}-${name}.png`;

    await this.page.screenshot({
      path: `public/test-videos/${filename}`,
      fullPage: options?.fullPage || false
    });

    console.log(`[BasePage] Screenshot saved: ${filename}`);
  }

  /**
   * Wait for network to be idle
   * More reliable than arbitrary timeouts
   */
  async waitForNetworkIdle(options?: { timeout?: number }): Promise<void> {
    await this.page.waitForLoadState('networkidle', {
      timeout: options?.timeout || 30000
    });
  }

  /**
   * Wait for WebSocket connection to be established
   * Useful for testing real-time features
   */
  async waitForWebSocketConnection(timeout: number = 10000): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const ws = (window as any).socket;
        return ws && ws.connected === true;
      },
      { timeout }
    );
  }

  /**
   * Get text content safely (handles null/undefined)
   */
  async getTextContent(selector: string): Promise<string> {
    const element = await this.waitForElement(selector);
    const text = await element.textContent();
    return text?.trim() || '';
  }

  /**
   * Get text content of all matching elements
   */
  async getAllTextContent(selector: string): Promise<string[]> {
    const elements = await this.page.locator(selector).all();
    const texts: string[] = [];

    for (const element of elements) {
      const text = await element.textContent();
      if (text) {
        texts.push(text.trim());
      }
    }

    return texts;
  }

  /**
   * Wait for element count to match expected value
   * Useful for waiting for lists to populate
   */
  async waitForElementCount(
    selector: string,
    expectedCount: number,
    timeout: number = 10000
  ): Promise<void> {
    await this.page.waitForFunction(
      ({ sel, count }) => {
        const elements = document.querySelectorAll(sel);
        return elements.length === count;
      },
      { selector, expectedCount },
      { timeout }
    );
  }

  /**
   * Check if element exists (without waiting)
   * Useful for conditional logic in tests
   */
  async elementExists(selector: string): Promise<boolean> {
    try {
      const count = await this.page.locator(selector).count();
      return count > 0;
    } catch {
      return false;
    }
  }

  /**
   * Check if element is visible (without waiting)
   */
  async isVisible(selector: string): Promise<boolean> {
    try {
      return await this.page.locator(selector).isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Wait for element to disappear
   * Useful for waiting for loading spinners to hide
   */
  async waitForElementToDisappear(
    selector: string,
    timeout: number = 10000
  ): Promise<void> {
    await this.page.locator(selector).waitFor({
      state: 'hidden',
      timeout
    });
  }

  /**
   * Scroll element into view
   * Useful for long pages or modals
   */
  async scrollIntoView(selector: string): Promise<void> {
    const element = await this.waitForElement(selector);
    await element.scrollIntoViewIfNeeded();
  }

  /**
   * Press keyboard key
   */
  async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  /**
   * Wait for specific time (use sparingly!)
   * Prefer smart waits over arbitrary delays
   */
  async waitFor(milliseconds: number): Promise<void> {
    console.warn(
      `[BasePage] Using arbitrary wait (${milliseconds}ms). ` +
      'Consider using smart waits instead (waitForElement, waitForNetworkIdle, etc.)'
    );
    await this.page.waitForTimeout(milliseconds);
  }

  /**
   * Reload page and wait for load
   */
  async reload(): Promise<void> {
    await this.page.reload();
    await this.waitForNetworkIdle();
  }

  /**
   * Get current URL
   */
  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  /**
   * Verify page URL matches expected pattern
   */
  async verifyUrl(urlPattern: string | RegExp): Promise<void> {
    const currentUrl = await this.getCurrentUrl();

    if (typeof urlPattern === 'string') {
      expect(currentUrl).toContain(urlPattern);
    } else {
      expect(currentUrl).toMatch(urlPattern);
    }
  }

  /**
   * Wait for navigation to complete
   */
  async waitForNavigation(options?: { url?: string | RegExp; timeout?: number }): Promise<void> {
    await this.page.waitForURL(options?.url || '**', {
      timeout: options?.timeout || 30000
    });
  }

  /**
   * Get attribute value from element
   */
  async getAttribute(selector: string, attributeName: string): Promise<string | null> {
    const element = await this.waitForElement(selector);
    return await element.getAttribute(attributeName);
  }

  /**
   * Get element count
   */
  async getElementCount(selector: string): Promise<number> {
    return await this.page.locator(selector).count();
  }

  /**
   * Click element by text content
   * Less preferred than test IDs, but useful for dynamic content
   */
  async clickByText(text: string, options?: { exact?: boolean }): Promise<void> {
    const element = this.page.getByText(text, { exact: options?.exact || false });
    await element.click();
  }

  /**
   * Wait for function condition to be true
   * Generic waiting mechanism for custom conditions
   */
  async waitForCondition(
    condition: () => boolean | Promise<boolean>,
    options?: { timeout?: number; message?: string }
  ): Promise<void> {
    const timeout = options?.timeout || 10000;
    const message = options?.message || 'Condition not met within timeout';

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await this.page.waitForTimeout(100); // Poll every 100ms
    }

    throw new Error(message);
  }

  /**
   * Execute JavaScript in page context
   * Useful for accessing window objects or game state
   */
  async evaluate<T>(fn: () => T | Promise<T>): Promise<T> {
    return await this.page.evaluate(fn);
  }

  /**
   * Check if selector matches expected count
   * Useful for assertions
   */
  async expectElementCount(selector: string, expectedCount: number): Promise<void> {
    const actualCount = await this.getElementCount(selector);
    expect(actualCount).toBe(expectedCount);
  }

  /**
   * Check if element has class
   */
  async hasClass(selector: string, className: string): Promise<boolean> {
    const element = await this.waitForElement(selector);
    const classAttr = await element.getAttribute('class');
    return classAttr?.includes(className) || false;
  }
}
