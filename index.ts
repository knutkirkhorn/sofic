import fs from 'node:fs/promises';
import path from 'node:path';
import {checkbox} from '@inquirer/prompts';
import chalk from 'chalk';
import gitRemoteOriginUrl from 'git-remote-origin-url';
import logSymbols from 'log-symbols';
import {checkJavascriptErrors, hasPackageJson} from './checkers/javascript.js';
import {add} from './commands/index.js';
import {fileExists} from './util.js';

type FixableTool = 'eslint' | 'prettier' | 'editorconfig' | 'gitattributes';

export interface CheckOptions {
	fix?: boolean;
	useDefault?: boolean;
}

const fixableFiles: Partial<Record<string, FixableTool>> = {
	'.editorconfig': 'editorconfig',
	'.gitattributes': 'gitattributes',
};

interface DirectoryInfo {
	isDirectory: boolean;
	directoryPath: string;
}

async function isDirectory(directoryPath: string): Promise<DirectoryInfo> {
	try {
		const stats = await fs.stat(directoryPath);
		return {
			isDirectory: stats.isDirectory(),
			directoryPath,
		};
	} catch {
		return {
			isDirectory: false,
			directoryPath,
		};
	}
}

async function getSubDirectories(directoryPath: string): Promise<string[]> {
	const subPaths = await fs.readdir(directoryPath);
	const subDirectories = await Promise.all(
		subPaths.map(subPath => isDirectory(path.join(directoryPath, subPath))),
	);
	return subDirectories
		.filter(subDirectory => subDirectory.isDirectory)
		.map(subDirectory => subDirectory.directoryPath);
}

const defaultFilesToCheck = ['.editorconfig'];

async function isGitRepo(directoryPath: string): Promise<boolean> {
	// eslint-disable-next-line unicorn/no-await-expression-member
	return (await isDirectory(path.join(directoryPath, '.git'))).isDirectory;
}

async function checkGithubActions(directoryPath: string): Promise<string[]> {
	const githubActionsDirectory = path.join(
		directoryPath,
		'.github',
		'workflows',
	);

	const {isDirectory: githubActionsDirectoryExists} = await isDirectory(
		githubActionsDirectory,
	);
	if (!githubActionsDirectoryExists) {
		return ['GitHub Actions: missing workflow file in `.github/workflows`'];
	}

	const files = await fs.readdir(githubActionsDirectory);

	for (const file of files) {
		const filePath = path.join(githubActionsDirectory, file);
		const stats = await fs.stat(filePath);

		if (
			!stats.isDirectory() &&
			(file.endsWith('.yaml') || file.endsWith('.yml'))
		) {
			return [];
		}
	}

	return ['GitHub Actions: missing workflow file in `.github/workflows`'];
}

async function checkGitLabCi(directoryPath: string): Promise<string[]> {
	const files = await fs.readdir(directoryPath);

	// Check all the files in the directory and see if any ends with `.gitlab-ci.yml`
	for (const file of files) {
		const filePath = path.join(directoryPath, file);
		const stats = await fs.stat(filePath);

		if (!stats.isDirectory() && file.endsWith('.gitlab-ci.yml')) {
			return [];
		}
	}

	return ['GitLab CI: missing `.gitlab-ci.yml` file'];
}

async function fixDirectory(
	directoryPath: string,
	tools: FixableTool[],
	useDefault: boolean | undefined,
): Promise<void> {
	const toolsToAdd = useDefault
		? tools
		: await checkbox({
				message: 'Select what to add',
				choices: tools.map(tool => ({name: tool, value: tool, checked: true})),
			});

	if (toolsToAdd.length === 0) return;

	// The add commands write to and install packages in the current working directory
	const originalCwd = process.cwd();
	process.chdir(directoryPath);

	try {
		for (const tool of toolsToAdd) {
			await add(tool, {default: useDefault});
		}
	} finally {
		process.chdir(originalCwd);
	}
}

