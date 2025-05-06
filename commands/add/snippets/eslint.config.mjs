import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import {defineConfig} from 'eslint/config';
import globals from 'globals';

export default defineConfig([
	js.configs.recommended,
	eslintPluginUnicorn.configs.recommended,
	eslintConfigPrettier,
	{
		languageOptions: {
			globals: {...globals.node},

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
