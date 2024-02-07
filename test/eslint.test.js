import test from 'ava';
import mock from 'mock-fs';
import {checkEslintConfig} from '../checkers/javascript.js';

test.serial('has not installed eslint, returns error', async t => {
	mock({
		'package.json': JSON.stringify({}),
	});

	const eslintConfigErrors = await checkEslintConfig('.');
	t.deepEqual(eslintConfigErrors, [
		'package.json: missing `eslint` in `devDependencies`',
	]);

	mock.restore();
});

test.serial('has ava installed, but not plugins, throws error', async t => {
	mock({
		'package.json': JSON.stringify({
			devDependencies: {
				ava: 'latest',
				eslint: 'latest',
			},
		}),
	});

	const eslintConfigErrors = await checkEslintConfig('.');
	t.deepEqual(eslintConfigErrors, [
		'package.json: missing `eslint-plugin-ava` in `devDependencies`',
		'package.json: missing `eslint-plugin-unicorn` in `devDependencies`',
	]);

	mock.restore();
});

test.serial(
	'has installed eslint and plugins, does not throw errors',
	async t => {
		mock({
			'package.json': JSON.stringify({
				devDependencies: {
					ava: 'latest',
					eslint: 'latest',
					'eslint-plugin-ava': 'latest',
					'eslint-plugin-unicorn': 'latest',
				},
			}),
		});

		const eslintConfigErrors = await checkEslintConfig('.');
		t.deepEqual(eslintConfigErrors, []);

		mock.restore();
	},
);
