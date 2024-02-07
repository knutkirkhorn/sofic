import test from 'ava';
import mock from 'mock-fs';
import {checkNpmPackage} from '../checkers/javascript.js';

test.serial('non-package returns no errors', async t => {
	mock({
		'package.json': JSON.stringify({
			private: true,
		}),
	});

	const eslintConfigErrors = await checkNpmPackage('.');
	t.deepEqual(eslintConfigErrors, []);

	mock.restore();
});

test.serial('package is missing files, returns errors', async t => {
	mock({
		'package.json': JSON.stringify({}),
		'index.js': '',
	});

	const eslintConfigErrors = await checkNpmPackage('.');
	const expectedResult = [
		'npm package: should have a `.npmrc` file',
		'npm package: should have type definitions (`index.d.ts`)',
		'npm package: should have type definition tests (`index.test-d.ts`)',
	];
	t.deepEqual(eslintConfigErrors, expectedResult);

	mock.restore();
});

test.serial('package has lockfile, returns error', async t => {
	mock({
		'package.json': JSON.stringify({}),
		'package-lock.json': '',
		'.npmrc': '',
	});

	const eslintConfigErrors = await checkNpmPackage('.');
	t.deepEqual(eslintConfigErrors, [
		'npm package: should not have a lockfile (`package-lock.json`)',
	]);

	mock.restore();
});

test.serial('package with files, returns no errors', async t => {
	mock({
		'package.json': JSON.stringify({}),
		'.npmrc': '',
		'index.js': '',
		'index.d.ts': '',
		'index.test-d.ts': '',
	});

	const eslintConfigErrors = await checkNpmPackage('.');
	t.deepEqual(eslintConfigErrors, []);

	mock.restore();
});

test.serial('typescript package with files, returns no errors', async t => {
	mock({
		'package.json': JSON.stringify({
			devDependencies: {
				typescript: 'latest',
			},
		}),
		'.npmrc': '',
	});

	const eslintConfigErrors = await checkNpmPackage('.');
	t.deepEqual(eslintConfigErrors, []);

	mock.restore();
});
