// @ts-check

import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    // Consumer-facing reference snippets and manual smoke scripts — not part
    // of the library build. They intentionally use other module systems
    // (CommonJS next.config.js, framework imports) and shouldn't be linted
    // against the lib's TS config.
    ignores: ['examples/**', 'scripts/smoke/**', 'dist/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
  },
  {
    files: ['**/*.js'],
    ...tseslint.configs.disableTypeChecked,
  },
)