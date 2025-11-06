import globals from 'globals';
import eslintTypescript from 'typescript-eslint';
import pluginPrettier from 'eslint-plugin-prettier/recommended';
import pluginNoRelativeImportPaths from 'eslint-plugin-no-relative-import-paths';
import promise from 'eslint-plugin-promise';
import importPlugin from 'eslint-plugin-import';

export default [
  {
    ignores: ['dist', 'lib', 'coverage', 'node_modules', 'static', '.github', '.idea', '.venv'],
  },
  ...eslintTypescript.configs.recommended,
  {
    files: ['**/*.{ts,mjs}'],
    languageOptions: {
      parser: eslintTypescript.parser,
      sourceType: 'module',
      ecmaVersion: 'latest',
      globals: globals.node,
    },
    plugins: {
      'no-relative-import-paths': pluginNoRelativeImportPaths,
      promise,
      'import': importPlugin,
    },
    rules: {
      '@typescript-eslint/no-empty-object-type': ['error', { allowInterfaces: 'with-single-extends' }],
      '@typescript-eslint/no-unused-vars': ['error', { args: 'after-used', ignoreRestSiblings: true }],
      'no-console': ['warn', { allow: ['info', 'warn', 'error'] }],
      'promise/prefer-await-to-then': 'error',
      'func-style': ['error', 'declaration', { allowArrowFunctions: false }],
      'prefer-arrow-callback': 'off',
    },
  },
  pluginPrettier,
];
