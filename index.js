import fs from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';
import gitRemoteOriginUrl from 'git-remote-origin-url';
import logSymbols from 'log-symbols';
import {checkJavascriptErrors, hasPackageJson} from './checkers/javascript.js';
import {fileExists} from './util.js';

async function isDirectory(directoryPath) {
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

async function getSubDirectories(directoryPath) {
	const subPaths = await fs.readdir(directoryPath);
	const subDirectories = await Promise.all(
		subPaths.map(subPath => isDirectory(path.join(directoryPath, subPath))),
	);
	return subDirectories
		.filter(subDirectory => subDirectory.isDirectory)
		.map(subDirectory => subDirectory.directoryPath);
}

const defaultFilesToCheck = ['.editorconfig'];

async function isGitRepo(directoryPath) {
	// eslint-disable-next-line unicorn/no-await-expression-member
	return (await isDirectory(path.join(directoryPath, '.git'))).isDirectory;
}

async function checkGithubActions(directoryPath) {
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

async function checkGitLabCi(directoryPath) {
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

async function checkDirectoryFiles(directoryPath) {
	const filesToCheck = [...defaultFilesToCheck];
	const regexFilesToCheck = [];
	const isJavascriptDirectory = await hasPackageJson(directoryPath);
	if (isJavascriptDirectory) {
		regexFilesToCheck.push(
			{
				regex: /^eslint\.config\.(js|mjs|ts)$/,
				error:
					'ESLint: missing config (`eslint.config.js`, `eslint.config.mjs`, or `eslint.config.ts`)',
			},
			{
				regex: /^prettier\.config\.(js|mjs|ts)$/,
				error:
					'Prettier: missing config (`prettier.config.js`, `prettier.config.mjs`, or `prettier.config.ts`)',
			},
		);
	}

	const isDirectoryGitRepo = await isGitRepo(directoryPath);
	if (isDirectoryGitRepo) filesToCheck.push('.gitignore', '.gitattributes');

	const errors = [];

	for (const fileToCheck of filesToCheck) {
		const filePath = path.join(directoryPath, fileToCheck);
		const currentFileExists = await fileExists(filePath);

		if (!currentFileExists) errors.push(fileToCheck);
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

		if (!foundFile) errors.push(regexFileToCheck.error);
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
}

export async function checkRepoFiles(directoryPath = process.cwd()) {
	const parsedDirectoryPath = path.resolve(directoryPath);
	const {isDirectory: isPathDirectory} = await isDirectory(parsedDirectoryPath);

	if (!isPathDirectory) throw new Error('Input path is not a directory');

	const isDirectoryGitRepo = await isGitRepo(directoryPath);
	const isJavascriptDirectory = await hasPackageJson(directoryPath);

	if (isDirectoryGitRepo || isJavascriptDirectory) {
		await checkDirectoryFiles(directoryPath);
		return;
	}

	const subDirectories = await getSubDirectories(parsedDirectoryPath);

	for (const subDirectory of subDirectories) {
		await checkDirectoryFiles(subDirectory);
	}
}
