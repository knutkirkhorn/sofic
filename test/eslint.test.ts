import {expect, test} from 'bun:test';
import {checkEslintConfig} from '../checkers/javascript.js';
import {readImportsFromConfig} from '../commands/add/eslint.js';
import {withMockedFilesystem} from './helpers.js';

test('has not installed eslint, returns error', async () => {
	await withMockedFilesystem(
		{
			'package.json': JSON.stringify({}),
		},
		async () => {
			const eslintConfigErrors = await checkEslintConfig('.');
			expect(eslintConfigErrors).toEqual([
				'package.json: missing `eslint` in `devDependencies`',
			]);
		},
	);
});

test('has ava installed, but not plugins, throws error', async () => {
	await withMockedFilesystem(
		{
			'package.json': JSON.stringify({
				devDependencies: {
					ava: 'latest',
					eslint: 'latest',
				},
			}),
		},
		async () => {
			const eslintConfigErrors = await checkEslintConfig('.');
			expect(eslintConfigErrors).toEqual([
				'package.json: missing `eslint-plugin-ava` in `devDependencies`',
				'package.json: missing `eslint-plugin-unicorn` in `devDependencies`',
			]);
		},
	);
});

test('has installed eslint and plugins, does not throw errors', async () => {
	await withMockedFilesystem(
		{
			'package.json': JSON.stringify({
				devDependencies: {
					ava: 'latest',
					eslint: 'latest',
					'eslint-plugin-ava': 'latest',
					'eslint-plugin-unicorn': 'latest',
				},
			}),
		},
		async () => {
			const eslintConfigErrors = await checkEslintConfig('.');
			expect(eslintConfigErrors).toEqual([]);
		},
	);
});

test('parse imports from config file', async () => {
	const mockConfig = `
		import eslint from 'eslint';
		import js from '@eslint/js';
		import node from 'node:fs';
		import config from 'eslint/config';
		import {something} from 'some-package';
	`;

	const result = await readImportsFromConfig(mockConfig);

	expect(result).toEqual(['eslint', '@eslint/js', 'some-package']);
});
