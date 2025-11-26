import { test, expect } from '@playwright/test';

test('Take screenshot of homepage', async ({ page }) => {
  await page.goto('http://localhost:5173/');

  // Wait for the main lobby content to be visible
  await expect(page.getByTestId('create-room-button')).toBeVisible({ timeout: 20000 });

  // Optional: wait for network idle to ensure all images/styles are loaded
  await page.waitForLoadState('networkidle');

  await page.screenshot({ path: 'homepage-screenshot.png' });
});
