import {expect, test} from 'bun:test';
import {checkNpmPackage} from '../checkers/javascript.js';
import {withMockedFilesystem} from './helpers.js';

test('non-package returns no errors', async () => {
	await withMockedFilesystem(
		{
			'package.json': JSON.stringify({
				private: true,
			}),
		},
		async () => {
			const eslintConfigErrors = await checkNpmPackage('.');
			expect(eslintConfigErrors).toEqual([]);
		},
	);
});

test('package is missing files, returns errors', async () => {
	await withMockedFilesystem(
		{
			'package.json': JSON.stringify({}),
			'index.js': '',
		},
		async () => {
			const eslintConfigErrors = await checkNpmPackage('.');
			const expectedResult = [
				'npm package: should have a `.npmrc` file',
				'npm package: should have type definitions (`index.d.ts`)',
				'npm package: should have type definition tests (`index.test-d.ts`)',
			];
			expect(eslintConfigErrors).toEqual(expectedResult);
		},
	);
});

test('package has lockfile, returns error', async () => {
	await withMockedFilesystem(
		{
			'package.json': JSON.stringify({}),
			'package-lock.json': '',
			'.npmrc': '',
		},
		async () => {
			const eslintConfigErrors = await checkNpmPackage('.');
			expect(eslintConfigErrors).toEqual([
				'npm package: should not have a lockfile (`package-lock.json`)',
			]);
		},
	);
});

test('package with files, returns no errors', async () => {
	await withMockedFilesystem(
		{
			'package.json': JSON.stringify({}),
			'.npmrc': '',
			'index.js': '',
			'index.d.ts': '',
			'index.test-d.ts': '',
		},
		async () => {
			const eslintConfigErrors = await checkNpmPackage('.');
			expect(eslintConfigErrors).toEqual([]);
		},
	);
});

test('typescript package with files, returns no errors', async () => {
	await withMockedFilesystem(
		{
			'package.json': JSON.stringify({
				devDependencies: {
					typescript: 'latest',
				},
			}),
			'.npmrc': '',
		},
		async () => {
			const eslintConfigErrors = await checkNpmPackage('.');
			expect(eslintConfigErrors).toEqual([]);
		},
	);
});
