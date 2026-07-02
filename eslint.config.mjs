import { config as baseConfig } from '@gaming-platform/config/eslint/base';

/**
 * Root ESLint flat config. Each app/package provides its own
 * `eslint.config.mjs` extending the shared configs from
 * `@gaming-platform/config`. This root config only governs
 * loose files at the repository root.
 *
 * @type {import('eslint').Linter.Config[]}
 */
export default [
  ...baseConfig,
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/build/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/generated/**',
    ],
  },
];
