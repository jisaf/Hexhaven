/**
 * Playwright Configuration for E2E Tests
 *
 * Configured for mobile-first testing with multiple device profiles
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // No retries - fail fast
  retries: 0,

  // Number of parallel workers
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ['html'],
    ['list'],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],

  // Shared settings for all projects
  use: {
    // Base URL for tests
    baseURL: process.env.VITE_URL || 'http://localhost:5173',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on first retry
    video: 'retain-on-failure'
  },

  // Configure projects for major browsers and devices (US3 - T143)
  projects: [
    // iPhone SE - Mobile portrait (minimum supported width: 375px)
    {
      name: 'iPhone SE',
      use: {
        ...devices['iPhone SE'],
        viewport: { width: 375, height: 667 },
      },
    },

    // iPad - Tablet viewport
    {
      name: 'iPad',
      use: {
        ...devices['iPad (gen 7)'],
        viewport: { width: 768, height: 1024 },
      },
    },

    // Pixel 5 - Android mobile
    {
      name: 'Pixel 5',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 393, height: 851 },
      },
    },

    // Desktop Chrome (for comparison)
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],

  // Run local dev server before starting the tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000 // 2 minutes
  },

  // Test timeout
  timeout: 30 * 1000, // 30 seconds

  // Expect timeout
  expect: {
    timeout: 5 * 1000 // 5 seconds
  }
});
