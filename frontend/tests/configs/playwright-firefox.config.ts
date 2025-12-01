/**
 * Playwright Configuration for Comprehensive Firefox Testing
 *
 * This config assumes dev servers are already running
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './public/test-videos',
  globalSetup: require.resolve('../cleanup-old-videos.ts'),
  fullyParallel: false,  // Run tests sequentially for comprehensive test
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html']],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
  },

  projects: [
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        headless: true,  // Run in headless mode
      },
    },
  ],

  // No webServer - assumes servers are already running
  timeout: 180 * 1000,  // 180 seconds (3 minutes) per test
  expect: {
    timeout: 10 * 1000  // 10 seconds for assertions
  },
});
