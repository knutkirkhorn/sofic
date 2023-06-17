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
	'.editorconfig',
];

async function isGitRepo(directoryPath) {
	// eslint-disable-next-line unicorn/no-await-expression-member
	return (await isDirectory(path.join(directoryPath, '.git'))).isDirectory;
}

async function hasPackageJson(directoryPath) {
	return fileExists(path.join(directoryPath, 'package.json'));
}

// eslint-disable-next-line consistent-return
async function checkEslintPlugin(packageJson, hasDevelopmentDependencies, eslintConfigExists, eslintConfig, pluginName) {
	const hasInstalledEslintPlugin = hasDevelopmentDependencies
		? Object.keys(packageJson.devDependencies).includes(`eslint-plugin-${pluginName}`)
		: false;
	const hasEnabledEslintPlugin = eslintConfigExists ? eslintConfig.extends.includes(`plugin:${pluginName}/recommended`) : false;

	if (!hasInstalledEslintPlugin) {
		return `package.json: missing \`eslint-plugin-${pluginName}\` in \`devDependencies\``;
	}

	if (eslintConfigExists && !hasEnabledEslintPlugin) {
		return `.eslintrc.json: missing \`plugin:${pluginName}/recommended\` in \`extends\``;
	}
}

async function checkEslintConfig(directoryPath) {
	const packageJson = JSON.parse(await fs.readFile(path.join(directoryPath, 'package.json'), 'utf8'));
	const eslintConfigPath = path.join(directoryPath, '.eslintrc.json');
	const eslintConfigExists = await fileExists(eslintConfigPath);
	const eslintConfig = eslintConfigExists
		? JSON.parse(stripJsonComments(await fs.readFile(eslintConfigPath, 'utf8')))
		: {};

	const eslintErrors = [];

	const hasDevelopmentDependencies = packageJson.devDependencies !== undefined;
	const isUsingAva = hasDevelopmentDependencies
		? Object.keys(packageJson.devDependencies).includes('ava')
		: false;

	if (isUsingAva) {
		const avaEslintError = await checkEslintPlugin(packageJson, hasDevelopmentDependencies, eslintConfigExists, eslintConfig, 'ava');
		if (avaEslintError) eslintErrors.push(avaEslintError);
	}

	const unicornEslintError = await checkEslintPlugin(packageJson, hasDevelopmentDependencies, eslintConfigExists, eslintConfig, 'unicorn');
	if (unicornEslintError) eslintErrors.push(unicornEslintError);

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
