import fs from 'node:fs/promises';
import path from 'node:path';
import {expect, test} from 'bun:test';
import {checkPrettierConfig} from '../checkers/javascript.js';
import {
	addFormatCheckScript,
	readImportsFromConfig,
} from '../commands/add/prettier.js';
import {withMockedFilesystem} from './helpers.js';

test('has dependencies', async () => {
	await withMockedFilesystem(
		{
			'package.json': JSON.stringify({
				devDependencies: {
					prettier: '1.0.0',
					'eslint-config-prettier': '1.0.0',
					'@ianvs/prettier-plugin-sort-imports': '1.0.0',
				},
			}),
		},
		async () => {
			const prettierConfigErrors = await checkPrettierConfig('.');
			expect(prettierConfigErrors).toEqual([]);
		},
	);
});

test('missing dev dependencies', async () => {
	await withMockedFilesystem(
		{
			'package.json': JSON.stringify({
				devDependencies: {},
			}),
		},
		async () => {
			const prettierConfigErrors = await checkPrettierConfig('.');
			const expectedResult = [
				'package.json: missing `prettier` in `devDependencies`',
				'package.json: missing `eslint-config-prettier` in `devDependencies`',
				'package.json: missing `@ianvs/prettier-plugin-sort-imports` in `devDependencies`',
			];
			expect(prettierConfigErrors).toEqual(expectedResult);
		},
	);
});

test('missing tailwindcss', async () => {
	await withMockedFilesystem(
		{
			'package.json': JSON.stringify({
				devDependencies: {
					prettier: '1.0.0',
					'eslint-config-prettier': '1.0.0',
					'@ianvs/prettier-plugin-sort-imports': '1.0.0',
					tailwindcss: '1.0.0',
				},
			}),
		},
		async () => {
			const prettierConfigErrors = await checkPrettierConfig('.');
			const expectedResult = [
				'package.json: missing `prettier-plugin-tailwindcss` in `devDependencies`',
			];
			expect(prettierConfigErrors).toEqual(expectedResult);
		},
	);
});

test('has all prettier and tailwind dependencies', async () => {
	await withMockedFilesystem(
		{
			'package.json': JSON.stringify({
				devDependencies: {
					prettier: '1.0.0',
					'eslint-config-prettier': '1.0.0',
					'@ianvs/prettier-plugin-sort-imports': '1.0.0',
					'prettier-plugin-tailwindcss': '1.0.0',
					tailwindcss: '1.0.0',
				},
			}),
		},
		async () => {
			const prettierConfigErrors = await checkPrettierConfig('.');
			expect(prettierConfigErrors).toEqual([]);
		},
	);
});

test('parse plugins imports from config file', async () => {
	await withMockedFilesystem(
		{
			'prettier.config.js': `
			export default {
				plugins: [
					'prettier-plugin-tailwindcss',
					'@ianvs/prettier-plugin-sort-imports',
					'some/other-plugin',
					'some/another-plugin',
				]
			}
		`,
		},
		async () => {
			const result = await readImportsFromConfig(
				path.resolve('./prettier.config.js'),
			);

			expect(result).toEqual([
				'prettier-plugin-tailwindcss',
				'@ianvs/prettier-plugin-sort-imports',
				'some',
			]);
		},
	);
});

test('adds format:check script when no format:check script exists', async () => {
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
			const result = await addFormatCheckScript();
			expect(result).toBe(true);

			const packageJson = JSON.parse(
				await fs.readFile('package.json', 'utf8'),
			) as {scripts: Record<string, string>};
			expect(packageJson.scripts['format:check']).toBe('prettier . --check');
			// Ensure existing scripts are preserved
			expect(packageJson.scripts.build).toBe('tsc');
		},
	);
});

test('does not add format:check script when one already exists', async () => {
	await withMockedFilesystem(
		{
			'package.json': JSON.stringify({
				name: 'test-project',
				scripts: {
					'format:check': 'custom-formatter --check',
				},
			}),
		},
		async () => {
			const result = await addFormatCheckScript();
			expect(result).toBe(false);

			const packageJson = JSON.parse(
				await fs.readFile('package.json', 'utf8'),
			) as {scripts: Record<string, string>};
			// Ensure the existing format:check script is not overwritten
			expect(packageJson.scripts['format:check']).toBe(
				'custom-formatter --check',
			);
		},
	);
});

test('returns false for format:check when no package.json exists', async () => {
	await withMockedFilesystem({}, async () => {
		const result = await addFormatCheckScript();
		expect(result).toBe(false);
	});
});

test('adds format:check script when scripts object does not exist', async () => {
	await withMockedFilesystem(
		{
			'package.json': JSON.stringify({
				name: 'test-project',
			}),
		},
		async () => {
			const result = await addFormatCheckScript();
			expect(result).toBe(true);

			const packageJson = JSON.parse(
				await fs.readFile('package.json', 'utf8'),
			) as {scripts: Record<string, string>};
			expect(packageJson.scripts['format:check']).toBe('prettier . --check');
		},
	);
});
