import fs from 'node:fs/promises';
import {execa} from 'execa';
import {detect, resolveCommand} from 'package-manager-detector';
import task from 'tasuku';
import {askForConfigOption} from '../add/common.js';
import {
	addLintScript,
	readImportsFromConfig as readEslintImports,
} from '../add/eslint.js';
import {
	addFormatCheckScript,
	readImportsFromConfig as readPrettierImports,
} from '../add/prettier.js';
import {
	ensureUserConfigDirectoriesExists,
	ensureUserConfigFileExists,
} from '../index.js';

async function installDevelopmentPackages(packages: string[]): Promise<void> {
	const packageManager = await detect({cwd: process.cwd()});
	const resolvedCommand = resolveCommand(
		packageManager?.agent || 'npm',
		'add',
		['-D', ...packages],
	);

	if (!resolvedCommand) {
		throw new Error('Failed to resolve command to install packages');
	}

	await execa(resolvedCommand.command, resolvedCommand.args);
}

export async function initBunProject() {
	// Run bun init
	await execa('bun', ['init', '-y']);

	// Ensure the user config directories and file exist
	await ensureUserConfigDirectoriesExists();
	await ensureUserConfigFileExists();

	// Phase 1: Collect all user input upfront so prompts don't interleave with task output
	const eslintConfig = await askForConfigOption('eslint');
	const prettierConfig = await askForConfigOption('prettier');
	const editorConfigResult = await askForConfigOption('editorconfig');
	const gitattributesConfig = await askForConfigOption('gitattributes');

	// Phase 2: Run all tasks (no more interactive prompts from here)
	if (eslintConfig.configFilePath && eslintConfig.configFileName) {
		const eslintConfigContent = await fs.readFile(
			eslintConfig.configFilePath,
			'utf8',
		);

		await Promise.all([
			task('Installing ESLint packages', async ({setTitle}) => {
				const packagesToInstall = await readEslintImports(eslintConfigContent);
				await installDevelopmentPackages(packagesToInstall);
				setTitle('Installed ESLint packages');
			}),
			task('Adding ESLint config', async ({setTitle, setOutput}) => {
				await fs.writeFile(eslintConfig.configFileName!, eslintConfigContent);
				setTitle('Added ESLint config');
				setOutput(eslintConfig.configFileName!);
			}),
		]);
		await task('Adding lint to scripts', async ({setTitle}) => {
			const added = await addLintScript();
			setTitle(
				added
					? 'Added lint to scripts'
					: '`lint` already exists in `scripts` or no package.json was found',
			);
		});
	}

	if (prettierConfig.configFilePath && prettierConfig.configFileName) {
		await Promise.all([
			task('Installing Prettier packages', async ({setTitle}) => {
				const packagesToInstall = await readPrettierImports(
					prettierConfig.configFilePath!,
				);
				await installDevelopmentPackages(['prettier', ...packagesToInstall]);
				setTitle('Installed Prettier packages');
			}),
			task('Adding Prettier config', async ({setTitle, setOutput}) => {
				const prettierConfigContent = await fs.readFile(
					prettierConfig.configFilePath!,
					'utf8',
				);
				await fs.writeFile(
					prettierConfig.configFileName!,
					prettierConfigContent,
				);
				setTitle('Added Prettier config');
				setOutput(prettierConfig.configFileName!);
			}),
		]);
		await task('Adding format:check to scripts', async ({setTitle}) => {
			const added = await addFormatCheckScript();
			setTitle(
				added
					? 'Added format:check to scripts'
					: '`format:check` already exists in `scripts` or no package.json was found',
			);
		});
	}

	if (editorConfigResult.configFilePath && editorConfigResult.configFileName) {
		await task('Adding EditorConfig', async ({setTitle, setOutput}) => {
			const content = await fs.readFile(
				editorConfigResult.configFilePath!,
				'utf8',
			);
			await fs.writeFile('.editorconfig', content);
			setTitle('Added EditorConfig');
			setOutput(editorConfigResult.configFileName!);
		});
	}

	if (
		gitattributesConfig.configFilePath &&
		gitattributesConfig.configFileName
	) {
		await task('Adding .gitattributes', async ({setTitle, setOutput}) => {
			const content = await fs.readFile(
				gitattributesConfig.configFilePath!,
				'utf8',
			);
			await fs.writeFile('.gitattributes', content);
			setTitle('Added .gitattributes');
			setOutput(gitattributesConfig.configFileName!);
		});
	}
}
