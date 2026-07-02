import { nextJsConfig } from '@gaming-platform/config/eslint/next';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...nextJsConfig,
  {
    // Node-context config files at the app root.
    files: ['*.{js,mjs,ts}', '*.config.{js,mjs,ts}'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    ignores: ['.next/**', 'next-env.d.ts'],
  },
];
