/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Process TypeScript files
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  // Resolve ESM modules
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  // Setup test files
  testMatch: ['**/tests/**/*.test.ts'],
  // Test timeout
  testTimeout: 10000,
  // Verbose output
  verbose: true,
  // Test environment
  testEnvironment: 'jest-environment-node'
};