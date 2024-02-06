import test from 'ava';
import mock from 'mock-fs';
import {checkPrettierConfig} from '../checkers/javascript.js';

test.serial('has dependencies', async t => {
	mock({
		'package.json': JSON.stringify({
			devDependencies: {
				prettier: '1.0.0',
				'eslint-config-prettier': '1.0.0',
				'@ianvs/prettier-plugin-sort-imports': '1.0.0',
			},
		}),
	});

	const prettierConfigErrors = await checkPrettierConfig('.');
	t.deepEqual(prettierConfigErrors, []);

	mock.restore();
});

test.serial('missing dev dependencies', async t => {
	mock({
		'package.json': JSON.stringify({
			devDependencies: {},
		}),
	});

	const prettierConfigErrors = await checkPrettierConfig('.');
	const expectedResult = [
		'package.json: missing `prettier` in `devDependencies`',
		'package.json: missing `eslint-config-prettier` in `devDependencies`',
		'package.json: missing `@ianvs/prettier-plugin-sort-imports` in `devDependencies`',
	];
	t.deepEqual(prettierConfigErrors, expectedResult);

	mock.restore();
});

test.serial('missing tailwindcss', async t => {
	mock({
		'package.json': JSON.stringify({
			devDependencies: {
				prettier: '1.0.0',
				'eslint-config-prettier': '1.0.0',
				'@ianvs/prettier-plugin-sort-imports': '1.0.0',
				tailwindcss: '1.0.0',
			},
		}),
	});

	const prettierConfigErrors = await checkPrettierConfig('.');
	const expectedResult = [
		'package.json: missing `prettier-plugin-tailwindcss` in `devDependencies`',
	];
	t.deepEqual(prettierConfigErrors, expectedResult);

	mock.restore();
});

test.serial('has all prettier and tailwind dependencies', async t => {
	mock({
		'package.json': JSON.stringify({
			devDependencies: {
				prettier: '1.0.0',
				'eslint-config-prettier': '1.0.0',
				'@ianvs/prettier-plugin-sort-imports': '1.0.0',
				'prettier-plugin-tailwindcss': '1.0.0',
				tailwindcss: '1.0.0',
			},
		}),
	});

	const prettierConfigErrors = await checkPrettierConfig('.');
	t.deepEqual(prettierConfigErrors, []);

	mock.restore();
});
