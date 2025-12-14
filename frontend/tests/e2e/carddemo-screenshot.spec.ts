import { test } from '@playwright/test';

test('screenshot carddemo pixel6', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2.625
  });
  const page = await context.newPage();
  await page.goto('http://dev.hexhaven.net/carddemo');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/carddemo-pixel6.png', fullPage: true });
  console.log('Screenshot saved to /tmp/carddemo-pixel6.png');
});
