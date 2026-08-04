/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const {FlatCompat} = require('@eslint/eslintrc');
const js = require('@eslint/js');
const globals = require('globals');
const tseslint = require('@typescript-eslint/eslint-plugin');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

// `valid-jsdoc` and `require-jsdoc` were removed from ESLint core in v9 but
// are still referenced by the unmaintained `eslint-config-google` package.
const google = compat.extends('google').map((config) => {
  if (!config.rules) {
    return config;
  }
  const rules = {...config.rules};
  delete rules['valid-jsdoc'];
  delete rules['require-jsdoc'];
  return {...config, rules};
});

// Scope every part of the recommended TS config to `.ts` files so it doesn't
// leak onto the plain JS config files in this repo.
const typescript = tseslint.configs['flat/recommended'].map(
    (config) => ({...config, files: config.files ?? ['**/*.ts']}));

module.exports = [
  js.configs.recommended,
  ...google,
  ...typescript,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['*.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
];
