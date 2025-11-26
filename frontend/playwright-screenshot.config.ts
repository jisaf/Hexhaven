
import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

export default defineConfig({
  ...baseConfig,
  webServer: undefined, // Don't start the webserver automatically
  testDir: './', // Look for tests in the root of the frontend folder
  testMatch: /screenshot\.spec\.ts/, // Only run the screenshot test
});
