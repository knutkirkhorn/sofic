import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {fixupConfigRules} from '@eslint/compat';
import {FlatCompat} from '@eslint/eslintrc';
import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import {defineConfig} from 'eslint/config';
import globals from 'globals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended,
	allConfig: js.configs.all,
});

export default defineConfig([
	js.configs.recommended,
	eslintPluginUnicorn.configs.recommended,
	eslintConfigPrettier,

	{
		extends: fixupConfigRules(compat.extends('plugin:ava/recommended')),

		languageOptions: {
			globals: {
				...globals.node,
			},

			ecmaVersion: 2025,
			sourceType: 'module',
		},

		rules: {
			// Disable rules
			'no-console': 'off',
			'no-plusplus': 'off',
			'no-await-in-loop': 'off',
			'no-restricted-syntax': 'off',

			// Enable rules
			'no-param-reassign': 'error',
			'consistent-return': 'error',
			'no-else-return': 'error',
			'no-var': 'error',
			'prefer-const': 'error',
		},
	},
]);
