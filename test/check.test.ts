import fs from 'node:fs/promises';
import path from 'node:path';
import {expect, spyOn, test} from 'bun:test';
import {
	checkRepoFiles,
	parseGitHostname,
	readIgnoredDirectories,
} from '../index.js';
import {fileExists} from '../utility.js';
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

test('parses the hostname of git remotes', () => {
	expect(parseGitHostname('https://github.com/user/repo.git')).toBe(
		'github.com',
	);
	expect(parseGitHostname('ssh://git@gitlab.com/user/repo.git')).toBe(
		'gitlab.com',
	);
	expect(parseGitHostname('git@github.com:user/repo.git')).toBe('github.com');
	expect(parseGitHostname('github.com:user/repo.git')).toBe('github.com');
	expect(parseGitHostname('/srv/git/repo.git')).toBeUndefined();
});

async function captureCheckOutput(directoryPath: string): Promise<string> {
	const logSpy = spyOn(console, 'log').mockImplementation(() => {});
	try {
		await checkRepoFiles(directoryPath);
		return logSpy.mock.calls.flat().join('\n');
	} finally {
		logSpy.mockRestore();
	}
}

test('check handles git repos with an SSH remote', async () => {
	await withMockedFilesystem(
		{
			'.git/config':
				'[remote "origin"]\n\turl = git@github.com:user/repo.git\n',
		},
		async () => {
			const output = await captureCheckOutput('.');
			expect(output).toContain('GitHub Actions: missing workflow file');
		},
	);
});

test('check handles git repos without a remote', async () => {
	await withMockedFilesystem(
		{
			'no-remote/.git/config': '[core]\n\tbare = false\n',
			'project/readme.md': '',
		},
		async () => {
			const output = await captureCheckOutput('.');
			expect(output).not.toContain('GitHub Actions');
			expect(output).toContain(path.resolve('project'));
		},
	);
});

test('reads ignored directories from .soficignore', async () => {
	await withMockedFilesystem(
		{
			'.soficignore':
				'# Comment\r\nfirst\n\n  second/  \n/third\n./fourth\nfifth\\\n',
		},
		async () => {
			const ignoredDirectories = await readIgnoredDirectories('.');
			expect([...ignoredDirectories]).toEqual([
				'first',
				'second',
				'third',
				'fourth',
				'fifth',
			]);
		},
	);
});

test('returns no ignored directories without .soficignore', async () => {
	await withMockedFilesystem({}, async () => {
		const ignoredDirectories = await readIgnoredDirectories('.');
		expect(ignoredDirectories.size).toBe(0);
	});
});

test('check skips directories listed in .soficignore', async () => {
	await withMockedFilesystem(
		{
			'.soficignore': 'ignored\n',
			'ignored/readme.md': '',
			'project/readme.md': '',
		},
		async () => {
			await checkRepoFiles('.', {fix: true, useDefault: true});

			expect(await fileExists(path.join('project', '.editorconfig'))).toBe(
				true,
			);
			expect(await fileExists(path.join('ignored', '.editorconfig'))).toBe(
				false,
			);
		},
	);
});
