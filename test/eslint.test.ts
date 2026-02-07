import fs from 'node:fs/promises';
import {expect, test} from 'bun:test';
import {checkEslintConfig} from '../checkers/javascript.js';
import {addLintScript, readImportsFromConfig} from '../commands/add/eslint.js';
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

test('adds lint script when no lint script exists', async () => {
	await withMockedFilesystem(
		{
			'package.json': JSON.stringify({
				name: 'test-project',
				scripts: {
					build: 'tsc',
				},
			}),
		},
		async () => {
			const result = await addLintScript();
			expect(result).toBe(true);

			const packageJson = JSON.parse(
				await fs.readFile('package.json', 'utf8'),
			) as {scripts: Record<string, string>};
			expect(packageJson.scripts.lint).toBe('eslint .');
			// Ensure existing scripts are preserved
			expect(packageJson.scripts.build).toBe('tsc');
		},
	);
});

test('does not add lint script when one already exists', async () => {
	await withMockedFilesystem(
		{
			'package.json': JSON.stringify({
				name: 'test-project',
				scripts: {
					lint: 'custom-linter .',
				},
			}),
		},
		async () => {
			const result = await addLintScript();
			expect(result).toBe(false);

			const packageJson = JSON.parse(
				await fs.readFile('package.json', 'utf8'),
			) as {scripts: Record<string, string>};
			// Ensure the existing lint script is not overwritten
			expect(packageJson.scripts.lint).toBe('custom-linter .');
		},
	);
});

test('returns false when no package.json exists', async () => {
	await withMockedFilesystem({}, async () => {
		const result = await addLintScript();
		expect(result).toBe(false);
	});
});

test('adds lint script when scripts object does not exist', async () => {
	await withMockedFilesystem(
		{
			'package.json': JSON.stringify({
				name: 'test-project',
			}),
		},
		async () => {
			const result = await addLintScript();
			expect(result).toBe(true);

			const packageJson = JSON.parse(
				await fs.readFile('package.json', 'utf8'),
			) as {scripts: Record<string, string>};
			expect(packageJson.scripts.lint).toBe('eslint .');
		},
	);
});
