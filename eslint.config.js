import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'server', // backend has its own test tooling; linted separately if ever needed
    'hermes', // vendored report-generation tool (own sources + dist), not app code
    'reports', // generated report output
    'test-results', // Playwright output
    'playwright-report',
  ]),
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Node-context files that legitimately use process/module globals.
    files: ['vite.config.js', 'proxy-server.cjs', 'scripts/**/*.mjs', 'e2e/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    // Generated OpenAPI types — excluded from linting entirely:
    // machine-produced code (structural `{}`, bare `any`, inline disables)
    // that is regenerated from the backend spec, never hand-edited.
    files: ['src/types/api-generated.d.ts'],
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
      'report-unused-disable-directives': 'off',
    },
  },
  {
    // shadcn/ui primitives co-locate cva variant exports with the component
    // (upstream shadcn convention, e.g. `export { Badge, badgeVariants }`).
    // react-refresh/only-export-components flags these, but they are constants,
    // not components — a known false positive. Scoped to ui primitives only.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
