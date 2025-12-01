/**
 * Simple Playwright Configuration for testing running servers
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './public/test-videos',
  fullyParallel: false,
  retries: 0,
  workers: 1,

  reporter: [['list']],

  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'on',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  timeout: 30 * 1000,
  expect: {
    timeout: 10 * 1000
  },
});
