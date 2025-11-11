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
  // Running on Pixel 6 only - mobile-first game with touch interactions
  // TODO: Add more mobile devices for cross-device testing once features are implemented
  projects: [
    // Pixel 6 - Primary mobile testing device
    {
      name: 'Pixel 6',
      use: {
        ...devices['Pixel 5'], // Use Pixel 5 as base (Pixel 6 not in default devices)
        viewport: { width: 412, height: 915 }, // Pixel 6 dimensions
        hasTouch: true,
        isMobile: true,
      },
    },

    // Disabled for now - uncomment when features are ready for cross-device testing
    /*
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

    // Desktop Chrome (for comparison)
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    */
  ],

  // Run local dev servers (backend and frontend) before starting the tests
  webServer: [
    {
      command: 'cd ../backend && npm run start:prod',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000, // 2 minutes
      stdout: 'pipe',
      stderr: 'pipe'
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000, // 2 minutes
      stdout: 'pipe',
      stderr: 'pipe'
    }
  ],

  // Test timeout - reduced for faster failures during development
  timeout: 10 * 1000, // 10 seconds (reduced from 30s)

  // Expect timeout - reduced for faster failures
  expect: {
    timeout: 3 * 1000 // 3 seconds (reduced from 5s)
  },

  // Max failures - stop after 5 failures to save CI time
  maxFailures: process.env.CI ? 5 : undefined,
});
