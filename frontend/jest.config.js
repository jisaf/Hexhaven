/**
 * Jest Configuration for Frontend
 *
 * Configured for React with TypeScript, PixiJS, and React Testing Library
 */

export default {
  // Use jsdom for browser-like environment
  testEnvironment: 'jsdom',

  // Root directory
  rootDir: '.',

  // Module file extensions
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],

  // Test match patterns (exclude e2e tests - those are for Playwright)
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
    '**/tests/unit/**/*.[jt]s?(x)',
    '**/tests/integration/**/*.[jt]s?(x)'
  ],

  // Transform configuration
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
  },

  // Module name mapper for path aliases and assets
  moduleNameMapper: {
    // Path aliases
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/../shared/$1',

    // Style files
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',

    // Asset files
    '\\.(jpg|jpeg|png|gif|svg|webp|avif)$': '<rootDir>/tests/__mocks__/fileMock.js',

    // PixiJS mocking (for unit tests that don't need full PixiJS)
    '^pixi\\.js$': '<rootDir>/tests/__mocks__/pixiMock.ts'
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Coverage collection
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/main.tsx',
    '!src/vite-env.d.ts'
  ],

  // Coverage directory
  coverageDirectory: './coverage',

  // Coverage thresholds (80% minimum as per constitution)
  coverageThreshold: {
    global: {
      branches: 70,  // Slightly lower for UI components
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Test timeout
  testTimeout: 5000,

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
    '/tests/__mocks__/',
    '/tests/setup.ts',
    '/tests/e2e/'  // E2E tests run via Playwright, not Jest
  ],

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Reset mocks between tests
  resetMocks: true,

  // Verbose output
  verbose: true
};
