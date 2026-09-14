// Mirrors canvas-editor's own eslint.config.js (1.0.3) — same presets and the
// same rule exemptions — so lint policy stays diffable against upstream just
// like the ported source does. Local additions are marked below.
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'index.html',
      // Local: build output and consumer-facing reference snippets. The
      // examples intentionally use other module systems (CommonJS
      // next.config.js, framework imports) and the smoke scripts are run by
      // hand, so neither is linted against the lib's TS config.
      'demo-dist/**',
      'examples/**',
      'scripts/smoke/**'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        process: 'readonly'
      }
    },
    rules: {
      'linebreak-style': 'off',
      'no-console': 'off',
      'no-debugger': 'off',
      'no-useless-escape': 'off',
      'no-useless-assignment': 'off',
      'preserve-caught-error': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      // Local: parameters kept for signature parity with upstream but unused
      // here are prefixed with _ (see TablePaging.truncateTableByFragment).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      'no-constant-condition': ['error', { checkLoops: false }],
      semi: ['warn', 'never'],
      quotes: [
        'warn',
        'single',
        { avoidEscape: true, allowTemplateLiterals: true }
      ]
    }
  },
  {
    files: ['tests/**/*.ts', 'vitest.config.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-expressions': 'off'
    }
  }
)
