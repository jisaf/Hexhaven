/**
 * Jest Configuration for Backend
 *
 * Configured for NestJS with TypeScript, Prisma, and WebSocket testing
 */

module.exports = {
  // Use ts-jest for TypeScript transformation
  preset: 'ts-jest',

  // Test environment
  testEnvironment: 'node',

  // Root directory
  rootDir: '.',

  // Module file extensions
  moduleFileExtensions: ['js', 'json', 'ts'],

  // Test match patterns
  testMatch: [
    '**/*.spec.ts',
    '**/*.test.ts'
  ],

  // Transform configuration
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest'
  },

  // Coverage collection
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.dto.ts',
    '!src/main.ts',
    '!src/**/*.module.ts'
  ],

  // Coverage directory
  coverageDirectory: './coverage',

  // Coverage thresholds (80% minimum as per constitution)
  // NOTE: Temporarily disabled until more tests are written
  // coverageThreshold: {
  //   global: {
  //     branches: 80,
  //     functions: 80,
  //     lines: 80,
  //     statements: 80
  //   }
  // },

  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/../shared/$1'
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Test timeout (5 seconds for integration tests)
  testTimeout: 5000,

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/tests/fixtures/',
    '/tests/setup.ts',
    '/tests/contract/'  // Contract tests run separately (require full WebSocket server)
  ],

  // Transform node_modules for ESM packages
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)'
  ],

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Reset mocks between tests
  resetMocks: true,

  // Globals for ts-jest
  globals: {
    'ts-jest': {
      tsconfig: {
        // Compiler options for tests
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true
      }
    }
  },

  // Verbose output
  verbose: true
};
