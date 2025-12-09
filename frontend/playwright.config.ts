/**
 * Playwright Configuration for E2E Tests
 *
 * Configured for mobile-first testing with multiple device profiles
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Output directory for test artifacts (videos, screenshots, traces)
  outputDir: './public/test-videos',

  // Global setup - cleanup old videos before tests run
  globalSetup: './tests/cleanup-old-videos.ts',

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry failed tests once on CI to handle transient failures
  retries: process.env.CI ? 1 : 0,

  // Number of parallel workers
  // CI: 4 workers for faster execution
  // Local: Use 50% of available cores
  workers: process.env.CI ? 4 : undefined,

  // Reporter to use
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    // Add JSON reporter for CI analysis
    ['json', { outputFile: 'test-results/results.json' }],
    // Add GitHub Actions reporter when running in CI
    ...(process.env.CI ? [['github'] as ['github']] : [])
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
    // Firefox - Desktop browser testing
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
    },

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
  ],

  // Run local dev servers (backend and frontend) before starting the tests
  // webServer: [
  //   {
  //     command: 'cd ../backend && npm run start:prod',
  //     url: 'http://localhost:3001',
  //     reuseExistingServer: !process.env.CI,
  //     timeout: 300 * 1000, // 5 minutes
  //     stdout: 'pipe',
  //     stderr: 'pipe'
  //   },
  //   {
  //     command: 'VITE_URL=http://localhost:5173 npm run dev',
  //     url: 'http://localhost:5173',
  //     reuseExistingServer: !process.env.CI,
  //     timeout: 300 * 1000, // 5 minutes
  //     stdout: 'pipe',
  //     stderr: 'pipe'
  //   }
  // ],

  // Test timeout
  timeout: 30 * 1000, // 30 seconds

  // Expect timeout
  expect: {
    timeout: 5 * 1000 // 5 seconds
  },

  // Max failures - stop after 5 failures to save CI time
  maxFailures: process.env.CI ? 5 : undefined,
});
