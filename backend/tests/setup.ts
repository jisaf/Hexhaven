/**
 * Jest Setup File for Backend Tests
 *
 * Runs before all tests to configure the test environment
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://hexhaven:hexhaven@127.0.0.1:5432/hexhaven_test?schema=public';
process.env.PORT = '3001';
process.env.JWT_SECRET = 'test_secret_for_testing_only';

// Increase test timeout for integration tests
jest.setTimeout(10000);

// Global test utilities
global.console = {
  ...console,
  // Suppress console output during tests (comment out for debugging)
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Clean up after all tests
afterAll(async () => {
  // Close any open connections
  await new Promise((resolve) => setTimeout(resolve, 500));
});
