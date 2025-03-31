/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

import type { Config } from 'jest'
import nextJest from 'next/jest.js'
 
const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: '../client',
})

const config: Config = {
  clearMocks: true,
  testPathIgnorePatterns: ["<rootDir>/test/e2e-tests"],

  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!<rootDir>/out/**',
    '!<rootDir>/.next/**',
    '!<rootDir>/test/e2e-tests/**',
    '!<rootDir>/*.config.js',
  ],
  coverageDirectory: "coverage",
  coverageProvider: "v8",

  testEnvironment: "jsdom",
  moduleNameMapper: {
    '^@/src/(.*)$': '<rootDir>/src/$1',
  },
};

export default createJestConfig(config)
