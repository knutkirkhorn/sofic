import path from 'node:path';
import fs from 'node:fs/promises';
import logSymbols from 'log-symbols';
import chalk from 'chalk';
import stripJsonComments from 'strip-json-comments';

async function isDirectory(directoryPath) {
	try {
		const stats = await fs.stat(directoryPath);
		return {
			isDirectory: stats.isDirectory(),
			directoryPath
		};
	} catch {
		return {
			isDirectory: false,
			directoryPath
		};
	}
}

async function getSubDirectories(directoryPath) {
	const subPaths = await fs.readdir(directoryPath);
	const subDirectories = await Promise.all(subPaths.map(subPath => isDirectory(path.join(directoryPath, subPath))));
	return subDirectories
		.filter(subDirectory => subDirectory.isDirectory)
		.map(subDirectory => subDirectory.directoryPath);
}

async function fileExists(filePath) {
	try {
		const stats = await fs.stat(filePath);
		return stats.isFile();
	} catch {
		return false;
	}
}

const defaultFilesToCheck = [
	'.editorconfig'
];

async function isGitRepo(directoryPath) {
	// eslint-disable-next-line unicorn/no-await-expression-member
	return (await isDirectory(path.join(directoryPath, '.git'))).isDirectory;
}

async function hasPackageJson(directoryPath) {
	return fileExists(path.join(directoryPath, 'package.json'));
}

async function checkEslintConfig(directoryPath) {
	const packageJson = JSON.parse(await fs.readFile(path.join(directoryPath, 'package.json'), 'utf8'));
	const isUsingAva = Object.keys(packageJson.devDependencies).includes('ava');
	const hasInstalledAvaEslintPlugin = Object.keys(packageJson.devDependencies).includes('eslint-plugin-ava');

	const eslintConfigPath = path.join(directoryPath, '.eslintrc.json');
	const eslintConfig = JSON.parse(stripJsonComments(await fs.readFile(eslintConfigPath, 'utf8')));
	const hasEnabledAvaEslintPlugin = eslintConfig.extends.includes('plugin:ava/recommended');

	const eslintErrors = [];

	if (isUsingAva) {
		if (!hasInstalledAvaEslintPlugin) {
			eslintErrors.push('package.json: missing `eslint-plugin-ava` in `devDependencies`');
		} else if (!hasEnabledAvaEslintPlugin) {
			eslintErrors.push('.eslintrc.json: missing `plugin:ava/recommended` in `extends`');
		}
	}

	return eslintErrors;
}

async function checkDirectoryFiles(directoryPath) {
	const filesToCheck = [...defaultFilesToCheck];
	const isJavascriptDirectory = await hasPackageJson(directoryPath);
	if (isJavascriptDirectory) filesToCheck.push('.eslintrc.json');

	const isDirectoryGitRepo = await isGitRepo(directoryPath);
	if (isDirectoryGitRepo) filesToCheck.push('.gitignore', '.gitattributes');

	const errors = [];

	for (const fileToCheck of filesToCheck) {
		const filePath = path.join(directoryPath, fileToCheck);
		const currentFileExists = await fileExists(filePath);

		if (!currentFileExists) errors.push(fileToCheck);
	}

	if (isJavascriptDirectory) {
		const eslintErrors = await checkEslintConfig(directoryPath);
		errors.push(...eslintErrors);
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
