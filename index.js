import fs from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';
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

async function checkDirectoryFiles(directoryPath) {
	const filesToCheck = [...defaultFilesToCheck];
	const isJavascriptDirectory = await hasPackageJson(directoryPath);
	if (isJavascriptDirectory) {
		filesToCheck.push('.eslintrc.json', 'prettier.config.js');
	}

	const isDirectoryGitRepo = await isGitRepo(directoryPath);
	if (isDirectoryGitRepo) filesToCheck.push('.gitignore', '.gitattributes');

	const errors = [];

	for (const fileToCheck of filesToCheck) {
		const filePath = path.join(directoryPath, fileToCheck);
		const currentFileExists = await fileExists(filePath);

		if (!currentFileExists) errors.push(fileToCheck);
	}

	if (isJavascriptDirectory) {
		const javascriptErrors = await checkJavascriptErrors(directoryPath);
		errors.push(...javascriptErrors);
	}

	const githubActionsErrors = await checkGithubActions(directoryPath);
	errors.push(...githubActionsErrors);

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
