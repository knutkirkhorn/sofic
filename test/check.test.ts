import fs from 'node:fs/promises';
import path from 'node:path';
import {expect, test} from 'bun:test';
import {checkRepoFiles} from '../index.js';
import {fileExists} from '../util.js';
import {withMockedFilesystem} from './helpers.js';

test('check does not add missing files without fix', async () => {
	await withMockedFilesystem({'project/readme.md': ''}, async () => {
		await checkRepoFiles('.');

		expect(await fileExists(path.join('project', '.editorconfig'))).toBe(false);
	});
});

test('check with fix adds missing files using the default config', async () => {
	await withMockedFilesystem({'project/readme.md': ''}, async () => {
		const originalCwd = process.cwd();
		await checkRepoFiles('.', {fix: true, useDefault: true});

		const editorConfig = await fs.readFile(
			path.join('project', '.editorconfig'),
			'utf8',
		);
		const defaultEditorConfig = await fs.readFile(
			path.join(
				import.meta.dir,
				'..',
				'commands',
				'add',
				'snippets',
				'.editorconfig',
			),
			'utf8',
		);
		expect(editorConfig).toBe(defaultEditorConfig);
		expect(process.cwd()).toBe(originalCwd);
	});
});
