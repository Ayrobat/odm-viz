// NOTE: This uses ES Module 'import' syntax, the modern standard for flat config.

import { defineConfig } from 'eslint/config';
import globals from 'globals';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import reactThreeFiber from '@react-three/eslint-plugin';
import { includeIgnoreFile } from '@eslint/compat';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolving paths
const gitignorePath = path.resolve(__dirname, '.gitignore');

// Base configuration for JavaScript and TypeScript
const baseConfig = tseslint.config(js.configs.recommended, ...tseslint.configs.recommended, {
  files: ['**/*.{ts,tsx,js,jsx}'],
  ignores: [
    '**/dist/**',
    '**/node_modules/**',
    '**/.turbo/**',
    '**/build/**',
    '**/coverage/**',
    '**/*.config.js',
    '**/*.config.mjs',
    '**/*.config.ts',
  ],
  languageOptions: {
    globals: {
      ...globals.browser,
      ...globals.node,
      ...globals.es2021,
      // Explicitly define Node.js globals
      process: 'readonly',
      __filename: 'readonly',
      __dirname: 'readonly',
      module: 'readonly',
      require: 'readonly',
    },
    parserOptions: {
      project: true,
      tsconfigRootDir: __dirname,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
  rules: {
    // Add global rules here
    'no-undef': 'error',
  },
});

// Configuration for React and related plugins
const reactConfig = {
  files: ['**/*.{js,jsx,ts,tsx}'],
  ignores: [
    '**/dist/**',
    '**/node_modules/**',
    '**/.turbo/**',
    '**/build/**',
    '**/coverage/**',
    '**/*.config.{js,mjs,cjs,ts}',
  ],
  plugins: {
    react: reactPlugin,
    'react-hooks': reactHooks,
    '@react-three': reactThreeFiber,
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    ...reactPlugin.configs.recommended.rules,
    ...reactPlugin.configs['jsx-runtime'].rules,
    ...reactHooks.configs.recommended.rules,
    ...reactThreeFiber.configs.recommended.rules,

    // React Three Fiber specific attributes
    'react/no-unknown-property': [
      'error',
      {
        ignore: [
          'intensity',
          'position',
          'geometry',
          'sizeAttenuation',
          'vertexColors',
          'transparent',
          'alphaTest',
          'depthWrite',
          'blending',
          'attach',
          'args',
          'material',
          'castShadow',
          'receiveShadow',
          'fog',
          'onUpdate',
          'onPointerMissed',
          'raycast',
          'visible',
          'renderOrder',
          'matrixAutoUpdate',
          'quaternion',
          'layers',
          'dispose',
          'type',
          'attachArray',
          'attachObject',
          'attachMatrix',
          'attachMatrix3',
          'attachMatrix4',
          'attachMatrix4x4',
          'attachMatrix3x3',
          'attachMatrix2x2',
          'attachMatrix3x2',
          'attachMatrix2x3',
          'attachMatrix3x4',
          'attachMatrix4x3',
          'attachMatrix2x4',
          'attachMatrix4x2',
          'attachMatrix2',
          'attachMatrix3',
          'attachMatrix4',
          'attachMatrix2x2',
          'attachMatrix3x2',
          'attachMatrix2x3',
          'attachMatrix3x3',
          'attachMatrix4x3',
          'attachMatrix2x4',
          'attachMatrix3x4',
          'attachMatrix4x4',
          'attachMatrix2x2',
          'attachMatrix3x2',
          'attachMatrix2x3',
          'attachMatrix3x3',
          'attachMatrix4x3',
          'attachMatrix2x4',
          'attachMatrix3x4',
          'attachMatrix4x4',
        ],
      },
    ],

    // Custom Overrides
    'react/react-in-jsx-scope': 'off',
    'react/jsx-uses-react': 'off',
    'react/display-name': 'off',
    'react-hooks/exhaustive-deps': 'warn',

    // TypeScript Overrides
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/ban-ts-comment': ['error', { 'ts-expect-error': 'allow-with-description' }],
  },
};

export default defineConfig([
  includeIgnoreFile(gitignorePath),
  ...baseConfig,
  reactConfig,
  {
    ...prettierRecommended,
    files: ['**/*.{ts,tsx,js,jsx}'],
    rules: {
      ...prettierRecommended.rules,
      'prettier/prettier': [
        'error',
        {
          printWidth: 100,
          tabWidth: 2,
          useTabs: false,
          semi: true,
          singleQuote: true,
          trailingComma: 'es5',
          bracketSpacing: true,
          bracketSameLine: false,
          arrowParens: 'always',
        },
      ],
    },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
  },
]);
