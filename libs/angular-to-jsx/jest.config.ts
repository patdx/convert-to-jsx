/* eslint-disable */
export default {
  displayName: 'angular-to-jsx',
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {},
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/libs/angular-to-jsx/tsconfig.spec.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  rootDir: '../..',
  roots: ['<rootDir>/libs/angular-to-jsx/src'],
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
};
