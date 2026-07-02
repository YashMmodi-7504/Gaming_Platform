import globals from 'globals';

import { config as baseConfig } from './base.mjs';

/**
 * ESLint flat config for the NestJS backend (Node.js environment).
 *
 * @type {import('eslint').Linter.Config[]}
 */
export const nestJsConfig = [
  ...baseConfig,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      parserOptions: {
        sourceType: 'module',
      },
    },
    rules: {
      // NestJS relies heavily on decorators and DI metadata.
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      // `emitDecoratorMetadata` requires runtime imports for types used as
      // DTO/param types, so `import type` is unsafe to enforce here.
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
];

export default nestJsConfig;
