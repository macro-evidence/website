import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import astro from 'eslint-plugin-astro';
import globals from 'globals';

export default [
  {
    ignores: ['node_modules/**', 'dist/**', '.astro/**', '.wrangler/**'],
  },

  {
    ...js.configs.recommended,
    files: ['**/*.{js,mjs,astro}'],
  },

  {
    files: ['scripts/**/*.mjs', '*.mjs'],
    languageOptions: {
      globals: globals.nodeBuiltin,
    },
  },

  {
    files: ['public/**/*.js'],
    languageOptions: {
      globals: globals.browser,
    },
  },

  ...astro.configs.recommended,

  {
    files: ['**/*.astro'],
    languageOptions: {
      parserOptions: {
        parser: tsParser,
      },
    },
    rules: {
      'astro/no-set-html-directive': 'error',
      'astro/no-unsafe-inline-scripts': 'error',
    },
  },
];
