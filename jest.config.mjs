export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    // Support ESM-style TS imports without .js
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Mock Obsidian API
    '^obsidian$': '<rootDir>/tests/__mocks__/obsidian.ts',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
};
