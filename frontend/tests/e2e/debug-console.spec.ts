/**
 * Debug test to check console errors
 */

import { test } from '@playwright/test';

test('check console errors on page load', async ({ page }) => {
  const consoleMessages: string[] = [];
  const errors: string[] = [];

  // Capture console messages
  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    consoleMessages.push(text);
    console.log(text);
  });

  // Capture page errors
  page.on('pageerror', error => {
    const text = `PAGE ERROR: ${error.message}\n${error.stack}`;
    errors.push(text);
    console.error(text);
  });

  // Navigate to page
  await page.goto('/');

  // Wait a bit for any async errors
  await page.waitForTimeout(3000);

  // Click create game
  try {
    const createButton = page.locator('button:has-text("Create Game")');
    if (await createButton.isVisible({ timeout: 2000 })) {
      console.log('Create button is visible');
      await createButton.click();
    } else {
      console.log('Create button is NOT visible');

      // Log what's actually on the page
      const html = await page.content();
      console.log('Page HTML length:', html.length);
      console.log('Page title:', await page.title());

      // Check for any visible text
      const bodyText = await page.locator('body').textContent();
      console.log('Body text:', bodyText?.substring(0, 200));
    }
  } catch (e) {
    console.error('Error clicking create button:', e);
  }

  // Wait for more async operations
  await page.waitForTimeout(2000);

  // Print summary
  console.log('\n=== CONSOLE MESSAGES ===');
  consoleMessages.forEach(msg => console.log(msg));

  console.log('\n=== ERRORS ===');
  if (errors.length === 0) {
    console.log('No page errors detected');
  } else {
    errors.forEach(err => console.error(err));
  }
});
