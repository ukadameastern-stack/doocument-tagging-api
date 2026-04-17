import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.pbt.test.ts', '**/*.e2e.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/server.ts'],
  coverageThreshold: { global: { lines: 80 } },
  setupFilesAfterFramework: [],
  testTimeout: 30000,
};

export default config;
