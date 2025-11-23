import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import {defineConfig} from 'eslint/config';
import globals from 'globals';

export default defineConfig([
	{
		ignores: ['dist/**'],
	},
	js.configs.recommended,
	eslintPluginUnicorn.configs.recommended,
	eslintConfigPrettier,

	{
		files: ['**/*.ts', '**/*.tsx'],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaVersion: 2025,
				sourceType: 'module',
			},
			globals: {
				...globals.node,
			},
		},
		plugins: {
			'@typescript-eslint': tseslint,
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
	{
		files: ['**/*.js', '**/*.mjs'],
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
