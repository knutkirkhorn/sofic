import path from 'node:path';
import {expect, test} from 'bun:test';
import {execa} from 'execa';
import {withMockedFilesystem} from './helpers.js';

const cliPath = path.join(import.meta.dir, '..', 'cli.ts');

async function runCli(arguments_: string[]): Promise<number | undefined> {
	const {exitCode} = await execa('bun', [cliPath, ...arguments_], {
		reject: false,
	});
	return exitCode;
}

test('cli can print out', async () => {
	const {stdout} = await execa('node', ['./dist/cli.js', '--version']);
	expect(stdout.length).toBeGreaterThan(0);
});

test('check exits with code 1 when it finds problems', async () => {
	await withMockedFilesystem({'project/readme.md': ''}, async () => {
		expect(await runCli(['check', process.cwd()])).toBe(1);
	});
});

test('check exits with code 0 when it finds no problems', async () => {
	await withMockedFilesystem({'project/.editorconfig': ''}, async () => {
		expect(await runCli(['check', process.cwd()])).toBe(0);
	});
});

test('check exits with code 0 when fix resolves all problems', async () => {
	await withMockedFilesystem({'project/readme.md': ''}, async () => {
		expect(await runCli(['check', process.cwd(), '--fix', '--default'])).toBe(
			0,
		);
	});
});

test('unknown command exits with code 1', async () => {
	expect(await runCli(['unknown'])).toBe(1);
});

test('add with unknown config name exits with code 1', async () => {
	const {exitCode, stderr} = await execa(
		'bun',
		[cliPath, 'add', 'eslint', 'definitely-missing-config-name'],
		{reject: false},
	);
	expect(exitCode).not.toBe(0);
	expect(stderr).toContain("Config 'definitely-missing-config-name' not found");
});
