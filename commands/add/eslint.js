import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {input, select, Separator} from '@inquirer/prompts';
import {execa} from 'execa';
import logSymbols from 'log-symbols';
import {detect, resolveCommand} from 'package-manager-detector';
import {parseImports} from 'parse-imports';
import task from 'tasuku';
import {z} from 'zod/v4';
import {fileExists} from '../../util.js';
import {askToDeleteConfig, askToRenameConfig} from './common.js';

async function installEslintPackages(packages) {
	// Get what package manager is used for given project
	const packageManager = await detect({
		cwd: process.cwd(),
	});

	// Get the command to install packages
	const {command, args} = resolveCommand(
		// Use 'npm' as default package manager if no package manager is detected
		packageManager?.agent || 'npm',
		'add',
		// Use `-D` to add packages as dev dependencies
		['-D', ...packages],
	);

	// Run the install packages command
	await execa(command, args);
}

const userConfigSchema = z.object({
	version: z.string(),
	configs: z.record(
		z.string(),
		z.record(
			z.string(),
			z.object({
				relative_path: z.string(),
			}),
		),
	),
});

async function getUserConfigs() {
	const homeDirectory = os.homedir();
	const configFile = path.join(
		homeDirectory,
		'.sofic',
		'configs',
		'configs.json',
	);
	const userConfigs = JSON.parse(await fs.readFile(configFile, 'utf8'));
	const parsedUserConfigs = userConfigSchema.parse(userConfigs);
	return parsedUserConfigs;
}

async function readImportsFromConfig(configFile) {
	// TODO: needs test for this, test with the default configs
	// TODO: do this for the prettier configs also

	const imports = [...(await parseImports(configFile))];
	const packageImports = imports
		.filter(
			import_ =>
				import_.moduleSpecifier.type === 'package' &&
				!import_.moduleSpecifier.value.startsWith('node:'),
		)
		.map(import_ => {
			// eslint/config -> eslint
			// @eslint/js -> @eslint/js
			if (
				!import_.moduleSpecifier.value.startsWith('@') &&
				import_.moduleSpecifier.value.includes('/')
			) {
				return import_.moduleSpecifier.value.split('/')[0];
			}

			return import_.moduleSpecifier.value;
		});
	return packageImports;
}

export async function addEslint() {
	// Read the user configs
	const userConfigs = await getUserConfigs();

	// Prompt the user for which config to use
	const configAnswer = await select({
		message: 'Select a config',
		choices: [
			{
				name: 'Default',
				value: 'default',
				description: 'Use the default config',
			},
			// Append all user defined configs
			...Object.keys(userConfigs.configs.eslint).map(key => ({
				name: key,
				value: `user-${key}`,
				description: `Use the ${key} config`,
			})),
			new Separator(),
			{
				name: 'New config',
				value: 'new',
				description: 'Create a new config',
			},
			{
				name: 'Rename config',
				value: 'rename',
				description: 'Rename a config',
			},
			{
				name: 'Delete config',
				value: 'delete',
				description: 'Delete a config',
			},
			new Separator(),
		],
	});

	let configFilePath = '';

	// TODO: fix this:
	// eslint-disable-next-line unicorn/prefer-switch
	if (configAnswer === 'new') {
		// Create new config
		const configName = await input({
			message: 'Config name',
			validate: value => {
				if (!value) return 'Config name is required';

				if (Object.keys(userConfigs.configs.eslint).includes(value)) {
					return 'Config with this name already exists';
				}

				return true;
			},
		});

		const configPath = await input({
			message: 'Config path',
			validate: value => {
				if (!value) return 'Config path is required';
				return true;
			},
		});

		// Check if the input path is a valid file
		const configFileExists = await fileExists(configPath);
		if (!configFileExists) {
			throw new Error('Config file does not exist');
		}

		// Copy it into the <home-directory>/.sofic/configs/eslint/<next-index>/eslint.config.mjs
		const homeDirectory = os.homedir();
		const nextIndex = Object.keys(userConfigs.configs.eslint).length + 1;
		const newConfigPath = path.join(
			homeDirectory,
			'.sofic',
			'configs',
			'eslint',
			`${nextIndex}`,
			'eslint.config.mjs',
		);
		// Create new config directory
		await fs.mkdir(
			path.join(homeDirectory, '.sofic', 'configs', 'eslint', `${nextIndex}`),
			{
				recursive: true,
			},
		);

		// Write new config file
		const userSelectedConfigFile = await fs.readFile(configPath, 'utf8');
		await fs.writeFile(newConfigPath, userSelectedConfigFile);

		// Update user configs
		userConfigs.configs.eslint[configName] = {
			relative_path: nextIndex.toString(),
		};

		// Save updated user configs
		const userConfigFilePath = path.join(
			homeDirectory,
			'.sofic',
			'configs',
			'configs.json',
		);
		await fs.writeFile(
			userConfigFilePath,
			JSON.stringify(userConfigs, undefined, 2),
		);
		console.log(`${logSymbols.success} Saved config file '${configName}'`);

		configFilePath = newConfigPath;
	} else if (configAnswer === 'default') {
		// Use default config
		const __filename = fileURLToPath(import.meta.url);
		const __dirname = path.dirname(__filename);
		const snippetsDirectory = path.join(__dirname, 'snippets');
		configFilePath = path.join(snippetsDirectory, 'eslint.config.mjs');
	} else if (configAnswer === 'rename') {
		await askToRenameConfig(userConfigs, 'eslint');
		return;
	} else if (configAnswer === 'delete') {
		await askToDeleteConfig(userConfigs, 'eslint');
		return;
	} else {
		// Use user config
		const homeDirectory = os.homedir();
		const configName = configAnswer.replace('user-', '');
		configFilePath = path.join(
			homeDirectory,
			'.sofic',
			'configs',
			'eslint',
			userConfigs.configs.eslint[configName].relative_path,
			'eslint.config.mjs',
		);
	}

	// Read config
	const eslintConfigFile = await fs.readFile(configFilePath, 'utf8');

	await Promise.all([
		task('Installing ESLint packages', async ({setTitle}) => {
			const packagesToInstall = await readImportsFromConfig(eslintConfigFile);
			await installEslintPackages(packagesToInstall);
			setTitle('Installed ESLint packages');
		}),
		task('Adding ESLint config', async ({setTitle, setOutput}) => {
			// Create new ESLint config file
			await fs.writeFile('eslint.config.mjs', eslintConfigFile);
			setTitle('Added ESLint config');
			setOutput('eslint.config.mjs');
		}),
	]);
}
