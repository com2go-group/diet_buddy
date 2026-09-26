const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  expoConfig,
  prettierRecommended,
  {
    ignores: [
      'prototype/*',
      'dist/*',
      '.expo/*',
      'coverage/*',
      'supabase/functions/*',
      'src/lib/supabase/database.types.ts',
    ],
  },
  {
    // Maestro runs these with its own globals (docs/testing.md).
    files: ['.maestro/scripts/*.js'],
    languageOptions: {
      globals: {
        output: 'writable',
        http: 'readonly',
        json: 'readonly',
        EMAIL: 'readonly',
        MAILBOX_URL: 'readonly',
        PASSWORD: 'readonly',
        SUPABASE_URL: 'readonly',
        SUPABASE_ANON_KEY: 'readonly',
      },
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
]);
