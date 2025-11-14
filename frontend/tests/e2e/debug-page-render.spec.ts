import { test, expect } from '@playwright/test';

test('debug page rendering', async ({ page }) => {
  console.log('Navigating to /', new Date().toISOString());
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  console.log('Page title:', await page.title());
  console.log('Page URL:', page.url());

  // Wait a bit for any async rendering
  await page.waitForTimeout(3000);

  // Get all h1 elements
  const h1s = await page.locator('h1').all();
  console.log('Number of h1 elements:', h1s.length);
  for (let i = 0; i < h1s.length; i++) {
    const text = await h1s[i].textContent();
    const isVisible = await h1s[i].isVisible();
    console.log(`h1[${i}] text: "${text}", visible: ${isVisible}`);
  }

  // Get all buttons
  const buttons = await page.locator('button').all();
  console.log('Number of buttons:', buttons.length);
  for (let i = 0; i < Math.min(buttons.length, 10); i++) {
    const text = await buttons[i].textContent();
    const isVisible = await buttons[i].isVisible();
    console.log(`button[${i}] text: "${text}", visible: ${isVisible}`);
  }

  // Check for root element
  const root = await page.locator('#root');
  const rootVisible = await root.isVisible();
  const rootHtml = await root.innerHTML();
  console.log('Root element visible:', rootVisible);
  console.log('Root HTML length:', rootHtml.length);
  console.log('First 500 chars of root HTML:', rootHtml.substring(0, 500));

  // Take screenshot
  await page.screenshot({ path: '/tmp/debug-screenshot.png' });
  console.log('Screenshot saved to /tmp/debug-screenshot.png');

  // Just pass the test
  expect(true).toBe(true);
});
