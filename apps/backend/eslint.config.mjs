import { nestJsConfig } from '@gaming-platform/config/eslint/nest';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...nestJsConfig,
  {
    ignores: ['dist/**', 'test/**', 'jest.config.js'],
  },
];