async function checkDirectoryFiles(
	directoryPath: string,
	options: CheckOptions,
): Promise<void> {
	const filesToCheck = [...defaultFilesToCheck];
	const regexFilesToCheck: Array<{
		regex: RegExp;
		error: string;
		tool: FixableTool;
	}> = [];
	const isJavascriptDirectory = await hasPackageJson(directoryPath);
	if (isJavascriptDirectory) {
		regexFilesToCheck.push(
			{
				regex: /^eslint\.config\.(js|mjs|ts)$/,
				error:
					'ESLint: missing config (`eslint.config.js`, `eslint.config.mjs`, or `eslint.config.ts`)',
				tool: 'eslint',
			},
			{
				regex: /^prettier\.config\.(js|mjs|ts)$/,
				error:
					'Prettier: missing config (`prettier.config.js`, `prettier.config.mjs`, or `prettier.config.ts`)',
				tool: 'prettier',
			},
		);
	}

	const isDirectoryGitRepo = await isGitRepo(directoryPath);
	if (isDirectoryGitRepo) filesToCheck.push('.gitignore', '.gitattributes');

	const errors: string[] = [];
	const fixableTools: FixableTool[] = [];

	for (const fileToCheck of filesToCheck) {
		const filePath = path.join(directoryPath, fileToCheck);
		const currentFileExists = await fileExists(filePath);

		if (!currentFileExists) {
			errors.push(fileToCheck);
			const tool = fixableFiles[fileToCheck];
			if (tool) fixableTools.push(tool);
		}
	}

	for (const regexFileToCheck of regexFilesToCheck) {
		const files = await fs.readdir(directoryPath);
		let foundFile = false;

		for (const file of files) {
			if (regexFileToCheck.regex.test(file)) {
				foundFile = true;
				break;
			}
		}

		if (!foundFile) {
			errors.push(regexFileToCheck.error);
			fixableTools.push(regexFileToCheck.tool);
		}
	}

	if (isJavascriptDirectory) {
		const javascriptErrors = await checkJavascriptErrors(directoryPath);
		errors.push(...javascriptErrors);
	}

	if (isDirectoryGitRepo) {
		const gitRemote = await gitRemoteOriginUrl({cwd: directoryPath});
		const gitHostname = new URL(gitRemote).hostname;

		if (gitHostname === 'github.com') {
			const githubActionsErrors = await checkGithubActions(directoryPath);
			errors.push(...githubActionsErrors);
		} else if (gitHostname === 'gitlab.com') {
			const gitlabCiErrors = await checkGitLabCi(directoryPath);
			errors.push(...gitlabCiErrors);
		}
	}

	if (errors.length > 0) {
		console.log(`\n${chalk.underline(directoryPath)}`);
	}

	for (const error of errors) {
		console.log(`${logSymbols.error} ${error}`);
	}

	if (options.fix && fixableTools.length > 0) {
		await fixDirectory(directoryPath, fixableTools, options.useDefault);
	}
}

export async function readIgnoredDirectories(
	directoryPath: string,
): Promise<Set<string>> {
	const ignoreFilePath = path.join(directoryPath, '.soficignore');
	if (!(await fileExists(ignoreFilePath))) return new Set();

	const ignoreFile = await fs.readFile(ignoreFilePath, 'utf8');
	const ignoredDirectories = ignoreFile
		.split(/\r?\n/)
		.map(line => line.trim())
		.filter(line => line !== '' && !line.startsWith('#'))
		// Allow `dir`, `dir/`, `/dir` and `./dir` to all mean the same directory
		.map(line => line.replace(/^\.?[/\\]+/, '').replace(/[/\\]+$/, ''));

	return new Set(ignoredDirectories);
}

export async function checkRepoFiles(
	directoryPath: string = process.cwd(),
	options: CheckOptions = {},
): Promise<void> {
	const parsedDirectoryPath = path.resolve(directoryPath);
	const {isDirectory: isPathDirectory} = await isDirectory(parsedDirectoryPath);

	if (!isPathDirectory) throw new Error('Input path is not a directory');

	const isDirectoryGitRepo = await isGitRepo(directoryPath);
	const isJavascriptDirectory = await hasPackageJson(directoryPath);

	if (isDirectoryGitRepo || isJavascriptDirectory) {
		await checkDirectoryFiles(directoryPath, options);
		return;
	}

	const subDirectories = await getSubDirectories(parsedDirectoryPath);
	const ignoredDirectories = await readIgnoredDirectories(parsedDirectoryPath);

	for (const subDirectory of subDirectories) {
		if (ignoredDirectories.has(path.basename(subDirectory))) continue;

		await checkDirectoryFiles(subDirectory, options);
	}
}
